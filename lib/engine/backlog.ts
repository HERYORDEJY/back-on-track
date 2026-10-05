import type { PlanInput } from "./types";
import { calendarDate, currentWeek } from "./time";

export function getWork(input: PlanInput) {
  const today = calendarDate(input.now);
  const week = currentWeek(today, input.course.startDate);
  const done = new Set(input.progress.filter(({ completedAt }) => completedAt <= input.now).map(({ topicId }) => topicId));
  const unfinished = input.topics.filter(({ id }) => !done.has(id));
  return {
    today, week, done, unfinished,
    backlog: unfinished.filter((topic) => topic.week <= week),
    remaining: unfinished.filter((topic) => topic.week > week),
    requiredMin: unfinished.reduce((sum, topic) => sum + topic.estMinutes, 0),
  };
}
