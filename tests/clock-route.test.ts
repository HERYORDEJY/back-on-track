import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeClock, getClockView } from "@/lib/services/clock";
import { GET, POST } from "@/app/api/clock/route";

vi.mock("@/lib/services/clock", () => ({ changeClock: vi.fn(), getClockView: vi.fn() }));
const view = { now: "2026-10-19T17:00:00.000Z", week: 7, date: { en: "Mon 19 Oct", pcm: "Mon 19 Oct" }, atLimit: false, futureWeeks: [8, 9, 10, 11, 12, 13] };
beforeEach(() => vi.resetAllMocks());
const request = (body: unknown) => new Request("http://localhost/api/clock", { method: "POST", body: JSON.stringify(body) });

describe("clock API", () => {
  it("returns a fresh view with no-store", async () => {
    vi.mocked(getClockView).mockResolvedValue(view);
    const response = await GET();
    expect(await response.json()).toEqual(view);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([{ jumpDays: 1 }, { toWeek: 10 }])("passes an accepted jump to the service: %j", async (jump) => {
    vi.mocked(changeClock).mockResolvedValue(view);
    const response = await POST(request(jump));
    expect(response.status).toBe(200);
    expect(changeClock).toHaveBeenCalledExactlyOnceWith(jump);
  });
  it.each([{}, { jumpDays: 0 }, { jumpDays: 1.5 }, { jumpDays: "1" }, { toWeek: 8, jumpDays: 1 }, { toWeek: 8, reset: true }, { reset: true }])("rejects invalid or unexpected input without a mutation: %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(changeClock).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON without a mutation", async () => {
    const response = await POST(new Request("http://localhost/api/clock", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(changeClock).not.toHaveBeenCalled();
  });
  it("returns a visible input error for a same-week or backward jump", async () => {
    vi.mocked(changeClock).mockRejectedValue(Object.assign(new Error("invalid"), { code: "CLOCK_JUMP_INVALID" }));
    expect((await POST(request({ toWeek: 7 }))).status).toBe(400);
  });
  it("does not leak database messages, stack traces or error codes", async () => {
    vi.mocked(getClockView).mockRejectedValue(Object.assign(new Error("private database details"), { code: "DB_INTERNAL" }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "CLOCK_UNAVAILABLE", message: "The demo clock is unavailable. Try again." } });
  });
});
