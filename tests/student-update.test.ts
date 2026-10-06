import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { getStudentLanguage, updateStudent } from "@/lib/services/students";
import { PATCH } from "@/app/api/students/[id]/route";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/clock", () => ({ getNow: vi.fn() }));

const hours = { mon: 40, tue: 40, wed: 40, thu: 40, fri: 40, sat: 0, sun: 90 };
const params = { params: Promise.resolve({ id: "amaka" }) };
const request = (body: string) => new Request("http://localhost/api/students/amaka", { method: "PATCH", body });

function mockStudent() {
  const tx = {
    student: {
      findUnique: vi.fn().mockResolvedValue({ id: "amaka", language: "pcm", goal: "Promotion", context: null, availability: hours, hoursVary: false }),
      update: vi.fn().mockResolvedValue({}),
    },
    plan: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  vi.mocked(getDb).mockReturnValue({ $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx) } as never);
  vi.mocked(getNow).mockResolvedValue(new Date("2026-10-19T17:00:00.000Z"));
  return tx;
}

beforeEach(() => vi.resetAllMocks());

describe("student preferences", () => {
  it("uses the saved learner language for a direct learner visit", async () => {
    const findUnique = vi.fn().mockResolvedValue({ language: "pcm" });
    vi.mocked(getDb).mockReturnValue({ student: { findUnique } } as never);
    expect(await getStudentLanguage("amaka")).toBe("pcm");
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "amaka" }, select: { language: true } });
  });

  it("switches language without invalidating a saved plan", async () => {
    const tx = mockStudent();
    const response = await PATCH(request('{"language":"en"}'), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ language: "en", planNeedsRefresh: false });
    expect(tx.plan.updateMany).not.toHaveBeenCalled();
    expect(tx.student.update).toHaveBeenCalledWith({ where: { id: "amaka" }, data: expect.objectContaining({ language: "en", lastSeenAt: new Date("2026-10-19T17:00:00.000Z") }) });
  });

  it("invalidates only the current plan when study hours change", async () => {
    const tx = mockStudent();
    const result = await updateStudent("amaka", { availability: { ...hours, mon: 60 }, hoursVary: true });
    expect(result.planNeedsRefresh).toBe(true);
    expect(tx.plan.updateMany).toHaveBeenCalledWith({ where: { studentId: "amaka", isCurrent: true }, data: { isCurrent: false } });
  });

  it.each([
    "{}", '{"language":"fr"}', '{"goal":"x","extra":true}',
    '{"availability":{"mon":10,"tue":0,"wed":0,"thu":0,"fri":0,"sat":0,"sun":0}}',
  ])("rejects invalid patches: %s", async (body) => {
    const response = await PATCH(request(body), params);
    expect(response.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns a private retryable error on a service failure", async () => {
    vi.mocked(getNow).mockRejectedValue(new Error("database secret"));
    const response = await PATCH(request('{"language":"en"}'), params);
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
