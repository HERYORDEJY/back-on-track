import type { Localized } from "../i18n";
import type { ACTION_FACTOR } from "./config";

export type { Localized };
export type Action = keyof typeof ACTION_FACTOR;
export type Availability = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", number>;
export type Topic = { id: string; title: string; week: number; order: number; estMinutes: number; examWeight: number; prereqIds: string[] };
export type Assessment = { id: string; title: string; kind: "assignment" | "quiz" | "exam"; dueDate: string; weight: number; topicIds: string[] };
export type Decision = { topicId: string; action: Action; minutes: number; basis: Localized; rationale: Localized };
export type PlannedSession = { date: string; minutes: number; pieces: { topicId: string; minutes: number; isLast: boolean }[]; reminder: { at: Date; text: Localized } };
export type Unscheduled = { topicId: string; minutes: number }[];
export type PlanInput = {
  now: Date; course: { startDate: string; examDate: string }; topics: Topic[]; assessments: Assessment[];
  availability: Availability; progress: { topicId: string; completedAt: Date }[];
  student: { goal?: string; context?: string };
  previous?: { decisions: Decision[]; sessions: { date: string; topicIds: string[] }[] };
};
export type PlanResult = {
  status: "fit" | "cut" | "infeasible"; source: "ai" | "cache" | "fallback";
  decisions: Decision[]; sessions: PlannedSession[]; warnings: Localized[]; summary: Localized;
  changeSummary?: Localized; focusAssessmentId?: string; focusDueDate?: string; unscheduled: Unscheduled;
  requiredMin: number; capacityMin: number; escalate: boolean;
};
export type TriageContext = {
  today: string; week: number; examDate: string; status: "fit" | "cut";
  nextCoursework: { title: string; dueDate: string; weight: number } | null;
  student: PlanInput["student"]; capacityMin: number; requiredMin: number; deficitMin: number;
  topics: { id: string; title: string; week: number; estMinutes: number; examWeightPct: number; protected: boolean; basis: string; prereqIds: string[]; deadline: string | null }[];
};
export type TriageOutput = { items: { topicId: string; action: Exclude<Action, "keep">; rationale: Localized }[]; summary: Localized };
export type Violation = { code: "DUPLICATE_TOPIC" | "UNKNOWN_TOPIC" | "ACTION_NOT_ALLOWED" | "OVER_CAPACITY"; topicId?: string; message: string };
export type TriageFn = (context: TriageContext, violations?: Violation[]) => Promise<{ output: TriageOutput; source: "ai" | "cache" } | null>;
