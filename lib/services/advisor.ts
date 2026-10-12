import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getNow, calendarDate } from "@/lib/clock";
import { outreach } from "@/lib/ai/client";
import { formatRiskReason, t, type Language } from "@/lib/i18n";
import { scoreRisk, sortRisk } from "@/lib/risk/score";
import { doneThroughWeek } from "@/lib/engine/display";
import { currentWeek } from "@/lib/engine/time";
import { adherenceMetric } from "@/lib/risk/metric";
import { Prisma } from "@/lib/generated/prisma/client";

export type AdvisorBand = "high" | "medium" | "low";
export type PublicRisk = { band: AdvisorBand; reasons: { code: string; params: Record<string, string | number> }[]; lastActivity: string | null; escalated: boolean };
export type AdvisorRow = { id: string; name: string; language: Language; risk: PublicRisk; planStatus: "fit" | "cut" | "infeasible" | null; doneThroughWeek: number; hasCurrentPlan: boolean; escalated: boolean; lastActive: string | null };
export type AdvisorEvent = { at: string; type: "done" | "sessionMissed" | "submitted" | "topicDone" | "seen"; title?: string };
export type AdvisorDetail = AdvisorRow & { events: AdvisorEvent[]; missedSessions: string[]; draftsUsedThisWeek: number; outreach: { id: string; message: string; nextStep: string; contacted: boolean; createdAt: string } | null };

export class AdvisorServiceError extends Error {
  constructor(public readonly code: "STUDENT_NOT_FOUND" | "OUTREACH_NOT_FOUND" | "OUTREACH_WEEKLY_LIMIT") { super(code); }
}

export function outreachWeekWindow(now: Date) {
  const localDay = new Date(`${calendarDate(now)}T00:00:00Z`);
  localDay.setUTCDate(localDay.getUTCDate() - ((localDay.getUTCDay() + 6) % 7));
  const monday = localDay.toISOString().slice(0, 10);
  localDay.setUTCDate(localDay.getUTCDate() + 7);
  const nextMonday = localDay.toISOString().slice(0, 10);
  return { gte: new Date(`${monday}T00:00:00+01:00`), lt: new Date(`${nextMonday}T00:00:00+01:00`) };
}

const availabilitySchema = z.strictObject({
  mon: z.number().int().min(0), tue: z.number().int().min(0), wed: z.number().int().min(0),
  thu: z.number().int().min(0), fri: z.number().int().min(0), sat: z.number().int().min(0), sun: z.number().int().min(0),
});

type RawStudent = {
  id: string; name: string; language: Language; availability: unknown; lastSeenAt: Date | null; escalatedAt: Date | null;
  progress: { topicId: string; completedAt: string }[];
  submissions: { assessmentId: string; submittedAt: string }[];
  plans: { id: string; status: "fit" | "cut" | "infeasible"; simNow: string; sessions: { date: string; status: "pending" | "done" | "missed"; checkedAt: string | null }[] }[];
};

async function loadFacts(studentId?: string) {
  const db = getDb();
  const where = studentId ? Prisma.sql`WHERE s."id" = ${studentId}` : Prisma.empty;
  const [now, studentRows, topics, assessments, course] = await Promise.all([
    getNow(),
    db.$queryRaw<RawStudent[]>`
      SELECT s."id", s."name", s."language", s."availability", s."lastSeenAt", s."escalatedAt",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('topicId', p."topicId", 'completedAt', p."completedAt"))
          FROM "Progress" p WHERE p."studentId" = s."id"), '[]'::jsonb) AS "progress",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('assessmentId', sub."assessmentId", 'submittedAt', sub."submittedAt"))
          FROM "Submission" sub WHERE sub."studentId" = s."id"), '[]'::jsonb) AS "submissions",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pl."id", 'status', pl."status", 'simNow', pl."simNow",
          'sessions', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', sess."date", 'status', sess."status", 'checkedAt', sess."checkedAt"))
            FROM "Session" sess WHERE sess."planId" = pl."id"), '[]'::jsonb)))
          FROM "Plan" pl WHERE pl."studentId" = s."id" AND pl."isCurrent" = true), '[]'::jsonb) AS "plans"
      FROM "Student" s ${where}
    `,
    db.topic.findMany({ select: { id: true, title: true, week: true, estMinutes: true } }),
    db.assessment.findMany({ select: { id: true, title: true, kind: true, dueDate: true, topicIds: true } }),
    db.course.findUnique({ where: { id: "smpl201" }, select: { startDate: true } }),
  ]);
  if (!course) throw new Error("Sample course missing");
  const students = studentRows.map((student) => ({
    id: student.id, name: student.name, language: student.language, availability: student.availability,
    lastSeenAt: student.lastSeenAt, escalatedAt: student.escalatedAt,
    progress: student.progress.map((row) => ({ topicId: row.topicId, completedAt: new Date(row.completedAt) })),
    submissions: student.submissions.map((row) => ({ assessmentId: row.assessmentId, submittedAt: new Date(row.submittedAt) })),
    plans: student.plans.map((plan) => ({ id: plan.id, status: plan.status, simNow: new Date(plan.simNow),
      sessions: plan.sessions.map((session) => ({ date: session.date, status: session.status, checkedAt: session.checkedAt ? new Date(session.checkedAt) : null })),
    })),
  }));
  return { now, students, topics, assessments, course };
}

