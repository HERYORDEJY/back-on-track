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
