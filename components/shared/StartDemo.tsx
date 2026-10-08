"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BusyOverlay } from "@/components/shared/BusyOverlay";
import { t, type Language } from "@/lib/i18n";
import { clearAllDemoLocalData } from "@/lib/offline";

export function StartDemo({ language }: { language: Language }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [deviceWarning, setDeviceWarning] = useState(false);
  async function start() {
    setPending(true); setFailed(false);
    setDeviceWarning(false);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed");
      if (!await clearAllDemoLocalData()) {
        setDeviceWarning(true);
        setPending(false);
        return;
      }
      router.push("/learner/amaka");
      router.refresh();
    } catch { setFailed(true); setPending(false); }
  }
  return <div className="start-demo">
    <BusyOverlay active={pending} language={language} message={t("landing.starting", language)} />
    <Button id="start-demo" data-testid="start-demo" disabled={pending} onClick={start}>{t(pending ? "landing.starting" : failed ? "landing.startRetry" : "landing.start", language)}</Button>
    {failed && <p role="alert">{t("demo.failed", language)}</p>}
    {deviceWarning && <p role="alert">{t("offline.resetDeviceFailed", language)}</p>}
  </div>;
}
