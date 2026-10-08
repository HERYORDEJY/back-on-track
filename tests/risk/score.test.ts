import { describe, expect, it } from "vitest";
import type { RiskInput, RiskResult } from "../../lib/risk/score";
import { scoreRisk, sortRisk } from "../../lib/risk/score";
import { adherenceMetric } from "../../lib/risk/metric";

const now = new Date("2026-10-19T18:00:00+01:00");
const at = (day: string) => new Date(`${day}T12:00:00+01:00`);
const hours = (minutes: number) => ({ mon: minutes, tue: minutes, wed: minutes, thu: minutes, fri: minutes, sat: minutes, sun: minutes });
const base = (): RiskInput => ({
  student: { lastSeenAt: now, escalatedAt: null, availability: hours(60) },
  course: { startDate: "2026-09-07" }, topics: [],
  assessments: [{ id: "exam", title: "Exam", dueDate: "2026-12-01", topicIds: [] }],
  progress: [], submissions: [], plan: null,
});
const codes = (input: RiskInput, date = now) => scoreRisk(input, date).reasons.map(({ code }) => code);

describe("risk activity and escalation", () => {
  it.each([
    ["2026-10-16", 0], ["2026-10-15", 15], ["2026-10-12", 15],
    ["2026-10-11", 30], ["2026-10-05", 30], ["2026-10-04", 45],
  ])("scores inactivity at %s as %i", (day, points) => {
    const input = base(); input.student.lastSeenAt = at(day);
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "INACTIVE")?.points ?? 0).toBe(points);
  });

  it("uses only the latest event at or before simulated now", () => {
    const input = base(); input.student.lastSeenAt = at("2026-09-01");
    input.progress = [{ topicId: "a", completedAt: at("2026-10-18") }, { topicId: "b", completedAt: at("2026-10-20") }];
    input.submissions = [{ assessmentId: "exam", submittedAt: at("2026-10-17") }];
    input.plan = { simNow: at("2026-10-01"), status: "fit", sessions: [{ date: "2026-10-19", status: "done", checkedAt: at("2026-10-19") }] };
    expect(scoreRisk(input, now).lastActivity).toEqual(at("2026-10-19"));
    expect(codes(input)).not.toContain("INACTIVE");
  });

  it("uses NO_ACTIVITY once when all recorded activity is future dated", () => {
    const input = base(); input.student.lastSeenAt = at("2026-10-20");
    input.progress = [{ topicId: "x", completedAt: at("2026-10-20") }];
    input.submissions = [{ assessmentId: "exam", submittedAt: at("2026-10-20") }];
    expect(scoreRisk(input, now)).toMatchObject({ lastActivity: null, score: 45, band: "medium" });
    expect(codes(input)).toEqual(["NO_ACTIVITY"]);
  });

  it("shows escalation first only once it occurs, then clears with a feasible plan", () => {
    const input = base(); input.student.escalatedAt = at("2026-10-20");
    expect(scoreRisk(input, now).escalated).toBe(false);
    input.student.escalatedAt = at("2026-10-18");
    expect(scoreRisk(input, now)).toMatchObject({ escalated: true, reasons: [{ code: "ESCALATED", points: 0 }] });
    input.student.escalatedAt = null; input.plan = { simNow: now, status: "fit", sessions: [] };
    expect(scoreRisk(input, now).escalated).toBe(false);
  });
});

