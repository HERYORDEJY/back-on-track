import { ENGINE } from "./config";

const dayMs = 86_400_000;
export function calendarDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ENGINE.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * dayMs).toISOString().slice(0, 10);
}
export function currentWeek(today: string, startDate: string): number {
  return Math.max(1, Math.min(12, Math.floor((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / (7 * dayMs)) + 1));
}
export function planDays(today: string, examDate: string, through?: string): string[] {
  const last = through && through < examDate ? through : addDays(examDate, -1);
  const days: string[] = [];
  for (let date = today; date <= last; date = addDays(date, 1)) days.push(date);
  return days;
}
export function effectiveStatus(session: { date: string; status: "pending" | "done" | "missed"; checkedAt?: Date | null }, now: Date) {
  if (session.status !== "pending" && session.checkedAt && session.checkedAt <= now) return session.status;
  return session.date < calendarDate(now) ? "missed" : "pending";
}
export function focusExpired(focusDueDate: string | undefined, now: Date): boolean {
  return Boolean(focusDueDate && focusDueDate < calendarDate(now));
}
