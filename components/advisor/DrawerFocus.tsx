"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./AdvisorView.module.css";

export function DrawerFocus({ closeHref, label, children }: { closeHref: string; label: string; children: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { router.push(closeHref); return; }
      if (event.key !== "Tab" || !ref.current) return;
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (document.activeElement === ref.current) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [closeHref, router]);

  return <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1}>{children}</aside>;
}
