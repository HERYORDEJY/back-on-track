import type { Availability } from "./types";

const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export function dayBudget(date: string, availability: Availability): number {
  return availability[weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()]];
}
export function capacity(days: string[], availability: Availability): number {
  return days.reduce((sum, date) => sum + dayBudget(date, availability), 0);
}
