import { addDays, calendarDate, effectiveStatus } from "./time";

export function doneThroughWeek(
  topics: { id: string; week: number }[],
  progress: { topicId: string; completedAt: Date }[],
  now: Date,
): number {
  const completed = new Set(progress.filter((item) => item.completedAt <= now).map((item) => item.topicId));
  const weeks = Math.max(0, ...topics.map((topic) => topic.week));
  let done = 0;
  for (let week = 1; week <= weeks; week++) {
    const inWeek = topics.filter((topic) => topic.week === week);
    if (!inWeek.length || inWeek.some((topic) => !completed.has(topic.id))) break;
    done = week;
  }
  return done;
}

export function miniPositions(doneWeek: number, currentWeek: number, totalWeeks: number) {
  if (totalWeeks <= 0) return { done: 0, now: 0 };
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return { done: clamp(doneWeek / totalWeeks), now: clamp((currentWeek - 1) / totalWeeks) };
}

export function timeBarWidths(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((value) => max ? Math.max(0, Math.min(1, value / max)) : 0);
}

export type Stop =
  | { kind: "session"; date: string; id: string; minutes: number; topicIds: string[]; state: "planned" | "tonight" | "done" | "missed"; editable: boolean }
  | { kind: "rest"; date: string }
  | { kind: "due"; date: string; id: string; title: string; weight: number }
  | { kind: "gap"; count: number }
  | { kind: "wont"; date: string; count: number }
  | { kind: "exam"; date: string };

type LineSession = { id: string; date: string; minutes: number; pieces: { topicId: string }[]; status: "pending" | "done" | "missed"; checkedAt?: Date | null };
type LinePlan = { version: number; simNow: Date; isCurrent: boolean; status: "fit" | "cut" | "infeasible"; unscheduledCount: number; sessions: LineSession[] };
type LineAssessment = { id: string; title: string; dueDate: string; weight: number; kind: "assignment" | "quiz" | "exam" };
type LineInput = {
  plans: LinePlan[];
  availability: Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", number>;
  assessments: LineAssessment[];
  examDate: string;
  now: Date;
};

const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function buildStops({ plans, availability, assessments, examDate, now }: LineInput): Stop[] {
  const today = calendarDate(now);
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  const monday = addDays(today, -((day + 6) % 7));
  const current = plans.find((plan) => plan.isCurrent) ?? [...plans].sort((a, b) => b.version - a.version)[0];
  if (!current) return [{ kind: "exam", date: examDate }];
  const stops: Stop[] = [];
  for (let date = monday; date < today; date = addDays(date, 1)) {
    const onDate = plans.filter((plan) => calendarDate(plan.simNow) <= date).sort((a, b) => b.version - a.version)[0];
    const session = onDate?.sessions.find((item) => item.date === date);
    if (session) stops.push(sessionStop(session, now, false));
  }
  const nextDue = assessments.filter((item) => item.kind !== "exam" && item.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  let shownDue = false;
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(today, offset);
    if (date >= examDate) break;
    const session = current.sessions.find((item) => item.date === date);
    if (session) stops.push(sessionStop(session, now, date === today));
    else if (availability[weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()]] === 0) stops.push({ kind: "rest", date });
    if (nextDue?.dueDate === date) {
      stops.push(dueStop(nextDue));
      shownDue = true;
    }
  }
  const afterWindow = addDays(today, 7);
  const future = current.sessions.filter((session) => session.date >= afterWindow && session.date < examDate);
  if (nextDue && !shownDue) {
    const before = future.filter((session) => session.date <= nextDue.dueDate).length;
    if (before) stops.push({ kind: "gap", count: before });
    stops.push(dueStop(nextDue));
    const after = future.length - before;
    if (after) stops.push({ kind: "gap", count: after });
  } else if (future.length) stops.push({ kind: "gap", count: future.length });
  if (current.status === "infeasible" && current.unscheduledCount && nextDue) stops.push({ kind: "wont", date: nextDue.dueDate, count: current.unscheduledCount });
  stops.push({ kind: "exam", date: examDate });
  return stops;
}

function sessionStop(session: LineSession, now: Date, editable: boolean): Stop {
  const status = effectiveStatus(session, now);
  return {
    kind: "session", date: session.date, id: session.id, minutes: session.minutes,
    topicIds: session.pieces.map((piece) => piece.topicId),
    state: status === "done" ? "done" : status === "missed" ? "missed" : editable ? "tonight" : "planned",
    editable,
  };
}

function dueStop(assessment: LineAssessment): Stop {
  return { kind: "due", date: assessment.dueDate, id: assessment.id, title: assessment.title, weight: assessment.weight };
}
