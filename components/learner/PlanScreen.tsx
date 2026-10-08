"use client";

import { IntakeForm } from "@/components/learner/IntakeForm";
import { SessionCheckIn } from "@/components/learner/SessionCheckIn";
import { AdvisorVisibility } from "@/components/learner/AdvisorVisibility";
import { DeleteMyData } from "@/components/learner/DeleteMyData";
import { Chip, Notice } from "@/components/shared/Notice";
import { Meter } from "@/components/shared/Meter";
import { NightBlock } from "@/components/shared/NightBlock";
import { ReadAloud } from "@/components/shared/ReadAloud";
import { SessionLine } from "@/components/shared/SessionLine";
import { TimeBars } from "@/components/shared/TimeBars";
import { formatDuration, t, type Language } from "@/lib/i18n";
import type { PlanView } from "@/lib/types";
import type { OfflineMutation, OfflineRisk } from "@/lib/offline";

type CurrentPlan = NonNullable<PlanView["plan"]>;

function TopicGroup({ title, items, language, open, action }: {
  title: string; items: CurrentPlan["items"]; language: Language; open: boolean; action: "keep" | "compress_light" | "skip";
}) {
  if (!items.length) return null;
  return <details className="group" open={open}>
    <summary className="group__head"><Meter action={action} language={language} />{title}<span className="group__count">{t(items.length === 1 ? "plan.topicCount.one" : "plan.topicCount.many", language, { count: items.length })}</span></summary>
    {items.map((item) => <div className="topic" key={item.topicId}>
      <div className="topic__head"><strong className="topic__name">{item.title}</strong><span className="topic__mins">{t("plan.topicMinutes", language, { minutes: item.minutes, estimate: item.estimateMin })}</span></div>
      <p className="topic__why">{item.rationale[language]}</p>
      <p className="topic__basis">{item.basis[language]}</p>
      {item.sourceUrl && <a className="topic__source" href={item.sourceUrl} target="_blank" rel="noreferrer">{t("learner.source", language)}</a>}
    </div>)}
  </details>;
}

function CourseDecisions({ plan, language }: { plan: CurrentPlan; language: Language }) {
  const infeasible = plan.status === "infeasible";
  const focusDate = plan.focusDateLabel?.[language] ?? plan.focusDueDate ?? "";
  if (infeasible) {
    const placed = plan.items.filter((item) => item.minutes > 0);
    return <section className="block" aria-labelledby="work-title"><h2 id="work-title" className="heading">{t("plan.groups.title", language)}</h2>
      <TopicGroup title={t("plan.groups.inPlan", language)} items={placed} language={language} open action="keep" />
      {plan.unscheduled.length > 0 && <details className="group"><summary className="group__head"><Meter action="skip" language={language} />{t("plan.wontFit", language, { date: focusDate })}<span className="group__count">{t(plan.unscheduled.length === 1 ? "plan.topicCount.one" : "plan.topicCount.many", language, { count: plan.unscheduled.length })}</span></summary>
        {plan.unscheduled.map((item) => <div className="topic" key={item.topicId}><div className="topic__head"><strong className="topic__name">{item.title}</strong><span className="topic__mins">{formatDuration(item.minutes, language)}</span></div></div>)}
      </details>}
    </section>;
  }
  const skipped = plan.items.filter((item) => item.action === "skip");
  const shortened = plan.items.filter((item) => item.action === "compress_light" || item.action === "compress_heavy");
  const kept = plan.items.filter((item) => item.action === "keep");
  return <section className="block" aria-labelledby="work-title"><h2 id="work-title" className="heading">{t("plan.groups.title", language)}</h2>
    <TopicGroup title={t("plan.groups.skipped", language)} items={skipped} language={language} open action="skip" />
    <TopicGroup title={t("plan.groups.shortened", language)} items={shortened} language={language} open action="compress_light" />
    <TopicGroup title={t("plan.groups.kept", language)} items={kept} language={language} open={!skipped.length && !shortened.length} action="keep" />
  </section>;
}

