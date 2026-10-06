import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/learner/IntakeForm";
import { SessionCheckIn } from "@/components/learner/SessionCheckIn";
import { ReadAloud } from "@/components/shared/ReadAloud";
import { getPlanView, PlanServiceError } from "@/lib/services/plans";
import { t, type Language } from "@/lib/i18n";
import type { PlanView, SessionView } from "@/lib/types";

export const dynamic = "force-dynamic";

function SessionList({ sessions, language }: { sessions: SessionView[]; language: Language }) {
  return <ol className="m-0 list-none divide-y divide-[#d8e3f5] p-0">
    {sessions.map((session) => <li key={session.id} className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong>{session.dateLabel[language]}</strong>
        <span>{t("time.minutes", language, { minutes: session.minutes })} · {t(`learner.session.${session.status}`, language)}</span>
      </div>
      <p className="m-0 text-sm text-[#475973]">{session.pieces.map((piece) => piece.title).join(" · ")}</p>
    </li>)}
  </ol>;
}

function CourseDecisions({ plan, language }: { plan: NonNullable<PlanView["plan"]>; language: Language }) {
  return <section className="plan-card" aria-labelledby="work-title">
    <h2 id="work-title">{t("learner.work", language)}</h2>
    <ul className="plan-items">{plan.items.map((item) => <li key={item.topicId}>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          {item.title} · {t(item.action === "skip" ? "learner.action.skip" : item.action === "keep" ? "learner.action.keep" : "learner.action.shorten", language)}
        </summary>
        <div className="pb-2">
          <p>{t("time.minutes", language, { minutes: item.minutes })}</p>
          <p>{item.rationale[language]}</p>
          <p className="course-basis">{item.basis[language]}</p>
          {item.sourceUrl && <a className="inline-flex min-h-11 items-center font-semibold text-[#244ba6] underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{t("learner.source", language)}</a>}
        </div>
      </details>
    </li>)}</ul>
  </section>;
}

function PlanContent({ view }: { view: PlanView }) {
  const { student, plan } = view;
  if (!plan) return <IntakeForm student={student} />;
  const language = student.language;
  const featured = plan.featuredSession;
  const isToday = featured?.date === view.today;
  const nextStep = t("plan.nextStep.infeasible", language);
  const summaryText = plan.status === "infeasible" ? plan.summary[language].replace(nextStep, "").trim() : plan.summary[language];
  const spokenText = plan.status === "infeasible"
    ? `${summaryText} ${nextStep}`
    : `${plan.summary[language]} ${featured ? `${featured.dateLabel[language]}. ${t("time.minutes", language, { minutes: featured.minutes })}. ${featured.pieces.map((piece) => `${piece.title}, ${t("time.minutes", language, { minutes: piece.minutes })}`).join(". ")}` : ""}`;

  const summarySection = <section className="plan-card plan-summary" aria-labelledby="summary-title">
    <p className="eyebrow">{t(plan.status === "infeasible" ? "learner.status.needHelp" : plan.status === "cut" ? "learner.status.cut" : "learner.status.fit", language)}</p>
    <h2 id="summary-title">{t("learner.plan.title", language)}</h2>
    <p data-testid={plan.status === "infeasible" ? "infeasible-message" : undefined}>{summaryText}</p>
    {plan.status === "infeasible" && <p className="font-semibold text-[#1a705d]">{nextStep}</p>}
    {(plan.status === "infeasible" || !featured) && <ReadAloud language={language} text={spokenText} label={t("learner.readPlan", language)} />}
  </section>;

  const featuredSection = featured && <section className="plan-card border-[#b7c6df]" aria-labelledby="tonight-title">
    <p className="eyebrow">{featured.dateLabel[language]}</p>
    <h2 id="tonight-title">{t(isToday ? "learner.tonight" : "learner.nextSession", language)}</h2>
    <p className="plan-minutes">{t("time.minutes", language, { minutes: featured.minutes })}</p>
    <ul>{featured.pieces.map((piece, index) => <li key={`${piece.topicId}-${index}`}>{piece.title} · {t("time.minutes", language, { minutes: piece.minutes })}</li>)}</ul>
    {plan.status !== "infeasible" && <ReadAloud language={language} text={spokenText} label={t("learner.readPlan", language)} />}
    <SessionCheckIn session={featured} language={language} />
  </section>;

  return <div data-testid="plan-status" data-status={plan.status}>
    {plan.status === "infeasible" && summarySection}
    {featuredSection}
    {plan.status !== "infeasible" && summarySection}

    {plan.changeSummary && <section className="plan-card border-[#c8d8f3] bg-[#edf2fb]" data-testid="change-summary" aria-labelledby="change-title">
      <h2 id="change-title">{t("learner.change.title", language)}</h2><p>{plan.changeSummary[language]}</p>
    </section>}

    {plan.weeklyHoursDue && <section className="plan-card border-[#c8d8f3] bg-[#edf2fb]" aria-labelledby="hours-prompt-title">
      <h2 id="hours-prompt-title">{t("learner.hoursPrompt.title", language)}</h2><p>{t("learner.hoursPrompt.description", language)}</p>
      <a className="inline-flex min-h-11 items-center font-semibold text-[#244ba6] underline" href="#edit-hours">{t("learner.editHours", language)}</a>
    </section>}

    {plan.weekSessions.length > 0 && <section className="plan-card" aria-labelledby="week-title">
      <h2 id="week-title">{t("learner.week.title", language)}</h2>
      <SessionList sessions={plan.weekSessions} language={language} />
    </section>}

    {plan.status === "infeasible" && <section className="plan-card" aria-labelledby="fits-title">
      <h2 id="fits-title">{t("learner.fitsBefore", language, { date: plan.focusDateLabel?.[language] ?? plan.focusDueDate ?? "" })}</h2>
      {plan.sessions.length > 0 ? <SessionList sessions={plan.sessions} language={language} /> : <p>{t("learner.noScheduled", language)}</p>}
    </section>}

    {plan.warnings.length > 0 && <section className="plan-card" aria-labelledby="warnings-title"><h2 id="warnings-title">{t("learner.warnings", language)}</h2>{plan.warnings.map((warning, index) => <p key={index}>{warning[language]}</p>)}</section>}

    {plan.unscheduled.length > 0 && <section className="plan-card" aria-labelledby="unplaced-title">
      <h2 id="unplaced-title">{t("plan.wontFit", language, { date: plan.focusDateLabel?.[language] ?? plan.focusDueDate ?? "" })}</h2>
      <ul>{plan.unscheduled.map((item) => <li key={item.topicId}>{item.title} · {t("time.minutes", language, { minutes: item.minutes })}</li>)}</ul>
    </section>}

    <CourseDecisions plan={plan} language={language} />

    <section className="plan-card" aria-labelledby="workload-title">
      <h2 id="workload-title">{t("learner.workload.title", language)}</h2>
      <p>{t("learner.counts", language, plan.counts)}</p>
      <p>{t("learner.totals", language, { required: plan.requiredMin, available: plan.capacityMin })}</p>
      <div className="grid gap-2" role="group" aria-label={t("learner.workload.title", language)}>
        <label className="text-sm" htmlFor="required-work">{t("learner.workload.required", language)}</label>
        <progress id="required-work" className="h-3 w-full accent-[#315fcb]" max={Math.max(plan.requiredMin, plan.capacityMin, 1)} value={plan.requiredMin} />
        <label className="text-sm" htmlFor="available-time">{t("learner.workload.available", language)}</label>
        <progress id="available-time" className="h-3 w-full accent-[#1a705d]" max={Math.max(plan.requiredMin, plan.capacityMin, 1)} value={plan.capacityMin} />
      </div>
    </section>

    {plan.reminders.length > 0 && <section className="plan-card" aria-labelledby="reminders-title">
      <h2 id="reminders-title">{t("learner.reminders.title", language)}</h2>
      <ul>{plan.reminders.map((reminder) => <li key={reminder.id}><strong>{reminder.atLabel[language]}</strong> · {reminder.text[language]}</li>)}</ul>
    </section>}

    <details className="plan-card" id="edit-hours">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("learner.editHours", language)}</summary>
      <IntakeForm student={student} editing />
    </details>
  </div>;
}

export default async function LearnerPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  let view: PlanView;
  try { view = await getPlanView(studentId); }
  catch (error) { if (error instanceof PlanServiceError && error.code === "STUDENT_NOT_FOUND") notFound(); throw error; }
  const language = view.student.language;
  return <main id="main" className="page-width learner-page">
    <nav className="learner-nav" aria-label={t("learner.personas", language)}>
      {(["amaka", "tunde", "zainab"] as const).map((id) => <a key={id} href={`/learner/${id}`} aria-current={id === studentId ? "page" : undefined}>{t(`landing.person.${id}.name`, language)}</a>)}
    </nav>
    <p className="eyebrow">{t("learner.sampleCourse", language)}</p>
    <h1>{view.student.name}</h1>
    {view.student.goal && <p className="learner-goal">{t("learner.goal", language)} {view.student.goal}</p>}
    <PlanContent view={view} />
  </main>;
}
