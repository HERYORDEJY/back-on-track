"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BusyOverlay } from "@/components/shared/BusyOverlay";
import { t, type Language } from "@/lib/i18n";
import type { SessionView } from "@/lib/types";
import { enqueueMutation } from "@/lib/offline";

export function SessionCheckIn({ session, language, studentId, queuedStatus, onQueued }: { session: SessionView; language: Language; studentId: string; queuedStatus: "done" | "missed" | null; onQueued: (sessionId: string, status: "done" | "missed") => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<"done" | "missed" | null>(null);

  async function checkIn(status: "done" | "missed") {
    if (!session.editable || busy || refreshing) return;
    setBusy(true);
    setError(false);
    setLastAttempt(status);
    function saveOnPhone() {
      const queued = enqueueMutation(studentId, { kind: "checkin", sessionId: session.id, sessionDate: session.date, status });
      if (!queued) { setError(true); return; }
      onQueued(session.id, status);
    }
    try {
      if (!navigator.onLine) { saveOnPhone(); return; }
      const response = await fetch(`/api/sessions/${encodeURIComponent(session.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 409 || response.status === 404) { setError(true); return; }
      if (!response.ok) { saveOnPhone(); return; }
      startTransition(() => router.refresh());
    } catch {
      saveOnPhone();
    } finally {
      setBusy(false);
    }
  }

  if (!session.editable) return null;
  return <div className="session-check-in">
    <BusyOverlay active={busy || refreshing} language={language} message={t("learner.checkIn.saving", language)} />
    <div className="flex flex-wrap gap-2">
      {session.status === "pending" ? <>
        <Button data-testid="session-done" type="button" disabled={busy || refreshing} onClick={() => checkIn("done")}>{t("learner.checkIn.done", language)}</Button>
        <Button type="button" variant="plain" disabled={busy || refreshing} onClick={() => checkIn("missed")}>{t("learner.checkIn.missed", language)}</Button>
      </> : <Button data-testid={session.status === "missed" ? "session-done" : undefined} type="button" variant="quiet" disabled={busy || refreshing} onClick={() => checkIn(session.status === "done" ? "missed" : "done")}>{t(session.status === "done" ? "learner.checkIn.changeMissed" : "learner.checkIn.changeDone", language)}</Button>}
    </div>
    {(busy || refreshing) && <p role="status">{t("learner.checkIn.saving", language)}</p>}
    {queuedStatus && <p role="status">{t("offline.checkInQueued", language)}</p>}
    {error && <div role="alert"><p>{t("learner.checkIn.failed", language)}</p><Button type="button" variant="plain" onClick={() => lastAttempt && checkIn(lastAttempt)}>{t("learner.retry", language)}</Button></div>}
  </div>;
}
