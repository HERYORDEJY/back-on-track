"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DemoReset } from "@/components/shared/DemoReset";
import { Button } from "@/components/ui/button";
import { t, type Language } from "@/lib/i18n";
import type { ClockJump, ClockView } from "@/lib/types";

export function ClockControl({ clock, language }: { clock: ClockView | null; language: Language }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [failedJump, setFailedJump] = useState<ClockJump | null>(null);
  function refresh() {
    setFailedJump(null);
    startTransition(() => router.refresh());
  }
  async function jump(value: ClockJump) {
    setPending(true);
    setFailedJump(null);
    try {
      const response = await fetch("/api/clock", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
      });
      if (!response.ok) throw new Error("Clock jump failed");
      refresh();
    } catch { setFailedJump(value); }
    finally { setPending(false); }
  }
  if (!clock) return <div className="clock-bar"><p role="status">{t(refreshing ? "clock.checking" : "clock.unavailable", language)}</p><Button variant="outline" disabled={refreshing} onClick={refresh}>{t("clock.retry", language)}</Button><DemoReset language={language} /></div>;
  return (
    <section className="clock-bar" aria-label={t("clock.label", language)}>
      <p><span className="clock-caption">{t("clock.label", language)}</span><strong>{clock.date[language]} · {t("clock.week", language, { week: clock.week })}</strong></p>
      <div className="clock-actions">
        <DemoReset language={language} disabled={pending || refreshing} onBusyChange={setResetting} onReset={refresh} />
        <Button variant="outline" disabled={pending || refreshing || resetting || Boolean(failedJump) || clock.atLimit} onClick={() => jump({ jumpDays: 1 })}>{t("clock.day", language)}</Button>
        <Button variant="outline" data-testid="clock-plus-3" disabled={pending || refreshing || resetting || Boolean(failedJump) || clock.atLimit} onClick={() => jump({ jumpDays: 3 })}>{t("clock.days", language)}</Button>
        <label className="clock-week">
          <span className="sr-only">{t("clock.jump", language)}</span>
          <select value="" disabled={pending || refreshing || resetting || Boolean(failedJump) || clock.atLimit} onChange={(event) => jump({ toWeek: Number(event.target.value) })}>
            <option value="" disabled>{t("clock.jump", language)}</option>
            {clock.futureWeeks.map((week) => <option key={week} value={week}>{t("clock.week", language, { week })}</option>)}
          </select>
        </label>
      </div>
      <div role="status" className="clock-status">
        {pending && <p>{t("clock.loading", language)}</p>}
        {!pending && refreshing && <p>{t("clock.checking", language)}</p>}
        {clock.atLimit && <p>{t("clock.limit", language)}</p>}
        {failedJump && <><p>{t("clock.failed", language)}</p><Button variant="outline" disabled={pending || refreshing} onClick={refresh}>{t("clock.refresh", language)}</Button></>}
      </div>
    </section>
  );
}
