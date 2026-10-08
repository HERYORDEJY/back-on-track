"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DemoReset } from "@/components/shared/DemoReset";
import { SimulatedBadge } from "@/components/shared/SimulatedBadge";
import { Button } from "@/components/ui/button";
import { t, type Language } from "@/lib/i18n";
import type { ClockJump, ClockView } from "@/lib/types";
import { useLearnerLanguage } from "./useLearnerLanguage";

export function ClockControl({ clock, language, studentId = null }: { clock: ClockView | null; language: Language; studentId?: string | null }) {
  const router = useRouter();
  const shown = useLearnerLanguage(language, studentId);
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [failedJump, setFailedJump] = useState<ClockJump | null>(null);
  const [open, setOpen] = useState(false);
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
  return (
    <section className="demo" aria-label={t("clock.label", shown)}>
      <div className="demo__row">
        <SimulatedBadge language={shown} studentId={studentId} />
        {clock && <span className="demo__when">{clock.date[shown]} · {t("clock.week", shown, { week: clock.week })}</span>}
        {!clock && <span role="status">{t(refreshing ? "clock.checking" : "clock.unavailable", shown)}</span>}
        <button type="button" className="demo__toggle" data-testid="clock-toggle" aria-expanded={open} aria-controls="demo-controls" onClick={() => setOpen(!open)}>{t("clock.toggle", shown)}</button>
        <div className="demo__controls" id="demo-controls" data-open={open}>
          {!clock && <Button variant="plain" className="demo__btn" disabled={refreshing} onClick={refresh}>{t("clock.retry", shown)}</Button>}
          <DemoReset language={shown} disabled={pending || refreshing} onBusyChange={setResetting} onReset={refresh} />
          {clock && <>
            <Button variant="plain" className="demo__btn" disabled={pending || refreshing || resetting || Boolean(failedJump) || clock.atLimit} onClick={() => jump({ jumpDays: 1 })}>{t("clock.day", shown)}</Button>
            <Button variant="plain" className="demo__btn" data-testid="clock-plus-3" disabled={pending || refreshing || resetting || Boolean(failedJump) || clock.atLimit} onClick={() => jump({ jumpDays: 3 })}>{t("clock.days", shown)}</Button>
            <label className="clock-week">
              <span className="sr-only">{t("clock.jump", shown)}</span>
              <select className="demo__btn" value="" disabled={pending || refreshing || resetting || Boolean(failedJump) || clock.atLimit} onChange={(event) => jump({ toWeek: Number(event.target.value) })}>
                <option value="" disabled>{t("clock.jump", shown)}</option>
                {clock.futureWeeks.map((week) => <option key={week} value={week}>{t("clock.week", shown, { week })}</option>)}
              </select>
            </label>
          </>}
        </div>
      </div>
      <div role="status" className="demo__status">
        {pending && <p>{t("clock.loading", shown)}</p>}
        {!pending && refreshing && <p>{t("clock.checking", shown)}</p>}
        {clock?.atLimit && <p>{t("clock.limit", shown)}</p>}
        {failedJump && <><p>{t("clock.failed", shown)}</p><Button variant="plain" className="demo__btn" disabled={pending || refreshing} onClick={refresh}>{t("clock.refresh", shown)}</Button></>}
      </div>
    </section>
  );
}
