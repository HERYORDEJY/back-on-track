import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStudentLocalData, studentStoragePrefix } from "@/lib/offline";

afterEach(() => vi.unstubAllGlobals());

describe("local learner data deletion", () => {
  it("removes only this learner's saved keys and cached pages", async () => {
    const entries = new Map([
      [`${studentStoragePrefix("amaka")}snapshot`, "private"],
      [`${studentStoragePrefix("amaka")}queue`, "pending"],
      [`${studentStoragePrefix("tunde")}snapshot`, "other learner"],
    ]);
    vi.stubGlobal("localStorage", {
      get length() { return entries.size; },
      key: (index: number) => [...entries.keys()][index] ?? null,
      removeItem: (key: string) => { entries.delete(key); },
    });
    const deleted: string[] = [];
    const requests = [
      new Request("https://example.test/learner/amaka"),
      new Request("https://example.test/learner/tunde"),
      new Request("https://example.test/api/plan"),
    ];
    vi.stubGlobal("window", { caches: true });
    vi.stubGlobal("caches", {
      keys: async () => ["learner-pages"],
      open: async () => ({ keys: async () => requests, delete: async (request: Request) => { deleted.push(request.url); return true; } }),
    });

    expect(await clearStudentLocalData("amaka")).toBe(true);
    expect([...entries.keys()]).toEqual([`${studentStoragePrefix("tunde")}snapshot`]);
    expect(deleted).toEqual(["https://example.test/learner/amaka"]);
  });

  it("reports when local cleanup cannot complete", async () => {
    vi.stubGlobal("localStorage", { get length() { throw new Error("blocked"); } });
    vi.stubGlobal("window", {});
    expect(await clearStudentLocalData("amaka")).toBe(false);
  });
});
