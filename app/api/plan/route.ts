import { z } from "zod";
import { createPlan, PlanServiceError } from "@/lib/services/plans";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const bodySchema = z.strictObject({ studentId: z.string().min(1).max(80) });
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: { code: "PLAN_INVALID", message: t("plan.error.invalid", "en") } }, { status: 400, headers });
  try { return Response.json(await createPlan(body.data.studentId), { headers }); }
  catch (error) {
    if (error instanceof PlanServiceError) {
      const status = error.code === "STUDENT_NOT_FOUND" ? 404 : 400;
      return Response.json({ error: { code: error.code, message: t(error.code === "STUDENT_NOT_FOUND" ? "plan.error.notFound" : "plan.error.hours", "en") } }, { status, headers });
    }
    return Response.json({ error: { code: "PLAN_UNAVAILABLE", message: t("plan.error.unavailable", "en") } }, { status: 503, headers });
  }
}
