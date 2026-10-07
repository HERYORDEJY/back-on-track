import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { readCache, writeCache } from "@/lib/ai/cache";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

function fixture(response: unknown = { summary: "Plan" }) {
  const tx = {
    aiCache: {
      findUnique: vi.fn().mockResolvedValue(response === null ? null : { response }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    aiCacheUse: { upsert: vi.fn().mockResolvedValue({}) },
  };
  const db = { $transaction: vi.fn((work: (client: typeof tx) => unknown) => work(tx)), aiCache: tx.aiCache };
  vi.mocked(getDb).mockReturnValue(db as never);
  return { tx, db };
}

beforeEach(() => vi.resetAllMocks());

describe("AI cache ownership", () => {
  it("links a cached response to the learner who reads it", async () => {
    const { tx, db } = fixture();
    expect(await readCache("shared-key", "amaka")).toEqual({ summary: "Plan" });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(tx.aiCacheUse.upsert).toHaveBeenCalledWith({
      where: { key_studentId: { key: "shared-key", studentId: "amaka" } },
      update: {}, create: { key: "shared-key", studentId: "amaka" },
    });
  });

  it("does not claim an absent cache entry", async () => {
    const { tx } = fixture(null);
    expect(await readCache("missing", "amaka")).toBeNull();
    expect(tx.aiCacheUse.upsert).not.toHaveBeenCalled();
  });

  it("writes a response and its ownership in one transaction", async () => {
    const { tx, db } = fixture();
    await writeCache("new-key", { message: "Hello" }, "tunde");
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(tx.aiCache.upsert).toHaveBeenCalledWith({
      where: { key: "new-key" }, update: { response: { message: "Hello" } },
      create: { key: "new-key", response: { message: "Hello" } },
    });
    expect(tx.aiCacheUse.upsert).toHaveBeenCalledWith({
      where: { key_studentId: { key: "new-key", studentId: "tunde" } },
      update: {}, create: { key: "new-key", studentId: "tunde" },
    });
  });
});
