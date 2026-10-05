import dotenv from "dotenv";
import { getDb } from "../lib/db";

dotenv.config({ quiet: true });
const db = getDb();
const rollback = new Error("ROLLBACK_VERIFICATION_FIXTURES");
try {
  await db.$transaction(async (tx) => {
    const courseId = "__verify_course";
    const studentId = "__verify_student";
    const topicId = "__verify_topic";
    const planId = "__verify_plan";
    const sessionId = "__verify_session";
    const now = new Date("2026-10-19T17:00:00.000Z");
    await tx.course.create({ data: { id: courseId, code: "VERIFY", title: "Verification fixture", startDate: now, examDate: now } });
    await tx.topic.create({ data: { id: topicId, courseId, week: 1, order: 1, title: "Fixture", estMinutes: 20, examWeight: 1, prereqIds: [], sourceRefs: [] } });
    await tx.student.create({ data: { id: studentId, name: "Verification fixture", language: "en", isSimulated: true } });
    await tx.plan.create({ data: { id: planId, studentId, version: 1, isCurrent: true, simNow: now, status: "fit", source: "fallback", requiredMin: 20, capacityMin: 20, summary: { en: "Fixture", pcm: "Fixture" }, warnings: [], unscheduled: [] } });
    await tx.session.create({ data: { id: sessionId, planId, date: "2026-10-19", minutes: 20, pieces: [{ topicId, minutes: 20, isLast: true }] } });
    await tx.progress.create({ data: { id: "__verify_progress", studentId, topicId, sessionId, completedAt: now } });
    await tx.session.delete({ where: { id: sessionId } });
    const progress = await tx.progress.findUniqueOrThrow({ where: { studentId_topicId: { studentId, topicId } } });
    if (progress.sessionId !== null || progress.completedAt.getTime() !== now.getTime()) throw new Error("PROVENANCE_RETENTION_FAILED");
    throw rollback;
  }, { timeout: 30_000 });
} catch (error) {
  if (error !== rollback) {
    console.error("Database verification failed; credentials and database details omitted.");
    process.exitCode = 1;
  } else {
    const count = await db.student.count({ where: { id: "__verify_student" } });
    if (count !== 0) { console.error("Verification fixtures were not rolled back."); process.exitCode = 1; }
    else console.log("Database verification passed: session deletion retains progress, clears provenance; fixtures rolled back.");
  }
} finally { await db.$disconnect(); }