function NightMessage({ view, queued, onQueued }: { view: PlanView; queued: OfflineMutation[]; onQueued: (id: string, status: "done" | "missed") => void }) {
  const { student, plan } = view;
  if (!plan) return null;
  const language = student.language;
  const featured = plan.featuredSession;
  const todaySession = featured?.date === view.today ? featured : null;
  const next = plan.sessions.find((session) => session.date > view.today && session.status === "pending");
  const firstTopic = featured?.pieces[0]?.title ?? "";
  const spokenText = plan.status === "infeasible" ? plan.summary.en : `${plan.summary.en} ${featured ? `${featured.dateLabel.en}. ${formatDuration(featured.minutes, "en")}. ${featured.pieces.map((piece) => piece.title).join(", ")}` : ""}`;
  const listen = <ReadAloud language={language} text={spokenText} label={t(language === "pcm" ? "learner.listenEnglish" : "learner.listen", language)} />;
  const queuedStatus = queued.find((item) => item.kind === "checkin" && item.sessionId === featured?.id);
  const action = todaySession && <SessionCheckIn session={todaySession} language={language} studentId={student.id} queuedStatus={queuedStatus?.kind === "checkin" ? queuedStatus.status : null} onQueued={onQueued} />;
  if (plan.status === "infeasible") {
    const summary = plan.summary[language];
    const breakAt = summary.indexOf(".");
    const lead = breakAt >= 0 ? summary.slice(0, breakAt + 1) : summary;
    const rest = breakAt >= 0 ? summary.slice(breakAt + 1).trim() : "";
    return <NightBlock actions={listen}><div data-testid="infeasible-message"><h2 className="night__say">{lead}</h2>{rest && <p className="night__what">{rest}</p>}</div></NightBlock>;
  }
  if (!todaySession) return <NightBlock label={t("plan.night.today", language)} listen={listen}><p className="night__say">{t("plan.night.noStudy", language)}</p>{featured && <p className="night__what">{t("plan.night.nextTopic", language, { date: featured.dateLabel[language], minutes: formatDuration(featured.minutes, language), topic: firstTopic })}</p>}</NightBlock>;
  if (todaySession.status === "done") return <NightBlock label={t("line.tonight", language)} listen={listen} actions={action}><p className="night__big">{t("line.done", language)}</p>{next && <p className="night__what">{t("plan.night.next", language, { date: next.dateLabel[language], minutes: formatDuration(next.minutes, language) })}</p>}</NightBlock>;
  if (todaySession.status === "missed") return <NightBlock label={t("line.tonight", language)} listen={listen} actions={action}><p className="night__say">{t("plan.night.missed", language)}</p></NightBlock>;
  return <NightBlock label={t("line.tonight", language)} listen={listen} actions={action}><p className="night__big">{todaySession.minutes}<span className="night__unit">min</span></p><p className="night__what">{t("plan.night.starting", language)} <b>{firstTopic}</b></p></NightBlock>;
}

export function PlanScreen({ view, risk, queued, onQueued, offline }: { view: PlanView; risk: OfflineRisk | null; queued: OfflineMutation[]; onQueued: (id: string, status: "done" | "missed") => void; offline: boolean }) {
  const { student, plan } = view;
  if (!plan) return null;
  const language = student.language;
  const infeasible = plan.status === "infeasible";
  const focus = plan.focusDateLabel?.[language] ?? plan.focusDueDate ?? "";
  const nextDue = plan.stops.find((stop) => stop.kind === "due");
  const untilAssessment = nextDue?.kind === "due" ? nextDue.title : focus;
  const today = plan.sessions.find((session) => session.date === view.today);
  const queuedStatus = queued.find((item) => item.kind === "checkin" && item.sessionId === today?.id);
  const currentAction = (id: string) => today?.id === id ? <SessionCheckIn session={today} language={language} studentId={student.id} queuedStatus={queuedStatus?.kind === "checkin" ? queuedStatus.status : null} onQueued={onQueued} /> : null;
  return <div className="plan" data-testid="plan-status" data-status={plan.status}>
    <div className="plan__side">
      {offline && <div className="plan__notice"><Chip>{t("plan.savedPhone", language)}</Chip></div>}
      {plan.changeSummary && <div className="plan__notice" data-testid="change-summary"><Notice><b>{t("learner.change.title", language)}.</b> {plan.changeSummary[language]}</Notice></div>}
      {plan.weeklyHoursDue && <div className="plan__notice"><Notice><b>{t("learner.hoursPrompt.title", language)}.</b> {t("learner.hoursPrompt.description", language)} <a href="#edit-hours">{t("learner.editHours", language)}</a></Notice></div>}
      {student.goal && <div className="goal"><p className="detail">{t("plan.goal", language)}</p><p className="goal__text">{student.goal}</p></div>}
      <NightMessage view={view} queued={queued} onQueued={onQueued} />
      <section className="block plan__time" aria-labelledby="plan-time-title"><h2 className="heading" id="plan-time-title">{t("plan.time.title", language)}</h2>
        {!infeasible && <p className="time__say">{plan.summary[language]}</p>}
        <TimeBars requiredMin={plan.requiredMin} capacityMin={plan.capacityMin} plannedMin={infeasible ? undefined : plan.plannedMin} language={language} />
      </section>
    </div>
    <div className="plan__main">
      <section className="block plan__week" aria-labelledby="plan-week-title"><h2 className="heading" id="plan-week-title">{infeasible ? t("plan.until", language, { assessment: untilAssessment }) : t("plan.week", language)}</h2>
        <SessionLine stops={plan.stops} today={view.today} topicTitles={plan.topicTitles} language={language} version={plan.version} renderCurrentAction={infeasible ? currentAction : undefined} />
      </section>
      {plan.warnings.map((warning, index) => {
        const copy = warning[language];
        const breakAt = copy.indexOf(".");
        return <div className="block" key={index}><Notice><b>{breakAt >= 0 ? copy.slice(0, breakAt + 1) : copy}</b>{breakAt >= 0 ? ` ${copy.slice(breakAt + 1).trim()}` : ""}</Notice></div>;
      })}
      <CourseDecisions plan={plan} language={language} />
      {infeasible && <section className="block" aria-labelledby="study-break-title"><h2 className="heading" id="study-break-title">{t("plan.break.title", language)}</h2><p>{t("plan.break.description", language)}</p></section>}
      <div className="block plan__advisor"><AdvisorVisibility risk={risk} language={language} studentId={student.id} /></div>
      <div className="block plan__delete"><DeleteMyData studentId={student.id} language={language} /></div>
      <details className="block plan__edit" id="edit-hours"><summary>{t("learner.editHours", language)}</summary><IntakeForm student={student} editing /></details>
    </div>
  </div>;
}
