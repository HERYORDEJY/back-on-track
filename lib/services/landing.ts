import { getDb } from "@/lib/db";
import { getNow, calendarDate } from "@/lib/clock";
import { doneThroughWeek } from "@/lib/engine/display";
import { currentWeek } from "@/lib/engine/time";

const personaIds = ["amaka", "tunde", "zainab"] as const;

export async function getLandingProgress() {
  const db = getDb();
  const [now, course, progress] = await Promise.all([
    getNow(),
    db.course.findUnique({ where: { id: "smpl201" }, select: { startDate: true, topics: { select: { id: true, week: true } } } }),
    db.progress.findMany({ where: { studentId: { in: [...personaIds] } }, select: { studentId: true, topicId: true, completedAt: true } }),
  ]);
  if (!course) throw new Error("Sample course missing");
  const totalWeeks = Math.max(0, ...course.topics.map((topic) => topic.week));
  return {
    week: currentWeek(calendarDate(now), calendarDate(course.startDate)), totalWeeks,
    people: Object.fromEntries(personaIds.map((id) => [id, doneThroughWeek(course.topics, progress.filter((item) => item.studentId === id), now)])) as Record<(typeof personaIds)[number], number>,
  };
}
