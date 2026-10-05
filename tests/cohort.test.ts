import { beforeAll, describe, expect, it } from "vitest";
import { COHORT_DEFAULTS, generateCohort } from "../prisma/cohort";
import { getCourseSeed } from "../prisma/course";
import { calendarDate, currentWeek } from "../lib/engine/time";
import type { PlannedSession } from "../lib/engine/types";

type Cohort = Awaited<ReturnType<typeof generateCohort>>;
let cohort: Cohort;
beforeAll(async () => { cohort = await generateCohort(); });

describe("deterministic simulated cohort", () => {
  it("repeats logical values/ids without changing global randomness", async () => {
    const random = Math.random;
    expect(await generateCohort()).toEqual(cohort);
    expect(Math.random).toBe(random);
    const changed = await generateCohort({ ...COHORT_DEFAULTS, seed: "another-demo" });
    expect(changed.students.map(({ name }) => name)).not.toEqual(cohort.students.map(({ name }) => name));
  });
  it("preserves the exact default mix, unique identities and approximately 30% Pidgin", () => {
    expect(cohort.students).toHaveLength(300);
    expect(new Set(cohort.students.map(({ id }) => id)).size).toBe(300);
    expect(new Set(cohort.students.map(({ name }) => name)).size).toBe(300);
    expect(cohort.students.every(({ isSimulated }) => isSimulated)).toBe(true);
    expect(cohort.students.filter(({ language }) => language === "pcm")).toHaveLength(90);
    expect(Object.fromEntries(Object.keys(COHORT_DEFAULTS.shares).map((segment) => [segment, cohort.students.filter((student) => student.segment === segment).length]))).toEqual({ on_track: 180, drifting: 60, recovering: 30, gone_quiet: 30 });
    expect(cohort.students.some(({ name }) => ["Amaka Okafor", "Tunde Adeyemi", "Zainab Bello"].includes(name!))).toBe(false);
  });
  it("uses valid daily hours for each segment and includes irregular weekends", () => {
    const ranges = { on_track: [45, 120], drifting: [20, 60], recovering: [30, 60], gone_quiet: [15, 45] };
    for (const student of cohort.students) for (const minutes of Object.values(student.availability)) {
      expect(minutes).toBeGreaterThanOrEqual(ranges[student.segment][0]);
      expect(minutes).toBeLessThanOrEqual(ranges[student.segment][1]);
      expect(Number.isInteger(minutes)).toBe(true);
    }
    expect(cohort.students.some(({ availability }) => availability.mon !== availability.sun)).toBe(true);
  });
  it("allocates arbitrary mixes stably and rejects invalid parameters", async () => {
    const small = await generateCohort({ seed: "small", count: 7, shares: { on_track: 0.25, drifting: 0.25, recovering: 0.25, gone_quiet: 0.25 } });
    expect(Object.keys(COHORT_DEFAULTS.shares).map((segment) => small.students.filter((student) => student.segment === segment).length)).toEqual([2, 2, 2, 1]);
    expect((await generateCohort({ ...COHORT_DEFAULTS, count: 0 })).students).toEqual([]);
    await expect(generateCohort({ ...COHORT_DEFAULTS, count: -1 })).rejects.toThrow("count");
    await expect(generateCohort({ ...COHORT_DEFAULTS, count: 769 })).rejects.toThrow("count");
    await expect(generateCohort({ ...COHORT_DEFAULTS, seed: " " })).rejects.toThrow("seed");
    await expect(generateCohort({ ...COHORT_DEFAULTS, shares: { ...COHORT_DEFAULTS.shares, on_track: 0.5 } })).rejects.toThrow("sum to one");
  });
  it("keeps stable unique progress/submission keys and source references", () => {
    const { topics, assessments } = getCourseSeed();
    expect(new Set(cohort.progress.map(({ id }) => id)).size).toBe(cohort.progress.length);
    expect(new Set(cohort.progress.map(({ studentId, topicId }) => `${studentId}:${topicId}`)).size).toBe(cohort.progress.length);
    expect(new Set(cohort.submissions.map(({ studentId, assessmentId }) => `${studentId}:${assessmentId}`)).size).toBe(cohort.submissions.length);
    for (const row of cohort.progress) expect(topics.some(({ id }) => id === row.topicId)).toBe(true);
    for (const row of cohort.submissions) expect(assessments.some(({ id }) => id === row.assessmentId)).toBe(true);
  });
  it("has the specified missed/submitted coursework proportions", () => {
    for (const [segment, submitted] of [["on_track", 180], ["drifting", 42], ["recovering", 15], ["gone_quiet", 0]] as const) {
      const ids = new Set(cohort.students.filter((student) => student.segment === segment).map(({ id }) => id));
      expect(cohort.submissions.filter((row) => ids.has(row.studentId) && row.assessmentId === "a1")).toHaveLength(submitted);
    }
    const ids = new Set(cohort.students.filter(({ segment }) => segment === "recovering").map(({ id }) => id));
    for (const assessmentId of ["a2", "a3"]) expect(cohort.submissions.filter((row) => ids.has(row.studentId) && row.assessmentId === assessmentId)).toHaveLength(21);
  });
  it("seeds on-track progress throughout future teaching weeks and early future submissions", () => {
    const { topics, assessments, course } = getCourseSeed();
    const now = new Date("2026-10-19T18:00:00+01:00");
    for (const student of cohort.students.filter(({ segment }) => segment === "on_track")) {
      const rows = cohort.progress.filter((row) => row.studentId === student.id);
      const initial = rows.filter((row) => new Date(row.completedAt) <= now);
      expect([18, 21]).toContain(initial.length);
      expect(rows).toHaveLength(36);
      for (const row of rows.filter((row) => new Date(row.completedAt) > now)) {
        const topic = topics.find(({ id }) => id === row.topicId)!;
        expect(currentWeek(calendarDate(new Date(row.completedAt)), calendarDate(course.startDate))).toBe(topic.week);
        expect(row.sessionId).toBeNull();
      }
      for (const row of cohort.submissions.filter((row) => row.studentId === student.id && row.assessmentId !== "a1")) {
        const due = calendarDate(assessments.find(({ id }) => id === row.assessmentId)!.dueDate);
        const submitted = calendarDate(new Date(row.submittedAt));
        const days = (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${submitted}T00:00:00Z`)) / 86_400_000;
        expect([2, 3]).toContain(days);
        expect(new Date(row.submittedAt) > now).toBe(true);
      }
    }
  });
  it("leaves drifting/gone-quiet students without future events or invented plans", () => {
    const demo = new Date("2026-10-19T18:00:00+01:00");
    const { topics } = getCourseSeed();
    for (const student of cohort.students.filter(({ segment }) => segment === "drifting" || segment === "gone_quiet")) {
      const rows = cohort.progress.filter((row) => row.studentId === student.id);
      const weeks = Math.max(...rows.map(({ topicId }) => topics.find(({ id }) => id === topicId)!.week));
      expect(student.segment === "drifting" ? [4, 5] : [1, 2, 3]).toContain(weeks);
      expect(rows.every((row) => new Date(row.completedAt) <= demo)).toBe(true);
      expect(cohort.plans.some((plan) => plan.studentId === student.id)).toBe(false);
    }
  });
  it("builds recovering plans with fallback and real timestamped final-piece provenance", () => {
    expect(cohort.plans).toHaveLength(30);
    for (const plan of cohort.plans) {
      expect(plan.source).toBe("fallback");
      expect(new Date(plan.simNow).toISOString()).toBe("2026-10-09T17:00:00.000Z");
      const sessions = cohort.sessions.filter((session) => session.planId === plan.id);
      expect(sessions.filter(({ status }) => status === "done").length).toBe(Math.round(sessions.length * 0.8));
      const items = cohort.planItems.filter((item) => item.planId === plan.id);
      const unplaced = (plan.unscheduled as { minutes: number }[]).reduce((sum, row) => sum + row.minutes, 0);
      expect(items.reduce((sum, item) => sum + item.minutes, 0)).toBe(sessions.reduce((sum, session) => sum + session.minutes, 0) + unplaced);
      for (const session of sessions) {
        if (session.status === "done") expect(new Date(session.checkedAt!).toISOString()).toBe(`${session.date}T20:00:00.000Z`);
        else expect(session.checkedAt).toBeNull();
        for (const piece of session.pieces as PlannedSession["pieces"]) {
          const row = cohort.progress.find((row) => row.studentId === plan.studentId && row.topicId === piece.topicId);
          if (piece.isLast && session.status === "done") { expect(row?.sessionId).toBe(session.id); expect(row?.completedAt).toEqual(session.checkedAt); }
          else expect(row?.sessionId).not.toBe(session.id);
        }
      }
    }
    expect(cohort.reminders).toHaveLength(cohort.sessions.length);
    expect(cohort.sessions.some((session) => session.date > "2026-10-19" && session.status === "done")).toBe(true);
  });
});
