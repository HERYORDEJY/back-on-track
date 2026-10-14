import { getStudentDetail } from "@/lib/services/advisor";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 80) return Response.json({ error: { code: "STUDENT_INVALID", message: t("advisor.outreach.notFound", "en") } }, { status: 400, headers });
  try {
    const detail = await getStudentDetail(id);
    return detail
      ? Response.json(detail, { headers })
      : Response.json({ error: { code: "STUDENT_NOT_FOUND", message: t("advisor.outreach.notFound", "en") } }, { status: 404, headers });
  } catch {
    return Response.json({ error: { code: "ADVISOR_UNAVAILABLE", message: t("advisor.detail.failed", "en") } }, { status: 503, headers });
  }
}
