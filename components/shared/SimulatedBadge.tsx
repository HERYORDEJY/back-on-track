import { t, type Language } from "@/lib/i18n";

export function SimulatedBadge({ language }: { language: Language }) {
  return <span className="simulated-badge">{t("app.simulated", language)}</span>;
}
