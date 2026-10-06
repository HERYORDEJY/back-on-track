"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t, type Language } from "@/lib/i18n";
import type { SessionView } from "@/lib/types";

export function SessionCheckIn({ session, language }: { session: SessionView; language: Language }) {
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
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(session.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Check-in unavailable");
      startTransition(() => router.refresh());
    } catch {
      setError(true);
      router.refresh();
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
    {error && <div role="alert"><p>{t("learner.checkIn.failed", language)}</p><Button type="button" variant="outline" onClick={() => lastAttempt && checkIn(lastAttempt)}>{t("learner.retry", language)}</Button></div>}
  </div>;
}
