import { formatDate, t, type Language, type MessageKey } from "@/lib/i18n";
import { Signal } from "@/components/shared/Signal";

type VisibleRisk = {
  band: "high" | "medium" | "low";
  reasons: { code: string; params: Record<string, string | number> }[];
  lastActivity: string | null;
  escalated: boolean;
};

export function AdvisorVisibility({ risk, language, studentId }: { risk: VisibleRisk | null; language: Language; studentId: string }) {
  return <section className="advisor-visibility" aria-labelledby="advisor-visibility-title">
    <h2 id="advisor-visibility-title">{t("learner.advisor.title", language)}</h2>
    <p className="detail">{t("learner.advisor.description", language)}</p>
    {!risk ? <p role="alert">{t("learner.advisor.unavailable", language)} <a href={`/learner/${encodeURIComponent(studentId)}`}>{t("clock.retry", language)}</a></p> : <>
      <div className="seen"><p className="seen__level"><Signal band={risk.band} language={language} label={t(`advisor.band.${risk.band}`, language)} /></p>
        <ul className="dashes">{risk.reasons.map(({ code, params }, index) => <li key={`${code}-${index}`}>{t(`risk.reason.${code}` as MessageKey, language, params)}</li>)}
          <li>{risk.lastActivity ? t("learner.advisor.lastActivity", language, { date: formatDate(new Date(risk.lastActivity), language) }) : t("advisor.neverActive", language)}</li>
          <li>{t(risk.escalated ? "learner.advisor.flagged" : "learner.advisor.notFlagged", language)}</li>
        </ul>
      </div>
    </>}
  </section>;
}
