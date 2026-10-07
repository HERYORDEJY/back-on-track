import { describe, expect, it, vi } from "vitest";
import { assertLiveWarmEnvironment, runDemoWarm } from "@/scripts/demo-warm";
import type { PlanView } from "@/lib/types";

function view(studentId: string, status: "fit" | "cut" | "infeasible", source: "ai" | "cache" | "fallback", version = 1): PlanView {
  return { today: "2026-10-19", student: { id: studentId }, plan: {
    id: `${studentId}-${version}`, version, status, source,
    changeSummary: version > 1 ? { en: "Changed", pcm: "Changed" } : null,
    featuredSession: { id: "amaka-tonight", date: "2026-10-19", editable: true },
  } } as PlanView;
}

function operations() {
  const resetDemo = vi.fn(async () => ({ now: "2026-10-19T17:00:00.000Z" }));
  const createPlan = vi.fn(async (id: string) => id === "amaka" ? view(id, "cut", "ai") : id === "zainab" ? view(id, "fit", "fallback") : view(id, "infeasible", "fallback"));
  const checkInSession = vi.fn(async () => view("amaka", "cut", "ai"));
  const changeClock = vi.fn(async () => ({ now: "2026-10-22T17:00:00.000Z" }));
  const getPlanView = vi.fn(async () => view("amaka", "cut", "cache", 2));
  const draftOutreach = vi.fn(async () => ({ message: "Tunde, let us talk", source: "ai" as string }));
  const hasTundeOutreachCache = vi.fn(async () => true);
  return { resetDemo, createPlan, checkInSession, changeClock, getPlanView, draftOutreach, hasTundeOutreachCache };
}

describe("demo cache warm", () => {
  it("follows the scripted path and resets after warming", async () => {
    const deps = operations();
    const result = await runDemoWarm(deps);
    expect(result).toEqual({ firstSource: "ai", replanSource: "cache", outreachCached: true });
    expect(deps.resetDemo).toHaveBeenCalledTimes(2);
    expect(deps.resetDemo.mock.invocationCallOrder[0]).toBeLessThan(deps.createPlan.mock.invocationCallOrder[0]);
    expect(deps.resetDemo.mock.invocationCallOrder[1]).toBeGreaterThan(deps.draftOutreach.mock.invocationCallOrder[0]);
    expect(deps.createPlan.mock.calls.map(([id]) => id)).toEqual(["amaka", "zainab", "tunde"]);
    expect(deps.checkInSession).toHaveBeenCalledExactlyOnceWith("amaka-tonight", "done");
    expect(deps.changeClock).toHaveBeenCalledExactlyOnceWith({ jumpDays: 3 });
    expect(deps.getPlanView).toHaveBeenCalledExactlyOnceWith("amaka");
    expect(deps.draftOutreach).toHaveBeenCalledExactlyOnceWith("tunde");
  });

  it("resets after a failed live step and refuses a fallback warm", async () => {
    const deps = operations();
    deps.getPlanView.mockResolvedValueOnce(view("amaka", "cut", "fallback", 2));
    await expect(runDemoWarm(deps)).rejects.toThrow("Amaka re-plan used fallback");
    expect(deps.resetDemo).toHaveBeenCalledTimes(2);
    expect(deps.createPlan).toHaveBeenCalledTimes(1);
  });

  it("retries one transient reset before making AI calls", async () => {
    const deps = operations();
    deps.resetDemo.mockRejectedValueOnce(new Error("Transaction startup failed"));
    await expect(runDemoWarm(deps)).resolves.toMatchObject({ outreachCached: true });
    expect(deps.resetDemo).toHaveBeenCalledTimes(3);
    expect(deps.resetDemo.mock.invocationCallOrder[1]).toBeLessThan(deps.createPlan.mock.invocationCallOrder[0]);
  });

  it("refuses a fallback outreach draft even when the plan steps pass", async () => {
    const deps = operations();
    deps.draftOutreach.mockResolvedValueOnce({ message: "Fallback", source: "fallback" });
    await expect(runDemoWarm(deps)).rejects.toThrow("Tunde outreach used fallback");
    expect(deps.resetDemo).toHaveBeenCalledTimes(2);
  });

  it("requires a live model, key and database before any mutation", () => {
    expect(() => assertLiveWarmEnvironment({ DEMO_MODE: "true", DATABASE_URL: "db", OPENAI_API_KEY: "key", OPENAI_MODEL: "model" })).toThrow("DEMO_MODE");
    expect(() => assertLiveWarmEnvironment({ DATABASE_URL: "db", OPENAI_MODEL: "model" })).toThrow("OPENAI_API_KEY");
    expect(() => assertLiveWarmEnvironment({ DATABASE_URL: "db", OPENAI_API_KEY: "key", OPENAI_MODEL: "model" })).not.toThrow();
  });
});
