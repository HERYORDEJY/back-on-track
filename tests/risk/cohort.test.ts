import { expect, it } from "vitest";
import { generateCohort } from "../../prisma/cohort";
import { getCourseSeed } from "../../prisma/course";
import { calendarDate } from "../../lib/engine/time";
import type { Availability } from "../../lib/engine/types";
import { scoreRisk, type RiskInput } from "../../lib/risk/score";

it("keeps most on-track students low and gone-quiet students high at demo start and Week 10", async () => {
  const cohort = await generateCohort();
  const course = getCourseSeed();
  const topics = course.topics.map(({ id, week, estMinutes }) => ({ id, week, estMinutes }));
  const assessments = course.assessments.map(({ id, title, dueDate, topicIds }) => ({ id, title, dueDate, topicIds }));
  const groups = new Map<string, { startLow: number; startHigh: number; week10Low: number; total: number }>();
  const demo = new Date("2026-10-19T18:00:00+01:00");
  const week10 = new Date("2026-11-09T18:00:00+01:00");

  for (const student of cohort.students) {
    const plan = cohort.plans.find(({ studentId }) => studentId === student.id);
    const input: RiskInput = {
      student: { lastSeenAt: student.lastSeenAt ? new Date(student.lastSeenAt) : null, escalatedAt: student.escalatedAt ? new Date(student.escalatedAt) : null, availability: student.availability as Availability },
      course: { startDate: calendarDate(course.course.startDate) }, topics, assessments,
      progress: cohort.progress.filter(({ studentId }) => studentId === student.id).map(({ topicId, completedAt }) => ({ topicId, completedAt: new Date(completedAt) })),
      submissions: cohort.submissions.filter(({ studentId }) => studentId === student.id).map(({ assessmentId, submittedAt }) => ({ assessmentId, submittedAt: new Date(submittedAt) })),
      plan: plan ? { simNow: new Date(plan.simNow), status: plan.status, sessions: cohort.sessions.filter(({ planId }) => planId === plan.id).map(({ date, status, checkedAt }) => ({ date, status: status ?? "pending", checkedAt: checkedAt ? new Date(checkedAt) : null })) } : null,
    };
    const segment = student.segment;
    const counts = groups.get(segment) ?? { startLow: 0, startHigh: 0, week10Low: 0, total: 0 };
    counts.total++;
    if (scoreRisk(input, demo).band === "low") counts.startLow++;
    if (scoreRisk(input, demo).band === "high") counts.startHigh++;
    if (scoreRisk(input, week10).band === "low") counts.week10Low++;
    groups.set(segment, counts);
  }

  const onTrack = groups.get("on_track")!;
  const goneQuiet = groups.get("gone_quiet")!;
  expect(onTrack.startLow).toBeGreaterThan(onTrack.total / 2);
  expect(onTrack.week10Low).toBeGreaterThan(onTrack.total / 2);
  expect(goneQuiet.startHigh).toBeGreaterThan(goneQuiet.total / 2);
});
