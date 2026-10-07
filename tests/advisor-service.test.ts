import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { outreach } from "@/lib/ai/client";
import { draftOutreach, getStudentDetail, getStudentRiskView, listStudents } from "@/lib/services/advisor";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/clock", () => ({ getNow: vi.fn(), calendarDate: (date: Date) => date.toISOString().slice(0, 10) }));
vi.mock("@/lib/ai/client", () => ({ outreach: vi.fn() }));

const now = new Date("2026-10-19T17:00:00Z");
const student = {
  id: "amaka", name: "Amaka Okafor", language: "pcm", availability: null,
  lastSeenAt: null, escalatedAt: null, progress: [], submissions: [], plans: [],
};

function fixture() {
  const db = {
    $queryRaw: vi.fn().mockResolvedValue([student]),
    topic: { findMany: vi.fn().mockResolvedValue([]) },
    assessment: { findMany: vi.fn().mockResolvedValue([]) },
    course: { findUnique: vi.fn().mockResolvedValue({ startDate: new Date("2026-09-06T23:00:00Z") }) },
    outreach: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(({ data }) => Promise.resolve({ id: data.id, message: data.message, nextStep: data.nextStep, contacted: false })),
    },
  };
  vi.mocked(getDb).mockReturnValue(db as never);
  vi.mocked(getNow).mockResolvedValue(now);
  return db;
}

beforeEach(() => { vi.resetAllMocks(); });

describe("advisor privacy projection", () => {
  it("selects no goal or context and exposes the same public risk on both sides", async () => {
    const db = fixture();
    const list = await listStudents();
    const learnerRisk = await getStudentRiskView("amaka");
    const detail = await getStudentDetail("amaka");
    expect(list.rows[0].risk).toEqual(learnerRisk);
    expect(detail?.risk).toEqual(learnerRisk);
    expect(list.metric).toBeNull();
    const sql = db.$queryRaw.mock.calls.map((call) => call[0].join(" ")).join(" ");
    expect(sql).not.toMatch(/"goal"|"context"/);
    const publicText = JSON.stringify({ list, learnerRisk, detail });
    expect(publicText).not.toMatch(/"score"|"goal"|"context"/);
    expect(JSON.stringify(learnerRisk)).not.toContain("outreach");
  });

  it("sends only risk facts to AI and inserts the learner's first name after fallback", async () => {
    const db = fixture();
    vi.mocked(outreach).mockResolvedValue(null);
    const draft = await draftOutreach("amaka");
    expect(outreach).toHaveBeenCalledWith(expect.objectContaining({ language: "pcm" }), undefined, "amaka");
    expect(JSON.stringify(vi.mocked(outreach).mock.calls[0][0])).not.toContain("Amaka");
    expect(draft.message).toMatch(/^Amaka,/);
    expect(draft.source).toBe("fallback");
    expect(db.outreach.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ studentId: "amaka" }) }));
  });

  it("addresses an escalated learner directly in the fallback draft", async () => {
    const db = fixture();
    db.$queryRaw.mockResolvedValue([{ ...student, escalatedAt: now }]);
    vi.mocked(outreach).mockResolvedValue(null);
    const draft = await draftOutreach("amaka");
    expect(draft.message).toContain("your plan show say");
    expect(draft.message).not.toContain("Their plan");
  });
});
