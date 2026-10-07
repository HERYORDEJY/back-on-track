"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { t, resolveLanguage, type Language } from "@/lib/i18n";
import { enqueueMutation, queuedLanguage as readQueuedLanguage } from "@/lib/offline";

export function LanguageSwitch({ language, studentId = null }: { language: Language; studentId?: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, refresh] = useTransition();
  const [targetLanguage, setTargetLanguage] = useState<Language | null>(null);
  const [failedLanguage, setFailedLanguage] = useState<Language | null>(null);
  const [queuedLanguage, setQueuedLanguage] = useState<Language | null>(null);
  const localLanguage = queuedLanguage ?? language;
  const selectRef = useRef<HTMLSelectElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wasShowing = useRef(false);
  const showing = targetLanguage !== null && (saving || refreshing || localLanguage !== targetLanguage);

  useEffect(() => {
    if (!studentId) return;
    queueMicrotask(() => setQueuedLanguage(readQueuedLanguage(studentId)));
  }, [studentId, language]);

  useEffect(() => {
    if (showing) overlayRef.current?.focus();
    else if (wasShowing.current) selectRef.current?.focus();
    wasShowing.current = showing;
  }, [showing]);

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
        document.cookie = `lang=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
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
    <label>
      <span className="sr-only">{t("language.label", localLanguage)}</span>
      <select
        ref={selectRef}
        data-testid="language-switch"
        value={localLanguage}
        disabled={showing}
        onChange={(event) => void change(resolveLanguage(event.target.value))}
      >
        <option value="en">{t("language.en", localLanguage)}</option>
        <option value="pcm">{t("language.pcm", localLanguage)}</option>
      </select>
    </label>
    {failedLanguage && <span role="alert">{t("language.failed", localLanguage)} <button type="button" onClick={() => void change(failedLanguage)}>{t("clock.retry", localLanguage)}</button></span>}
    {showing && targetLanguage && <div ref={overlayRef} className="language-transition" role="dialog" aria-modal="true" aria-labelledby="language-transition-title" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Tab") event.preventDefault(); }}>
      <div className="language-transition__inner">
        <p className="language-transition__brand">{t("app.name", localLanguage)}</p>
        <div className="language-transition__folio" aria-hidden="true"><span /><span /></div>
        <h2 id="language-transition-title">{t("language.transition.title", localLanguage, { language: t(`language.${targetLanguage}`, localLanguage) })}</h2>
        <p className="language-transition__note">{t("language.transition.note", localLanguage)}</p>
        <p className="sr-only" role="status" aria-live="polite">{t(saving ? "language.transition.save" : "language.transition.apply", localLanguage)}</p>
        <div className="language-transition__steps" aria-hidden="true">
          <span className={saving ? "is-current" : "is-done"}>{t("language.transition.save", localLanguage)}</span>
          <span className={!saving ? "is-current" : ""}>{t("language.transition.apply", localLanguage)}</span>
        </div>
        <div className="language-transition__track" aria-hidden="true"><span /></div>
      </div>
    </div>}
    </div>
  );
}
