"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { t, type Language } from "@/lib/i18n";

const subscribe = () => () => {};
const speechAvailable = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

export function ReadAloud({ language, text, label }: { language: Language; text: string; label?: string }) {
  const supported = useSyncExternalStore(subscribe, speechAvailable, () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, [text]);

  function toggle() {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "pcm" ? "en-NG" : "en-GB";
    const voices = window.speechSynthesis.getVoices();
    const voice = language === "pcm"
      ? voices.find((item) => item.lang.toLowerCase() === "en-ng") ?? voices.find((item) => item.lang.toLowerCase().startsWith("en"))
      : voices.find((item) => item.lang.toLowerCase().startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  if (!supported) return <p role="status">{t("readAloud.unavailable", language)}</p>;
  return <button className="read-aloud" type="button" onClick={toggle} aria-label={speaking ? t("readAloud.stop", language) : label ?? t("readAloud.play", language)}>
    {speaking ? t("readAloud.stop", language) : label ?? t("readAloud.play", language)}
  </button>;
}
