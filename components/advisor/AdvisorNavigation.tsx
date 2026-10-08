"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BusyOverlay } from "@/components/shared/BusyOverlay";
import { t } from "@/lib/i18n";

export function AdvisorNavigation({ renderedHref, detailId, children }: { renderedHref: string; detailId: string | null; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const [pending, setPending] = useState<{ href: string; studentId: string | null } | null>(null);
  useEffect(() => {
    if (pending?.href === currentHref && (pending.studentId ? detailId === pending.studentId : renderedHref === pending.href)) queueMicrotask(() => setPending(null));
  }, [pending, currentHref, detailId, renderedHref]);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link) return;
    const next = new URL(link.href);
    if (next.origin !== window.location.origin || next.pathname !== "/advisor") return;
    const href = `${next.pathname}${next.search}`;
    if (href !== currentHref) setPending({ href, studentId: next.searchParams.get("student") });
  }

  return <div onClickCapture={onClick}>
    <BusyOverlay active={pending !== null} language="en" message={t(pending?.studentId ? "advisor.opening" : "advisor.listLoading", "en")} />
    {children}
  </div>;
}
