"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t, type Language } from "@/lib/i18n";

export function DemoReset({ language, disabled = false, onBusyChange, onReset }: { language: Language; disabled?: boolean; onBusyChange?: (busy: boolean) => void; onReset?: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  async function reset() {
    setPending(true);
    onBusyChange?.(true);
    setFailed(false);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error("Demo reset failed");
      if (onReset) onReset();
      else startTransition(() => router.refresh());
    } catch { setFailed(true); }
    finally { setPending(false); onBusyChange?.(false); }
  }
  return <div>
    <Button variant="outline" disabled={disabled || pending || refreshing} onClick={reset}>{t(pending || refreshing ? "demo.resetting" : failed ? "demo.retry" : "demo.reset", language)}</Button>
    <p role="status">{failed && t("demo.failed", language)}</p>
  </div>;
}
