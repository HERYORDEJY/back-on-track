import { studentPatchSchema, StudentServiceError, updateStudent, deleteStudentData } from "@/lib/services/students";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = studentPatchSchema.safeParse(await request.json().catch(() => null));
  if (!id || id.length > 80 || !body.success) return Response.json({ error: { code: "STUDENT_INVALID", message: t("student.error.invalid", "en") } }, { status: 400, headers });
  try { return Response.json(await updateStudent(id, body.data), { headers }); }
  catch (error) {
    if (error instanceof StudentServiceError) return Response.json({ error: { code: error.code, message: t("student.error.notFound", "en") } }, { status: 404, headers });
    return Response.json({ error: { code: "STUDENT_UNAVAILABLE", message: t("student.error.unavailable", "en") } }, { status: 503, headers });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text().catch(() => null);
  if (!id || id.length > 80 || body !== "") return Response.json({ error: { code: "STUDENT_INVALID", message: t("student.error.invalid", "en") } }, { status: 400, headers });
  try { return Response.json(await deleteStudentData(id), { headers }); }
  catch (error) {
    if (error instanceof StudentServiceError) return Response.json({ error: { code: error.code, message: t("student.error.notFound", "en") } }, { status: 404, headers });
    return Response.json({ error: { code: "STUDENT_UNAVAILABLE", message: t("student.error.unavailable", "en") } }, { status: 503, headers });
  }
}
