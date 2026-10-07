"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "@/lib/i18n";
import styles from "./AdvisorView.module.css";

type Draft = { id: string; message: string; nextStep: string; contacted: boolean };

export function OutreachEditor({ studentId, initialDraft }: { studentId: string; initialDraft: Draft | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [message, setMessage] = useState(initialDraft?.message ?? "");
  const [busy, setBusy] = useState<"draft" | "contact" | null>(null);
  const [status, setStatus] = useState<"copied" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function makeDraft() {
    setBusy("draft"); setError(null); setStatus(null);
    try {
      const response = await fetch("/api/advisor/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId }), cache: "no-store" });
      if (!response.ok) throw new Error();
      const next = await response.json() as Draft;
      setDraft(next); setMessage(next.message); router.refresh();
    } catch { setError(t("advisor.outreach.failed", "en")); }
    finally { setBusy(null); }
  }

  async function markContacted() {
    if (!draft || !message.trim()) { setError(t("advisor.outreach.invalid", "en")); return; }
    setBusy("contact"); setError(null); setStatus(null);
    try {
      const response = await fetch(`/api/advisor/outreach/${encodeURIComponent(draft.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacted: true, message }), cache: "no-store" });
      if (!response.ok) throw new Error();
      const next = await response.json() as Draft;
      setDraft(next); setMessage(next.message); setStatus("saved"); router.refresh();
    } catch { setError(t("advisor.outreach.contactFailed", "en")); }
    finally { setBusy(null); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(message); setStatus("copied"); setError(null); }
    catch { setError(t("advisor.outreach.copyFailed", "en")); }
  }

  return <div>
    <h3>{t("advisor.outreach.title", "en")}</h3>
    <p>{t("advisor.outreach.description", "en")}</p>
    {!draft && <button type="button" className={styles.button} disabled={busy !== null} onClick={makeDraft}>{busy === "draft" ? t("advisor.outreach.drafting", "en") : error ? t("advisor.outreach.retry", "en") : t("advisor.outreach.draft", "en")}</button>}
    {draft && <>
      <label className={styles.field} htmlFor="outreach-message">{t("advisor.outreach.message", "en")}</label>
      <textarea id="outreach-message" className={styles.message} maxLength={1000} value={message} onChange={(event) => { setMessage(event.target.value); setStatus(null); }} />
      <p><strong>{t("advisor.outreach.nextStep", "en")}:</strong> {draft.nextStep}</p>
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} disabled={!message || busy !== null} onClick={copy}>{t("advisor.outreach.copy", "en")}</button>
        <button type="button" className={styles.button} disabled={!message.trim() || busy !== null || (draft.contacted && message === draft.message)} onClick={markContacted}>{busy === "contact" ? t("advisor.outreach.saving", "en") : t("advisor.outreach.contact", "en")}</button>
      </div>
    </>}
    <p className={`${styles.status} ${error ? styles.error : ""}`} role={error ? "alert" : "status"} aria-live="polite">{error ?? (status === "copied" ? t("advisor.outreach.copied", "en") : status === "saved" ? t("advisor.outreach.saved", "en") : draft?.contacted ? t("advisor.outreach.saved", "en") : "")}</p>
  </div>;
}
