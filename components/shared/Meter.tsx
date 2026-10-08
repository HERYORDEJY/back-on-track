import { t, type Language } from "@/lib/i18n";

export function Meter({ action, language }: { action: "keep" | "compress_light" | "compress_heavy" | "skip"; language: Language }) {
  const fill = { keep: 100, compress_light: 70, compress_heavy: 50, skip: 0 }[action];
  return <span className="meter" role="img" aria-label={t(`meter.${action}`, language)} style={{ "--f": `${fill}%` } as React.CSSProperties} />;
}
