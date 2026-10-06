import { z } from "zod";
import { checkInSession, SessionServiceError } from "@/lib/services/plans";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const bodySchema = z.strictObject({ status: z.enum(["done", "missed"]) });
const headers = { "Cache-Control": "no-store" };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  const { id } = await context.params;
  if (!body.success || !id) return Response.json({ error: { code: "SESSION_INVALID", message: t("student.error.invalid", "en") } }, { status: 400, headers });
  try { return Response.json(await checkInSession(id, body.data.status), { headers }); }
  catch (error) {
    if (error instanceof SessionServiceError) {
      return Response.json({ error: { code: error.code, message: t(error.code === "SESSION_LOCKED" ? "learner.checkIn.locked" : "learner.checkIn.failed", "en") } }, { status: error.code === "SESSION_NOT_FOUND" ? 404 : 409, headers });
    }
    return Response.json({ error: { code: "SESSION_UNAVAILABLE", message: t("learner.checkIn.failed", "en") } }, { status: 503, headers });
  }
}
