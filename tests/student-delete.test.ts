import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { deleteStudentData } from "@/lib/services/students";
import { DELETE } from "@/app/api/students/[id]/route";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

function fixture(id = "amaka") {
  const tx = {
    student: {
      findUnique: vi.fn().mockResolvedValue({ id }),
      update: vi.fn().mockResolvedValue({}),
    },
    aiCacheUse: {
      findMany: vi.fn().mockResolvedValue([{ key: "used-by-amaka" }]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    aiCache: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    plan: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    reminder: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    outreach: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    progress: { deleteMany: vi.fn() },
    submission: { deleteMany: vi.fn() },
  };
  vi.mocked(getDb).mockReturnValue({ $transaction: (work: (client: typeof tx) => unknown) => work(tx) } as never);
  return tx;
}

const request = (id: string, body?: string) => new Request(`http://localhost/api/students/${id}`, { method: "DELETE", body });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.resetAllMocks());

describe("Delete my data", () => {
  it("removes app data and only cache entries with no other owners", async () => {
    const tx = fixture();
    expect(await deleteStudentData("amaka")).toEqual({ id: "amaka", restoredDemo: true });
    expect(tx.plan.deleteMany).toHaveBeenCalledWith({ where: { studentId: "amaka" } });
    expect(tx.outreach.deleteMany).toHaveBeenCalledWith({ where: { studentId: "amaka" } });
    expect(tx.aiCacheUse.deleteMany).toHaveBeenCalledWith({ where: { studentId: "amaka" } });
    expect(tx.aiCache.deleteMany).toHaveBeenCalledWith({ where: { key: { in: ["used-by-amaka"] }, uses: { none: {} } } });
    expect(tx.progress.deleteMany).not.toHaveBeenCalled();
    expect(tx.submission.deleteMany).not.toHaveBeenCalled();
    expect(tx.student.update).toHaveBeenCalledWith({ where: { id: "amaka" }, data: expect.objectContaining({ language: "pcm", goal: "Promotion to senior nursing officer", hoursVary: false, escalatedAt: null }) });
  });

  it("clears cohort app fields without reloading a demo persona", async () => {
    const tx = fixture("cohort-001");
    tx.aiCacheUse.findMany.mockResolvedValue([]);
    expect(await deleteStudentData("cohort-001")).toEqual({ id: "cohort-001", restoredDemo: false });
    expect(tx.aiCache.deleteMany).not.toHaveBeenCalled();
    expect(tx.student.update).toHaveBeenCalledWith({ where: { id: "cohort-001" }, data: expect.objectContaining({ goal: null, context: null, hoursVary: false, lastSeenAt: null }) });
  });

  it("allows a cold database connection to start the deletion transaction", async () => {
    const tx = fixture();
    vi.mocked(getDb).mockReturnValue({ $transaction: (work: (client: typeof tx) => unknown, options?: { maxWait?: number }) => {
      if ((options?.maxWait ?? 2_000) < 10_000) throw Object.assign(new Error("Unable to start a transaction in the given time"), { code: "P2028" });
      return work(tx);
    } } as never);
    await expect(deleteStudentData("amaka")).resolves.toEqual({ id: "amaka", restoredDemo: true });
  });

  it("validates the endpoint and hides internal errors", async () => {
    fixture();
    expect((await DELETE(request("amaka", "extra"), params("amaka"))).status).toBe(400);
    expect((await DELETE(request("amaka", ""), params("amaka"))).status).toBe(200);
    const response = await DELETE(request("amaka"), params("amaka"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ id: "amaka", restoredDemo: true });
    vi.mocked(getDb).mockImplementation(() => { throw new Error("database secret"); });
    const failed = await DELETE(request("amaka"), params("amaka"));
    expect(failed.status).toBe(503);
    expect(JSON.stringify(await failed.json())).not.toContain("secret");
  });
});
