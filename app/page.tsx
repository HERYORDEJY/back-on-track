import { cookies } from "next/headers";
import Link from "next/link";
import { StartDemo } from "@/components/shared/StartDemo";
import { MiniLine } from "@/components/shared/MiniLine";
import { resolveLanguage, t, type MessageKey } from "@/lib/i18n";
import { getLandingProgress } from "@/lib/services/landing";

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const language = resolveLanguage((await cookies()).get("lang")?.value);
  const progress = await getLandingProgress();
  const learners = ["amaka", "tunde", "zainab"] as const;
  const nowPosition = progress.totalWeeks ? (progress.week - 1) / progress.totalWeeks : 0;
  return <main id="main" className="landing">
    <div className="landing__inner">
      <section className="hero" aria-labelledby="landing-title">
        {deleted === "1" && <p role="status">{t("learner.delete.done", language)}</p>}
        <h1 id="landing-title" className="display">{t("landing.title", language)}</h1>
        <p className="hero__lede">{t("landing.description", language)}</p>
        <div className="hero__actions"><StartDemo language={language} /><Link className="landing__text-link" href="/advisor">{t("landing.openAdvisor", language)}</Link></div>
      </section>
      <section className="people" aria-label={t("landing.people.title", language)} style={{ "--now": `${nowPosition * 100}%` } as React.CSSProperties}>
        <div className="people__now" aria-hidden="true" />
        <div className="people__scale"><span className="people__nowname">{t("landing.courseWeek", language, { week: progress.week })}</span></div>
        {learners.map((id) => {
          const copy = (field: "name" | "context") => t(`landing.person.${id}.${field}` satisfies MessageKey, language);
          const done = progress.people[id];
          return <Link key={id} className="person" href={`/learner/${id}`}>
            <h2 className="person__name">{copy("name")}</h2>
            <p className="person__who">{copy("context")}</p>
            <MiniLine doneWeek={done} week={progress.week} totalWeeks={progress.totalWeeks} language={language} />
            <p className="person__where"><span>{done ? t("landing.doneThrough", language, { week: done }) : t("landing.notStarted", language)}</span><span className="person__open">{t("landing.openLearner", language)}</span></p>
          </Link>;
        })}
      </section>
    </div>
  </main>;
}
