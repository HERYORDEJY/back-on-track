import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueMutation, readMutationQueue, readPlanSnapshot, removeMutation, savePlanSnapshot, studentStoragePrefix, clearAllDemoLocalData, syncMutationQueue, LEARNER_PAGE_CACHE } from "@/lib/offline";
import type { PlanView } from "@/lib/types";

const view = { today: "2026-10-19", student: { id: "amaka", language: "pcm" }, plan: { sessions: [], weekSessions: [], items: [], warnings: [], unscheduled: [], reminders: [], stops: [], topicTitles: {}, plannedMin: 0 } } as unknown as PlanView;

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
  it("opens an old Pidgin snapshot as English without exposing its Pidgin copy", () => {
    const entries = storage();
    const oldView = { ...view, plan: { ...view.plan!, summary: { en: "English plan", pcm: "Pidgin plan" } } } as PlanView;
    entries.set(`${studentStoragePrefix("amaka")}snapshot`, JSON.stringify({ version: 2, studentId: "amaka", view: oldView, risk: null }));
    const saved = readPlanSnapshot("amaka");
    expect(saved?.view.student.language).toBe("en");
    expect(saved?.view.plan?.summary).toEqual({ en: "English plan", pcm: "English plan" });
  });
  it("keeps a versioned English plan snapshot for one learner", () => {
    const entries = storage();
    expect(savePlanSnapshot("amaka", view, null)).toBe(true);
    expect(readPlanSnapshot("amaka")?.view).toEqual({ ...view, student: { ...view.student, language: "en" } });
    expect(readPlanSnapshot("tunde")).toBeNull();
    entries.set(`${studentStoragePrefix("amaka")}snapshot`, JSON.stringify({ version: 1, studentId: "amaka", view, risk: null }));
    expect(readPlanSnapshot("amaka")).toBeNull();
    entries.set(`${studentStoragePrefix("amaka")}snapshot`, "{broken");
    expect(readPlanSnapshot("amaka")).toBeNull();
  });

  it("coalesces unsent reversals while language changes are paused", () => {
    storage();
    expect(enqueueMutation("amaka", { kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "done" })).toMatchObject({ id: "m1" });
    expect(enqueueMutation("amaka", { kind: "language", language: "pcm" })).toBeNull();
    expect(enqueueMutation("amaka", { kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "missed" })).toMatchObject({ id: "m2" });
    expect(readMutationQueue("amaka")).toEqual([
      { id: "m2", kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "missed" },
    ]);
    expect(removeMutation("amaka", "m2")).toBe(true);
    expect(readMutationQueue("amaka")).toHaveLength(0);
  });

  it("preserves a corrupt queue rather than replacing or silently dropping it", () => {
    const entries = storage();
    entries.set(`${studentStoragePrefix("amaka")}queue`, "corrupt");
    expect(readMutationQueue("amaka")).toBeNull();
    expect(enqueueMutation("amaka", { kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "done" })).toBeNull();
    expect(entries.get(`${studentStoragePrefix("amaka")}queue`)).toBe("corrupt");
  });

  it("replays check-ins but leaves old queued language edits inactive", async () => {
    const entries = storage();
    entries.set(`${studentStoragePrefix("amaka")}queue`, JSON.stringify([
      { id: "old-language", kind: "language", language: "pcm" },
    ]));
    enqueueMutation("amaka", { kind: "checkin", sessionId: "s1", sessionDate: "2026-10-19", status: "done" });
    const send = vi.fn().mockResolvedValueOnce({ ok: true, clone: () => ({ json: async () => ({ today: "2026-10-20" }) }) });
    expect(await syncMutationQueue("amaka", send as typeof fetch)).toEqual({ synced: 1, late: 1, pending: 0, issue: null });
    expect(send.mock.calls[0]).toEqual(["/api/sessions/s1", expect.objectContaining({ body: JSON.stringify({ status: "done", offlineSessionDate: "2026-10-19" }) })]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(readMutationQueue("amaka")).toEqual([]);
    expect(JSON.parse(entries.get(`${studentStoragePrefix("amaka")}queue`) ?? "[]")).toEqual([
      { id: "old-language", kind: "language", language: "pcm" },
    ]);
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
