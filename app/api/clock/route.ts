import { z } from "zod";
import { changeClock, getClockView } from "@/lib/services/clock";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const jumpSchema = z.union([
  z.object({ jumpDays: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).strict(),
  z.object({ toWeek: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).strict(),
]);

function clockFailure(error: unknown): Response {
  const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "CLOCK_UNAVAILABLE";
  if (code === "CLOCK_JUMP_INVALID") {
    return Response.json({ error: { code, message: t("clock.invalid", "en") } }, { status: 400 });
  }
  return Response.json({ error: { code: "CLOCK_UNAVAILABLE", message: t("clock.unavailable", "en") } }, { status: 503 });
}

export async function GET() {
  try { return Response.json(await getClockView(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return clockFailure(error); }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = jumpSchema.safeParse(payload);
  if (!result.success) {
    return Response.json({ error: { code: "CLOCK_JUMP_INVALID", message: t("clock.invalid", "en") } }, { status: 400 });
  }
  try { return Response.json(await changeClock(result.data), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return clockFailure(error); }
}
