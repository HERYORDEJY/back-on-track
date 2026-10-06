import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triage, outreach } from "@/lib/ai/client";
import { readCache, writeCache } from "@/lib/ai/cache";
import type { TriageContext } from "@/lib/engine/types";

const sdk = vi.hoisted(() => ({ parse: vi.fn(), constructed: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { parse: sdk.parse }; constructor() { sdk.constructed(); } } }));
vi.mock("@/lib/ai/cache", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/cache")>();
  return { ...original, readCache: vi.fn(), writeCache: vi.fn() };
});

const context: TriageContext = { today: "2026-10-19", week: 7, examDate: "2026-12-01", status: "fit", nextCoursework: null, student: {}, capacityMin: 100, requiredMin: 80, deficitMin: 0, topics: [] };
const output = { items: [], summary: { en: "Everything fits.", pcm: "Everything fit." } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OPENAI_MODEL", "test-model");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("DEMO_MODE", "true");
  vi.mocked(readCache).mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe("AI cache and fallback contract", () => {
  it("never constructs a network client on a demo cache miss", async () => {
    expect(await triage(context)).toBeNull();
    expect(await outreach({ reasons: [], planStatus: "cut", language: "pcm" })).toBeNull();
    expect(sdk.constructed).not.toHaveBeenCalled();
  });
  it("returns a validated cached response without a network call", async () => {
    vi.mocked(readCache).mockResolvedValue(output);
    expect(await triage(context)).toEqual({ output, source: "cache" });
    expect(sdk.constructed).not.toHaveBeenCalled();
  });
  it("rejects an invalid cached response and falls back in demo mode", async () => {
    vi.mocked(readCache).mockResolvedValue({ ...output, order: ["t01"] });
    expect(await triage(context)).toBeNull();
    expect(sdk.constructed).not.toHaveBeenCalled();
  });
  it("catches live parse errors without exposing them", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    sdk.parse.mockRejectedValue(new Error("private API detail"));
    expect(await triage(context)).toBeNull();
    expect(writeCache).not.toHaveBeenCalled();
  });
  it("caches a valid live structured response", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    sdk.parse.mockResolvedValue({ output_parsed: output });
    expect(await triage(context)).toEqual({ output, source: "ai" });
    expect(writeCache).toHaveBeenCalledTimes(1);
  });
});
