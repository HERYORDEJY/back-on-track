import type { Localized } from "@/lib/i18n";

export type ClockJump = { jumpDays: number; toWeek?: never } | { toWeek: number; jumpDays?: never };
export type ClockView = { now: string; week: number; date: Localized; atLimit: boolean; futureWeeks: number[] };
