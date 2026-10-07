import { addDays, calendarDate, effectiveStatus } from "../engine/time";
import { RISK } from "./config";

export type MetricPlan = {
  simNow: Date;
  sessions: { date: string; status: "pending" | "done" | "missed"; checkedAt: Date | null }[];
};

/** Current plans only; callers supply one current plan per learner. */
export function adherenceMetric(plans: MetricPlan[], now: Date): { kept: number; total: number } | null {
  const today = calendarDate(now);
  const firstDay = addDays(today, -(RISK.adherence.windowDays - 1));
  const oldEnough = new Date(now.getTime() - RISK.adherence.planAgeDays * 86_400_000);
  let kept = 0;
  let total = 0;
  for (const plan of plans) {
    if (plan.simNow >= oldEnough) continue;
    const sessions = plan.sessions.filter(({ date }) => date >= firstDay && date <= today);
    if (sessions.length === 0) continue;
    total++;
    const done = sessions.filter((session) => effectiveStatus(session, now) === "done").length;
    if (done / sessions.length >= RISK.adherence.keptRatio) kept++;
  }
  return total ? { kept, total } : null;
}
