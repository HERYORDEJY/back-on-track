import dotenv from "dotenv";
import { createHash } from "node:crypto";
import { getDb } from "../lib/db";
import { seedDatabase } from "../prisma/load-seed";
import { DEMO_START } from "../lib/clock";

dotenv.config({ quiet: true });
const db = getDb();
const fixtureKey = "__back_on_track_seed_verification__";
let fixtureCreated = false;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function snapshot() {
  return await db.$transaction(async (tx) => ({
    course: await tx.course.findMany({ orderBy: { id: "asc" } }),
    topic: await tx.topic.findMany({ orderBy: { id: "asc" } }),
    assessment: await tx.assessment.findMany({ orderBy: { id: "asc" } }),
    student: await tx.student.findMany({ orderBy: { id: "asc" } }),
    progress: await tx.progress.findMany({ orderBy: { id: "asc" } }),
    submission: await tx.submission.findMany({ orderBy: { id: "asc" } }),
    plan: await tx.plan.findMany({ orderBy: { id: "asc" } }),
    item: await tx.planItem.findMany({ orderBy: { id: "asc" } }),
    session: await tx.session.findMany({ orderBy: { id: "asc" } }),
    reminder: await tx.reminder.findMany({ orderBy: { id: "asc" } }),
    outreach: await tx.outreach.findMany({ orderBy: { id: "asc" } }),
    setting: await tx.setting.findMany({ orderBy: { key: "asc" } }),
  }), { timeout: 60_000 });
}
try {
  if (await db.aiCache.findUnique({ where: { key: fixtureKey } })) throw new Error("Verification key already exists");
  await db.aiCache.create({ data: { key: fixtureKey, response: { fixture: "cache-retention" }, createdAt: new Date("2026-10-05T00:00:00Z") } });
  fixtureCreated = true;
  await db.aiCacheUse.create({ data: { key: fixtureKey, studentId: "amaka" } });
  const cacheBefore = await db.aiCache.findMany({ orderBy: { key: "asc" } });
  await seedDatabase(db);
  const first = await snapshot();
  await seedDatabase(db);
  const second = await snapshot();
  const cacheAfter = await db.aiCache.findMany({ orderBy: { key: "asc" } });
  if (digest(first) !== digest(second) || digest(cacheBefore) !== digest(cacheAfter)) throw new Error("Seed identity/cache retention failed");
  if (!await db.aiCacheUse.findUnique({ where: { key_studentId: { key: fixtureKey, studentId: "amaka" } } })) throw new Error("Seed cache ownership retention failed");
  if (second.student.length !== 303 || second.topic.length !== 36 || second.plan.length !== 30 || second.setting.find(({ key }) => key === "clock")?.value !== DEMO_START) throw new Error("Seed counts/clock failed");
  if (second.student.some(({ isSimulated }) => !isSimulated) || second.plan.some(({ source }) => source !== "fallback")) throw new Error("Seed provenance failed");
  console.log(`Simulated seed verification passed: two runs produce identical logical rows; ${second.student.length} students, ${second.plan.length} fallback plans, ${second.session.length} sessions; AiCache and ownership retained, clock restored.`);
} catch {
  console.error("Seed verification failed; credentials, cache contents and database details omitted.");
  process.exitCode = 1;
} finally {
  if (fixtureCreated) {
    try { await db.aiCache.deleteMany({ where: { key: fixtureKey } }); }
    catch { console.error("Could not confirm verification-cache fixture cleanup."); process.exitCode = 1; }
  }
  await db.$disconnect();
}
