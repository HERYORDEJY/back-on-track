/** The approved advisor-priority thresholds. Keep changes in sync with docs/specs/risk.md. */
export const RISK = {
  inactive: { days: [4, 8, 15], points: [15, 30, 45] },
  backlog: { ratio: [0.5, 1], points: [15, 30] },
  missedAssessment: { each: 10, max: 20 },
  missedSessions: { count: 3, points: 10 },
  fallingStudyTime: { ratio: 0.5, points: 10 },
  bands: { medium: 30, high: 60 },
  adherence: { planAgeDays: 14, windowDays: 14, keptRatio: 0.7 },
} as const;
