import { formatDate, t, type Language, type MessageKey } from "@/lib/i18n";

type VisibleRisk = {
  band: "high" | "medium" | "low";
  reasons: { code: string; params: Record<string, string | number> }[];
  lastActivity: string | null;
  escalated: boolean;
};

export function AdvisorVisibility({ risk, language, studentId }: { risk: VisibleRisk | null; language: Language; studentId: string }) {
  return <section className="advisor-visibility" aria-labelledby="advisor-visibility-title">
    <h2 id="advisor-visibility-title">{t("learner.advisor.title", language)}</h2>
    <p>{t("learner.advisor.description", language)}</p>
    {!risk ? <p role="alert">{t("learner.advisor.unavailable", language)} <a href={`/learner/${encodeURIComponent(studentId)}`}>{t("clock.retry", language)}</a></p> : <>
      <p className={`advisor-visibility__band advisor-visibility__band--${risk.band}`}>{t(`advisor.band.${risk.band}`, language)}</p>
      {risk.reasons.length ? <ul>{risk.reasons.map(({ code, params }, index) => <li key={`${code}-${index}`}>{t(`risk.reason.${code}` as MessageKey, language, params)}</li>)}</ul> : <p>{t("learner.advisor.noReasons", language)}</p>}
      <p>{risk.lastActivity ? t("learner.advisor.lastActivity", language, { date: formatDate(new Date(risk.lastActivity), language) }) : t("advisor.neverActive", language)}</p>
      <p>{t(risk.escalated ? "learner.advisor.flagged" : "learner.advisor.notFlagged", language)}</p>
    </>}
  </section>;
}
