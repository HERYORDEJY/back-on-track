"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BusyOverlay } from "@/components/shared/BusyOverlay";
import { t } from "@/lib/i18n";
import type { AdvisorRow } from "@/lib/types";
import { AdvisorDetailPanel } from "./AdvisorDetailPanel";

export function AdvisorNavigation({ renderedHref, rows, closeHref, children }: { renderedHref: string; rows: AdvisorRow[]; closeHref: string; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const selectedId = searchParams.get("student");
  const root = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (pending === currentHref && renderedHref === pending) queueMicrotask(() => setPending(null));
  }, [pending, currentHref, renderedHref]);
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>("li[data-student-id]").forEach((row) => {
      row.dataset.selected = String(row.dataset.studentId === selectedId);
    });
  }, [selectedId]);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link) return;
    const next = new URL(link.href);
    if (next.origin !== window.location.origin || next.pathname !== "/advisor") return;
    const href = `${next.pathname}${next.search}`;
    if (link.closest("li[data-student-id]")) {
      event.preventDefault();
      event.stopPropagation();
      if (href !== currentHref) window.history.pushState(null, "", href);
      return;
    }
    if (href !== currentHref) setPending(href);
  }

  return <div ref={root} onClickCapture={onClick}>
    <BusyOverlay active={pending !== null} language="en" message={t("advisor.listLoading", "en")} />
    {children}
    {selectedId && <AdvisorDetailPanel key={selectedId} studentId={selectedId} preview={rows.find((row) => row.id === selectedId) ?? null} closeHref={closeHref} />}
  </div>;
}
