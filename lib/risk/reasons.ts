export type RiskReasonCode =
  | "ESCALATED"
  | "INACTIVE"
  | "NO_ACTIVITY"
  | "BACKLOG_PRESSURE"
  | "NO_STUDY_TIME"
  | "MISSED_ASSESSMENT"
  | "MISSED_SESSIONS"
  | "FALLING_STUDY_TIME";

export type RiskReason = { code: RiskReasonCode; points: number; params: Record<string, string | number> };

export function reason(code: RiskReasonCode, points: number, params: RiskReason["params"] = {}): RiskReason {
  return { code, points, params };
}
