"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { BusyOverlay } from "@/components/shared/BusyOverlay";
import { t } from "@/lib/i18n";

export function AdvisorNavigation({ selectedId, children }: { selectedId: string | null; children: ReactNode }) {
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => { if (opening && opening === selectedId) queueMicrotask(() => setOpening(null)); }, [opening, selectedId]);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link) return;
    const next = new URL(link.href);
    if (next.pathname === "/advisor") setOpening(next.searchParams.get("student"));
  }

  return <div onClickCapture={onClick}>
    <BusyOverlay active={opening !== null} language="en" message={t("advisor.opening", "en")} />
    {children}
  </div>;
}
