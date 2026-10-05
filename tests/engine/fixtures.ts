import type { Availability, PlanInput, Topic, TriageOutput } from "../../lib/engine/types";
import { getCourseSeed } from "../../prisma/course";
import { getPersonaSeed } from "../../prisma/personas";
import { calendarDate } from "../../lib/engine/time";

export const hours = (minutes: number): Availability => ({ mon: minutes, tue: minutes, wed: minutes, thu: minutes, fri: minutes, sat: minutes, sun: minutes });
export const topic = (id: string, order: number, extra: Partial<Topic> = {}): Topic => ({ id, title: id, order, week: 1, estMinutes: 40, examWeight: 1 / 3, prereqIds: [], ...extra });
export function input(extra: Partial<PlanInput> = {}): PlanInput {
  return { now: new Date("2026-10-19T17:00:00Z"), course: { startDate: "2026-09-07", examDate: "2026-10-20" }, topics: [topic("a", 1, { examWeight: 0.6 }), topic("b", 2, { examWeight: 0.3 }), topic("c", 3, { examWeight: 0.1 })], assessments: [], availability: hours(120), progress: [], student: {}, ...extra };
}
export const output = (items: TriageOutput["items"] = []): TriageOutput => ({ items, summary: { en: "A plan for your time.", pcm: "Plan wey fit your time." } });
export function personaInput(id: string): PlanInput {
  const { course, topics, assessments } = getCourseSeed();
  const { students, progress } = getPersonaSeed();
  const student = students.find((student) => student.id === id)!;
  return {
    now: new Date("2026-10-19T17:00:00Z"), course: { startDate: calendarDate(course.startDate), examDate: calendarDate(course.examDate) }, topics,
    assessments: assessments.map((assessment) => ({ ...assessment, dueDate: calendarDate(assessment.dueDate) })),
    availability: student.availability, progress: progress.filter((row) => row.studentId === id),
    student: { goal: student.goal, context: student.context },
  };
}
