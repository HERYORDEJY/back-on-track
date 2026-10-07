import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/sessions/[id]/route";
import { checkInSession, SessionServiceError } from "@/lib/services/plans";

vi.mock("@/lib/services/plans", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/services/plans")>();
  return { ...original, checkInSession: vi.fn() };
});
beforeEach(() => vi.resetAllMocks());
const request = (body: string) => new Request("http://localhost/api/sessions/s1", { method: "PATCH", body });
const context = { params: Promise.resolve({ id: "s1" }) };

describe("session check-in API", () => {
  it("accepts a normal status and returns a no-store view", async () => {
    vi.mocked(checkInSession).mockResolvedValue({ today: "2026-10-19", student: { id: "amaka", name: "Amaka", goal: null, context: null, language: "pcm", availability: null, hoursVary: false, isSimulated: true }, plan: null });
    const response = await PATCH(request('{"status":"done"}'), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(checkInSession).toHaveBeenCalledExactlyOnceWith("s1", "done", undefined);
  });
  it("passes the original session date for a queued offline check-in", async () => {
    vi.mocked(checkInSession).mockResolvedValue({ today: "2026-10-20", student: { id: "amaka", name: "Amaka", goal: null, context: null, language: "pcm", availability: null, hoursVary: false, isSimulated: true }, plan: null });
    expect((await PATCH(request('{"status":"done","offlineSessionDate":"2026-10-19"}'), context)).status).toBe(200);
    expect(checkInSession).toHaveBeenCalledExactlyOnceWith("s1", "done", "2026-10-19");
  });
  it.each(['{"status":"pending"}', '{"status":"done","studentId":"amaka"}', '{"status":"done","offlineSessionDate":"yesterday"}', "null", "{"]) ("rejects invalid bodies: %s", async (body) => {
    expect((await PATCH(request(body), context)).status).toBe(400);
    expect(checkInSession).not.toHaveBeenCalled();
  });
  it("distinguishes absent and locked sessions", async () => {
    vi.mocked(checkInSession).mockRejectedValueOnce(new SessionServiceError("SESSION_NOT_FOUND")).mockRejectedValueOnce(new SessionServiceError("SESSION_LOCKED"));
    expect((await PATCH(request('{"status":"done"}'), context)).status).toBe(404);
    expect((await PATCH(request('{"status":"done"}'), context)).status).toBe(409);
  });
  it("keeps unexpected service errors private", async () => {
    vi.mocked(checkInSession).mockRejectedValue(new Error("secret database details"));
    const response = await PATCH(request('{"status":"done"}'), context);
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
