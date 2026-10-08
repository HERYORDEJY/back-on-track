import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getNow, calendarDate } from "@/lib/clock";
import { buildPlan } from "@/lib/engine/plan";
import { effectiveStatus, needsReplan } from "@/lib/engine/time";
import { buildStops } from "@/lib/engine/display";
import type { PlanInput, PlanResult, TriageFn } from "@/lib/engine/types";
import { triage } from "@/lib/ai/client";
import { Localized } from "@/lib/ai/schemas";
import { formatDate } from "@/lib/i18n";
import type { PlanView, SessionView } from "@/lib/types";
import type { Prisma } from "@/lib/generated/prisma/client";

const availabilitySchema = z.strictObject({ mon: z.number().int().min(0), tue: z.number().int().min(0), wed: z.number().int().min(0), thu: z.number().int().min(0), fri: z.number().int().min(0), sat: z.number().int().min(0), sun: z.number().int().min(0) });
const piecesSchema = z.array(z.strictObject({ topicId: z.string(), minutes: z.number().int(), isLast: z.boolean() }));
const unscheduledSchema = z.array(z.strictObject({ topicId: z.string(), minutes: z.number().int() }));

export class PlanServiceError extends Error {
  constructor(public readonly code: "STUDENT_NOT_FOUND" | "AVAILABILITY_REQUIRED") { super(code); }
}

export class SessionServiceError extends Error {
  constructor(public readonly code: "SESSION_NOT_FOUND" | "SESSION_LOCKED") { super(code); }
}

export function redactPrivateText(text: string | null | undefined, name: string, limit: number): string | undefined {
  if (!text) return undefined;
  let value = text;
  value = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  value = value.replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, "[phone]");
  for (const part of name.split(/\s+/).filter((part) => part.length >= 2)) {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    value = value.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "[name]");
  }
  return value.slice(0, limit);
}

export function withPlanBudget(call: (context: Parameters<TriageFn>[0], violations: Parameters<TriageFn>[1], signal: AbortSignal) => ReturnType<TriageFn>, budgetMs = 20_000, elapsed = () => performance.now()): TriageFn {
  const started = elapsed();
  return async (context, violations) => {
    const remaining = budgetMs - (elapsed() - started);
    if (remaining <= 0) return null;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        call(context, violations, controller.signal),
        new Promise<null>((resolve) => { timer = setTimeout(() => { controller.abort(); resolve(null); }, remaining); }),
      ]);
    } catch { return null; }
    finally { if (timer) clearTimeout(timer); }
  };
}

function dateLabel(date: string) {
  const value = new Date(`${date}T12:00:00+01:00`);
  return { en: formatDate(value, "en"), pcm: formatDate(value, "pcm") };
}

function reminderLabel(at: Date) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
  return { en: `${formatDate(at, "en")} ${time}`, pcm: `${formatDate(at, "pcm")} ${time}` };
}

