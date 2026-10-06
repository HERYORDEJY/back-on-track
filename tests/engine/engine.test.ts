import { describe, expect, it, vi } from "vitest";
import { buildPlan } from "../../lib/engine/plan";
import { calendarDate, currentWeek, effectiveStatus, focusExpired, needsReplan, planDays } from "../../lib/engine/time";
import { capacity } from "../../lib/engine/capacity";
import { getWork } from "../../lib/engine/backlog";
import { actionMinutes, inheritedDeadlines, nextAssessment, priorityOrder, protectedFloor, protectedTopics } from "../../lib/engine/rules";
import { courseBasis } from "../../lib/engine/basis";
import { planState, decisionsFor, triageContext } from "../../lib/engine/triage";
import { schedule } from "../../lib/engine/schedule";
import { validate } from "../../lib/engine/validate";
import { fallbackTriage } from "../../lib/engine/fallback";
import type { Assessment, TriageOutput } from "../../lib/engine/types";
import { hours, input, output, personaInput, topic } from "./fixtures";

const coursework: Assessment = { id: "a2", title: "Assignment 2", kind: "assignment", dueDate: "2026-10-19", weight: 0.15, topicIds: ["b"] };
const rationale = { en: "Shortened for your time.", pcm: "We shorten am for your time." };

describe("Lagos time and as-of work", () => {
  it("handles local midnight and clamps teaching weeks", () => {
    expect(calendarDate(new Date("2026-10-18T23:00:00Z"))).toBe("2026-10-19");
    expect(currentWeek("2026-10-19", "2026-09-07")).toBe(7);
    expect(currentWeek("2026-08-01", "2026-09-07")).toBe(1);
    expect(currentWeek("2026-11-30", "2026-09-07")).toBe(12);
  });
  it("includes today but excludes exam day and bounds focus horizons", () => {
    expect(planDays("2026-10-19", "2026-10-22")).toEqual(["2026-10-19", "2026-10-20", "2026-10-21"]);
    expect(planDays("2026-10-19", "2026-10-22", "2026-10-20")).toHaveLength(2);
    expect(planDays("2026-10-19", "2026-10-22", "2026-10-25")).toHaveLength(3);
    expect(planDays("2026-10-22", "2026-10-22")).toEqual([]);
  });
  it("excludes future progress and separates backlog from remaining", () => {
    const value = input({ topics: [topic("a", 1), topic("b", 2, { week: 7 }), topic("c", 3, { week: 8 })], progress: [{ topicId: "a", completedAt: new Date("2026-10-19T17:00:00Z") }, { topicId: "b", completedAt: new Date("2026-10-19T17:00:01Z") }] });
    const work = getWork(value);
    expect([...work.done]).toEqual(["a"]);
    expect(work.backlog.map(({ id }) => id)).toEqual(["b"]);
    expect(work.remaining.map(({ id }) => id)).toEqual(["c"]);
    expect(work.requiredMin).toBe(80);
  });
  it.each([
    ["2026-10-18", "pending", null, "missed"], ["2026-10-19", "pending", null, "pending"], ["2026-10-20", "pending", null, "pending"],
    ["2026-10-18", "done", "2026-10-19T17:00:00Z", "done"], ["2026-10-18", "missed", "2026-10-19T17:00:00Z", "missed"],
    ["2026-10-18", "done", "2026-10-20T17:00:00Z", "missed"], ["2026-10-19", "done", "2026-10-20T17:00:00Z", "pending"],
  ] as const)("reads %s %s checked %s as %s", (date, status, checked, expected) => {
    expect(effectiveStatus({ date, status, checkedAt: checked ? new Date(checked) : null }, input().now)).toBe(expected);
  });
  it("expires an infeasible focus only after its local date passes", () => {
    expect(focusExpired("2026-10-19", input().now)).toBe(false);
    expect(focusExpired("2026-10-18", input().now)).toBe(true);
    expect(focusExpired(undefined, input().now)).toBe(false);
  });
  it("re-plans on a later visit after today's miss while preserving today's editability", () => {
    const now = input().now;
    const todayMissed = { date: "2026-10-19", status: "missed" as const, checkedAt: now };
    expect(needsReplan({ status: "cut", sessions: [todayMissed] }, now)).toBe(false);
    expect(needsReplan({ status: "cut", sessions: [todayMissed] }, new Date("2026-10-20T17:00:00Z"))).toBe(true);
    expect(needsReplan({ status: "cut", sessions: [{ ...todayMissed, status: "done" }] }, new Date("2026-10-20T17:00:00Z"))).toBe(false);
    expect(needsReplan({ status: "infeasible", focusDueDate: "2026-10-19", sessions: [] }, new Date("2026-10-20T17:00:00Z"))).toBe(true);
  });
  it("sums weekday-specific capacity including irregular/zero days", () => {
    expect(capacity(planDays("2026-10-19", "2026-10-26"), { ...hours(40), sat: 0, sun: 90 })).toBe(290);
  });
});

