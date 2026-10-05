import { t, formatDate, type MessageKey, type Localized } from "../i18n";
import type { Assessment, Topic } from "./types";

export function localized(key: MessageKey, params: Record<string, string | number> = {}): Localized {
  return { en: t(key, "en", params), pcm: t(key, "pcm", params) };
}
export function courseBasis(topic: Topic, unfinished: Topic[], coursework: Assessment | null, highIds: Set<string>): Localized {
  const dependent = [...unfinished].sort((a, b) => a.order - b.order).find(({ prereqIds }) => prereqIds.includes(topic.id));
  if (dependent) return localized("basis.prereq", { topic: dependent.title });
  if (coursework?.topicIds.includes(topic.id)) return localized("basis.coursework", { assessment: coursework.title, weight: Math.round(coursework.weight * 100), date: formatDate(new Date(`${coursework.dueDate}T00:00:00+01:00`), "en") });
  return localized(highIds.has(topic.id) ? "basis.examHigh" : "basis.examLow", { pct: Math.round(topic.examWeight * 100) });
}
export function rationale(action: string, topic: Topic, assessment: Assessment | null): Localized {
  if (action === "skip") return localized("rationale.skip");
  if (action !== "keep") return localized("rationale.shorten");
  return assessment?.topicIds.includes(topic.id) ? localized("rationale.keepFor", { assessment: assessment.title }) : localized("rationale.keep");
}
