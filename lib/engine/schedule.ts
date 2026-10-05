import { ENGINE } from "./config";
import { dayBudget } from "./capacity";
import { localized } from "./basis";
import type { Availability, Decision, PlannedSession, Topic, Unscheduled } from "./types";

/** Decisions are already code-ordered. This is the only placement algorithm. */
export function schedule(decisions: Decision[], days: string[], availability: Availability, topics: Topic[]) {
  const work = decisions.filter(({ minutes }) => minutes > 0).map((decision) => ({ ...decision, left: decision.minutes }));
  const titles = new Map(topics.map(({ id, title }) => [id, title]));
  const sessions: PlannedSession[] = [];
  let index = 0;
  for (const date of days) {
    let budget = dayBudget(date, availability);
    const pieces: PlannedSession["pieces"] = [];
    while (budget >= ENGINE.minBlockMinutes && index < work.length) {
      const topic = work[index];
      const minutes = Math.min(budget, topic.left);
      topic.left -= minutes;
      budget -= minutes;
      pieces.push({ topicId: topic.topicId, minutes, isLast: topic.left === 0 });
      if (topic.left === 0) index++;
    }
    if (pieces.length) {
      const minutes = pieces.reduce((sum, piece) => sum + piece.minutes, 0);
      sessions.push({ date, minutes, pieces, reminder: { at: new Date(`${date}T${ENGINE.reminderTime}:00+01:00`), text: localized("reminder.text", { minutes, topic: titles.get(pieces[0].topicId)! }) } });
    }
  }
  const unscheduled: Unscheduled = work.filter(({ left }) => left > 0).map(({ topicId, left }) => ({ topicId, minutes: left }));
  return { sessions, unscheduled };
}
