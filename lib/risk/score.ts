import type { Availability } from "../engine/types";
import { capacity } from "../engine/capacity";
import { addDays, calendarDate, currentWeek, effectiveStatus } from "../engine/time";
import { RISK } from "./config";
import { reason, type RiskReason } from "./reasons";

type EventDate = Date;
type CalendarDate = string | Date;
type Session = { date: string; status: "pending" | "done" | "missed"; checkedAt: EventDate | null };

export type RiskInput = {
  student: { lastSeenAt: EventDate | null; escalatedAt: EventDate | null; availability: Availability | null };
  course: { startDate: CalendarDate };
  topics: { id: string; week: number; estMinutes: number }[];
  assessments: { id: string; title: string; dueDate: CalendarDate; topicIds: string[] }[];
  progress: { topicId: string; completedAt: EventDate }[];
  submissions: { assessmentId: string; submittedAt: EventDate }[];
  plan: { simNow: EventDate; status: string; sessions: Session[] } | null;
};

export type RiskResult = {
  score: number;
  band: "low" | "medium" | "high";
  reasons: RiskReason[];
  lastActivity: Date | null;
  escalated: boolean;
};

const dayMs = 86_400_000;
const asDay = (value: CalendarDate) => typeof value === "string" ? value.slice(0, 10) : calendarDate(value);
const asTime = (value: Date) => value.getTime();

/** All inputs are snapshots; future events must be ignored until the simulated clock reaches them. */
export function scoreRisk(input: RiskInput, now: Date): RiskResult {
  const today = calendarDate(now);
  const reasons: RiskReason[] = [];
  const progress = input.progress.filter(({ completedAt }) => completedAt <= now);
  const submissions = input.submissions.filter(({ submittedAt }) => submittedAt <= now);
  const checked = input.plan?.sessions.filter(({ checkedAt }) => checkedAt && checkedAt <= now).map(({ checkedAt }) => checkedAt!) ?? [];
  const activities = [input.student.lastSeenAt, ...progress.map(({ completedAt }) => completedAt), ...submissions.map(({ submittedAt }) => submittedAt), ...checked]
    .filter((date): date is Date => Boolean(date && date <= now));
  const lastActivity = activities.length ? new Date(Math.max(...activities.map(asTime))) : null;
  const escalated = Boolean(input.student.escalatedAt && input.student.escalatedAt <= now);
  if (escalated) reasons.push(reason("ESCALATED", 0));

  if (!lastActivity) reasons.push(reason("NO_ACTIVITY", 45));
  else {
    const days = Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${calendarDate(lastActivity)}T00:00:00Z`)) / dayMs));
    const points = days >= RISK.inactive.days[2] ? RISK.inactive.points[2]
      : days >= RISK.inactive.days[1] ? RISK.inactive.points[1]
        : days >= RISK.inactive.days[0] ? RISK.inactive.points[0] : 0;
    if (points) reasons.push(reason("INACTIVE", points, { days }));
  }

  const upcoming = [...input.assessments].filter(({ dueDate }) => asDay(dueDate) >= today)
    .sort((a, b) => asDay(a.dueDate).localeCompare(asDay(b.dueDate)))[0];
  if (upcoming) {
    const done = new Set(progress.map(({ topicId }) => topicId));
    const week = currentWeek(today, asDay(input.course.startDate));
    const backlogMinutes = input.topics.reduce((sum, topic) => sum + (topic.week <= week && !done.has(topic.id) ? topic.estMinutes : 0), 0);
    if (backlogMinutes > 0) {
      const days: string[] = [];
      for (let day = today; day <= asDay(upcoming.dueDate); day = addDays(day, 1)) days.push(day);
      const available = input.student.availability ? capacity(days, input.student.availability) : 0;
      if (available === 0) reasons.push(reason("NO_STUDY_TIME", 30, { assessment: upcoming.title }));
      else {
        const ratio = backlogMinutes / available;
        const points = ratio > RISK.backlog.ratio[1] ? RISK.backlog.points[1]
          : ratio >= RISK.backlog.ratio[0] ? RISK.backlog.points[0] : 0;
        if (points) reasons.push(reason("BACKLOG_PRESSURE", points, { workMinutes: backlogMinutes, availableMinutes: available, assessment: upcoming.title }));
      }
    }
  }

  const submitted = new Set(submissions.map(({ assessmentId }) => assessmentId));
  const missedAssessments = input.assessments.filter(({ id, dueDate }) => asDay(dueDate) < today && !submitted.has(id)).length;
  if (missedAssessments) reasons.push(reason("MISSED_ASSESSMENT", Math.min(missedAssessments * RISK.missedAssessment.each, RISK.missedAssessment.max), { count: missedAssessments }));

  if (input.plan) {
    const past = [...input.plan.sessions].filter(({ date }) => date < today).sort((a, b) => b.date.localeCompare(a.date));
    let missed = 0;
    for (const session of past) {
      if (effectiveStatus(session, now) !== "missed") break;
      missed++;
    }
    if (missed >= RISK.missedSessions.count) reasons.push(reason("MISSED_SESSIONS", RISK.missedSessions.points, { count: missed }));
  }

  const recentStart = new Date(now.getTime() - 14 * dayMs);
  const beforeStart = new Date(now.getTime() - 28 * dayMs);
  const minutes = (start: Date, end: Date) => {
    const done = new Set(progress.filter(({ completedAt }) => completedAt > start && completedAt <= end).map(({ topicId }) => topicId));
    return input.topics.reduce((sum, topic) => sum + (done.has(topic.id) ? topic.estMinutes : 0), 0);
  };
  const before = minutes(beforeStart, recentStart);
  const after = minutes(recentStart, now);
  if (before > 0 && after < before * RISK.fallingStudyTime.ratio) reasons.push(reason("FALLING_STUDY_TIME", RISK.fallingStudyTime.points, { before, after }));

  const score = Math.min(100, reasons.reduce((sum, item) => sum + item.points, 0));
  const band = score >= RISK.bands.high ? "high" : score >= RISK.bands.medium ? "medium" : "low";
  return { score, band, reasons, lastActivity, escalated };
}

export function sortRisk(a: RiskResult, b: RiskResult): number {
  if (a.escalated !== b.escalated) return a.escalated ? -1 : 1;
  if (a.score !== b.score) return b.score - a.score;
  if (!a.lastActivity && !b.lastActivity) return 0;
  if (!a.lastActivity) return -1;
  if (!b.lastActivity) return 1;
  return a.lastActivity.getTime() - b.lastActivity.getTime();
}
