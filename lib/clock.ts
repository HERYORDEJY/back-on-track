import { getDb } from "@/lib/db";
import type { ClockJump } from "@/lib/types";
export type { ClockJump } from "@/lib/types";

export const DEMO_START = "2026-10-19T17:00:00.000Z";
export const CLOCK_LIMIT = "2026-11-30T17:00:00.000Z";
const COURSE_START = "2026-09-07T17:00:00.000Z";
const DAY_MS = 86_400_000;

export class ClockError extends Error {
  constructor(public readonly code: "CLOCK_INVALID" | "CLOCK_JUMP_INVALID" | "CLOCK_NOT_INITIALISED") {
    super(code);
  }
}

export function parseClock(value: string): Date {
  const result = new Date(value);
  if (!Number.isFinite(result.getTime()) || result.getTime() < Date.parse(DEMO_START) || result.getTime() > Date.parse(CLOCK_LIMIT)) {
    throw new ClockError("CLOCK_INVALID");
  }
  return result;
}

export function calendarDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export function clockWeek(now: Date): number {
  const currentDate = Date.parse(`${calendarDate(now)}T00:00:00+01:00`);
  const firstDate = Date.parse("2026-09-07T00:00:00+01:00");
  return Math.floor((currentDate - firstDate) / (7 * DAY_MS)) + 1;
}

export function advanceClock(now: Date, jump: ClockJump): Date {
  parseClock(now.toISOString());
  const days = jump.jumpDays;
  const week = jump.toWeek;
  let target: number;
  if (days !== undefined && week === undefined && Number.isSafeInteger(days) && days >= 1) {
    target = now.getTime() + days * DAY_MS;
  } else if (week !== undefined && days === undefined && Number.isSafeInteger(week) && week > clockWeek(now)) {
    target = Date.parse(COURSE_START) + (week - 1) * 7 * DAY_MS;
  } else {
    throw new ClockError("CLOCK_JUMP_INVALID");
  }
  return new Date(Math.min(target, Date.parse(CLOCK_LIMIT)));
}

export async function getNow(): Promise<Date> {
  const setting = await getDb().setting.findUnique({ where: { key: "clock" } });
  if (!setting) throw new ClockError("CLOCK_NOT_INITIALISED");
  return parseClock(setting.value);
}

export async function moveClock(jump: ClockJump): Promise<Date> {
  return getDb().$transaction(async (tx) => {
    // Hold the row lock until commit: concurrent jumps read the preceding result.
    const rows = await tx.$queryRaw<{ value: string }[]>`SELECT "value" FROM "Setting" WHERE "key" = 'clock' FOR UPDATE`;
    if (!rows[0]) throw new ClockError("CLOCK_NOT_INITIALISED");
    const next = advanceClock(parseClock(rows[0].value), jump);
    await tx.setting.update({ where: { key: "clock" }, data: { value: next.toISOString() } });
    return next;
  });
}
