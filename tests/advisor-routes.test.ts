import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ draft: vi.fn(), contact: vi.fn(), detail: vi.fn() }));
vi.mock("@/lib/services/advisor", () => ({
  draftOutreach: mocks.draft,
  markContacted: mocks.contact,
  getStudentDetail: mocks.detail,
  AdvisorServiceError: class AdvisorServiceError extends Error {
    constructor(public code: string) { super(code); }
  },
}));

import { POST } from "@/app/api/advisor/outreach/route";
import { PATCH } from "@/app/api/advisor/outreach/[id]/route";
import { GET as GET_DETAIL } from "@/app/api/advisor/students/[id]/route";

function request(path: string, method: string, body: unknown) {
  return new Request(`http://localhost${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("advisor outreach routes", () => {
  beforeEach(() => { mocks.draft.mockReset(); mocks.contact.mockReset(); mocks.detail.mockReset(); });

  it("loads advisor-only details without caching or leaking private learner fields", async () => {
    const detail = { id: "tunde", name: "Tunde Adeyemi", risk: { band: "high", reasons: [] }, events: [], missedSessions: [], outreach: null };
    mocks.detail.mockResolvedValue(detail);
    const params = { params: Promise.resolve({ id: "tunde" }) };
    const response = await GET_DETAIL(new Request("http://localhost/api/advisor/students/tunde"), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(detail);
    expect(JSON.stringify(detail)).not.toMatch(/"goal"|"context"|"score"/);
    expect(mocks.detail).toHaveBeenCalledWith("tunde");
  });

  it("rejects extra draft fields and never calls the service", async () => {
    const response = await POST(request("/api/advisor/outreach", "POST", { studentId: "tunde", goal: "private" }));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.draft).not.toHaveBeenCalled();
  });

  it("returns a saved draft without cacheable response headers", async () => {
    const draft = { id: "out-1", message: "Tunde, can we talk?", nextStep: "Call this week.", contacted: false };
    mocks.draft.mockResolvedValue(draft);
    const response = await POST(request("/api/advisor/outreach", "POST", { studentId: "tunde" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(draft);
    expect(mocks.draft).toHaveBeenCalledWith("tunde");
  });

  it("returns a clear retryable-week message when the weekly draft limit is reached", async () => {
    const { AdvisorServiceError } = await import("@/lib/services/advisor");
    mocks.draft.mockRejectedValue(new AdvisorServiceError("OUTREACH_WEEKLY_LIMIT"));
    const response = await POST(request("/api/advisor/outreach", "POST", { studentId: "tunde" }));
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("OUTREACH_WEEKLY_LIMIT");
  });

  it("rejects empty or extra contact fields before saving", async () => {
    const params = { params: Promise.resolve({ id: "out-1" }) };
    expect((await PATCH(request("/api/advisor/outreach/out-1", "PATCH", { contacted: true, message: " " }), params)).status).toBe(400);
    expect((await PATCH(request("/api/advisor/outreach/out-1", "PATCH", { contacted: true, message: "Hi", phone: "private" }), params)).status).toBe(400);
    expect(mocks.contact).not.toHaveBeenCalled();
  });

  it("saves the final edited message and hides internal failures", async () => {
    const params = { params: Promise.resolve({ id: "out-1" }) };
    mocks.contact.mockResolvedValueOnce({ id: "out-1", message: "Edited note", contacted: true });
    const response = await PATCH(request("/api/advisor/outreach/out-1", "PATCH", { contacted: true, message: "Edited note" }), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.contact).toHaveBeenCalledWith("out-1", "Edited note");
    mocks.contact.mockRejectedValueOnce(new Error("private database message"));
    const failed = await PATCH(request("/api/advisor/outreach/out-1", "PATCH", { contacted: true, message: "Edited note" }), params);
    expect(failed.status).toBe(503);
    expect(JSON.stringify(await failed.json())).not.toContain("private database message");
  });
});
