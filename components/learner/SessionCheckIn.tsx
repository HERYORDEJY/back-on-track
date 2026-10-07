"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  if (!session.editable) return <p className="text-sm text-[#475973]">{t(session.status === "pending" ? "learner.checkIn.notToday" : "learner.checkIn.locked", language)}</p>;
  return <div className="mt-4">
    <div className="flex flex-wrap gap-2">
      <Button data-testid="session-done" type="button" disabled={busy || refreshing || session.status === "done"} onClick={() => checkIn("done")}>{t("learner.checkIn.done", language)}</Button>
      <Button type="button" variant="outline" disabled={busy || refreshing || session.status === "missed"} onClick={() => checkIn("missed")}>{t("learner.checkIn.missed", language)}</Button>
    </div>
    {(busy || refreshing) && <p role="status">{t("learner.checkIn.saving", language)}</p>}
    {queuedStatus && <p role="status">{t("offline.checkInQueued", language)}</p>}
    {error && <div role="alert"><p>{t("learner.checkIn.failed", language)}</p><Button type="button" variant="outline" onClick={() => lastAttempt && checkIn(lastAttempt)}>{t("learner.retry", language)}</Button></div>}
  </div>;
}