describe("risk pressure and missed work", () => {
  it.each([[49, 0], [50, 15], [100, 15], [101, 30]])("scores %i backlog minutes against 100 capacity as %i", (minutes, points) => {
    const input = base(); input.student.availability = hours(0); input.student.availability.mon = 100;
    input.assessments = [{ id: "a2", title: "Assignment 2", dueDate: "2026-10-19", topicIds: [] }];
    input.topics = [{ id: "t", week: 6, estMinutes: minutes }];
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "BACKLOG_PRESSURE")?.points ?? 0).toBe(points);
  });

  it("chooses the next deadline, excludes future topics and counts today through the due date", () => {
    const input = base(); input.student.availability = hours(0); input.student.availability.mon = 60; input.student.availability.tue = 60;
    input.assessments = [
      { id: "later", title: "Later", dueDate: "2026-10-25", topicIds: [] },
      { id: "next", title: "Next", dueDate: "2026-10-20", topicIds: [] },
    ];
    input.topics = [{ id: "old", week: 6, estMinutes: 60 }, { id: "future", week: 8, estMinutes: 1000 }];
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "BACKLOG_PRESSURE")?.params).toEqual({ workMinutes: 60, availableMinutes: 120, assessment: "Next" });
  });

  it("handles zero capacity with and without work, and omits pressure after the last deadline", () => {
    const input = base(); input.student.availability = hours(0); input.topics = [{ id: "t", week: 1, estMinutes: 80 }];
    expect(codes(input)).toContain("NO_STUDY_TIME");
    input.progress = [{ topicId: "t", completedAt: at("2026-10-18") }];
    expect(codes(input)).not.toContain("NO_STUDY_TIME");
    input.progress = []; input.assessments = [];
    expect(codes(input)).not.toContain("NO_STUDY_TIME");
  });

  it("counts missed assessments after their due date and caps points at twenty", () => {
    const input = base(); input.assessments = [1, 2, 3].map((n) => ({ id: `a${n}`, title: `A${n}`, dueDate: "2026-10-18", topicIds: [] }));
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "MISSED_ASSESSMENT")).toMatchObject({ points: 20, params: { count: 3 } });
    input.submissions = [{ assessmentId: "a1", submittedAt: at("2026-10-20") }];
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "MISSED_ASSESSMENT")?.params).toEqual({ count: 3 });
    input.submissions[0].submittedAt = at("2026-10-18");
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "MISSED_ASSESSMENT")?.params).toEqual({ count: 2 });
    input.assessments[0].dueDate = "2026-10-19";
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "MISSED_ASSESSMENT")?.points).toBe(20);
    input.assessments[1].dueDate = "2026-10-19";
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "MISSED_ASSESSMENT")?.points).toBe(10);
  });

  it("requires three consecutive most recent past sessions to be effectively missed", () => {
    const input = base();
    const session = (date: string, status: "pending" | "done" | "missed", checkedAt: Date | null = null) => ({ date, status, checkedAt });
    input.plan = { simNow: at("2026-10-01"), status: "fit", sessions: [session("2026-10-16", "pending"), session("2026-10-17", "pending")] };
    expect(codes(input)).not.toContain("MISSED_SESSIONS");
    input.plan.sessions.push(session("2026-10-18", "pending"));
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "MISSED_SESSIONS")?.params).toEqual({ count: 3 });
    input.plan.sessions[2] = session("2026-10-18", "done", at("2026-10-18"));
    expect(codes(input)).not.toContain("MISSED_SESSIONS");
    input.plan.sessions[2] = session("2026-10-18", "done", at("2026-10-20"));
    expect(codes(input)).toContain("MISSED_SESSIONS");
    input.plan.sessions.push(session("2026-10-19", "missed", at("2026-10-19")));
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "MISSED_SESSIONS")?.params).toEqual({ count: 3 });
  });

  it("scores falling study time only below half of the previous fortnight", () => {
    const input = base(); input.topics = [
      { id: "old", week: 1, estMinutes: 100 }, { id: "half", week: 2, estMinutes: 50 }, { id: "under", week: 2, estMinutes: 49 },
    ];
    input.progress = [{ topicId: "old", completedAt: at("2026-09-30") }, { topicId: "half", completedAt: at("2026-10-18") }];
    expect(codes(input)).not.toContain("FALLING_STUDY_TIME");
    input.progress[1] = { topicId: "under", completedAt: at("2026-10-18") };
    expect(scoreRisk(input, now).reasons.find(({ code }) => code === "FALLING_STUDY_TIME")).toMatchObject({ points: 10, params: { before: 100, after: 49 } });
    input.progress = [{ topicId: "under", completedAt: at("2026-10-18") }];
    expect(codes(input)).not.toContain("FALLING_STUDY_TIME");
  });

  it("caps the total at 100 and derives bands at 30 and 60", () => {
    const input = base(); input.student.lastSeenAt = at("2026-10-04");
    input.student.availability = hours(0); input.topics = [{ id: "t", week: 1, estMinutes: 100 }];
    input.assessments.unshift({ id: "a1", title: "A1", dueDate: "2026-10-01", topicIds: [] }, { id: "a2", title: "A2", dueDate: "2026-10-02", topicIds: [] });
    input.plan = { simNow: at("2026-09-01"), status: "fit", sessions: ["2026-10-16", "2026-10-17", "2026-10-18"].map((date) => ({ date, status: "pending", checkedAt: null })) };
    expect(scoreRisk(input, now)).toMatchObject({ score: 100, band: "high" });
  });

  it("uses the exact 30 and 60 band boundaries", () => {
    const input = base(); input.student.lastSeenAt = at("2026-10-11");
    expect(scoreRisk(input, now)).toMatchObject({ score: 30, band: "medium" });
    input.student.lastSeenAt = at("2026-10-04");
    input.student.availability = hours(0); input.student.availability.mon = 100;
    input.assessments = [{ id: "today", title: "Today", dueDate: "2026-10-19", topicIds: [] }];
    input.topics = [{ id: "backlog", week: 1, estMinutes: 50 }];
    expect(scoreRisk(input, now)).toMatchObject({ score: 60, band: "high" });
  });
});

describe("sort and adherence", () => {
  const result = (score: number, activity: Date | null, escalated = false): RiskResult => ({ score, lastActivity: activity, escalated, band: "low", reasons: [] });
  it("sorts escalation, score and oldest activity", () => {
    const rows = [result(70, at("2026-10-18")), result(80, at("2026-10-18")), result(80, null), result(20, at("2026-10-18"), true)];
    const expected = [rows[3], rows[2], rows[1], rows[0]];
    expect([...rows].sort(sortRisk)).toEqual(expected);
    expect(sortRisk(result(0, null), result(0, null))).toBe(0);
  });

  it("excludes young plans, empty windows and future check-ins; keeps the 70% boundary", () => {
    const plan = (simNow: Date, count: number, done: number) => ({ simNow, sessions: Array.from({ length: count }, (_, i) => ({
      date: `2026-10-${String(i + 6).padStart(2, "0")}`, status: i < done ? "done" as const : "pending" as const,
      checkedAt: i < done ? at(`2026-10-${String(i + 6).padStart(2, "0")}`) : null,
    })) });
    expect(adherenceMetric([], now)).toBeNull();
    expect(adherenceMetric([plan(at("2026-10-01"), 0, 0)], now)).toBeNull();
    expect(adherenceMetric([plan(at("2026-10-10"), 10, 10)], now)).toBeNull();
    expect(adherenceMetric([plan(at("2026-10-01"), 10, 7), plan(at("2026-10-01"), 10, 6)], now)).toEqual({ kept: 1, total: 2 });
    const future = plan(at("2026-10-01"), 10, 7); future.sessions[0].checkedAt = at("2026-10-20");
    expect(adherenceMetric([future], now)).toEqual({ kept: 0, total: 1 });
  });
});