describe("protection, basis and code-owned order", () => {
  it("selects upcoming coursework separately from the exam", () => {
    const exam = { ...coursework, id: "exam", kind: "exam" as const, dueDate: "2026-10-20" };
    expect(nextAssessment([exam, coursework], "2026-10-19")?.id).toBe("a2");
    expect(nextAssessment([exam, coursework], "2026-10-20", true)).toBeNull();
    expect(nextAssessment([exam, coursework], "2026-10-20")?.id).toBe("exam");
  });
  it("protects unfinished parents, weighted next coursework and the stable top third", () => {
    const topics = [topic("a", 1, { examWeight: 0.6 }), topic("b", 2, { examWeight: 0.3 }), topic("c", 3, { examWeight: 0.1, prereqIds: ["b"] })];
    expect([...protectedTopics(topics, topics, null)].sort()).toEqual(["a", "b"]);
    expect([...protectedTopics(topics, topics, { ...coursework, topicIds: ["c"] })].sort()).toEqual(["a", "b", "c"]);
    expect([...protectedTopics(topics, topics.slice(1), { ...coursework, weight: 0.14, topicIds: ["c"] })]).toEqual(["b"]);
    expect(protectedTopics(topics, [topics[0], topics[1]], null).has("b")).toBe(false);
  });
  it("rounds action minutes before summing the protected floor", () => {
    const value = topic("a", 1, { estMinutes: 61 });
    expect(["keep", "compress_light", "compress_heavy", "skip"].map((action) => actionMinutes(value, action as "keep"))).toEqual([61, 43, 31, 0]);
    expect(protectedFloor([value, topic("b", 2, { estMinutes: 61 })], new Set(["a", "b"]))).toBe(86);
  });
  it("inherits deadlines recursively even when parent weight is lower", () => {
    const topics = [topic("a", 1, { examWeight: 0.01 }), topic("b", 2, { prereqIds: ["a"] }), topic("c", 3, { prereqIds: ["b"] })];
    const deadlines = inheritedDeadlines(topics, [{ ...coursework, topicIds: ["c"] }, { ...coursework, id: "later", dueDate: "2026-10-21", topicIds: ["a"] }], "2026-10-19");
    expect([...deadlines.values()]).toEqual(["2026-10-19", "2026-10-19", "2026-10-19"]);
    expect(priorityOrder(topics, deadlines).map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });
  it("uses deadline then weight, week and stable course order among eligible topics", () => {
    const topics = [topic("a", 1, { examWeight: 0.5, week: 2 }), topic("b", 2, { examWeight: 0.5, week: 1 }), topic("c", 3, { examWeight: 0.1 })];
    expect(priorityOrder(topics, new Map([["c", "2026-10-19"]])).map(({ id }) => id)).toEqual(["c", "b", "a"]);
    expect(priorityOrder([topic("b", 2), topic("a", 1)], new Map()).map(({ id }) => id)).toEqual(["a", "b"]);
  });
  it("rejects cycles rather than silently generating a prerequisite violation", () => {
    const topics = [topic("a", 1, { prereqIds: ["b"] }), topic("b", 2, { prereqIds: ["a"] })];
    expect(() => priorityOrder(topics, new Map())).toThrow("cycle");
    expect(() => inheritedDeadlines(topics, [{ ...coursework, topicIds: ["a"] }], "2026-10-19")).toThrow("cycle");
  });
  it("uses labelled basis precedence: prerequisite, coursework, high then low exam weight", () => {
    const a = topic("a", 1); const b = topic("b", 2, { prereqIds: ["a"] });
    expect(courseBasis(a, [a, b], { ...coursework, topicIds: ["a"] }, new Set(["a"])).en).toContain("Simulated prerequisite");
    expect(courseBasis(b, [a, b], coursework, new Set(["b"])).en).toContain("Simulated coursework");
    expect(courseBasis(a, [a], null, new Set(["a"])).en).toContain("high");
    expect(courseBasis(a, [a], null, new Set()).en).toContain("low");
  });
});

describe("shared rounded-minute scheduler", () => {
  it("splits a topic across days and marks only its final piece complete", () => {
    const value = input({ topics: [topic("a", 1, { estMinutes: 61 })] });
    const result = schedule(decisionsFor(planState(value)), ["2026-10-19", "2026-10-20", "2026-10-21"], hours(30), value.topics);
    expect(result.sessions.map(({ minutes }) => minutes)).toEqual([30, 30, 1]);
    expect(result.sessions.map(({ pieces }) => pieces[0].isLast)).toEqual([false, false, true]);
    expect(result.unscheduled).toEqual([]);
    expect(result.sessions[0].reminder.at.toISOString()).toBe("2026-10-19T19:00:00.000Z");
  });
  it("drops daily remnants under 20 even when raw capacity covers required minutes", () => {
    const value = input({ topics: [topic("a", 1, { estMinutes: 25 }), topic("b", 2, { estMinutes: 25 })], availability: hours(30), course: { startDate: "2026-09-07", examDate: "2026-10-21" } });
    const result = schedule(decisionsFor(planState(value)), ["2026-10-19", "2026-10-20"], value.availability, value.topics);
    expect(result.sessions.map(({ minutes }) => minutes)).toEqual([25, 25]);
    const bad = { ...value, availability: hours(19) };
    expect(schedule(decisionsFor(planState(bad)), planDays("2026-10-19", "2026-10-22"), bad.availability, bad.topics).unscheduled).toHaveLength(2);
    expect(capacity(planDays("2026-10-19", "2026-10-22"), bad.availability)).toBe(57);
  });
  it("leaves truncated pieces unfinished, omits zero days and skipped topics", () => {
    const value = input(); const state = planState(value);
    const result = schedule(decisionsFor(state, new Map([["b", "skip"], ["c", "skip"]])), ["2026-10-19", "2026-10-20"], { ...hours(0), mon: 20 }, value.topics);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].pieces).toEqual([{ topicId: "a", minutes: 20, isLast: false }]);
    expect(result.unscheduled).toEqual([{ topicId: "a", minutes: 20 }]);
  });
  it("captures the agreed ordering's effect on usable remnants", () => {
    const value = input({ topics: [topic("a", 1, { estMinutes: 15 }), topic("b", 2, { estMinutes: 25 })], availability: hours(40) });
    const decisions = decisionsFor(planState(value));
    expect(schedule(decisions, ["2026-10-19"], value.availability, value.topics).unscheduled).toEqual([]);
    expect(schedule([...decisions].reverse(), ["2026-10-19"], value.availability, value.topics).unscheduled).toEqual([{ topicId: "a", minutes: 15 }]);
  });
});

