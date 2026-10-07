import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueMutation, readMutationQueue, readPlanSnapshot, removeMutation, savePlanSnapshot, studentStoragePrefix, clearAllDemoLocalData, syncMutationQueue, LEARNER_PAGE_CACHE } from "@/lib/offline";
import type { PlanView } from "@/lib/types";

const view = { today: "2026-10-19", student: { id: "amaka", language: "pcm" }, plan: { sessions: [], weekSessions: [], items: [], warnings: [], unscheduled: [], reminders: [] } } as unknown as PlanView;

function storage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() { return entries.size; },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
  });
  vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("m1").mockReturnValueOnce("m2").mockReturnValueOnce("m3") });
  return entries;
}

afterEach(() => vi.unstubAllGlobals());

describe("offline learner storage", () => {
  it("keeps a versioned bilingual plan snapshot for one learner", () => {
    const entries = storage();
    expect(savePlanSnapshot("amaka", view, null)).toBe(true);
    expect(readPlanSnapshot("amaka")?.view).toEqual(view);
    expect(readPlanSnapshot("tunde")).toBeNull();
    entries.set(`${studentStoragePrefix("amaka")}snapshot`, "{broken");
    expect(readPlanSnapshot("amaka")).toBeNull();
  });

  it("coalesces unsent reversals and language choices without losing other actions", () => {
    storage();
    expect(enqueueMutation("amaka", { kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "done" })).toMatchObject({ id: "m1" });
    expect(enqueueMutation("amaka", { kind: "language", language: "en" })).toMatchObject({ id: "m2" });
    expect(enqueueMutation("amaka", { kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "missed" })).toMatchObject({ id: "m3" });
    expect(readMutationQueue("amaka")).toEqual([
      { id: "m2", kind: "language", language: "en" },
      { id: "m3", kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "missed" },
    ]);
    expect(removeMutation("amaka", "m2")).toBe(true);
    expect(readMutationQueue("amaka")).toHaveLength(1);
  });

  it("preserves a corrupt queue rather than replacing or silently dropping it", () => {
    const entries = storage();
    entries.set(`${studentStoragePrefix("amaka")}queue`, "corrupt");
    expect(readMutationQueue("amaka")).toBeNull();
    expect(enqueueMutation("amaka", { kind: "language", language: "en" })).toBeNull();
    expect(entries.get(`${studentStoragePrefix("amaka")}queue`)).toBe("corrupt");
  });

  it("replays queued actions in order and retains a failed action for retry", async () => {
    storage();
    enqueueMutation("amaka", { kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "done" });
    enqueueMutation("amaka", { kind: "language", language: "en" });
    const send = vi.fn().mockResolvedValueOnce({ ok: true, clone: () => ({ json: async () => ({ today: "2026-10-20" }) }) }).mockResolvedValueOnce({ ok: false, status: 503 });
    expect(await syncMutationQueue("amaka", send as typeof fetch)).toEqual({ synced: 1, late: 1, pending: 1, issue: "network" });
    expect(send.mock.calls[0]).toEqual(["/api/sessions/s1", expect.objectContaining({ body: JSON.stringify({ status: "done", offlineSessionDate: "2026-10-19" }) })]);
    expect(readMutationQueue("amaka")).toEqual([{ id: "m2", kind: "language", language: "en" }]);
    send.mockResolvedValueOnce({ ok: true });
    expect(await syncMutationQueue("amaka", send as typeof fetch)).toEqual({ synced: 1, late: 0, pending: 0, issue: null });
  });

  it("clears all demo learners on Reset but leaves unrelated browser data", async () => {
    const entries = storage();
    entries.set(`${studentStoragePrefix("amaka")}snapshot`, "plan");
    entries.set(`${studentStoragePrefix("tunde")}queue`, "pending");
    entries.set("other-app", "retain");
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("window", { caches: true });
    vi.stubGlobal("caches", { delete: deleteCache });
    expect(await clearAllDemoLocalData()).toBe(true);
    expect([...entries.keys()]).toEqual(["other-app"]);
    expect(deleteCache).toHaveBeenCalledWith(LEARNER_PAGE_CACHE);
  });
});
