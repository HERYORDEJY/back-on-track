import type { Language, Localized } from "@/lib/i18n";

export type ClockJump = { jumpDays: number; toWeek?: never } | { toWeek: number; jumpDays?: never };
export type ClockView = { now: string; week: number; date: Localized; atLimit: boolean; futureWeeks: number[] };

export type Availability = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", number>;
export type SessionView = {
  id: string; date: string; dateLabel: Localized; minutes: number;
  status: "pending" | "done" | "missed"; editable: boolean;
  pieces: { topicId: string; title: string; minutes: number; isLast: boolean }[];
};
export type PlanView = {
  today: string;
  student: {
    id: string; name: string; goal: string | null; context: string | null;
    language: Language; availability: Availability | null; hoursVary: boolean; isSimulated: boolean;
  };
  plan: null | {
    id: string; version: number; status: "fit" | "cut" | "infeasible"; source: "ai" | "cache" | "fallback";
    summary: Localized; changeSummary: Localized | null; requiredMin: number; capacityMin: number; scheduledMin: number;
    focusDueDate: string | null; focusDateLabel: Localized | null; warnings: Localized[];
    unscheduled: { topicId: string; minutes: number; title: string }[];
    items: { topicId: string; title: string; action: "keep" | "compress_light" | "compress_heavy" | "skip"; minutes: number; rationale: Localized; basis: Localized; sourceUrl: string | null }[];
    sessions: SessionView[]; featuredSession: SessionView | null; weekSessions: SessionView[];
    counts: { kept: number; shortened: number; skipped: number }; weeklyHoursDue: boolean;
    reminders: { id: string; atLabel: Localized; text: Localized }[];
  };
};
