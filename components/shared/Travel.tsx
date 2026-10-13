import type { CSSProperties } from "react";
import { t, type Language } from "@/lib/i18n";

export function TravelTrack({ style }: { style?: CSSProperties } = {}) {
  return <span className="travel" style={style} aria-hidden="true">
    <span style={{ position: "absolute", left: 0, right: 0, top: 5, height: 6, borderRadius: 3, background: "var(--rail, rgb(169 179 204))" }} />
    <span className="travel__stop" style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, boxSizing: "border-box", borderRadius: "50%", background: "var(--lamp, rgb(255 199 44))", border: "4px solid var(--night, rgb(15 31 77))" }} />
  </span>;
}

export function Travel({ language, text }: { language: Language; text?: string }) {
  return <div className="travel-wrap" role="status"><TravelTrack /><span>{text ?? t("travel.loading", language)}</span></div>;
}
