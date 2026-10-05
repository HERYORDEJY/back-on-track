import type { Prisma } from "../lib/generated/prisma/client";
import { getCourseSeed } from "./course";

const definitions = [
  { id: "amaka", name: "Amaka Okafor", context: "Nurse in Lagos, two children, night shifts", goal: "Promotion to senior nursing officer", language: "pcm", doneWeeks: 3, lastSeen: "2026-09-27", availability: { mon: 40, tue: 40, wed: 40, thu: 40, fri: 40, sat: 0, sun: 90 } },
  { id: "tunde", name: "Tunde Adeyemi", context: "Civil servant in Abuja", goal: "A policy analyst role", language: "en", doneWeeks: 1, lastSeen: "2026-09-13", availability: { mon: 20, tue: 20, wed: 20, thu: 20, fri: 20, sat: 20, sun: 20 } },
  { id: "zainab", name: "Zainab Bello", context: "Software developer in Kano", goal: "A move into product management", language: "en", doneWeeks: 5, lastSeen: "2026-10-17", availability: { mon: 60, tue: 60, wed: 60, thu: 60, fri: 60, sat: 60, sun: 60 } },
] as const;

/** Academic records only; all three personas start without application plans. */
export function getPersonaSeed() {
  const { course, topics } = getCourseSeed();
  const students = definitions.map((student) => {
    const availability: Record<keyof typeof student.availability, number> = { ...student.availability };
    return {
      id: student.id, name: student.name, context: student.context, goal: student.goal, language: student.language,
      availability, isSimulated: true, segment: null, hoursVary: false,
      lastSeenAt: new Date(`${student.lastSeen}T21:00:00+01:00`), escalatedAt: null,
    } satisfies Prisma.StudentCreateManyInput;
  });
  const progress = definitions.flatMap((student) => topics.filter(({ week }) => week <= student.doneWeeks).map((topic) => {
    // Tuesday, Thursday and Sunday at 21:00 Lagos in the topic's demo week.
    const offset = (topic.week - 1) * 7 + [1, 3, 6][(topic.order - 1) % 3];
    const completedAt = new Date(course.startDate.getTime() + (offset * 24 + 21) * 60 * 60 * 1000);
    return { id: `${student.id}-progress-${topic.id}`, studentId: student.id, topicId: topic.id, completedAt, sessionId: null } satisfies Prisma.ProgressCreateManyInput;
  }));
  const submissions = [{
    id: "zainab-submission-a1", studentId: "zainab", assessmentId: "a1", submittedAt: new Date("2026-10-02T21:00:00+01:00"),
  } satisfies Prisma.SubmissionCreateManyInput];
  return { students, progress, submissions };
}
