import { z } from "zod";
import { draftOutreach, AdvisorServiceError } from "@/lib/services/advisor";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const bodySchema = z.strictObject({ studentId: z.string().min(1).max(80) });

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: { code: "OUTREACH_INVALID", message: t("advisor.outreach.invalid", "en") } }, { status: 400, headers });
  try { return Response.json(await draftOutreach(body.data.studentId), { headers }); }
  catch (error) {
    if (error instanceof AdvisorServiceError) return Response.json({ error: { code: error.code, message: t("advisor.outreach.notFound", "en") } }, { status: 404, headers });
    return Response.json({ error: { code: "OUTREACH_UNAVAILABLE", message: t("advisor.outreach.unavailable", "en") } }, { status: 503, headers });
  }
}
