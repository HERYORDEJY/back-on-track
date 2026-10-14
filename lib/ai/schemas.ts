import { z } from "zod";
import type { TriageOutput as EngineTriageOutput } from "@/lib/engine/types";

export const Action = z.enum(["keep", "compress_light", "compress_heavy", "skip"]);
export const ChangedAction = z.enum(["compress_light", "compress_heavy", "skip"]);
export const Localized = z.strictObject({ en: z.string(), pcm: z.string() });
// Keep Localized for stored plans. Restore it as the AI text schema after Pidgin review.
const EnglishText = z.strictObject({ en: z.string() });
export const TriageOutput = z.strictObject({
  items: z.array(z.strictObject({ topicId: z.string(), action: ChangedAction, rationale: EnglishText })),
  summary: EnglishText,
});
export const OutreachOutput = z.strictObject({ message: z.string(), nextStep: z.string() });

function words(value: string): string[] { return value.trim().split(/\s+/).filter(Boolean); }

export function trimSentences(value: string, limit: number): string {
  const text = value.trim();
  if (words(text).length <= limit) return text;
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  let result = "";
  for (const sentence of sentences) {
    const next = `${result} ${sentence.trim()}`.trim();
    if (words(next).length > limit) break;
    result = next;
  }
  return result || words(text).slice(0, limit).join(" ");
}

export function limitTriage(output: z.infer<typeof TriageOutput>): z.infer<typeof TriageOutput> {
  return {
    items: output.items.map((item) => ({ ...item, rationale: { en: trimSentences(item.rationale.en, 20) } })),
    summary: { en: trimSentences(output.summary.en, 60) },
  };
}

export function expandEnglishTriage(output: z.infer<typeof TriageOutput>): EngineTriageOutput {
  return {
    items: output.items.map((item) => ({ ...item, rationale: { en: item.rationale.en, pcm: item.rationale.en } })),
    summary: { en: output.summary.en, pcm: output.summary.en },
  };
}

export function limitOutreach(output: z.infer<typeof OutreachOutput>): z.infer<typeof OutreachOutput> {
  return { message: trimSentences(output.message, 80), nextStep: trimSentences(output.nextStep, 20) };
}
