"use client";

import { t, type Language } from "@/lib/i18n";
import { useLearnerLanguage } from "./useLearnerLanguage";

export function SimulatedBadge({ language, studentId = null }: { language: Language; studentId?: string | null }) {
  const shown = useLearnerLanguage(language, studentId);
  return <span className="simulated-badge">{t("app.simulated", shown)}</span>;
}
