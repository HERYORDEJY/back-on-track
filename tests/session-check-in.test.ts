import { describe, expect, it, vi } from "vitest";
import { checkInSessionInTransaction } from "@/lib/services/plans";

const now = new Date("2026-10-19T17:00:00Z");
const pieces = [{ topicId: "a", minutes: 30, isLast: false }, { topicId: "b", minutes: 20, isLast: true }];

function fixture(overrides: Record<string, unknown> = {}) {
  const session = { id: "s1", date: "2026-10-19", status: "pending", checkedAt: null, pieces, plan: { studentId: "amaka", isCurrent: true }, ...overrides };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "amaka" }]),
    session: { findUnique: vi.fn().mockResolvedValue(session), update: vi.fn().mockResolvedValue({}) },
    progress: { createMany: vi.fn().mockResolvedValue({ count: 1 }), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    student: { update: vi.fn().mockResolvedValue({}) },
  };
  return tx;
}

describe("today-only check-in transaction", () => {
  it("records only completed last pieces with session provenance", async () => {
    const tx = fixture();
    await checkInSessionInTransaction(tx as never, "s1", "done", now);
    expect(tx.progress.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ studentId: "amaka", topicId: "b", completedAt: now, sessionId: "s1" })], skipDuplicates: true });
    expect(tx.progress.deleteMany).not.toHaveBeenCalled();
    expect(tx.session.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { status: "done", checkedAt: now } });
    expect(tx.student.update).toHaveBeenCalledWith({ where: { id: "amaka" }, data: { lastSeenAt: now } });
  });
  it("is idempotent when the same status is repeated", async () => {
    const tx = fixture({ status: "done", checkedAt: now });
    await checkInSessionInTransaction(tx as never, "s1", "done", now);
    expect(tx.progress.createMany).not.toHaveBeenCalled();
    expect(tx.progress.deleteMany).not.toHaveBeenCalled();
    expect(tx.session.update).not.toHaveBeenCalled();
  });
  it("reverses only progress attributed to this session", async () => {
    const tx = fixture({ status: "done", checkedAt: now });
    await checkInSessionInTransaction(tx as never, "s1", "missed", now);
    expect(tx.progress.deleteMany).toHaveBeenCalledWith({ where: { studentId: "amaka", sessionId: "s1" } });
    expect(tx.progress.createMany).not.toHaveBeenCalled();
  });
  it.each([{ date: "2026-10-18" }, { date: "2026-10-20" }, { plan: { studentId: "amaka", isCurrent: false } }])("locks earlier, future and stale sessions: %j", async (override) => {
    const tx = fixture(override);
    await expect(checkInSessionInTransaction(tx as never, "s1", "done", now)).rejects.toMatchObject({ code: "SESSION_LOCKED" });
    expect(tx.progress.createMany).not.toHaveBeenCalled();
    expect(tx.progress.deleteMany).not.toHaveBeenCalled();
  });
  it("derives the student from the session", async () => {
    const tx = fixture({ plan: { studentId: "tunde", isCurrent: true } });
    expect(await checkInSessionInTransaction(tx as never, "s1", "done", now)).toBe("tunde");
    expect(tx.student.update).toHaveBeenCalledWith({ where: { id: "tunde" }, data: { lastSeenAt: now } });
  });
});