describe("sparse validation and deterministic fallback", () => {
  it.each([
    [output([{ topicId: "c", action: "skip", rationale }, { topicId: "c", action: "skip", rationale }]), "DUPLICATE_TOPIC"],
    [output([{ topicId: "unknown", action: "skip", rationale }]), "UNKNOWN_TOPIC"],
    [output([{ topicId: "a", action: "skip", rationale }]), "ACTION_NOT_ALLOWED"],
    [output([{ topicId: "a", action: "compress_heavy", rationale }]), "ACTION_NOT_ALLOWED"],
    [output([{ topicId: "c", action: "keep" as TriageOutput["items"][number]["action"], rationale }]), "ACTION_NOT_ALLOWED"],
  ] as const)("rejects invalid sparse changes (%s)", (proposal, code) => {
    const value = input();
    expect(validate(proposal, "cut", planState(value), value).violations.map(({ code }) => code)).toContain(code);
  });
  it("rejects every changed item for a fit proposal", () => {
    const value = input();
    expect(validate(output([{ topicId: "c", action: "skip", rationale }]), "fit", planState(value), value).violations[0].code).toBe("ACTION_NOT_ALLOWED");
  });
  it("expands omitted topics to keep and validates actual placement", () => {
    const value = input({ availability: hours(60) }); const state = planState(value);
    expect(validate(output(), "cut", state, value).violations[0].code).toBe("OVER_CAPACITY");
    const good = validate(output([{ topicId: "b", action: "skip", rationale }, { topicId: "c", action: "skip", rationale }]), "cut", state, value);
    expect(good.violations).toEqual([]);
    expect(good.decisions.find(({ topicId }) => topicId === "a")?.action).toBe("keep");
    expect(good.placement.unscheduled).toEqual([]);
  });
  it("skips the lowest weight first and stops as soon as placement succeeds", () => {
    const value = input({ availability: hours(80) });
    const result = fallbackTriage(value, planState(value));
    expect(result.decisions.filter(({ action }) => action === "skip").map(({ topicId }) => topicId)).toEqual(["c"]);
    expect(result.unscheduled).toEqual([]);
  });
  it("breaks skip ties by later week, then course order", () => {
    const value = input({ availability: hours(80), topics: [topic("a", 1, { examWeight: 0.6 }), topic("b", 2, { examWeight: 0.2 }), topic("c", 3, { examWeight: 0.2, week: 2 })] });
    expect(fallbackTriage(value, planState(value)).decisions.find(({ topicId }) => topicId === "c")?.action).toBe("skip");
  });
  it("lightly compresses protected work after unprotected skips are exhausted", () => {
    const value = input({ availability: hours(100), assessments: [{ ...coursework, topicIds: ["a", "b", "c"] }] });
    const result = fallbackTriage(value, planState(value));
    expect(result.unscheduled).toEqual([]);
    expect(result.decisions.filter(({ action }) => action === "compress_light")).toHaveLength(2);
    expect(result.decisions.every(({ action }) => action === "keep" || action === "compress_light")).toBe(true);
  });
  it("retains explicit unplaced protected minimum when it cannot fit", () => {
    const value = input({ availability: hours(20), topics: [topic("a", 1)] });
    const result = fallbackTriage(value, planState(value));
    expect(result.unscheduled).toEqual([{ topicId: "a", minutes: 8 }]);
    expect(result.decisions[0].action).toBe("compress_light");
  });
});

