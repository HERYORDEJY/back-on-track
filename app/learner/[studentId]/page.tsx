import { notFound } from "next/navigation";
import { LearnerContent } from "@/components/learner/LearnerContent";
import { getPlanView, PlanServiceError } from "@/lib/services/plans";
import { getStudentRiskView } from "@/lib/services/advisor";
import type { PlanView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LearnerPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  let view: PlanView;
  try { view = await getPlanView(studentId); }
  catch (error) { if (error instanceof PlanServiceError && error.code === "STUDENT_NOT_FOUND") notFound(); throw error; }
  const risk = view.plan ? await getStudentRiskView(studentId).catch(() => null) : null;
  return <LearnerContent initialView={view} initialRisk={risk} />;
}
