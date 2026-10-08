"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm } from "@/components/learner/IntakeForm";
import { SessionCheckIn } from "@/components/learner/SessionCheckIn";
import { DeleteMyData } from "@/components/learner/DeleteMyData";
import { AdvisorVisibility } from "@/components/learner/AdvisorVisibility";
import { ReadAloud } from "@/components/shared/ReadAloud";
import { t, type Language } from "@/lib/i18n";
import type { PlanView, SessionView } from "@/lib/types";
import { prepareLearnerPage, readMutationQueue, readPlanSnapshot, savePlanSnapshot, syncMutationQueue, type OfflineMutation, type OfflineRisk, type SyncResult } from "@/lib/offline";

function SessionList({ sessions, language }: { sessions: SessionView[]; language: Language }) {
  return <ol className="m-0 list-none divide-y divide-rail p-0">
    {sessions.map((session) => <li key={session.id} className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong>{session.dateLabel[language]}</strong>
        <span>{t("time.minutes", language, { minutes: session.minutes })} · {t(`learner.session.${session.status}`, language)}</span>
      </div>
      <p className="m-0 text-sm text-slate">{session.pieces.map((piece) => piece.title).join(" · ")}</p>
    </li>)}
  </ol>;
}

function CourseDecisions({ plan, language }: { plan: NonNullable<PlanView["plan"]>; language: Language }) {
  return <section className="plan-card" aria-labelledby="work-title">
    <h2 id="work-title">{t("learner.work", language)}</h2>
    <ul className="plan-items">{plan.items.map((item) => <li key={item.topicId}>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 font-bold">
          {item.title} · {t(item.action === "skip" ? "learner.action.skip" : item.action === "keep" ? "learner.action.keep" : "learner.action.shorten", language)}
        </summary>
        <div className="pb-2">
          <p>{t("time.minutes", language, { minutes: item.minutes })}</p>
          <p>{item.rationale[language]}</p>
          <p className="course-basis">{item.basis[language]}</p>
          {item.sourceUrl && <a className="inline-flex min-h-11 items-center font-bold text-night underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{t("learner.source", language)}</a>}
        </div>
      </details>
    </li>)}</ul>
  </section>;
}

function PlanContent({ view, risk, queued, onQueued }: { view: PlanView; risk: OfflineRisk | null; queued: OfflineMutation[]; onQueued: (sessionId: string, status: "done" | "missed") => void }) {
  const { student, plan } = view;
  if (!plan) return <IntakeForm student={student} />;
  const language = student.language;
  const featured = plan.featuredSession;
  const pendingCheckIn = queued.find((item) => item.kind === "checkin" && item.sessionId === featured?.id);
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
    {plan.status === "infeasible" && <p className="font-bold text-night">{nextStep}</p>}
    {(plan.status === "infeasible" || !featured) && <ReadAloud language={language} text={spokenText} label={t("learner.readPlan", language)} />}
  </section>;

  const featuredSection = featured && <section className="plan-card border-rail" aria-labelledby="tonight-title">
    <p className="eyebrow">{featured.dateLabel[language]}</p>
    <h2 id="tonight-title">{t(isToday ? "learner.tonight" : "learner.nextSession", language)}</h2>
    <p className="plan-minutes">{t("time.minutes", language, { minutes: featured.minutes })}</p>
    <ul>{featured.pieces.map((piece, index) => <li key={`${piece.topicId}-${index}`}>{piece.title} · {t("time.minutes", language, { minutes: piece.minutes })}</li>)}</ul>
    {plan.status !== "infeasible" && <ReadAloud language={language} text={spokenText} label={t("learner.readPlan", language)} />}
    <SessionCheckIn session={featured} language={language} studentId={student.id} queuedStatus={pendingCheckIn?.kind === "checkin" ? pendingCheckIn.status : null} onQueued={onQueued} />
  </section>;

  return <div data-testid="plan-status" data-status={plan.status}>
    {plan.status === "infeasible" && summarySection}
    {featuredSection}
    {plan.status !== "infeasible" && summarySection}

    {plan.changeSummary && <section className="plan-card border-rail bg-mist" data-testid="change-summary" aria-labelledby="change-title">
      <h2 id="change-title">{t("learner.change.title", language)}</h2><p>{plan.changeSummary[language]}</p>
    </section>}

    {plan.weeklyHoursDue && <section className="plan-card border-rail bg-mist" aria-labelledby="hours-prompt-title">
      <h2 id="hours-prompt-title">{t("learner.hoursPrompt.title", language)}</h2><p>{t("learner.hoursPrompt.description", language)}</p>
      <a className="inline-flex min-h-11 items-center font-bold text-night underline" href="#edit-hours">{t("learner.editHours", language)}</a>
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
        <progress id="required-work" className="h-3 w-full accent-night" max={Math.max(plan.requiredMin, plan.capacityMin, 1)} value={plan.requiredMin} />
        <label className="text-sm" htmlFor="available-time">{t("learner.workload.available", language)}</label>
        <progress id="available-time" className="h-3 w-full accent-night" max={Math.max(plan.requiredMin, plan.capacityMin, 1)} value={plan.capacityMin} />
      </div>
    </section>

    <AdvisorVisibility risk={risk} language={language} studentId={student.id} />

    {plan.reminders.length > 0 && <section className="plan-card" aria-labelledby="reminders-title">
      <h2 id="reminders-title">{t("learner.reminders.title", language)}</h2>
      <ul>{plan.reminders.map((reminder) => <li key={reminder.id}><strong>{reminder.atLabel[language]}</strong> · {reminder.text[language]}</li>)}</ul>
    </section>}

    <details className="plan-card" id="edit-hours">
      <summary className="min-h-11 cursor-pointer py-2 font-bold">{t("learner.editHours", language)}</summary>
      <IntakeForm student={student} editing />
    </details>
  </div>;
}

function withSessionStatus(view: PlanView, sessionId: string, status: "done" | "missed"): PlanView {
  if (!view.plan) return view;
  const update = (session: SessionView) => session.id === sessionId ? { ...session, status } : session;
  return { ...view, plan: { ...view.plan,
    sessions: view.plan.sessions.map(update),
    weekSessions: view.plan.weekSessions.map(update),
    featuredSession: view.plan.featuredSession ? update(view.plan.featuredSession) : null,
  } };
}

export function LearnerContent({ initialView, initialRisk }: { initialView: PlanView; initialRisk: OfflineRisk | null }) {
  const router = useRouter();
  const studentId = initialView.student.id;
  const [saved, setSaved] = useState<{ view: PlanView; risk: OfflineRisk | null } | null>(null);
  const view = saved?.view ?? initialView;
  const risk = saved ? saved.risk : initialRisk;
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<OfflineMutation[]>([]);
  const [issue, setIssue] = useState<SyncResult["issue"]>(null);
  const [lateSynced, setLateSynced] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [offlineReady, setOfflineReady] = useState<boolean | null>(null);
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    const result = await syncMutationQueue(studentId);
    setQueue(readMutationQueue(studentId) ?? []);
    setIssue(result.issue);
    if (result.late) setLateSynced((count) => count + result.late);
    setSyncing(false);
    syncingRef.current = false;
    if (!result.issue) { setSaved(null); router.refresh(); }
  }, [studentId, router]);

  useEffect(() => {
    if (!navigator.onLine) return;
    if (initialView.plan) {
      queueMicrotask(() => setOfflineReady(null));
      void prepareLearnerPage().then(setOfflineReady);
    }
  }, [initialView]);

  useEffect(() => {
    if (view.plan && (navigator.onLine || offline)) savePlanSnapshot(studentId, view, risk);
  }, [studentId, view, risk, offline]);

  useEffect(() => {
    let cancelled = false;
    function wentOffline() {
      setOffline(true);
      const snapshot = readPlanSnapshot(studentId);
      if (snapshot) {
        const pendingLanguage = readMutationQueue(studentId)?.findLast((item) => item.kind === "language");
        const language = pendingLanguage?.kind === "language" ? pendingLanguage.language : snapshot.view.student.language;
        setSaved({ view: { ...snapshot.view, student: { ...snapshot.view.student, language } }, risk: snapshot.risk });
      }
    }
    function cameOnline() { setOffline(false); void sync(); }
    function resetLocal() {
      setSaved(null);
      setQueue([]);
      setIssue(null);
      setLateSynced(0);
      setOfflineReady(null);
    }
    function changedLanguage(event: Event) {
      const detail = (event as CustomEvent<{ studentId: string; language: Language }>).detail;
      if (detail?.studentId !== studentId) return;
      setSaved((current) => ({
        view: { ...(current?.view ?? initialView), student: { ...(current?.view ?? initialView).student, language: detail.language } },
        risk: current?.risk ?? initialRisk,
      }));
      setQueue(readMutationQueue(studentId) ?? []);
    }
    window.addEventListener("offline", wentOffline);
    window.addEventListener("online", cameOnline);
    window.addEventListener("back-on-track:language", changedLanguage);
    window.addEventListener("back-on-track:reset", resetLocal);
    queueMicrotask(() => {
      if (cancelled) return;
      const savedQueue = readMutationQueue(studentId);
      setQueue(savedQueue ?? []);
      if (!savedQueue) setIssue("storage");
      if (!navigator.onLine) wentOffline();
      else if (savedQueue?.length) void sync();
    });
    return () => {
      cancelled = true;
      window.removeEventListener("offline", wentOffline);
      window.removeEventListener("online", cameOnline);
      window.removeEventListener("back-on-track:language", changedLanguage);
      window.removeEventListener("back-on-track:reset", resetLocal);
    };
  }, [studentId, initialView, initialRisk, sync]);

  function queuedCheckIn(sessionId: string, status: "done" | "missed") {
    setSaved((current) => ({ view: withSessionStatus(current?.view ?? initialView, sessionId, status), risk: current?.risk ?? initialRisk }));
    setQueue(readMutationQueue(studentId) ?? []);
  }

  const language = view.student.language;
  const pending = queue.length;
  return <main id="main" className="page-width learner-page">
    <nav className="learner-nav" aria-label={t("learner.personas", language)}>
      {(["amaka", "tunde", "zainab"] as const).map((id) => <a key={id} href={`/learner/${id}`} aria-current={id === studentId ? "page" : undefined}>{t(`landing.person.${id}.name`, language)}</a>)}
    </nav>
    {(view.plan || pending > 0 || issue || lateSynced > 0) && <div className="offline-notice" role="status" data-testid="offline-note">
      <p>{offline ? t(saved ? "offline.saved" : "offline.noSnapshot", language) : pending ? t("offline.pending", language, { count: pending }) : offlineReady === null ? t("offline.preparing", language) : t(offlineReady ? "offline.ready" : "offline.unavailable", language)}</p>
      {syncing && <p>{t("offline.syncing", language)}</p>}
      {lateSynced > 0 && <p>{t("offline.syncedLate", language, { count: lateSynced })}</p>}
      {issue && <p role="alert">{t(`offline.issue.${issue}`, language)}</p>}
      {!offline && (pending > 0 || offlineReady === false) && <button type="button" disabled={syncing} onClick={() => { if (pending) void sync(); else void prepareLearnerPage().then(setOfflineReady); }}>{t("offline.retry", language)}</button>}
    </div>}
    <p className="eyebrow">{t("learner.sampleCourse", language)}</p>
    <h1>{view.student.name}</h1>
    {view.student.goal && <p className="learner-goal">{t("learner.goal", language)} {view.student.goal}</p>}
    <PlanContent view={view} risk={risk} queued={queue} onQueued={queuedCheckIn} />
    <DeleteMyData studentId={studentId} language={language} />
  </main>;
}
