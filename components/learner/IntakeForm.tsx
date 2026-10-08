"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/shared/Notice";
import { Travel } from "@/components/shared/Travel";
import { formatDuration, t } from "@/lib/i18n";
import type { Availability, PlanView } from "@/lib/types";

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const emptyHours: Availability = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

export function IntakeForm({ student, editing = false }: { student: PlanView["student"]; editing?: boolean }) {
  const router = useRouter();
  const language = student.language;
  const [hours, setHours] = useState<Availability>(student.availability ?? emptyHours);
  const [hoursVary, setHoursVary] = useState(student.hoursVary);
  const [average, setAverage] = useState(String(student.availability?.mon ?? 0));
  const [goal, setGoal] = useState(student.goal ?? "");
  const [context, setContext] = useState(student.context ?? "");
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<"hours" | "save" | "build" | null>(null);
  const [saved, setSaved] = useState(true);
  const waiting = busy || refreshing;
  const weeklyMinutes = hoursVary ? Number(average) * 7 : days.reduce((sum, day) => sum + hours[day], 0);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  function choosePreset(minutes: number) {
    if (hoursVary) setAverage(String(minutes));
    else setHours(Object.fromEntries(days.map((day) => [day, minutes])) as Availability);
    setSaved(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (waiting) return;
    const value = Number(average);
    const availability = hoursVary ? Object.fromEntries(days.map((day) => [day, value])) as Availability : hours;
    if (Object.values(availability).some((minutes) => !Number.isSafeInteger(minutes) || minutes < 0 || minutes > 1440) || Math.max(...Object.values(availability)) < 20) {
      setError("hours");
      return;
    }
    setBusy(true);
    setSlow(false);
    setError(null);
    try {
      if (!saved) {
        const update = await fetch(`/api/students/${encodeURIComponent(student.id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availability, hoursVary, goal: goal.trim() || null, context: context.trim() || null }),
        });
        if (!update.ok) throw new Error("save");
        setSaved(true);
      }
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: student.id }) });
      if (!response.ok) throw new Error("build");
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "build" ? "build" : "save");
    } finally { setBusy(false); }
  }

  return <section className={`intake${editing ? " intake--editing" : ""}`} aria-labelledby={editing ? "edit-intake-title" : "intake-title"}>
    {editing ? <h2 className="heading" id="edit-intake-title">{t("learner.intake.editTitle", language)}</h2> : <h1 className="display intake__title" id="intake-title">{t("learner.intake.newTitle", language)}</h1>}
    <p className="intake__lede">{t("learner.intake.newLede", language)}</p>
    <form onSubmit={submit}>
      <fieldset className="field">
        <legend className="field__label">{t("learner.intake.dailyMinutes", language)}</legend>
        {hoursVary ? <label className="field__label" htmlFor="typical-day">{t("learner.intake.typicalDay", language)}</label> : null}
        {hoursVary ? <input className="input" id="typical-day" type="number" inputMode="numeric" min="0" max="1440" step="1" value={average} aria-invalid={error === "hours"} aria-describedby={error === "hours" ? "intake-hours-error" : undefined} onChange={(event) => { setAverage(event.target.value); setSaved(false); setError(null); }} required /> :
          <div className="days">{days.map((day) => <label key={day} className="day">
            <span className="day__name">{t(`learner.day.short.${day}`, language)}</span>
            <input className="input day__in" type="number" inputMode="numeric" min="0" max="1440" step="1" value={hours[day]} aria-invalid={error === "hours"} aria-describedby={error === "hours" ? "intake-hours-error" : undefined} onChange={(event) => { setHours({ ...hours, [day]: event.target.value === "" ? NaN : Number(event.target.value) }); setSaved(false); setError(null); }} required />
          </label>)}</div>}
        <p className="field__hint">{t("learner.intake.weeklyTotal", language, { duration: formatDuration(Number.isFinite(weeklyMinutes) ? weeklyMinutes : 0, language) })}</p>
        {error === "hours" && <p className="field__error" id="intake-hours-error" role="alert">{t("plan.error.hours", language)}</p>}
        <div className="presets" role="group" aria-label={t("learner.intake.setEveryDay", language)}>
          <span className="presets__say">{t("learner.intake.setEveryDay", language)}</span>
          {[20, 40, 60, 90].map((minutes) => <Button key={minutes} type="button" variant="plain" className="btn--small" onClick={() => choosePreset(minutes)}>{formatDuration(minutes, language)}</Button>)}
        </div>
      </fieldset>
      <label className="check"><input className="check__box" type="checkbox" checked={hoursVary} onChange={(event) => { setHoursVary(event.target.checked); setSaved(false); setError(null); }} />{t("learner.intake.variableHours", language)}</label>
      <div className="field"><label className="field__label" htmlFor="intake-goal">{t("learner.intake.goalNew", language)} <span className="field__opt">{t("learner.intake.optional", language)}</span></label>
        <input className="input" id="intake-goal" type="text" maxLength={80} value={goal} onChange={(event) => { setGoal(event.target.value); setSaved(false); }} />
        <p className="field__hint">{t("learner.intake.goalHint", language)}</p>
      </div>
      <div className="field"><label className="field__label" htmlFor="intake-context">{t("learner.intake.contextNew", language)} <span className="field__opt">{t("learner.intake.optional", language)}</span></label>
        <input className="input" id="intake-context" type="text" maxLength={120} value={context} onChange={(event) => { setContext(event.target.value); setSaved(false); }} />
      </div>
      <div className="plan-action intake__go"><Button id={editing ? undefined : "build-plan"} data-testid={editing ? undefined : "build-plan"} type="submit" disabled={waiting} className="btn--wide">{t(waiting ? "learner.building" : editing ? "learner.intake.updatePlan" : "learner.build", language)}</Button></div>
      {waiting && <div className="intake__waiting"><Travel language={language} />{slow && <p>{t("learner.intake.stillWorking", language)}</p>}</div>}
      {(error === "save" || error === "build") && <div className="intake__error"><Notice error><b>{t("learner.intake.failedTitle", language)}</b> {t("learner.intake.failedDetail", language)}<div className="notice__act"><Button type="submit" variant="plain">{t("clock.retry", language)}</Button></div></Notice></div>}
    </form>
  </section>;
}
