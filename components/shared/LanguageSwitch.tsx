"use client";

import { useRouter } from "next/navigation";
import { t, resolveLanguage, type Language } from "@/lib/i18n";

export function LanguageSwitch({ language }: { language: Language }) {
  const router = useRouter();
  return (
    <label className="language-switch">
      <span className="sr-only">{t("language.label", language)}</span>
      <select
        data-testid="language-switch"
        value={language}
        onChange={(event) => {
          document.cookie = `lang=${resolveLanguage(event.target.value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
          router.refresh();
        }}
      >
        <option value="en">{t("language.en", language)}</option>
        <option value="pcm">{t("language.pcm", language)}</option>
      </select>
    </label>
  );
}
