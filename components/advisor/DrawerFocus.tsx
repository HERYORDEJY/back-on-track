"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import styles from "./AdvisorView.module.css";

export function DrawerFocus({ closeHref, label, name, children }: { closeHref: string; label: string; name: string; children: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (closing) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
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
  }, [closing]);

  if (closing) return null;
  return <>
    <div className={styles.scrim} aria-hidden="true" />
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1}>
      <div className={styles.drawerTop}><h2>{name}</h2><Button type="button" variant="quiet" className={styles.close} onClick={() => { setClosing(true); router.replace(closeHref); }}>{t("advisor.close", "en")}</Button></div>
      {children}
    </aside>
  </>;
}
