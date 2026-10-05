import { formatDate } from "../i18n";
import { ENGINE } from "./config";
import { localized } from "./basis";
import { planDays } from "./time";
import { decisionsFor, planState, triageContext, type PlanState } from "./triage";
import { schedule } from "./schedule";
import { validate } from "./validate";
import { fallbackTriage } from "./fallback";
import type { Action, Decision, Localized, PlanInput, PlanResult, PlannedSession, TriageFn, Violation } from "./types";

function warnings(input: PlanInput, state: PlanState, sessions: PlannedSession[]): Localized[] {
  const finish = new Map(sessions.flatMap(({ date, pieces }) => pieces.filter(({ isLast }) => isLast).map(({ topicId }) => [topicId, date] as const)));
  return input.assessments.filter((assessment) => assessment.kind !== "exam" && assessment.dueDate >= state.today).flatMap((assessment) => {
    const n = assessment.topicIds.filter((id) => Boolean(finish.get(id) && finish.get(id)! > assessment.dueDate)).length;
    return n ? [localized("plan.deadlineWarning", { n, assessment: assessment.title, date: formatDate(new Date(`${assessment.dueDate}T00:00:00+01:00`), "en") })] : [];
  });
}

function changeSummary(input: PlanInput, decisions: Decision[], sessions: PlannedSession[]): Localized | undefined {
  if (!input.previous) return undefined;
  const previous = new Map(input.previous.decisions.map((decision) => [decision.topicId, decision.action]));
  const before = new Map<string, string>();
  const after = new Map<string, string>();
  for (const session of [...input.previous.sessions].sort((a, b) => a.date.localeCompare(b.date))) for (const id of session.topicIds) if (!before.has(id)) before.set(id, session.date);
  for (const session of sessions) for (const piece of session.pieces) if (!after.has(piece.topicId)) after.set(piece.topicId, session.date);
  return localized("plan.changeSummary", {
    moved: [...after].filter(([id, date]) => before.has(id) && before.get(id) !== date).length,
    shortened: decisions.filter(({ topicId, action }) => previous.get(topicId) === "keep" && (action === "compress_light" || action === "compress_heavy")).length,
    dropped: decisions.filter(({ topicId, action }) => action === "skip" && previous.has(topicId) && previous.get(topicId) !== "skip").length,
  });
}

function infeasible(input: PlanInput, state: PlanState): PlanResult {
  const focus = state.assessment;
  const byId = new Map(state.unfinished.map((topic) => [topic.id, topic]));
  const target = new Set<string>();
  const include = (id: string) => {
    if (target.has(id) || !byId.has(id)) return;
    target.add(id);
    for (const parent of byId.get(id)!.prereqIds) include(parent);
  };
  for (const id of focus?.topicIds ?? [...state.protectedIds]) include(id);
  const targetState = { ...state, unfinished: state.unfinished.filter(({ id }) => target.has(id)) };
  const decisions = decisionsFor(targetState).map((decision) => ({ ...decision, rationale: localized(focus?.topicIds.includes(decision.topicId) ? "rationale.keepFor" : "rationale.prereqFor", { assessment: focus?.title ?? "Final exam" }) }));
  const focusDueDate = focus?.dueDate ?? input.course.examDate;
  const days = planDays(state.today, input.course.examDate, focusDueDate);
  const placement = schedule(decisions, days, input.availability, targetState.unfinished);
  return {
    status: "infeasible", source: "fallback", decisions, ...placement,
    summary: localized("plan.summary.infeasible", { assessment: focus?.title ?? "Final exam", date: formatDate(new Date(`${focusDueDate}T00:00:00+01:00`), "en") }),
    warnings: warnings(input, state, placement.sessions), focusAssessmentId: focus?.id, focusDueDate,
    changeSummary: changeSummary(input, decisions, placement.sessions), requiredMin: state.requiredMin, capacityMin: state.capacityMin, escalate: true,
  };
}

export async function buildPlan(input: PlanInput, triage: TriageFn): Promise<PlanResult> {
  const state = planState(input);
  const allKeep = schedule(decisionsFor(state), state.days, input.availability, state.unfinished);
  const status = allKeep.unscheduled.length ? "cut" : "fit";
  if (status === "cut") {
    const minimum = new Map<string, Action>(state.unfinished.map(({ id }) => [id, state.protectedIds.has(id) ? "compress_light" : "skip"]));
    if (schedule(decisionsFor(state, minimum), state.days, input.availability, state.unfinished).unscheduled.length) return infeasible(input, state);
  }
  let violations: Violation[] | undefined;
  for (let attempt = 0; attempt <= ENGINE.maxAiRetries; attempt++) {
    // The injected service owns timeout, refusal, parsing and privacy handling.
    let response: Awaited<ReturnType<TriageFn>>;
    try { response = await triage(triageContext(input, state, status), violations); } catch { break; }
    if (!response) break;
    const validated = validate(response.output, status, state, input);
    if (validated.violations.length) { violations = validated.violations; continue; }
    return {
      status, source: response.source, decisions: validated.decisions, ...validated.placement,
      summary: { ...response.output.summary }, warnings: warnings(input, state, validated.placement.sessions),
      changeSummary: changeSummary(input, validated.decisions, validated.placement.sessions),
      requiredMin: state.requiredMin, capacityMin: state.capacityMin, escalate: false,
    };
  }
  const fallback = fallbackTriage(input, state);
  if (fallback.unscheduled.length) return infeasible(input, state);
  const summary = status === "fit" ? localized("plan.summary.fit") : localized("plan.summary.cut", {
    scheduledHours: Math.round(fallback.sessions.reduce((sum, session) => sum + session.minutes, 0) / 6) / 10,
    kept: fallback.decisions.filter(({ action }) => action === "keep").length,
    shortened: fallback.decisions.filter(({ action }) => action === "compress_light" || action === "compress_heavy").length,
    skipped: fallback.decisions.filter(({ action }) => action === "skip").length,
  });
  return { status, source: "fallback", ...fallback, summary, warnings: warnings(input, state, fallback.sessions), changeSummary: changeSummary(input, fallback.decisions, fallback.sessions), requiredMin: state.requiredMin, capacityMin: state.capacityMin, escalate: false };
}
