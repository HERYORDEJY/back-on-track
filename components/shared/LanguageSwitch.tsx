"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, resolveLanguage, type Language } from "@/lib/i18n";

export function LanguageSwitch({ language, studentId = null }: { language: Language; studentId?: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [failedLanguage, setFailedLanguage] = useState<Language | null>(null);
  async function change(value: Language) {
    if (!studentId) {
      document.cookie = `lang=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
      router.refresh();
      return;
    }
    setSaving(true);
    setFailedLanguage(null);
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: value }),
      });
      if (!response.ok) throw new Error("Language update failed");
      router.refresh();
    } catch { setFailedLanguage(value); }
    finally { setSaving(false); }
  }
  return (
    <div className="language-switch">
    <label>
      <span className="sr-only">{t("language.label", language)}</span>
      <select
        data-testid="language-switch"
        value={language}
        disabled={saving}
        onChange={(event) => void change(resolveLanguage(event.target.value))}
      >
        <option value="en">{t("language.en", language)}</option>
        <option value="pcm">{t("language.pcm", language)}</option>
      </select>
    </label>
    {saving && <span role="status">{t("language.saving", language)}</span>}
    {failedLanguage && <span role="alert">{t("language.failed", language)} <button type="button" onClick={() => void change(failedLanguage)}>{t("clock.retry", language)}</button></span>}
    </div>
  );
}
