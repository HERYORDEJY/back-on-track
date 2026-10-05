import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDemo } from "@/lib/services/demo";
import { POST } from "@/app/api/demo/reset/route";

vi.mock("@/lib/services/demo", () => ({ resetDemo: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const request = (body?: string) => new Request("http://localhost/api/demo/reset", { method: "POST", body });

describe("demo reset API", () => {
  it.each([undefined, "{}"])("accepts the global reset with body %s", async (body) => {
    vi.mocked(resetDemo).mockResolvedValue({ now: "2026-10-19T17:00:00.000Z" });
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ now: "2026-10-19T17:00:00.000Z" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(resetDemo).toHaveBeenCalledExactlyOnceWith();
  });
  it.each(['{"studentId":"cohort-001"}', '{"all":true}', "null", "[]", "{"])("rejects malformed or unexpected reset scope: %s", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(resetDemo).not.toHaveBeenCalled();
  });
  it("exposes a retryable generic failure without database details", async () => {
    vi.mocked(resetDemo).mockRejectedValue(new Error("secret database details"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: { code: "DEMO_RESET_UNAVAILABLE", message: "The demo could not be reset. Try again." } });
  });
});
