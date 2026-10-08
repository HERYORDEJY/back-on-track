import { t, type Language } from "@/lib/i18n";

export function Travel({ language, text }: { language: Language; text?: string }) {
  return <div className="travel-wrap" role="status"><span className="travel" aria-hidden="true" /><span>{text ?? t("travel.loading", language)}</span></div>;
}
