"use client";

import { useState } from "react";
import { t, type Language } from "@/lib/i18n";
import { clearStudentLocalData } from "@/lib/offline";
import { Button } from "@/components/ui/button";

export function DeleteMyData({ studentId, language }: { studentId: string; language: Language }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverDeleted, setServerDeleted] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<"server" | "device" | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      if (!serverDeleted) {
        const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Delete failed");
        setServerDeleted(true);
      }
      if (!await clearStudentLocalData(studentId)) {
        setError("device");
        return;
      }
      setDeleted(true);
      setConfirming(false);
      window.location.replace("/?deleted=1");
    } catch { setError("server"); }
    finally { setBusy(false); }
  }

  return <section className="delete-data" aria-labelledby="delete-data-title">
    <h2 id="delete-data-title">{t("learner.delete.title", language)}</h2>
    {deleted ? <p role="status">{t("learner.delete.done", language)}</p> : <>
      <p>{t("learner.delete.description", language)}</p>
      {!confirming ? <Button type="button" variant="text" onClick={() => setConfirming(true)}>{t("learner.delete.open", language)}</Button> : <div className="delete-data__confirm">
        <p>{t("learner.delete.confirm", language)}</p>
        <div className="delete-data__actions">
          {!serverDeleted && <Button type="button" variant="text" disabled={busy} onClick={() => { setConfirming(false); setError(null); }}>{t("learner.delete.keep", language)}</Button>}
          <Button type="button" variant="plain" disabled={busy} onClick={() => void remove()}>{t(busy ? "learner.delete.deleting" : serverDeleted ? "learner.delete.retryDevice" : "learner.delete.remove", language)}</Button>
        </div>
      </div>}
      {error && <p role="alert">{t(error === "device" ? "learner.delete.deviceFailed" : "learner.delete.failed", language)}</p>}
    </>}
  </section>;
}
