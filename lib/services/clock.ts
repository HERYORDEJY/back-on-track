import { clockWeek, CLOCK_LIMIT, getNow, moveClock, type ClockJump } from "@/lib/clock";
import { formatDate } from "@/lib/i18n";
import type { ClockView } from "@/lib/types";

function clockView(now: Date): ClockView {
  return {
    now: now.toISOString(),
    week: clockWeek(now),
    date: { en: formatDate(now, "en"), pcm: formatDate(now, "pcm") },
    atLimit: now.getTime() === Date.parse(CLOCK_LIMIT),
    futureWeeks: Array.from({ length: Math.max(0, clockWeek(new Date(CLOCK_LIMIT)) - clockWeek(now)) }, (_, index) => clockWeek(now) + index + 1),
  };
}

export async function getClockView(): Promise<ClockView> {
  return clockView(await getNow());
}

export async function changeClock(jump: ClockJump): Promise<ClockView> {
  return clockView(await moveClock(jump));
}
