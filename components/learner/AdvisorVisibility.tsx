import { formatDate, formatRiskReason, t, type Language } from "@/lib/i18n";
import { Signal } from "@/components/shared/Signal";
import { EmphasizedText } from "@/components/shared/EmphasizedText";

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
        <div className="seen__facts"><ul className="dashes">{risk.reasons.map(({ code, params }, index) => <li key={`${code}-${index}`}><EmphasizedText text={formatRiskReason(code, params, language)} terms={[String(params.assessment ?? "")]} /></li>)}</ul></div>
        <p className="seen__activity">{risk.lastActivity ? t("learner.advisor.lastActivity", language, { date: formatDate(new Date(risk.lastActivity), language) }) : t("advisor.neverActive", language)}</p>
        <p className="seen__activity">{t(risk.escalated ? "learner.advisor.flagged" : "learner.advisor.notFlagged", language)}</p>
      </div>
    </>}
  </section>;
}
