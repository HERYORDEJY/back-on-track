import { afterEach, describe, expect, it, vi } from "vitest";
import { getPersonaSeed } from "@/prisma/personas";
import { cacheKey, canonicalJson } from "@/lib/ai/cache";
import { triagePrompt, outreachPrompt } from "@/lib/ai/prompts";
import { limitOutreach, limitTriage, TriageOutput, trimSentences } from "@/lib/ai/schemas";
import { redactPrivateText, withPlanBudget } from "@/lib/services/plans";
import type { TriageContext } from "@/lib/engine/types";

const context: TriageContext = {
  today: "2026-10-19", week: 7, examDate: "2026-12-01", status: "cut", nextCoursework: null,
  student: {}, capacityMin: 300, requiredMin: 600, deficitMin: 300,
  topics: [{ id: "t01", title: "Management", week: 1, estMinutes: 80, examWeightPct: 2, protected: false, basis: "Simulated exam weight", prereqIds: [], deadline: null }],
};

describe("AI privacy and payloads", () => {
  it("removes each persona name, emails and phones before a prompt is formed", () => {
    for (const student of getPersonaSeed().students) {
      const raw = `${student.name} can be reached at amaka@example.com or +234 801 234 5678. My goal is a promotion.`;
      const safe = redactPrivateText(raw, student.name, 80)!;
      const prompt = triagePrompt({ ...context, student: { goal: safe, context: redactPrivateText(raw, student.name, 120) } });
      for (const part of student.name.split(" ")) expect(prompt.toLowerCase()).not.toContain(part.toLowerCase());
      expect(prompt).not.toContain("amaka@example.com");
      expect(prompt).not.toContain("801 234 5678");
      expect(prompt).toContain("[name]");
      expect(prompt).toContain("[email]");
      expect(prompt).toContain("[phone]");
      expect(safe.length).toBeLessThanOrEqual(80);
    }
  });
  it("keeps outreach inputs anonymous and cache inputs canonical", () => {
    const prompt = outreachPrompt({ reasons: [{ code: "MISSED", params: { n: 2 } }], planStatus: "cut", language: "pcm" });
    expect(prompt).toContain("{firstName}");
    expect(prompt).not.toContain("Amaka");
    expect(canonicalJson({ b: 1, a: { y: 2, x: 1 } })).toBe(canonicalJson({ a: { x: 1, y: 2 }, b: 1 }));
    expect(cacheKey("triage", "model-a", { a: 1 })).toBe(cacheKey("triage", "model-a", { a: 1 }));
    expect(cacheKey("triage", "model-a", { a: 1 })).not.toBe(cacheKey("triage", "model-a", { a: 2 }));
    expect(cacheKey("triage", "model-a", { a: 1 })).not.toBe(cacheKey("triage", "model-b", { a: 1 }));
    expect(cacheKey("triage", "model-a", { a: 1 }, "v1")).not.toBe(cacheKey("triage", "model-a", { a: 1 }, "v2"));
  });
  it("rejects generated order and bounds text after parsing", () => {
    expect(TriageOutput.safeParse({ items: [], summary: { en: "Fine", pcm: "E fine" }, order: ["t01"] }).success).toBe(false);
    expect(trimSentences("First sentence. Second sentence has too many words to fit now.", 3)).toBe("First sentence.");
    const long = Array(70).fill("word").join(" ");
    const result = limitTriage({ items: [{ topicId: "t01", action: "skip", rationale: { en: long, pcm: long } }], summary: { en: long, pcm: long } });
    expect(result.items[0].rationale.en.split(" ")).toHaveLength(20);
    expect(result.summary.pcm.split(" ")).toHaveLength(60);
    expect(limitOutreach({ message: long + " " + long, nextStep: long }).message.split(" ")).toHaveLength(80);
  });
});

describe("single plan budget", () => {
  afterEach(() => vi.useRealTimers());
  it("shares elapsed time across attempts and stops at the limit", async () => {
    let elapsed = 0;
    const call = vi.fn().mockResolvedValue(null);
    const budgeted = withPlanBudget(call, 20_000, () => elapsed);
    await budgeted(context);
    elapsed = 19_999;
    await budgeted(context);
    elapsed = 20_000;
    expect(await budgeted(context)).toBeNull();
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("aborts a stalled request and returns fallback signal", async () => {
    vi.useFakeTimers();
    const call = vi.fn((_ctx, _violations, signal: AbortSignal) => new Promise<null>(() => { signal.addEventListener("abort", () => {}); }));
    const budgeted = withPlanBudget(call, 20);
    const result = budgeted(context);
    await vi.advanceTimersByTimeAsync(21);
    expect(await result).toBeNull();
    expect(call.mock.calls[0][2].aborted).toBe(true);
  });
});