type Facts = Awaited<ReturnType<typeof loadFacts>>;
type StudentFact = Facts["students"][number];

function riskInput(student: StudentFact, facts: Facts) {
  const plan = student.plans[0];
  return {
    course: { startDate: calendarDate(facts.course.startDate) },
    student: { lastSeenAt: student.lastSeenAt, escalatedAt: student.escalatedAt, availability: availabilitySchema.safeParse(student.availability).data ?? null },
    topics: facts.topics.map(({ id, week, estMinutes }) => ({ id, week, estMinutes })),
    assessments: facts.assessments.map(({ id, title, kind, dueDate, topicIds }) => ({ id, title, kind, dueDate: calendarDate(dueDate), topicIds })),
    progress: student.progress,
    submissions: student.submissions,
    plan: plan ? { simNow: plan.simNow, status: plan.status, sessions: plan.sessions } : null,
  };
}

function projectRisk(result: ReturnType<typeof scoreRisk>): PublicRisk {
  return {
    band: result.band,
    reasons: result.reasons.map(({ code, params }) => ({ code, params })),
    lastActivity: result.lastActivity?.toISOString() ?? null,
    escalated: result.escalated,
  };
}

function scoreStudent(student: StudentFact, facts: Facts) {
  return { student, result: scoreRisk(riskInput(student, facts), facts.now) };
}

function rowOf(student: StudentFact, result: ReturnType<typeof scoreRisk>, facts: Facts): AdvisorRow {
  const risk = projectRisk(result);
  return { id: student.id, name: student.name, language: student.language, risk, planStatus: student.plans[0]?.status ?? null,
    doneThroughWeek: doneThroughWeek(facts.topics, student.progress, facts.now), hasCurrentPlan: Boolean(student.plans[0]),
    escalated: risk.escalated, lastActive: risk.lastActivity };
}

export async function listStudents({ band = null }: { band?: AdvisorBand | null } = {}) {
  const facts = await loadFacts();
  const ranked = facts.students.map((student) => scoreStudent(student, facts));
  ranked.sort((a, b) => sortRisk(a.result, b.result));
  const rows = ranked.filter(({ result }) => !band || result.band === band).map(({ student, result }) => rowOf(student, result, facts));
  const plans = facts.students.flatMap((student) => student.plans);
  return {
    rows,
    metric: adherenceMetric(plans, facts.now),
    week: currentWeek(calendarDate(facts.now), calendarDate(facts.course.startDate)),
    totalWeeks: Math.max(0, ...facts.topics.map((topic) => topic.week)),
    counts: { all: ranked.length, high: ranked.filter(({ result }) => result.band === "high").length,
      medium: ranked.filter(({ result }) => result.band === "medium").length,
      low: ranked.filter(({ result }) => result.band === "low").length },
  };
}

export async function getStudentRiskView(studentId: string): Promise<PublicRisk | null> {
  const facts = await loadFacts(studentId);
  const student = facts.students[0];
  return student ? projectRisk(scoreRisk(riskInput(student, facts), facts.now)) : null;
}

