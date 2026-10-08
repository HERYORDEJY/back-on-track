import { timeBarWidths } from "@/lib/engine/display";
import { formatDuration, t, type Language } from "@/lib/i18n";

export function TimeBars({ requiredMin, capacityMin, plannedMin, language }: { requiredMin: number; capacityMin: number; plannedMin?: number; language: Language }) {
  const values = plannedMin === undefined ? [requiredMin, capacityMin] : [requiredMin, capacityMin, plannedMin];
  const widths = timeBarWidths(values);
  const rows = values.map((value, index) => ({ value, width: widths[index], type: ["course", "available", "plan"][index] }));
  return <div className="time">
    {rows.map((row) => <div key={row.type} className={`time__row time__row--${row.type}`}>
      <span>{t(`time.bar.${row.type}` as "time.bar.course" | "time.bar.available" | "time.bar.plan", language)}</span>
      <strong className="time__val">{formatDuration(row.value, language)}</strong>
      <div className="time__track" role="img" aria-label={`${t(`time.bar.${row.type}` as "time.bar.course" | "time.bar.available" | "time.bar.plan", language)}: ${formatDuration(row.value, language)}`}><span className="time__fill" style={{ "--w": `${row.width * 100}%` } as React.CSSProperties} aria-hidden="true" /></div>
    </div>)}
  </div>;
}
