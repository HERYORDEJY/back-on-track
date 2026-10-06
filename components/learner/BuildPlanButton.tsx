"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t, type Language } from "@/lib/i18n";

export function BuildPlanButton({ studentId, language }: { studentId: string; language: Language }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  async function build() {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId }) });
      if (!response.ok) throw new Error("Plan unavailable");
      startTransition(() => router.refresh());
    } catch { setFailed(true); }
    finally { setPending(false); }
  }
  return <div className="plan-action">
    <Button id="build-plan" data-testid="build-plan" disabled={pending || refreshing} onClick={build}>{t(pending || refreshing ? "learner.building" : failed ? "learner.retry" : "learner.build", language)}</Button>
    {failed && <p role="alert">{t("plan.error.unavailable", language)}</p>}
  </div>;
}
