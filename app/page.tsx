import { cookies } from "next/headers";
import { resolveLanguage, t, type MessageKey } from "@/lib/i18n";
import Link from "next/link";
import { StartDemo } from "@/components/shared/StartDemo";

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const language = resolveLanguage((await cookies()).get("lang")?.value);
  const learners = ["amaka", "tunde", "zainab"] as const;
  return (
    <main id="main" className="page-width landing">
      <section className="introduction" aria-labelledby="landing-title">
        {deleted === "1" && <p role="status">{t("learner.delete.done", language)}</p>}
        <p className="eyebrow">{t("landing.eyebrow", language)}</p>
        <h1 id="landing-title">{t("landing.title", language)}</h1>
        <p className="intro-copy">{t("landing.description", language)}</p>
        <StartDemo language={language} />
        <Link className="persona-link" href="/advisor">{t("landing.openAdvisor", language)}</Link>
      </section>
      <section aria-labelledby="learners-title" className="learners">
        <div className="section-heading">
          <h2 id="learners-title">{t("landing.people.title", language)}</h2>
          <p>{t("landing.people.description", language)}</p>
        </div>
        <ul className="persona-list">
          {learners.map((id, index) => {
            const copy = (field: "name" | "context" | "hours" | "goal") =>
              t(`landing.person.${id}.${field}` satisfies MessageKey, language);
            return (
              <li key={id} className="persona-row">
                <span className="persona-number" aria-hidden="true">0{index + 1}</span>
                <div className="persona-description">
                  <h3>{copy("name")}</h3>
                  <p>{copy("context")}</p>
                  <p className="persona-goal">{copy("goal")}</p>
                  <Link className="persona-link" href={`/learner/${id}`}>{t("landing.openLearner", language)}</Link>
                </div>
                <p className="persona-hours">{copy("hours")}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <footer className="site-footer">{t("landing.footer", language)}</footer>
    </main>
  );
}
