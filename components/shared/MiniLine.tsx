import { miniPositions } from "@/lib/engine/display";
import { t, type Language } from "@/lib/i18n";

export function MiniLine({ doneWeek, week, totalWeeks = 12, language }: { doneWeek: number; week: number; totalWeeks?: number; language: Language }) {
  const position = miniPositions(doneWeek, week, totalWeeks);
  return <div className="mini" role="img" aria-label={t("line.mini.label", language, { done: doneWeek, week, total: totalWeeks })} style={{ "--done": `${position.done * 100}%`, "--now": `${position.now * 100}%` } as React.CSSProperties}>
    <span className="mini__done" aria-hidden="true" /><span className="mini__at" aria-hidden="true" /><span className="mini__now" aria-hidden="true" /><span className="mini__end" aria-hidden="true" />
  </div>;
}
