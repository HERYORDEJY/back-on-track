"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmphasizedText } from "@/components/shared/EmphasizedText";
import { Travel } from "@/components/shared/Travel";
import { formatDate, formatRiskReason, t, type MessageKey } from "@/lib/i18n";
import type { AdvisorDetail, AdvisorOutreach, AdvisorRow } from "@/lib/types";
import { DrawerFocus } from "./DrawerFocus";
import { OutreachEditor } from "./OutreachEditor";
import styles from "./AdvisorView.module.css";

function date(iso: string | null): string {
  return iso ? formatDate(new Date(iso), "en") : t("advisor.neverActive", "en");
}

function planText(status: AdvisorRow["planStatus"]): string {
  return t(`advisor.plan.${status ?? "none"}` as MessageKey, "en");
}

export function AdvisorDetailPanel({ studentId, preview, closeHref }: { studentId: string; preview: AdvisorRow | null; closeHref: string }) {
  const [detail, setDetail] = useState<AdvisorDetail | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/advisor/students/${encodeURIComponent(studentId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("detail");
        return response.json() as Promise<AdvisorDetail>;
      })
      .then((next) => { setDetail(next); setError(false); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [studentId, attempt]);

  const shown = detail ?? preview;
  const name = shown?.name ?? t("advisor.detail.unknown", "en");
  const reasons = shown?.risk.reasons ?? [];
  function updateOutreach(next: AdvisorOutreach, created: boolean) {
    setDetail((current) => current ? { ...current, outreach: next, draftsUsedThisWeek: current.draftsUsedThisWeek + Number(created) } : current);
  }

  return <DrawerFocus studentId={studentId} closeHref={closeHref} name={name} label={shown ? t("advisor.detail.title", "en", { name }) : name}>
    {shown && <>
      <div className={styles.detailPriority} data-band={shown.risk.band}>
        <strong>{t(`advisor.band.${shown.risk.band}` as MessageKey, "en")}</strong>
        <p>{t("advisor.lastActive", "en", { date: date(shown.risk.lastActivity) })}</p>
        <p>{planText(shown.planStatus)}{shown.risk.escalated ? ` · ${t("advisor.escalated", "en")}` : ""}</p>
      </div>
      <section className={styles.detailSection} aria-labelledby="risk-reasons"><h3 id="risk-reasons">{t("advisor.detail.reasons", "en")}</h3>
        {reasons.length ? <ul>{reasons.map((reason, i) => <li key={`${reason.code}-${i}`}><EmphasizedText text={formatRiskReason(reason.code, reason.params, "en")} terms={[String(reason.params.assessment ?? "")]} /></li>)}</ul>
          : <p>{t("advisor.noReasons", "en")}</p>}
      </section>
    </>}
    {!detail && !error && <div className={styles.detailLoading}><Travel language="en" text={t("advisor.detail.loading", "en")} /></div>}
    {error && <div className={styles.detailLoading}><p role="alert">{t("advisor.detail.failed", "en")}</p><Button type="button" variant="plain" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>{t("advisor.detail.retry", "en")}</Button></div>}
    {detail && <>
      <section className={styles.detailSection}><OutreachEditor key={detail.id} studentId={detail.id} initialDraft={detail.outreach} initialDraftsUsed={detail.draftsUsedThisWeek} onChange={updateOutreach} /></section>
      <section className={styles.detailSection} aria-labelledby="missed-title"><h3 id="missed-title">{t("advisor.detail.missed", "en")}</h3>{detail.missedSessions.length ? <ul>{detail.missedSessions.map((missed) => <li key={missed}>{date(missed)}</li>)}</ul> : <p>{t("advisor.detail.noneMissed", "en")}</p>}</section>
      <section className={styles.detailSection} aria-labelledby="activity-title"><h3 id="activity-title">{t("advisor.detail.activity", "en")}</h3>{detail.events.length ? <ol className={styles.timeline}>{detail.events.map((event, i) => <li key={`${event.at}-${event.type}-${i}`}><time dateTime={event.at}>{date(event.at)}</time><span>{t(`advisor.detail.${event.type}` as MessageKey, "en", event.title ? { title: event.title } : {})}</span></li>)}</ol> : <p>{t("advisor.detail.noEvents", "en")}</p>}
        {detail.outreach && <div className={styles.outreachHistory}><h4>{t("advisor.outreach.latest", "en")}</h4><p>{t("advisor.outreach.draftedAt", "en", { date: date(detail.outreach.createdAt) })}</p><p>{t(detail.outreach.contacted ? "advisor.outreach.contactTimeUnknown" : "advisor.outreach.noContact", "en")}</p><blockquote>{detail.outreach.message}</blockquote></div>}
      </section>
    </>}
  </DrawerFocus>;
}
