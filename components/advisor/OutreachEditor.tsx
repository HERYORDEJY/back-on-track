"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { BusyOverlay } from "@/components/shared/BusyOverlay";
import { Button } from "@/components/ui/button";
import styles from "./AdvisorView.module.css";

type Draft = { id: string; message: string; nextStep: string; contacted: boolean; createdAt: string; source?: string };

export function OutreachEditor({ studentId, initialDraft, initialDraftsUsed }: { studentId: string; initialDraft: Draft | null; initialDraftsUsed: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [draftsUsed, setDraftsUsed] = useState(initialDraftsUsed);
  const [message, setMessage] = useState(initialDraft?.message ?? "");
  const [busy, setBusy] = useState<"draft" | "contact" | null>(null);
  const [status, setStatus] = useState<"copied" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function makeDraft() {
    if (draftsUsed >= 2) { setError(t("advisor.outreach.weeklyLimit", "en")); return; }
    setBusy("draft"); setError(null); setStatus(null);
    try {
      const response = await fetch("/api/advisor/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId }), cache: "no-store" });
      if (response.status === 429) { setDraftsUsed(2); throw new Error("weekly-limit"); }
      if (!response.ok) throw new Error();
      const next = await response.json() as Draft;
      setDraft(next); setMessage(next.message); if (next.source !== "saved") setDraftsUsed((used) => used + 1); router.refresh();
    } catch (caught) { setError(t(caught instanceof Error && caught.message === "weekly-limit" ? "advisor.outreach.weeklyLimit" : "advisor.outreach.failed", "en")); }
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
    <BusyOverlay active={busy !== null} language="en" message={t(busy === "contact" ? "advisor.outreach.saving" : "advisor.outreach.drafting", "en")} />
    <h3>{t("advisor.outreach.title", "en")}</h3>
    <p>{t("advisor.outreach.description", "en")}</p>
    <p className={styles.draftCount}>{t("advisor.outreach.weeklyCount", "en", { count: draftsUsed })}</p>
    {!draft && <Button type="button" disabled={busy !== null || draftsUsed >= 2} onClick={makeDraft}>{busy === "draft" ? t("advisor.outreach.drafting", "en") : error ? t("advisor.outreach.retry", "en") : t("advisor.outreach.draft", "en")}</Button>}
    {draft && <>
      <label className={styles.field} htmlFor="outreach-message">{t("advisor.outreach.message", "en")}</label>
      <textarea id="outreach-message" className={styles.message} maxLength={1000} value={message} readOnly={draft.contacted} onChange={(event) => { setMessage(event.target.value); setStatus(null); }} />
      <p><strong>{t("advisor.outreach.nextStep", "en")}:</strong> {draft.nextStep}</p>
      <div className={styles.actions}>
        <Button type="button" variant="plain" disabled={!message || busy !== null} onClick={copy}>{t("advisor.outreach.copy", "en")}</Button>
        {!draft.contacted && <Button type="button" disabled={!message.trim() || busy !== null} onClick={markContacted}>{busy === "contact" ? t("advisor.outreach.saving", "en") : t("advisor.outreach.contact", "en")}</Button>}
        {draft.contacted && <Button type="button" disabled={busy !== null || draftsUsed >= 2} onClick={makeDraft}>{t("advisor.outreach.another", "en")}</Button>}
      </div>
    </>}
    {draftsUsed >= 2 && draft?.contacted && <p className={styles.limit} role="status">{t("advisor.outreach.weeklyLimit", "en")}</p>}
    <p className={`${styles.status} ${error ? styles.error : ""}`} role={error ? "alert" : "status"} aria-live="polite">{error ?? (status === "copied" ? t("advisor.outreach.copyReady", "en") : status === "saved" ? t("advisor.outreach.saved", "en") : draft?.contacted ? t("advisor.outreach.saved", "en") : "")}</p>
  </div>;
}
