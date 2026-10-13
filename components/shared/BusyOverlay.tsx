"use client";

import { useEffect, useRef } from "react";
import { TravelTrack } from "@/components/shared/Travel";
import type { Language } from "@/lib/i18n";

/** A modal wait state. The native dialog keeps keyboard and pointer focus off the page. */
export function BusyOverlay({ active, language, message, detail }: { active: boolean; language: Language; message: string; detail?: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !active) return;
    dialog.showModal();
    dialog.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, [active]);

  if (!active) return null;
  return <dialog ref={ref} className="busy-overlay" lang={language} aria-modal="true" aria-label={message} tabIndex={-1} onCancel={(event) => event.preventDefault()}>
    <div className="busy-overlay__content" role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      <TravelTrack style={{ display: "block", position: "relative", flex: "none", width: 180, height: 16, maxWidth: "100%" }} />
      <span className="busy-overlay__message" style={{ display: "block", fontWeight: 700 }}>{message}</span>
      {detail && <p>{detail}</p>}
    </div>
  </dialog>;
}
