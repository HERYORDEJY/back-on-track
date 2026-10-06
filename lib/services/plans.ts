import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getNow, calendarDate } from "@/lib/clock";
import { buildPlan } from "@/lib/engine/plan";
import type { Availability, PlanInput, PlanResult, TriageFn } from "@/lib/engine/types";
import { triage } from "@/lib/ai/client";
import { Localized } from "@/lib/ai/schemas";
import type { Language } from "@/lib/i18n";
import type { Prisma } from "@/lib/generated/prisma/client";

const availabilitySchema = z.strictObject({ mon: z.number().int().min(0), tue: z.number().int().min(0), wed: z.number().int().min(0), thu: z.number().int().min(0), fri: z.number().int().min(0), sat: z.number().int().min(0), sun: z.number().int().min(0) });
const piecesSchema = z.array(z.strictObject({ topicId: z.string(), minutes: z.number().int(), isLast: z.boolean() }));
const unscheduledSchema = z.array(z.strictObject({ topicId: z.string(), minutes: z.number().int() }));

export class PlanServiceError extends Error {
  constructor(public readonly code: "STUDENT_NOT_FOUND" | "AVAILABILITY_REQUIRED") { super(code); }
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

export type PlanView = {
  today: string;
  student: { id: string; name: string; goal: string | null; language: Language; availability: Availability | null };
  plan: null | {
    status: PlanResult["status"]; source: PlanResult["source"]; summary: z.infer<typeof Localized>;
    requiredMin: number; capacityMin: number; focusDueDate: string | null;
    warnings: z.infer<typeof Localized>[]; unscheduled: { topicId: string; minutes: number; title: string }[];
    items: { topicId: string; title: string; action: string; minutes: number; rationale: z.infer<typeof Localized>; basis: z.infer<typeof Localized>; sourceUrl: string | null }[];
    sessions: { date: string; minutes: number; pieces: { topicId: string; title: string; minutes: number; isLast: boolean }[] }[];
  };
};

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
    await tx.session.createMany({ data: rows.map(({ id, planId, date, minutes, pieces }) => ({ id, planId, date, minutes, pieces })) });
    await tx.reminder.createMany({ data: rows.map(({ id: sessionId, reminder }) => ({ id: randomUUID(), studentId, sessionId, at: reminder.at, text: reminder.text })) });
  }
  await tx.student.update({ where: { id: studentId }, data: { lastSeenAt: now, escalatedAt: result.escalate ? now : null } });
}

export async function getPlanView(studentId: string): Promise<PlanView> {
  const db = getDb();
  const now = await getNow();
  const student = await db.student.findUnique({ where: { id: studentId }, include: { plans: { where: { isCurrent: true }, include: { items: { include: { topic: true } }, sessions: { orderBy: { date: "asc" } } }, take: 1 } } });
  if (!student) throw new PlanServiceError("STUDENT_NOT_FOUND");
  await db.student.update({ where: { id: studentId }, data: { lastSeenAt: now } });
  const plan = student.plans[0];
  const availability = availabilitySchema.safeParse(student.availability);
  const studentView = { id: student.id, name: student.name, goal: student.goal, language: student.language, availability: availability.success ? availability.data : null };
  if (!plan || !availability.success) return { today: calendarDate(now), student: studentView, plan: null };
  const titleById = new Map(plan.items.map(({ topic }) => [topic.id, topic.title]));
  return { today: calendarDate(now), student: studentView, plan: {
    status: plan.status, source: plan.source, summary: Localized.parse(plan.summary), requiredMin: plan.requiredMin, capacityMin: plan.capacityMin,
    focusDueDate: plan.focusDueDate ? calendarDate(plan.focusDueDate) : null,
    warnings: z.array(Localized).parse(plan.warnings),
    unscheduled: unscheduledSchema.parse(plan.unscheduled).map((item) => ({ ...item, title: titleById.get(item.topicId) ?? item.topicId })),
    items: plan.items.map((item) => ({ topicId: item.topicId, title: item.topic.title, action: item.action, minutes: item.minutes, rationale: Localized.parse(item.rationale), basis: Localized.parse(item.basis), sourceUrl: z.array(z.object({ url: z.string() })).parse(item.topic.sourceRefs)[0]?.url ?? null })),
    sessions: plan.sessions.map((session) => ({ date: session.date, minutes: session.minutes, pieces: piecesSchema.parse(session.pieces).map((piece) => ({ ...piece, title: titleById.get(piece.topicId) ?? piece.topicId })) })),
  } };
}

export async function createPlan(studentId: string): Promise<PlanView> {
  const db = getDb();
  const now = await getNow();
  const [student, course] = await Promise.all([
    db.student.findUnique({ where: { id: studentId }, include: { progress: true } }),
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
  };
  const result = await buildPlan(input, withPlanBudget(triage));
  await db.$transaction((tx) => savePlanInTransaction(tx, studentId, now, result), { timeout: 30_000 });
  return getPlanView(studentId);
}