function weekStart(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

function daysBetween(first: string, second: string): number {
  return Math.floor((Date.parse(`${second}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000);
}

export async function savePlanInTransaction(tx: Prisma.TransactionClient, studentId: string, now: Date, result: PlanResult): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Student" WHERE "id" = ${studentId} FOR UPDATE`;
  const latest = await tx.plan.findFirst({ where: { studentId }, orderBy: { version: "desc" }, select: { version: true } });
  await tx.plan.updateMany({ where: { studentId, isCurrent: true }, data: { isCurrent: false } });
  const planId = randomUUID();
  await tx.plan.create({ data: {
    id: planId, studentId, version: (latest?.version ?? 0) + 1, isCurrent: true, simNow: now,
    status: result.status, source: result.source, requiredMin: result.requiredMin, capacityMin: result.capacityMin,
    summary: result.summary, changeSummary: result.changeSummary, warnings: result.warnings,
    focusAssessmentId: result.focusAssessmentId, focusDueDate: result.focusDueDate ? new Date(`${result.focusDueDate}T00:00:00+01:00`) : null,
    unscheduled: result.unscheduled,
  } });
  if (result.decisions.length) await tx.planItem.createMany({ data: result.decisions.map((item) => ({ id: randomUUID(), planId, topicId: item.topicId, action: item.action, minutes: item.minutes, basis: item.basis, rationale: item.rationale })) });
  if (result.sessions.length) {
    const rows = result.sessions.map((session) => ({ id: randomUUID(), planId, date: session.date, minutes: session.minutes, pieces: session.pieces, reminder: session.reminder }));
    await tx.session.createMany({ data: rows.map((row) => ({ id: row.id, planId: row.planId, date: row.date, minutes: row.minutes, pieces: row.pieces })) });
    await tx.reminder.createMany({ data: rows.map(({ id: sessionId, reminder }) => ({ id: randomUUID(), studentId, sessionId, at: reminder.at, text: reminder.text })) });
  }
  await tx.student.update({ where: { id: studentId }, data: { lastSeenAt: now, escalatedAt: result.escalate ? now : null } });
}

export async function getPlanView(studentId: string): Promise<PlanView> {
  const db = getDb();
  const now = await getNow();
  const student = await db.student.findUnique({ where: { id: studentId }, include: { plans: { where: { isCurrent: true }, include: { items: { include: { topic: true } }, sessions: { orderBy: { date: "asc" }, include: { reminders: true } } }, take: 1 } } });
  if (!student) throw new PlanServiceError("STUDENT_NOT_FOUND");
  await db.student.update({ where: { id: studentId }, data: { lastSeenAt: now } });
  const plan = student.plans[0];
  const availability = availabilitySchema.safeParse(student.availability);
  const today = calendarDate(now);
  const studentView = { id: student.id, name: student.name, goal: student.goal, context: student.context, language: student.language, availability: availability.success ? availability.data : null, hoursVary: student.hoursVary, isSimulated: student.isSimulated };
  if (!plan || !availability.success) return { today, student: studentView, plan: null };
  if (needsReplan({ status: plan.status, focusDueDate: plan.focusDueDate ? calendarDate(plan.focusDueDate) : undefined, sessions: plan.sessions }, now)) {
    return createPlan(studentId);
  }
  const [history, course] = await Promise.all([
    db.plan.findMany({ where: { studentId }, orderBy: { version: "asc" }, select: {
      version: true, simNow: true, isCurrent: true, status: true, unscheduled: true,
      sessions: { select: { id: true, date: true, minutes: true, pieces: true, status: true, checkedAt: true } },
    } }),
    db.course.findUnique({ where: { id: "smpl201" }, select: {
      examDate: true, topics: { select: { id: true, title: true } },
      assessments: { select: { id: true, title: true, kind: true, dueDate: true, weight: true } },
    } }),
  ]);
  if (!course) throw new Error("Sample course missing");
  const titleById = new Map(plan.items.map(({ topic }) => [topic.id, topic.title]));
  const sessions: SessionView[] = plan.sessions.map((session) => ({
    id: session.id, date: session.date, dateLabel: dateLabel(session.date), minutes: session.minutes,
    status: effectiveStatus(session, now), editable: session.date === today,
    pieces: piecesSchema.parse(session.pieces).map((piece) => ({ ...piece, title: titleById.get(piece.topicId) ?? piece.topicId })),
  }));
  const monday = weekStart(today);
  const nextMonday = new Date(Date.parse(`${monday}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const pendingIds = new Set(sessions.filter((session) => session.status === "pending").map((session) => session.id));
  const reminders = plan.sessions.flatMap((session) => session.reminders.filter(() => pendingIds.has(session.id)).map((reminder) => ({
    id: reminder.id, atLabel: reminderLabel(reminder.at), text: Localized.parse(reminder.text),
  })));
  const items = plan.items.map((item) => ({ topicId: item.topicId, title: item.topic.title, action: item.action, minutes: item.minutes, estimateMin: item.topic.estMinutes, rationale: Localized.parse(item.rationale), basis: Localized.parse(item.basis), sourceUrl: z.array(z.object({ url: z.string() })).parse(item.topic.sourceRefs)[0]?.url ?? null }));
  return { today, student: studentView, plan: {
    id: plan.id, version: plan.version, status: plan.status, source: plan.source, summary: Localized.parse(plan.summary),
    changeSummary: plan.changeSummary ? Localized.parse(plan.changeSummary) : null,
    requiredMin: plan.requiredMin, capacityMin: plan.capacityMin,
    scheduledMin: sessions.reduce((sum, session) => sum + session.minutes, 0),
    plannedMin: items.reduce((sum, item) => sum + item.minutes, 0),
    focusDueDate: plan.focusDueDate ? calendarDate(plan.focusDueDate) : null,
    focusDateLabel: plan.focusDueDate ? dateLabel(calendarDate(plan.focusDueDate)) : null,
    warnings: z.array(Localized).parse(plan.warnings),
    unscheduled: unscheduledSchema.parse(plan.unscheduled).map((item) => ({ ...item, title: titleById.get(item.topicId) ?? item.topicId })),
    items, sessions, featuredSession: sessions.find((session) => session.date === today) ?? sessions.find((session) => session.date > today && session.status === "pending") ?? null,
    weekSessions: sessions.filter((session) => session.date >= monday && session.date < nextMonday),
    counts: { kept: items.filter((item) => item.action === "keep").length, shortened: items.filter((item) => item.action === "compress_light" || item.action === "compress_heavy").length, skipped: items.filter((item) => item.action === "skip").length },
    weeklyHoursDue: student.hoursVary && daysBetween(calendarDate(plan.simNow), today) >= 7,
    reminders,
    topicTitles: Object.fromEntries(course.topics.map((topic) => [topic.id, topic.title])),
    stops: buildStops({ now, availability: availability.data, examDate: calendarDate(course.examDate),
      assessments: course.assessments.map((assessment) => ({ id: assessment.id, title: assessment.title, kind: assessment.kind, dueDate: calendarDate(assessment.dueDate), weight: assessment.weight })),
      plans: history.map((previous) => ({ version: previous.version, simNow: previous.simNow, isCurrent: previous.isCurrent, status: previous.status,
        unscheduledCount: unscheduledSchema.parse(previous.unscheduled).length,
        sessions: previous.sessions.map((session) => ({ ...session, pieces: piecesSchema.parse(session.pieces) })),
      })),
    }),
  } };
}

export async function createPlan(studentId: string): Promise<PlanView> {
  const db = getDb();
  const now = await getNow();
  const [student, course] = await Promise.all([
    db.student.findUnique({ where: { id: studentId }, include: { progress: true, plans: { orderBy: { version: "desc" }, take: 1, include: { items: true, sessions: { orderBy: { date: "asc" } } } } } }),
    db.course.findUnique({ where: { id: "smpl201" }, include: { topics: { orderBy: { order: "asc" } }, assessments: { orderBy: { dueDate: "asc" } } } }),
  ]);
  if (!student) throw new PlanServiceError("STUDENT_NOT_FOUND");
  const availability = availabilitySchema.safeParse(student.availability);
  if (!availability.success || Math.max(...Object.values(availability.data)) < 20) throw new PlanServiceError("AVAILABILITY_REQUIRED");
  if (!course) throw new Error("Sample course missing");
  const input: PlanInput = {
    now, course: { startDate: calendarDate(course.startDate), examDate: calendarDate(course.examDate) },
    topics: course.topics.map(({ id, title, week, order, estMinutes, examWeight, prereqIds }) => ({ id, title, week, order, estMinutes, examWeight, prereqIds })),
    assessments: course.assessments.map(({ id, title, kind, dueDate, weight, topicIds }) => ({ id, title, kind, dueDate: calendarDate(dueDate), weight, topicIds })),
    availability: availability.data,
    progress: student.progress.map(({ topicId, completedAt }) => ({ topicId, completedAt })),
    student: { goal: redactPrivateText(student.goal, student.name, 80), context: redactPrivateText(student.context, student.name, 120) },
    previous: student.plans[0] ? {
      decisions: student.plans[0].items.map((item) => ({ topicId: item.topicId, action: item.action, minutes: item.minutes, basis: Localized.parse(item.basis), rationale: Localized.parse(item.rationale) })),
      sessions: student.plans[0].sessions.map((session) => ({ date: session.date, topicIds: piecesSchema.parse(session.pieces).map((piece) => piece.topicId) })),
    } : undefined,
  };
  const result = await buildPlan(input, withPlanBudget((context, violations, signal) => triage(context, violations, signal, studentId)));
  await db.$transaction((tx) => savePlanInTransaction(tx, studentId, now, result), { timeout: 30_000 });
  return getPlanView(studentId);
}

export async function checkInSession(sessionId: string, status: "done" | "missed", offlineSessionDate?: string): Promise<PlanView> {
  const db = getDb();
  const now = await getNow();
  const studentId = await db.$transaction((tx) => checkInSessionInTransaction(tx, sessionId, status, now, offlineSessionDate));
  return getPlanView(studentId);
}

export async function checkInSessionInTransaction(tx: Prisma.TransactionClient, sessionId: string, status: "done" | "missed", now: Date, offlineSessionDate?: string): Promise<string> {
  const today = calendarDate(now);
  const candidate = await tx.session.findUnique({ where: { id: sessionId }, include: { plan: true } });
  if (!candidate) throw new SessionServiceError("SESSION_NOT_FOUND");
  const studentId = candidate.plan.studentId;
  // The student lock also serialises plan replacement and check-ins.
  const students = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Student" WHERE "id" = ${studentId} FOR UPDATE`;
  if (!students[0]) throw new SessionServiceError("SESSION_NOT_FOUND");
  const session = await tx.session.findUnique({ where: { id: sessionId }, include: { plan: true } });
  if (!session || session.plan.studentId !== studentId) throw new SessionServiceError("SESSION_NOT_FOUND");
  const delayedOffline = offlineSessionDate === session.date && session.date < today;
  if (!session.plan.isCurrent || (session.date !== today && !delayedOffline)) throw new SessionServiceError("SESSION_LOCKED");
  if (effectiveStatus(session, now) !== status) {
    if (status === "missed") {
      await tx.progress.deleteMany({ where: { studentId, sessionId } });
    } else {
      const lastPieces = piecesSchema.parse(session.pieces).filter((piece) => piece.isLast);
      if (lastPieces.length) await tx.progress.createMany({ data: lastPieces.map((piece) => ({ id: randomUUID(), studentId, topicId: piece.topicId, completedAt: now, sessionId })), skipDuplicates: true });
    }
    await tx.session.update({ where: { id: sessionId }, data: { status, checkedAt: now } });
  }
  await tx.student.update({ where: { id: studentId }, data: { lastSeenAt: now } });
  return studentId;
}
