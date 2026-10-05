import dotenv from "dotenv";
import { createHash } from "node:crypto";
import { getDb } from "../lib/db";
import { DEMO_START } from "../lib/clock";
import { resetDemo } from "../lib/services/demo";
import { getPersonaSeed } from "../prisma/personas";

dotenv.config({ quiet: true });
const db = getDb();
const seed = getPersonaSeed();
const ids = seed.students.map(({ id }) => id);
const key = "__back_on_track_reset_verification__";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
let fixturesCommitted = false;
let cacheCreated = false;

async function retained() {
  const studentId = { notIn: ids };
  return db.$transaction(async (tx) => ({
    course: await tx.course.findMany({ orderBy: { id: "asc" } }),
    topic: await tx.topic.findMany({ orderBy: { id: "asc" } }),
    assessment: await tx.assessment.findMany({ orderBy: { id: "asc" } }),
    student: await tx.student.findMany({ where: { id: studentId }, orderBy: { id: "asc" } }),
    progress: await tx.progress.findMany({ where: { studentId }, orderBy: { id: "asc" } }),
    submission: await tx.submission.findMany({ where: { studentId }, orderBy: { id: "asc" } }),
    plan: await tx.plan.findMany({ where: { studentId }, orderBy: { id: "asc" } }),
    item: await tx.planItem.findMany({ where: { plan: { studentId } }, orderBy: { id: "asc" } }),
    session: await tx.session.findMany({ where: { plan: { studentId } }, orderBy: { id: "asc" } }),
    reminder: await tx.reminder.findMany({ where: { studentId }, orderBy: { id: "asc" } }),
    cache: await tx.aiCache.findMany({ orderBy: { key: "asc" } }),
    setting: await tx.setting.findMany({ where: { key: { not: "clock" } }, orderBy: { key: "asc" } }),
  }), { timeout: 60_000 });
}

async function restored() {
  const students = await db.student.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } });
  const progress = await db.progress.findMany({ where: { studentId: { in: ids } }, orderBy: { id: "asc" } });
  const submissions = await db.submission.findMany({ where: { studentId: { in: ids } }, orderBy: { id: "asc" } });
  const sorted = <T extends { id?: string }>(rows: T[]) => [...rows].sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
  // Normalize object property order without exposing fields in logs.
  const canonical = (value: unknown) => JSON.stringify(value, (_, entry) => entry && typeof entry === "object" && !Array.isArray(entry) ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry);
  if (canonical(students) !== canonical(sorted(seed.students)) || canonical(progress) !== canonical(sorted(seed.progress)) || canonical(submissions) !== canonical(sorted(seed.submissions))) throw new Error("Persona restoration failed");
  const remaining = await Promise.all([
    db.plan.count({ where: { studentId: { in: ids } } }),
    db.reminder.count({ where: { studentId: { in: ids } } }),
    db.outreach.count(),
    db.session.count({ where: { id: key } }),
    db.planItem.count({ where: { id: key } }),
  ]);
  if (remaining.some(Boolean) || (await db.setting.findUnique({ where: { key: "clock" } }))?.value !== DEMO_START) throw new Error("Cleanup/clock failed");
  return { students, progress, submissions };
}

try {
  if (await db.aiCache.findUnique({ where: { key } }) || await db.plan.findUnique({ where: { id: key } })) throw new Error("Fixture exists");
  await db.aiCache.create({ data: { key, response: { fixture: "reset-retention" } } });
  cacheCreated = true;
  const before = await retained();
  await db.$transaction(async (tx) => {
    await tx.student.update({ where: { id: "amaka" }, data: { goal: "Reset verification", context: "Temporary fixture", language: "en", hoursVary: true, availability: { mon: 120 }, lastSeenAt: new Date("2026-11-01T17:00:00Z"), escalatedAt: new Date("2026-11-01T17:00:00Z") } });
    await tx.plan.create({ data: { id: key, studentId: "amaka", version: 999999, isCurrent: true, simNow: new Date(DEMO_START), status: "fit", source: "fallback", requiredMin: 20, capacityMin: 20, summary: { en: "Fixture", pcm: "Fixture" }, warnings: [], unscheduled: [] } });
    await tx.planItem.create({ data: { id: key, planId: key, topicId: "t10", action: "keep", minutes: 20, basis: {}, rationale: {} } });
    await tx.session.create({ data: { id: key, planId: key, date: "2026-10-19", minutes: 20, pieces: [], status: "done", checkedAt: new Date(DEMO_START) } });
    await tx.reminder.create({ data: { id: key, studentId: "amaka", sessionId: key, at: new Date(DEMO_START), text: {} } });
    await tx.progress.create({ data: { id: key, studentId: "amaka", topicId: "t10", completedAt: new Date(DEMO_START), sessionId: key } });
    await tx.progress.delete({ where: { id: "amaka-progress-t01" } });
    await tx.progress.update({ where: { id: "amaka-progress-t02" }, data: { completedAt: new Date("2026-11-01T17:00:00Z"), sessionId: key } });
    await tx.submission.create({ data: { id: key, studentId: "amaka", assessmentId: "a2", submittedAt: new Date(DEMO_START) } });
    await tx.submission.delete({ where: { id: "zainab-submission-a1" } });
    await tx.outreach.create({ data: { id: key, studentId: "cohort-001", message: "Fixture", nextStep: "Fixture" } });
    await tx.setting.update({ where: { key: "clock" }, data: { value: "2026-11-01T17:00:00.000Z" } });
  });
  fixturesCommitted = true;
  await resetDemo();
  const first = await restored();
  await resetDemo();
  if (digest(first) !== digest(await restored()) || digest(before) !== digest(await retained())) throw new Error("Idempotence/retention failed");
  console.log("Simulated demo reset verified: exact persona restoration, cascaded cleanup, all outreach cleared, clock restored; two identical resets preserve cohort study records and AiCache.");
} catch {
  console.error("Demo reset verification failed; credentials and database contents omitted.");
  process.exitCode = 1;
} finally {
  if (fixturesCommitted) {
    try { await resetDemo(); }
    catch { console.error("Could not confirm persona fixture cleanup; retry demo reset."); process.exitCode = 1; }
  }
  if (cacheCreated) await db.aiCache.deleteMany({ where: { key } }).catch(() => { console.error("Could not confirm isolated cache-fixture cleanup."); process.exitCode = 1; });
  await db.$disconnect();
}
