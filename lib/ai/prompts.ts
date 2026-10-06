import type { TriageContext, Violation } from "@/lib/engine/types";

export const PROMPT_VERSION = "d2-v1";

export function triagePrompt(context: TriageContext, violations: Violation[] = []): string {
  const correction = violations.length ? `\nCorrect all these validation errors:\n${violations.map(({ code, topicId, message }) => `- ${code}${topicId ? ` (${topicId})` : ""}: ${message}`).join("\n")}` : "";
  return `You help a student catch up in a simulated sample management course. Return only the requested structured fields. Code owns arithmetic, topic order and final schedule validation.\n
Find the smallest set of changes needed to fit available study time. List only topics to shorten or skip. Unlisted unfinished topics are kept. Never skip or heavily shorten a protected topic. Prefer lower exam-weight topics when work must be dropped. Prerequisites come first and inherit a dependant's earliest deadline. Do not add an order field.\n
Write changed-topic reasons in English and everyday Nigerian Pidgin, at most 20 words each. Write a useful summary in both languages, at most 60 words each. Ground every reason in the supplied course facts, and call weights, time estimates and deadlines simulated. Never promise an extension or study-break approval. Never mention AI.\n
Input facts: ${JSON.stringify(context)}${correction}`;
}

export type OutreachContext = { reasons: { code: string; params: Record<string, string | number> }[]; planStatus: string; language: "en" | "pcm" };

export function outreachPrompt(context: OutreachContext): string {
  return `Write a short, warm advisor message in ${context.language === "pcm" ? "everyday Nigerian Pidgin" : "English"} using only the given reasons and plan status. Begin with the literal placeholder {firstName}. At most 80 words. Give one concrete next step in English for the advisor, at most 20 words. Do not mention AI, make eligibility promises, or add private learner details.\nInput facts: ${JSON.stringify(context)}`;
}
