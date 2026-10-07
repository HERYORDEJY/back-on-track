import type { TriageContext, Violation } from "@/lib/engine/types";

export const PROMPT_VERSION = "d5-v6";

export function triagePrompt(context: TriageContext, violations: Violation[] = []): string {
  const correction = violations.length ? `\nCorrect all these validation errors:\n${violations.map(({ code, topicId, message }) => `- ${code}${topicId ? ` (${topicId})` : ""}: ${message}`).join("\n")}` : "";
  const target = context.status === "cut" && context.placementTargetMin !== undefined
    ? `Required total: ${context.requiredMin} minutes. Feasible remaining-work target: ${context.placementTargetMin} minutes. Choose at least ${context.requiredMin - context.placementTargetMin} minutes of reductions across unprotected low-weight topics. The arithmetic deficit of ${context.deficitMin} minutes is insufficient for the daily study blocks.\n\n`
    : "";
  return `You help a student catch up in a simulated sample management course. Return only the requested structured fields. Code owns arithmetic, topic order and final schedule validation.\n\n${target}
Choose changes that leave enough study time to place all remaining work. List only topics to shorten or skip. Unlisted unfinished topics are kept. Never skip or heavily shorten a protected topic. Prefer lower exam-weight topics when work must be dropped. Prerequisites come first and inherit a dependant's earliest deadline. Do not add an order field.\n
For a cut plan, capacityMin is a display total, not a scheduling guarantee: the 20-minute block rule leaves some daily time unusable. deficitMin is only the minimum arithmetic reduction. placementTargetMin is the remaining-minute total of a feasible code fallback. Choose your own lower-weight unprotected topics to shorten or skip. For each changed topic, use the corresponding cutSavingsMin field: light for compress_light, heavy for compress_heavy, skip for skip. Only listed savings are allowed. Sum the cutSavingsMin values for your chosen actions until the required reduction above is met or exceeded; equivalently, keep remaining work at or below placementTargetMin. Unlisted topics stay at full estimated minutes. Check the savings before responding; omit the calculation from the structured output. Code still checks the complete schedule.\n
Write changed-topic reasons in English and everyday Nigerian Pidgin, at most 20 words each. Write a useful summary in both languages, at most 60 words each. Ground every reason in the supplied course facts, and call weights, time estimates and deadlines simulated. Never promise an extension or study-break approval. Never mention AI.\n
Input facts: ${JSON.stringify(context)}${correction}`;
}

export type OutreachContext = { reasons: { code: string; params: Record<string, string | number> }[]; planStatus: string; language: "en" | "pcm" };

export function outreachPrompt(context: OutreachContext): string {
  return `Write a short, warm advisor message in ${context.language === "pcm" ? "everyday Nigerian Pidgin" : "English"} using only the given reasons and plan status. Begin with the literal placeholder {firstName}. At most 80 words. Give one concrete next step in English for the advisor, at most 20 words. Do not mention AI, make eligibility promises, or add private learner details.\nInput facts: ${JSON.stringify(context)}`;
}
