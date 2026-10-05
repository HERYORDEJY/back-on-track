import { ENGINE, ACTION_FACTOR } from "./config";
import type { Action, Assessment, Topic } from "./types";

export function nextAssessment(assessments: Assessment[], today: string, courseworkOnly = false) {
  return assessments.filter((assessment) => assessment.dueDate >= today && (!courseworkOnly || assessment.kind !== "exam"))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))[0] ?? null;
}
export function protectedTopics(all: Topic[], unfinished: Topic[], coursework: Assessment | null): Set<string> {
  const high = new Set([...all].sort((a, b) => b.examWeight - a.examWeight || a.order - b.order).slice(0, Math.ceil(all.length * ENGINE.examWeightProtectFraction)).map(({ id }) => id));
  const parents = new Set(unfinished.flatMap(({ prereqIds }) => prereqIds));
  return new Set(unfinished.filter((topic) => parents.has(topic.id) || high.has(topic.id) || Boolean(coursework && coursework.weight >= ENGINE.courseworkProtectWeight && coursework.topicIds.includes(topic.id))).map(({ id }) => id));
}
export function actionMinutes(topic: Topic, action: Action): number {
  return Math.round(topic.estMinutes * ACTION_FACTOR[action]);
}
export function protectedFloor(topics: Topic[], protectedIds: Set<string>): number {
  return topics.filter(({ id }) => protectedIds.has(id)).reduce((sum, topic) => sum + actionMinutes(topic, "compress_light"), 0);
}

/** Deadlines apply to unfinished work, including recursive prerequisite inheritance. */
export function inheritedDeadlines(topics: Topic[], assessments: Assessment[], today: string): Map<string, string | null> {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const deadlines = new Map<string, string | null>(topics.map(({ id }) => [id, null]));
  const propagate = (id: string, deadline: string, path: Set<string>) => {
    const topic = byId.get(id);
    if (!topic) return; // already-done prerequisites are absent
    if (path.has(id)) throw new Error("Course prerequisites contain a cycle");
    const previous = deadlines.get(id);
    if (!previous || deadline < previous) deadlines.set(id, deadline);
    const nextPath = new Set(path).add(id);
    for (const parent of topic.prereqIds) propagate(parent, deadline, nextPath);
  };
  for (const assessment of assessments.filter((assessment) => assessment.kind !== "exam" && assessment.dueDate >= today)) {
    for (const id of assessment.topicIds) propagate(id, assessment.dueDate, new Set());
  }
  return deadlines;
}

export function priorityOrder(topics: Topic[], deadlines: Map<string, string | null>): Topic[] {
  const remaining = new Map(topics.map((topic) => [topic.id, topic]));
  const result: Topic[] = [];
  while (remaining.size) {
    const eligible = [...remaining.values()].filter((topic) => topic.prereqIds.every((id) => !remaining.has(id)));
    eligible.sort((a, b) => (deadlines.get(a.id) ?? "9999-12-31").localeCompare(deadlines.get(b.id) ?? "9999-12-31") || b.examWeight - a.examWeight || a.week - b.week || a.order - b.order || a.id.localeCompare(b.id));
    if (!eligible.length) throw new Error("Course prerequisites contain a cycle");
    result.push(eligible[0]);
    remaining.delete(eligible[0].id);
  }
  return result;
}
