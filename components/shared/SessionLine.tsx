import type { ReactNode } from "react";
import type { Stop } from "@/lib/engine/display";
import { formatDate, formatDuration, t, type Language } from "@/lib/i18n";

function label(date: string, language: Language) {
  return formatDate(new Date(`${date}T12:00:00+01:00`), language);
}

export function SessionLine({ stops, today, topicTitles, language, version, renderCurrentAction }: {
  stops: Stop[]; today: string; topicTitles: Record<string, string>; language: Language; version: number;
  renderCurrentAction?: (sessionId: string) => ReactNode;
}) {
  return <ol className="line line--draw" key={version}>
    {stops.map((stop, index) => {
      const kind = stop.kind === "session" ? stop.state === "tonight" ? "now" : stop.state : stop.kind === "exam" ? "end" : stop.kind;
      const past = stop.kind === "session" && stop.date < today ? " stop--past" : "";
      const content = stop.kind === "session" ? <>
        <div className="stop__when"><span>{label(stop.date, language)}</span><span className="stop__mins">{formatDuration(stop.minutes, language)}</span>
          {stop.state === "tonight" && <span className="stop__flag">{t("line.tonight", language)}</span>}
          {(stop.state === "done" || stop.state === "missed") && <span className="stop__state">{t(`line.${stop.state}`, language)}</span>}
        </div>
        {stop.state !== "missed" && <div className="stop__what">{stop.topicIds.map((id) => topicTitles[id] ?? id).join(", ")}</div>}
        {stop.editable && renderCurrentAction && <div className="stop__do">{renderCurrentAction(stop.id)}</div>}
      </> : stop.kind === "rest" ? <div className="stop__when">{t("line.rest", language, { date: label(stop.date, language) })}</div>
        : stop.kind === "due" ? <><div className="stop__when">{label(stop.date, language)}</div><div className="stop__what">{t("line.due", language, { assessment: stop.title, weight: stop.weight })}</div></>
        : stop.kind === "gap" ? <div className="stop__when">{t(stop.count === 1 ? "line.gap.one" : "line.gap.many", language, { count: stop.count })}</div>
        : stop.kind === "wont" ? <div className="stop__when">{t(stop.count === 1 ? "line.wont.one" : "line.wont.many", language, { count: stop.count, date: label(stop.date, language) })}</div>
        : <><div className="stop__when">{label(stop.date, language)}</div><div className="stop__what">{t("line.exam", language)}</div></>;
      return <li key={`${stop.kind}-${"id" in stop ? stop.id : "date" in stop ? stop.date : index}-${index}`} className={`stop stop--${kind}${past}`} style={{ "--i": Math.min(index, 13) } as React.CSSProperties}>
        <span className="stop__mark" aria-hidden="true" />{content}
      </li>;
    })}
  </ol>;
}
