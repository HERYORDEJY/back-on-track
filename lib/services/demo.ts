import { getDb } from "@/lib/db";
import { DEMO_START, ClockError } from "@/lib/clock";
import { getPersonaSeed } from "@/prisma/personas";

/** Restore only scripted learners; the cohort and shared AI cache survive. */
export async function resetDemo(): Promise<{ now: string }> {
  const seed = getPersonaSeed();
  const studentId = { in: seed.students.map(({ id }) => id) };
  return getDb().$transaction(async (tx) => {
    // Serialize resets with all clock advances; hold the lock through restoration.
    const rows = await tx.$queryRaw<{ value: string }[]>`SELECT "value" FROM "Setting" WHERE "key" = 'clock' FOR UPDATE`;
    if (!rows[0]) throw new ClockError("CLOCK_NOT_INITIALISED");
    await tx.outreach.deleteMany();
    await tx.reminder.deleteMany({ where: { studentId } });
    await tx.progress.deleteMany({ where: { studentId } });
    await tx.submission.deleteMany({ where: { studentId } });
    await tx.plan.deleteMany({ where: { studentId } });
    for (const student of seed.students) {
      await tx.student.upsert({ where: { id: student.id }, create: student, update: student });
    }
    await tx.progress.createMany({ data: seed.progress });
    await tx.submission.createMany({ data: seed.submissions });
    await tx.setting.update({ where: { key: "clock" }, data: { value: DEMO_START } });
    return { now: DEMO_START };
  }, { timeout: 30_000 });
}
