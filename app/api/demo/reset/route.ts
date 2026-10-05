import { z } from "zod";
import { resetDemo } from "@/lib/services/demo";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const empty = z.object({}).strict();
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const text = await request.text();
  let body: unknown = {};
  try { if (text.trim()) body = JSON.parse(text); }
  catch { body = null; }
  if (!empty.safeParse(body).success) {
    return Response.json({ error: { code: "DEMO_RESET_INVALID", message: t("demo.invalid", "en") } }, { status: 400, headers });
  }
  try { return Response.json(await resetDemo(), { headers }); }
  catch {
    return Response.json({ error: { code: "DEMO_RESET_UNAVAILABLE", message: t("demo.failed", "en") } }, { status: 503, headers });
  }
}
