export const ENGINE = {
  courseworkProtectWeight: 0.15, examWeightProtectFraction: 1 / 3, protectedMinFactor: 0.7,
  minBlockMinutes: 20, maxAiRetries: 2, planBudgetMs: 20_000, reminderTime: "20:00", timeZone: "Africa/Lagos",
} as const;
export const ACTION_FACTOR = { keep: 1, compress_light: 0.7, compress_heavy: 0.5, skip: 0 } as const;
