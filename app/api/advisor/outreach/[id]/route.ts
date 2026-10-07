import { z } from "zod";
import { AdvisorServiceError, markContacted } from "@/lib/services/advisor";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const bodySchema = z.strictObject({ contacted: z.literal(true), message: z.string().trim().min(1).max(1000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!id || id.length > 80 || !body.success) return Response.json({ error: { code: "OUTREACH_INVALID", message: t("advisor.outreach.invalid", "en") } }, { status: 400, headers });
  try { return Response.json(await markContacted(id, body.data.message), { headers }); }
  catch (error) {
    if (error instanceof AdvisorServiceError) return Response.json({ error: { code: error.code, message: t("advisor.outreach.notFound", "en") } }, { status: 404, headers });
    return Response.json({ error: { code: "OUTREACH_UNAVAILABLE", message: t("advisor.outreach.unavailable", "en") } }, { status: 503, headers });
  }
}
