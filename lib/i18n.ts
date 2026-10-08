import en from "@/messages/en.json";
import pcm from "@/messages/pcm.json";

export type Language = "en" | "pcm";
export type MessageKey = keyof typeof en;
export type Localized = Record<Language, string>;

const messages = { en, pcm };

export function resolveLanguage(value: unknown): Language {
  return value === "pcm" ? "pcm" : "en";
}

export function t(
  key: MessageKey,
  language: Language,
  params: Record<string, string | number> = {},
): string {
  return messages[language][key].replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!Object.hasOwn(params, name)) {
      throw new Error(`Missing translation parameter: ${key}.${name}`);
    }
    return String(params[name]);
  });
}

export function formatDate(date: Date, language: Language): string {
  // Both supported languages use the same short calendar labels.
  const locale: Record<Language, string> = { en: "en-GB", pcm: "en-GB" };
  return new Intl.DateTimeFormat(locale[language], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(date).replace(/,/g, "");
}

export function formatDuration(minutes: number, language: Language): string {
  // The supported languages share these unit abbreviations.
  void language;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatRiskReason(code: string, params: Record<string, string | number>, language: Language): string {
  if (code === "BACKLOG_PRESSURE") return t("risk.reason.BACKLOG_PRESSURE", language, {
    work: formatDuration(Number(params.workMinutes), language),
    available: formatDuration(Number(params.availableMinutes), language),
    assessment: params.assessment,
  });
  return t(`risk.reason.${code}` as MessageKey, language, params);
}
