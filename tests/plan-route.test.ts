import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/plan/route";
import { createPlan, PlanServiceError } from "@/lib/services/plans";

vi.mock("@/lib/services/plans", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/services/plans")>();
  return { ...original, createPlan: vi.fn() };
});
beforeEach(() => vi.resetAllMocks());
const request = (body: string) => new Request("http://localhost/api/plan", { method: "POST", body });

describe("plan API", () => {
  it("accepts only a student id and returns a no-store view", async () => {
    vi.mocked(createPlan).mockResolvedValue({ today: "2026-10-19", student: { id: "amaka", name: "Amaka", goal: null, language: "pcm", availability: null }, plan: null });
    const response = await POST(request('{"studentId":"amaka"}'));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(createPlan).toHaveBeenCalledExactlyOnceWith("amaka");
  });
  it.each(['{"studentId":"amaka","ignore":true}', '{"studentId":""}', "null", "{"])("rejects invalid bodies: %s", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(createPlan).not.toHaveBeenCalled();
  });
  it("keeps unexpected service errors private", async () => {
    vi.mocked(createPlan).mockRejectedValue(new Error("secret database details"));
    const response = await POST(request('{"studentId":"amaka"}'));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
  it("returns a useful status for unknown students and missing hours", async () => {
    vi.mocked(createPlan).mockRejectedValueOnce(new PlanServiceError("STUDENT_NOT_FOUND")).mockRejectedValueOnce(new PlanServiceError("AVAILABILITY_REQUIRED"));
    expect((await POST(request('{"studentId":"unknown"}'))).status).toBe(404);
    expect((await POST(request('{"studentId":"amaka"}'))).status).toBe(400);
  });
});
