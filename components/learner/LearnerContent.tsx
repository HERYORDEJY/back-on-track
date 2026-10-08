"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm } from "@/components/learner/IntakeForm";
import { PlanScreen } from "@/components/learner/PlanScreen";
import { DeleteMyData } from "@/components/learner/DeleteMyData";
import { t, type Language } from "@/lib/i18n";
import type { PlanView, SessionView } from "@/lib/types";
import { prepareLearnerPage, readMutationQueue, readPlanSnapshot, savePlanSnapshot, syncMutationQueue, type OfflineMutation, type OfflineRisk, type SyncResult } from "@/lib/offline";

function withSessionStatus(view: PlanView, sessionId: string, status: "done" | "missed"): PlanView {
  if (!view.plan) return view;
  const update = (session: SessionView) => session.id === sessionId ? { ...session, status } : session;
  return { ...view, plan: { ...view.plan,
    sessions: view.plan.sessions.map(update),
    weekSessions: view.plan.weekSessions.map(update),
    featuredSession: view.plan.featuredSession ? update(view.plan.featuredSession) : null,
    stops: view.plan.stops.map((stop) => stop.kind === "session" && stop.id === sessionId ? { ...stop, state: status } : stop),
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
      setSaved(null); setQueue([]); setIssue(null); setLateSynced(0); setOfflineReady(null);
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
  const quietOfflineStatus = Boolean(view.plan && !pending && !issue && !lateSynced && (!offline || saved));
  return <main id="main" className={`learner-page${view.plan ? " learner-page--plan" : " learner-page--intake"}`}>
    <div className="learner-page__inner">
      {(view.plan || pending > 0 || issue || lateSynced > 0) && <div className={quietOfflineStatus ? "sr-only" : "offline-notice"} role="status" data-testid="offline-note">
        <p>{offline ? t(saved ? "offline.saved" : "offline.noSnapshot", language) : pending ? t("offline.pending", language, { count: pending }) : offlineReady === null ? t("offline.preparing", language) : t(offlineReady ? "offline.ready" : "offline.unavailable", language)}</p>
        {syncing && <p>{t("offline.syncing", language)}</p>}
        {lateSynced > 0 && <p>{t("offline.syncedLate", language, { count: lateSynced })}</p>}
        {issue && <p role="alert">{t(`offline.issue.${issue}`, language)}</p>}
        {!offline && (pending > 0 || offlineReady === false) && <button type="button" disabled={syncing} onClick={() => { if (pending) void sync(); else void prepareLearnerPage().then(setOfflineReady); }}>{t("offline.retry", language)}</button>}
      </div>}
      {view.plan ? <PlanScreen view={view} risk={risk} queued={queue} onQueued={queuedCheckIn} offline={offline} /> : <IntakeForm student={view.student} />}
      {!view.plan && <DeleteMyData studentId={studentId} language={language} />}
      <nav className="learner-nav" aria-label={t("learner.personas", language)}>
        {(["amaka", "tunde", "zainab"] as const).map((id) => <a key={id} href={`/learner/${id}`} aria-current={id === studentId ? "page" : undefined}>{t(`landing.person.${id}.name`, language)}</a>)}
      </nav>
    </div>
  </main>;
}
