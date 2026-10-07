"use client";

import { useEffect, useState } from "react";
import { queuedLanguage } from "@/lib/offline";
import type { Language } from "@/lib/i18n";

export function useLearnerLanguage(language: Language, studentId: string | null) {
  const [local, setLocal] = useState<Language | null>(null);
  useEffect(() => {
    if (!studentId) return;
    queueMicrotask(() => setLocal(queuedLanguage(studentId)));
    function changed(event: Event) {
      const detail = (event as CustomEvent<{ studentId: string; language: Language }>).detail;
      if (detail?.studentId === studentId) setLocal(detail.language);
    }
    window.addEventListener("back-on-track:language", changed);
    return () => window.removeEventListener("back-on-track:language", changed);
  }, [studentId, language]);
  return local ?? language;
}
