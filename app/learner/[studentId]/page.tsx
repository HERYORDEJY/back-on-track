import Link from "next/link";
import { notFound } from "next/navigation";
import { BuildPlanButton } from "@/components/learner/BuildPlanButton";
import { getPlanView, PlanServiceError } from "@/lib/services/plans";
import { t, type Language } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LearnerPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  let view;
  try { view = await getPlanView(studentId); }
  catch (error) { if (error instanceof PlanServiceError && error.code === "STUDENT_NOT_FOUND") notFound(); throw error; }
  const language: Language = view.student.language;
  const plan = view.plan;
  const tonight = plan?.sessions.find((session) => session.date === view.today) ?? plan?.sessions[0];
  return <main id="main" className="page-width learner-page">
    <nav className="learner-nav" aria-label={t("learner.personas", language)}>
      {(["amaka", "tunde", "zainab"] as const).map((id) => <Link key={id} href={`/learner/${id}`} aria-current={id === studentId ? "page" : undefined}>{t(`landing.person.${id}.name`, language)}</Link>)}
    </nav>
    <p className="eyebrow">{t("learner.sampleCourse", language)}</p>
    <h1>{view.student.name}</h1>
    {view.student.goal && <p className="learner-goal">{t("learner.goal", language)} {view.student.goal}</p>}
    {!plan ? <section className="plan-card">
      <h2>{t("learner.ready.title", language)}</h2>
      <p>{t("learner.ready.description", language)}</p>
      <BuildPlanButton studentId={studentId} language={language} />
    </section> : <div data-testid="plan-status" data-status={plan.status}>
      <section className="plan-card plan-summary" aria-labelledby="summary-title">
        <p className="eyebrow">{t(plan.status === "infeasible" ? "learner.status.needHelp" : plan.status === "cut" ? "learner.status.cut" : "learner.status.fit", language)}</p>
        <h2 id="summary-title">{t("learner.plan.title", language)}</h2>
        <p data-testid={plan.status === "infeasible" ? "infeasible-message" : undefined}>{plan.summary[language]}</p>
      </section>
      {tonight && <section className="plan-card" aria-labelledby="tonight-title">
        <h2 id="tonight-title">{t("learner.tonight", language)}</h2>
        <p className="plan-minutes">{t("time.minutes", language, { minutes: tonight.minutes })}</p>
        <ul>{tonight.pieces.map((piece, index) => <li key={`${piece.topicId}-${index}`}>{piece.title} · {t("time.minutes", language, { minutes: piece.minutes })}</li>)}</ul>
      </section>}
      {plan.warnings.length > 0 && <section className="plan-card" aria-label={t("learner.warnings", language)}><h2>{t("learner.warnings", language)}</h2>{plan.warnings.map((warning, index) => <p key={index}>{warning[language]}</p>)}</section>}
      <section className="plan-card" aria-labelledby="work-title">
        <h2 id="work-title">{t("learner.work", language)}</h2>
        <ul className="plan-items">{plan.items.map((item) => <li key={item.topicId}>
          <h3>{item.title}</h3>
          <p><strong>{t(item.action === "skip" ? "learner.action.skip" : item.action === "keep" ? "learner.action.keep" : "learner.action.shorten", language)}</strong> · {t("time.minutes", language, { minutes: item.minutes })}</p>
          <p>{item.rationale[language]}</p><p className="course-basis">{item.basis[language]}</p>
          {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">{t("learner.source", language)}</a>}
        </li>)}</ul>
      </section>
      {plan.unscheduled.length > 0 && <section className="plan-card"><h2>{t("plan.wontFit", language, { date: plan.focusDueDate ?? "" })}</h2><ul>{plan.unscheduled.map((item) => <li key={item.topicId}>{item.title} · {t("time.minutes", language, { minutes: item.minutes })}</li>)}</ul></section>}
      <p className="plan-totals">{t("learner.totals", language, { required: plan.requiredMin, available: plan.capacityMin })}</p>
    </div>}
  </main>;
}
