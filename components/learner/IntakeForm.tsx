"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
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
  const [error, setError] = useState<"hours" | "save" | "build" | null>(null);
  const [saved, setSaved] = useState(true);

  function choosePreset(minutes: number) {
    if (hoursVary) setAverage(String(minutes));
    else setHours(Object.fromEntries(days.map((day) => [day, minutes])) as Availability);
    setSaved(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || refreshing) return;
    const value = Number(average);
    const availability = hoursVary ? Object.fromEntries(days.map((day) => [day, value])) as Availability : hours;
    if (Object.values(availability).some((minutes) => !Number.isSafeInteger(minutes) || minutes < 0 || minutes > 1440) || Math.max(...Object.values(availability)) < 20) {
      setError("hours");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!saved) {
        const update = await fetch(`/api/students/${encodeURIComponent(student.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availability, hoursVary, goal: goal.trim() || null, context: context.trim() || null }),
        });
        if (!update.ok) throw new Error("save");
        setSaved(true);
      }
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      if (!response.ok) throw new Error("build");
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "build" ? "build" : "save");
    } finally {
      setBusy(false);
    }
  }

  return <section className={editing ? "pt-3" : "plan-card"} aria-labelledby={editing ? "edit-intake-title" : "intake-title"}>
    <h2 id={editing ? "edit-intake-title" : "intake-title"}>{t(editing ? "learner.intake.editTitle" : "learner.ready.title", language)}</h2>
    <p className="text-slate">{t("learner.intake.description", language)}</p>
    <form className="grid gap-5" onSubmit={submit}>
      <fieldset>
        <legend className="font-bold">{t("learner.intake.hoursTitle", language)}</legend>
        <p className="my-2 text-sm text-slate">{t("learner.intake.hoursHint", language)}</p>
        <div className="flex flex-wrap gap-2" aria-label={t("learner.intake.presets", language)}>
          {[20, 40, 60, 90].map((minutes) => <Button key={minutes} type="button" variant="plain" onClick={() => choosePreset(minutes)}>{t("time.minutes", language, { minutes })}</Button>)}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-3 font-bold">
        <input className="h-5 w-5 accent-night" type="checkbox" checked={hoursVary} onChange={(event) => { setHoursVary(event.target.checked); setSaved(false); }} />
        {t("learner.intake.variableHours", language)}
      </label>
      {hoursVary ? <label className="grid gap-1 font-bold">
        {t("learner.intake.average", language)}
        <input className="min-h-11 w-full rounded-lg border border-rail bg-paper px-3" type="number" min="0" max="1440" step="1" inputMode="numeric" value={average} onChange={(event) => { setAverage(event.target.value); setSaved(false); }} required />
      </label> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {days.map((day) => <label key={day} className="grid gap-1 font-bold">
          {t(`learner.day.${day}`, language)}
          <input className="min-h-11 w-full rounded-lg border border-rail bg-paper px-3" type="number" min="0" max="1440" step="1" inputMode="numeric" value={hours[day]} onChange={(event) => { setHours({ ...hours, [day]: event.target.value === "" ? NaN : Number(event.target.value) }); setSaved(false); }} required />
        </label>)}
      </div>}
      <label className="grid gap-1 font-bold">
        {t("learner.intake.goal", language)}
        <input className="min-h-11 w-full rounded-lg border border-rail bg-paper px-3" type="text" maxLength={80} value={goal} onChange={(event) => { setGoal(event.target.value); setSaved(false); }} />
      </label>
      <label className="grid gap-1 font-bold">
        {t("learner.intake.context", language)}
        <input className="min-h-11 w-full rounded-lg border border-rail bg-paper px-3" type="text" maxLength={120} value={context} onChange={(event) => { setContext(event.target.value); setSaved(false); }} />
      </label>
      <p className="m-0 text-sm text-slate">{t("learner.intake.privacyHint", language)}</p>
      <div className="plan-action">
        <Button id={editing ? undefined : "build-plan"} data-testid={editing ? undefined : "build-plan"} type="submit" disabled={busy || refreshing}>
          {t(busy || refreshing ? "learner.building" : error ? "learner.retry" : editing ? "learner.intake.updatePlan" : "learner.build", language)}
        </Button>
        {error && <p role="alert">{t(error === "hours" ? "plan.error.hours" : error === "save" ? "student.error.unavailable" : "plan.error.unavailable", language)}</p>}
      </div>
    </form>
  </section>;
}
