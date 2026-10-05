import seedrandom from "seedrandom";
import type { Prisma } from "../lib/generated/prisma/client";
import { buildPlan } from "../lib/engine/plan";
import { addDays, calendarDate } from "../lib/engine/time";
import { getCourseSeed } from "./course";

export const COHORT_DEFAULTS = { seed: "back-on-track-2026", count: 300, shares: { on_track: 0.6, drifting: 0.2, recovering: 0.1, gone_quiet: 0.1 } } as const;
type Segment = keyof typeof COHORT_DEFAULTS.shares;
type Options = { seed: string; count: number; shares: Record<Segment, number> };
type Student = Prisma.StudentCreateManyInput & { segment: Segment; availability: Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", number> };
const firstNames = ["Adebayo", "Adeola", "Bisi", "Bola", "Damilola", "Femi", "Funke", "Kemi", "Oluwaseun", "Temitope", "Chidinma", "Chinedu", "Emeka", "Ifeoma", "Nkechi", "Ngozi", "Obinna", "Uche", "Aisha", "Amina", "Fatima", "Hassan", "Ibrahim", "Musa", "Sadiq", "Yusuf", "Ebi", "Efe", "Ese", "Ini", "Isong", "Osaze"];
const lastNames = ["Adebisi", "Afolabi", "Ajayi", "Alabi", "Balogun", "Lawal", "Ogunleye", "Ojo", "Onyeka", "Eze", "Nwankwo", "Nwosu", "Okeke", "Okonkwo", "Abubakar", "Balarabe", "Garba", "Haruna", "Suleiman", "Usman", "Edet", "Ekanem", "Okon", "Omoregie"];

function allocate(count: number, shares: Options["shares"]) {
  const segments = Object.keys(COHORT_DEFAULTS.shares) as Segment[];
  if (Object.keys(shares).length !== segments.length || segments.some((segment) => !Number.isFinite(shares[segment]) || shares[segment] < 0) || Math.abs(segments.reduce((sum, segment) => sum + shares[segment], 0) - 1) > 1e-9) throw new Error("Segment shares must be nonnegative and sum to one");
  const counts = segments.map((segment, order) => ({ segment, order, count: Math.floor(count * shares[segment]), fraction: count * shares[segment] % 1 }));
  const extra = count - counts.reduce((sum, item) => sum + item.count, 0);
  for (const item of [...counts].sort((a, b) => b.fraction - a.fraction || a.order - b.order).slice(0, extra)) item.count++;
  return counts;
}

/** Pure asynchronous generation; buildPlan receives null triage and does no I/O. */
export async function generateCohort({ seed, count, shares }: Options = COHORT_DEFAULTS) {
  if (!seed.trim() || !Number.isSafeInteger(count) || count < 0 || count > firstNames.length * lastNames.length) throw new Error("Use a nonempty seed and a count within the unique name pool");
  const rng = seedrandom(seed);
  const integer = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const shuffle = <T,>(values: T[]): T[] => {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) { const other = integer(0, index); [result[index], result[other]] = [result[other], result[index]]; }
    return result;
  };
  const names = shuffle(firstNames.flatMap((first) => lastNames.map((last) => `${first} ${last}`)));
  const pcmIndices = new Set(shuffle(Array.from({ length: count }, (_, i) => i)).slice(0, Math.round(count * 0.3)));
  const { course, topics, assessments } = getCourseSeed();
  const start = calendarDate(course.startDate);
  const demo = "2026-10-19";
  const planNow = new Date("2026-10-09T18:00:00+01:00");
  const students: Student[] = [];
  const progress: Prisma.ProgressCreateManyInput[] = [];
  const submissions: Prisma.SubmissionCreateManyInput[] = [];
  const plans: Prisma.PlanCreateManyInput[] = [];
  const planItems: Prisma.PlanItemCreateManyInput[] = [];
  const sessions: Prisma.SessionCreateManyInput[] = [];
  const reminders: Prisma.ReminderCreateManyInput[] = [];
  const atNight = (date: string) => new Date(`${date}T21:00:00+01:00`);
  const addSubmission = (studentId: string, assessmentId: string, date: string) => submissions.push({ id: `${studentId}-submission-${assessmentId}`, studentId, assessmentId, submittedAt: atNight(date) });

  for (const { segment, count: segmentCount } of allocate(count, shares)) {
    for (let index = 0; index < segmentCount; index++) {
      const globalIndex = students.length;
      const id = `cohort-${String(globalIndex + 1).padStart(3, "0")}`;
      const [min, max] = segment === "on_track" ? [45, 120] : segment === "drifting" ? [20, 60] : segment === "recovering" ? [30, 60] : [15, 45];
      const weekday = integer(min / 5, max / 5) * 5;
      const weekend = rng() < 0.5 ? integer(min / 5, max / 5) * 5 : weekday;
      const doneWeeks = segment === "on_track" ? integer(6, 7) : segment === "drifting" ? integer(4, 5) : segment === "recovering" ? integer(3, 4) : integer(1, 3);
      const quietDays = segment === "on_track" ? integer(0, 3) : segment === "drifting" ? integer(4, 10) : segment === "recovering" ? integer(0, 2) : integer(15, 40);
      const lastSeenDate = addDays(demo, -quietDays);
      const student: Student = { id, name: names[globalIndex], language: pcmIndices.has(globalIndex) ? "pcm" : "en", isSimulated: true, segment, context: null, goal: null, hoursVary: false, availability: { mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekday, sat: weekend, sun: weekend }, lastSeenAt: atNight(lastSeenDate), escalatedAt: null };
      students.push(student);
      const baseline = topics.filter(({ week }) => week <= doneWeeks);
      for (const topic of baseline) {
        const teachingDate = addDays(start, (topic.week - 1) * 7 + [1, 3, 6][(topic.order - 1) % 3]);
        // Week-7 on-track students have read ahead before the demo starts.
        const cutoff = segment === "recovering" ? "2026-10-08" : lastSeenDate < demo ? lastSeenDate : addDays(demo, -1);
        const date = teachingDate < cutoff ? teachingDate : cutoff;
        progress.push({ id: `${id}-progress-${topic.id}`, studentId: id, topicId: topic.id, completedAt: atNight(date), sessionId: null });
      }
      const missedA1 = segment === "gone_quiet" || (segment === "drifting" && index < Math.round(segmentCount * 0.3)) || (segment === "recovering" && index < Math.round(segmentCount * 0.5));
      if (!missedA1) addSubmission(id, "a1", addDays("2026-10-04", -integer(1, 3)));

      if (segment === "on_track") {
        for (const topic of topics.filter(({ week }) => week > doneWeeks)) {
          const date = addDays(start, (topic.week - 1) * 7 + [1, 3, 6][(topic.order - 1) % 3]);
          progress.push({ id: `${id}-progress-${topic.id}`, studentId: id, topicId: topic.id, completedAt: atNight(date), sessionId: null });
        }
        addSubmission(id, "a2", addDays("2026-11-01", -integer(2, 3)));
        addSubmission(id, "a3", addDays("2026-11-22", -integer(2, 3)));
      }
      if (segment !== "recovering") continue;
      const result = await buildPlan({ now: planNow, course: { startDate: start, examDate: calendarDate(course.examDate) }, topics, assessments: assessments.map((assessment) => ({ ...assessment, dueDate: calendarDate(assessment.dueDate) })), availability: student.availability, progress: progress.filter((row) => row.studentId === id).map((row) => ({ topicId: row.topicId, completedAt: new Date(row.completedAt) })), student: {} }, async () => null);
      const planId = `${id}-plan-1`;
      plans.push({ id: planId, studentId: id, version: 1, isCurrent: true, simNow: planNow, status: result.status, source: result.source, requiredMin: result.requiredMin, capacityMin: result.capacityMin, summary: result.summary, warnings: result.warnings, unscheduled: result.unscheduled, focusAssessmentId: result.focusAssessmentId ?? null, focusDueDate: result.focusDueDate ? new Date(`${result.focusDueDate}T00:00:00+01:00`) : null });
      if (result.escalate) student.escalatedAt = planNow;
      for (const decision of result.decisions) planItems.push({ id: `${planId}-item-${decision.topicId}`, planId, ...decision });
      const doneIndices = new Set(shuffle(result.sessions.map((_, i) => i)).slice(0, Math.round(result.sessions.length * 0.8)));
      for (const [sessionIndex, session] of result.sessions.entries()) {
        const sessionId = `${planId}-session-${session.date}`;
        const done = doneIndices.has(sessionIndex);
        const checkedAt = done ? atNight(session.date) : null;
        sessions.push({ id: sessionId, planId, date: session.date, minutes: session.minutes, pieces: session.pieces, status: done ? "done" : "pending", checkedAt });
        reminders.push({ id: `${sessionId}-reminder`, studentId: id, sessionId, at: session.reminder.at, text: session.reminder.text });
        if (done) for (const piece of session.pieces.filter(({ isLast }) => isLast)) progress.push({ id: `${id}-progress-${piece.topicId}`, studentId: id, topicId: piece.topicId, completedAt: checkedAt!, sessionId });
      }
      if (index < Math.round(segmentCount * 0.7)) {
        addSubmission(id, "a2", "2026-10-31");
        addSubmission(id, "a3", "2026-11-21");
      }
    }
  }
  return { students, progress, submissions, plans, planItems, sessions, reminders };
}
