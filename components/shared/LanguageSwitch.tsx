"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { t, type Language } from "@/lib/i18n";
import { BusyOverlay } from "@/components/shared/BusyOverlay";
import { enqueueMutation, queuedLanguage as readQueuedLanguage } from "@/lib/offline";

function saveLandingLanguage(value: Language) {
  document.cookie = `lang=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageSwitch({ language, studentId = null }: { language: Language; studentId?: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, refresh] = useTransition();
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null);
  const [failedLanguage, setFailedLanguage] = useState<Language | null>(null);
  const [queuedLanguage, setQueuedLanguage] = useState<Language | null>(null);
  const localLanguage = queuedLanguage ?? language;
  const showing = targetLanguage !== null && (saving || refreshing || localLanguage !== targetLanguage);

  useEffect(() => {
    if (!studentId) return;
    queueMicrotask(() => setQueuedLanguage(readQueuedLanguage(studentId)));
  }, [studentId, language]);

  useEffect(() => {
    if (!targetLanguage || saving || language === targetLanguage) return;
    const timeout = window.setTimeout(() => {
      setFailedLanguage(targetLanguage);
      setTargetLanguage(null);
    }, 20000);
    return () => window.clearTimeout(timeout);
  }, [targetLanguage, saving, language]);

  async function change(value: Language) {
    if (value === localLanguage || showing) return;
    setTargetLanguage(value);
    setSaving(true);
    setFailedLanguage(null);
    let queueOnError = true;
    function saveOnPhone() {
      if (!studentId || !enqueueMutation(studentId, { kind: "language", language: value })) return false;
      setQueuedLanguage(value);
      document.documentElement.lang = value;
      window.dispatchEvent(new CustomEvent("back-on-track:language", { detail: { studentId, language: value } }));
      setTargetLanguage(null);
      return true;
    }
    try {
      if (studentId) {
        if (!navigator.onLine) {
          if (!saveOnPhone()) throw new Error("Device storage unavailable");
          return;
        }
        const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: value }),
        });
        if (!response.ok) {
          if (response.status >= 500 && saveOnPhone()) return;
          if (response.status < 500) queueOnError = false;
          throw new Error("Language update failed");
        }
      } else {
        saveLandingLanguage(value);
      }
      setQueuedLanguage(null);
      refresh(() => router.refresh());
    } catch {
      if (studentId && navigator.onLine && queueOnError && saveOnPhone()) return;
      setTargetLanguage(null);
      setFailedLanguage(value);
    }
    finally { setSaving(false); }
  }
  return (
    <div className="language-switch">
    <BusyOverlay active={showing} language={localLanguage} message={t("language.saving", localLanguage)} />
    <div className="lang" data-testid="language-switch" role="group" aria-label={t("language.label", localLanguage)}>
      {(["en", "pcm"] as const).map((value) => <button key={value} type="button" className="lang__opt" data-language={value} aria-pressed={localLanguage === value} disabled={showing} onClick={() => void change(value)}>{t(`language.short.${value}`, localLanguage)}</button>)}
    </div>
    {failedLanguage && <span role="alert">{t("language.failed", localLanguage)} <button type="button" onClick={() => void change(failedLanguage)}>{t("clock.retry", localLanguage)}</button></span>}
    {showing && <span className="sr-only" role="status">{t("language.saving", localLanguage)}</span>}
    </div>
  );
}