describe("plan assembly", () => {
  it("returns a complete empty fit plan when all course work is already done", async () => {
    const value = input();
    value.progress = value.topics.map(({ id }) => ({ topicId: id, completedAt: value.now }));
    const result = await buildPlan(value, async () => null);
    expect(result.status).toBe("fit"); expect(result.requiredMin).toBe(0);
    expect(result.decisions).toEqual([]); expect(result.sessions).toEqual([]);
    expect(result.unscheduled).toEqual([]); expect(result.escalate).toBe(false);
  });
  it("never accepts display capacity when every daily budget is unusable", async () => {
    const value = input({ topics: [topic("a", 1, { estMinutes: 25 }), topic("b", 2, { estMinutes: 25 })], availability: hours(19), course: { startDate: "2026-09-07", examDate: "2026-10-22" } });
    const result = await buildPlan(value, async () => null);
    expect(result.capacityMin).toBeGreaterThan(result.requiredMin);
    expect(result.status).toBe("infeasible"); expect(result.sessions).toEqual([]);
    expect(result.unscheduled.length).toBeGreaterThan(0);
  });
  it.each([["amaka", "cut"], ["tunde", "infeasible"], ["zainab", "fit"]] as const)("gives approved persona %s a %s fallback plan", async (id, expected) => {
    const value = personaInput(id); const original = structuredClone(value);
    const result = await buildPlan(value, async () => null);
    expect(result.status).toBe(expected); expect(result.source).toBe("fallback");
    expect(value).toEqual(original);
    expect(result.escalate).toBe(expected === "infeasible");
    if (expected !== "infeasible") expect(result.unscheduled).toEqual([]);
    for (const session of result.sessions) expect(session.date < value.course.examDate).toBe(true);
    for (const decision of result.decisions) expect(decision.basis.en).toContain("Simulated");
  });
  it("retries twice with violations and accepts the corrected result", async () => {
    const value = input(); const bad = output([{ topicId: "a", action: "skip", rationale }]);
    const triage = vi.fn().mockResolvedValueOnce({ output: bad, source: "ai" }).mockResolvedValueOnce({ output: bad, source: "ai" }).mockResolvedValueOnce({ output: output(), source: "ai" });
    expect((await buildPlan(value, triage)).source).toBe("ai");
    expect(triage).toHaveBeenCalledTimes(3);
    expect(triage.mock.calls[1][1][0].code).toBe("ACTION_NOT_ALLOWED");
    expect(triage.mock.calls[2][1][0].message).toContain("not allowed");
  });
  it("falls back after three invalid replies, null, or a thrown call", async () => {
    const invalid = vi.fn().mockResolvedValue({ output: output([{ topicId: "a", action: "skip", rationale }]), source: "ai" });
    expect((await buildPlan(input(), invalid)).source).toBe("fallback"); expect(invalid).toHaveBeenCalledTimes(3);
    const miss = vi.fn().mockResolvedValue(null);
    expect((await buildPlan(input(), miss)).source).toBe("fallback"); expect(miss).toHaveBeenCalledTimes(1);
    expect((await buildPlan(input(), async () => { throw new Error("network"); })).source).toBe("fallback");
  });
  it("accepts cache summaries and preserves sparse rationale with code minutes", async () => {
    const value = input({ availability: hours(60) });
    const proposal = output([{ topicId: "b", action: "skip", rationale }, { topicId: "c", action: "skip", rationale }]);
    const result = await buildPlan(value, async () => ({ output: proposal, source: "cache" }));
    expect(result.status).toBe("cut"); expect(result.source).toBe("cache"); expect(result.summary).toEqual(proposal.summary);
    expect(result.decisions.find(({ topicId }) => topicId === "c")?.rationale).toEqual(rationale);
  });
  it("does not call AI when protected work is infeasible and targets the next assessment with parents", async () => {
    const value = input({ availability: hours(20), topics: [topic("a", 1), topic("b", 2, { prereqIds: ["a"] })], assessments: [coursework] });
    const triage = vi.fn(); const result = await buildPlan(value, triage);
    expect(triage).not.toHaveBeenCalled(); expect(result.status).toBe("infeasible");
    expect(result.focusAssessmentId).toBe("a2"); expect(result.focusDueDate).toBe("2026-10-19");
    expect(result.decisions.map(({ topicId }) => topicId)).toEqual(["a", "b"]);
    expect(result.sessions[0].pieces[0].isLast).toBe(false);
    expect(result.unscheduled).toEqual([{ topicId: "a", minutes: 20 }, { topicId: "b", minutes: 40 }]);
    expect(result.decisions[0].rationale.en).toContain("before a topic");
  });
  it("can focus the exam after the quiz and never schedules on exam day", async () => {
    const value = input({ availability: hours(0), assessments: [{ ...coursework, id: "quiz", kind: "quiz", dueDate: "2026-10-18" }, { ...coursework, id: "exam", kind: "exam", dueDate: "2026-10-20", topicIds: ["a", "b", "c"] }] });
    const result = await buildPlan(value, async () => null);
    expect(result.focusAssessmentId).toBe("exam"); expect(result.sessions).toEqual([]); expect(result.unscheduled).toHaveLength(3);
  });
  it("uses protected work with exam cutoff if no assessment remains", async () => {
    const result = await buildPlan(input({ availability: hours(0) }), async () => null);
    expect(result.status).toBe("infeasible"); expect(result.focusDueDate).toBe("2026-10-20"); expect(result.decisions).toHaveLength(1);
  });
  it("warns about late coursework without rejecting fully placed fit work", async () => {
    const value = input({ availability: hours(60), course: { startDate: "2026-09-07", examDate: "2026-10-22" }, assessments: [{ ...coursework, topicIds: ["a", "b", "c"] }] });
    const result = await buildPlan(value, async () => null);
    expect(result.status).toBe("fit"); expect(result.unscheduled).toEqual([]); expect(result.warnings[0].en).toContain("2 topics");
  });
  it("reports moved, shortened and dropped differences from the previous plan", async () => {
    const value = input({ availability: hours(60) });
    value.previous = { decisions: decisionsFor(planState(value)), sessions: [{ date: "2026-10-18", topicIds: ["a", "b", "c"] }] };
    const result = await buildPlan(value, async () => ({ output: output([{ topicId: "a", action: "compress_light", rationale }, { topicId: "b", action: "skip", rationale }, { topicId: "c", action: "skip", rationale }]), source: "ai" }));
    expect(result.changeSummary?.en).toBe("Moved 1 topics, shortened 1, dropped 2.");
  });
  it("builds a metadata-only triage context with display numbers and inherited deadlines", () => {
    const value = input({ availability: hours(60), assessments: [coursework] }); const state = planState(value);
    const context = triageContext(value, state, "cut");
    expect(context.deficitMin).toBe(60); expect(context.nextCoursework?.title).toBe("Assignment 2");
    expect(context.topics.find(({ id }) => id === "b")?.deadline).toBe("2026-10-19");
    expect(JSON.stringify(context)).not.toContain("completedAt");
    expect(context).not.toHaveProperty("order");
  });
});
