import { t, type Language } from "@/lib/i18n";

export function Signal({ band, language }: { band: "high" | "medium" | "low"; language: Language }) {
  const filled = { high: 3, medium: 2, low: 1 }[band];
  return <span className="signal-wrap"><span className="signal" aria-hidden="true">{[0, 1, 2].map((index) => <i key={index} className={index < filled ? "on" : ""} />)}</span><span>{t(`signal.${band}`, language)}</span></span>;
}
