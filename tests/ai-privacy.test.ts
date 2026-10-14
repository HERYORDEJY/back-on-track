import { afterEach, describe, expect, it, vi } from "vitest";
import { getPersonaSeed } from "@/prisma/personas";
import { cacheKey, canonicalJson } from "@/lib/ai/cache";
import { triagePrompt, outreachPrompt } from "@/lib/ai/prompts";
import { limitOutreach, limitTriage, TriageOutput, trimSentences } from "@/lib/ai/schemas";
import { redactPrivateText, withPlanBudget } from "@/lib/services/plans";
import { personaInput } from "./engine/fixtures";
import { planState, triageContext } from "@/lib/engine/triage";
import { validate } from "@/lib/engine/validate";
import type { TriageContext } from "@/lib/engine/types";

const context: TriageContext = {
  today: "2026-10-19", week: 7, examDate: "2026-12-01", status: "cut", nextCoursework: null,
  student: {}, capacityMin: 300, requiredMin: 600, deficitMin: 300,
  topics: [{ id: "t01", title: "Management", week: 1, estMinutes: 80, examWeightPct: 2, protected: false, basis: "Simulated exam weight", prereqIds: [], deadline: null, cutSavingsMin: { light: 24, heavy: 40, skip: 80 } }],
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
    expect(prompt).toContain("in English");
    expect(prompt).not.toContain("Nigerian Pidgin");
    expect(prompt).not.toContain("Amaka");
    expect(canonicalJson({ b: 1, a: { y: 2, x: 1 } })).toBe(canonicalJson({ a: { x: 1, y: 2 }, b: 1 }));
    expect(cacheKey("triage", "model-a", { a: 1 })).toBe(cacheKey("triage", "model-a", { a: 1 }));
    expect(cacheKey("triage", "model-a", { a: 1 })).not.toBe(cacheKey("triage", "model-a", { a: 2 }));
    expect(cacheKey("triage", "model-a", { a: 1 })).not.toBe(cacheKey("triage", "model-b", { a: 1 }));
    expect(cacheKey("triage", "model-a", { a: 1 }, "v1")).not.toBe(cacheKey("triage", "model-a", { a: 1 }, "v2"));
  });
  it("rejects generated order and bounds text after parsing", () => {
    expect(TriageOutput.safeParse({ items: [], summary: { en: "Fine", pcm: "E fine" }, order: ["t01"] }).success).toBe(false);
    expect(TriageOutput.safeParse({ items: [], summary: { en: "Fine", pcm: "E fine" } }).success).toBe(false);
    expect(TriageOutput.safeParse({ items: [], summary: { en: "Fine" } }).success).toBe(true);
    expect(trimSentences("First sentence. Second sentence has too many words to fit now.", 3)).toBe("First sentence.");
    const long = Array(70).fill("word").join(" ");
    const result = limitTriage({ items: [{ topicId: "t01", action: "skip", rationale: { en: long } }], summary: { en: long } });
    expect(result.items[0].rationale.en.split(" ")).toHaveLength(20);
    expect(result.summary.en.split(" ")).toHaveLength(60);
    expect(limitOutreach({ message: long + " " + long, nextStep: long }).message.split(" ")).toHaveLength(80);
  });
  it("warns that matching displayed capacity can still leave work unplaced", () => {
    const input = personaInput("amaka");
    const state = planState(input);
    const items = ["t11", "t26", "t29", "t31", "t35"].map((topicId) => ({
      topicId, action: "skip" as const, rationale: { en: "Lower simulated exam weight.", pcm: "Simulated exam weight small." },
    }));
    const proposal = validate({ items, summary: { en: "Plan", pcm: "Plan" } }, "cut", state, input);
    expect(proposal.decisions.reduce((sum, item) => sum + item.minutes, 0)).toBe(state.capacityMin);
    expect(proposal.violations).toContainEqual(expect.objectContaining({ code: "OVER_CAPACITY" }));
    const prompt = triagePrompt(triageContext(input, state, "cut", state.capacityMin - 20));
    expect(prompt).toMatch(/20.minute block/i);
    expect(prompt).toMatch(/at or below.*placementTargetMin/i);
    expect(prompt).toContain(`"placementTargetMin":${state.capacityMin - 20}`);
  });
  it("tells cut triage the engine's concrete remaining-minute target", () => {
    const prompt = triagePrompt({ ...context, placementTargetMin: 260 });
    expect(prompt).toContain("260");
    expect(prompt).toContain("340 minutes of reductions");
    expect(prompt).toMatch(/at or below.*placementTargetMin/i);
    expect(prompt).toMatch(/sum the cutSavingsMin values/i);
    expect(prompt).toContain("English summary");
    expect(prompt).not.toContain("Nigerian Pidgin");
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