export async function getStudentDetail(studentId: string): Promise<AdvisorDetail | null> {
  const facts = await loadFacts(studentId);
  const student = facts.students[0];
  if (!student) return null;
  const risk = scoreRisk(riskInput(student, facts), facts.now);
  const topicTitles = new Map(facts.topics.map((topic) => [topic.id, topic.title]));
  const assessmentTitles = new Map(facts.assessments.map((assessment) => [assessment.id, assessment.title]));
  const plan = student.plans[0];
  const effectiveSessions = plan?.sessions.filter((session) => session.date <= calendarDate(facts.now) && session.checkedAt && session.checkedAt <= facts.now) ?? [];
  const events: AdvisorEvent[] = [
    ...student.progress.filter((row) => row.completedAt <= facts.now).map((row) => ({ at: row.completedAt.toISOString(), type: "topicDone" as const, title: topicTitles.get(row.topicId) ?? row.topicId })),
    ...student.submissions.filter((row) => row.submittedAt <= facts.now).map((row) => ({ at: row.submittedAt.toISOString(), type: "submitted" as const, title: assessmentTitles.get(row.assessmentId) ?? row.assessmentId })),
    ...effectiveSessions.map((session) => ({ at: session.checkedAt!.toISOString(), type: session.status === "done" ? "done" as const : "sessionMissed" as const })),
    ...(student.lastSeenAt && student.lastSeenAt <= facts.now ? [{ at: student.lastSeenAt.toISOString(), type: "seen" as const }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  const today = calendarDate(facts.now);
  const missedSessions = plan?.sessions.filter((session) => (session.date < today && (session.status !== "done" || !session.checkedAt || session.checkedAt > facts.now)) || (session.date === today && session.status === "missed" && !!session.checkedAt && session.checkedAt <= facts.now)).map((session) => `${session.date}T12:00:00+01:00`).sort().reverse() ?? [];
  const [saved, draftsUsedThisWeek] = await Promise.all([
    getDb().outreach.findFirst({ where: { studentId }, orderBy: { createdAt: "desc" }, select: { id: true, message: true, nextStep: true, contacted: true, createdAt: true } }),
    getDb().outreach.count({ where: { studentId, createdAt: outreachWeekWindow(facts.now) } }),
  ]);
  return { ...rowOf(student, risk, facts), events, missedSessions, draftsUsedThisWeek, outreach: saved ? { ...saved, createdAt: saved.createdAt.toISOString() } : null };
}

export async function draftOutreach(studentId: string) {
  const facts = await loadFacts(studentId);
  const student = facts.students[0];
  if (!student) throw new AdvisorServiceError("STUDENT_NOT_FOUND");
  const existing = await getDb().outreach.findFirst({ where: { studentId, contacted: false }, orderBy: { createdAt: "desc" }, select: { id: true, message: true, nextStep: true, contacted: true, createdAt: true } });
  if (existing) return { ...existing, source: "saved" as const };
  if (await getDb().outreach.count({ where: { studentId, createdAt: outreachWeekWindow(facts.now) } }) >= 2) throw new AdvisorServiceError("OUTREACH_WEEKLY_LIMIT");
  const result = scoreRisk(riskInput(student, facts), facts.now);
  const context = {
    reasons: result.reasons.map(({ code, params }) => ({ code, params })),
    planStatus: student.plans[0]?.status ?? "none",
    language: student.language,
  };
  const generated = await outreach(context, undefined, studentId);
  const firstName = student.name.split(/\s+/)[0] ?? student.name;
  const top = result.reasons[0];
  const reason = top?.code === "ESCALATED" ? t("outreach.fallback.reason.escalated", student.language)
    : top ? formatRiskReason(top.code, top.params, student.language)
      : t("outreach.fallback.reason.none", student.language);
  const fallback = t("outreach.fallback.message", student.language, { firstName, reason });
  let message = generated?.output.message?.replaceAll("{firstName}", firstName).trim() || fallback;
  if (!message.toLocaleLowerCase().startsWith(firstName.toLocaleLowerCase())) message = `${firstName}, ${message}`;
  const nextStep = generated?.output.nextStep || t("outreach.fallback.nextStep", "en");
  const saved = await getDb().outreach.create({ data: { id: randomUUID(), studentId, message, nextStep, createdAt: facts.now }, select: { id: true, message: true, nextStep: true, contacted: true, createdAt: true } });
  return { ...saved, source: generated?.source ?? "fallback" as const };
}

export async function markContacted(outreachId: string, message: string) {
  const existing = await getDb().outreach.findUnique({ where: { id: outreachId }, select: { id: true } });
  if (!existing) throw new AdvisorServiceError("OUTREACH_NOT_FOUND");
  return getDb().outreach.update({ where: { id: outreachId }, data: { message: message.trim(), contacted: true }, select: { id: true, message: true, nextStep: true, contacted: true, createdAt: true } });
}
