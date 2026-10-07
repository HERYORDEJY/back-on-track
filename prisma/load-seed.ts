import type { getDb } from "../lib/db";
import { DEMO_START } from "../lib/clock";
import { getCourseSeed } from "./course";
import { getPersonaSeed } from "./personas";
import { generateCohort } from "./cohort";

/** Complete replacement seed, except the shared AiCache. Never import the CLI runner. */
export async function seedDatabase(db: ReturnType<typeof getDb>) {
  const { course, topics, assessments } = getCourseSeed();
  const personas = getPersonaSeed();
  const cohort = await generateCohort();
  await db.$transaction(async (tx) => {
    // Student replacement cascades these links; restore them with the stable seed ids.
    const cacheUses = await tx.aiCacheUse.findMany({ select: { key: true, studentId: true } });
    await tx.reminder.deleteMany();
    await tx.outreach.deleteMany();
    await tx.progress.deleteMany();
    await tx.submission.deleteMany();
    await tx.plan.deleteMany(); // cascades sessions and plan items
    await tx.student.deleteMany();
    await tx.assessment.deleteMany();
    await tx.topic.deleteMany();
    await tx.course.deleteMany();
    await tx.setting.deleteMany();
    await tx.course.create({ data: course });
    await tx.topic.createMany({ data: topics });
    await tx.assessment.createMany({ data: assessments });
    await tx.student.createMany({ data: [...personas.students, ...cohort.students] });
    if (cacheUses.length) await tx.aiCacheUse.createMany({ data: cacheUses });
    await tx.plan.createMany({ data: cohort.plans });
    await tx.planItem.createMany({ data: cohort.planItems });
    await tx.session.createMany({ data: cohort.sessions });
    await tx.progress.createMany({ data: [...personas.progress, ...cohort.progress] });
    await tx.submission.createMany({ data: [...personas.submissions, ...cohort.submissions] });
    await tx.reminder.createMany({ data: cohort.reminders });
    await tx.setting.create({ data: { key: "clock", value: DEMO_START } });
  }, { timeout: 120_000 });
  return { students: personas.students.length + cohort.students.length, topics: topics.length, recoveringPlans: cohort.plans.length };
}
