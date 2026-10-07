import { ACTION_FACTOR } from "./config";
import { decisionsFor, type PlanState } from "./triage";
import { schedule } from "./schedule";
import type { Action, PlanInput, TriageOutput, Violation } from "./types";

export function validate(output: TriageOutput, status: "fit" | "cut", state: PlanState, input: PlanInput) {
  const violations: Violation[] = [];
  const seen = new Set<string>();
  const actions = new Map<string, Action>();
  const known = new Set(state.unfinished.map(({ id }) => id));
  for (const item of output.items) {
    if (seen.has(item.topicId)) violations.push({ code: "DUPLICATE_TOPIC", topicId: item.topicId, message: `Topic ${item.topicId} occurs more than once.` });
    seen.add(item.topicId);
    if (!known.has(item.topicId)) violations.push({ code: "UNKNOWN_TOPIC", topicId: item.topicId, message: `Topic ${item.topicId} is not unfinished work.` });
    if (status === "fit" || item.action === ("keep" as Action) || !Object.hasOwn(ACTION_FACTOR, item.action) || (state.protectedIds.has(item.topicId) && item.action !== "compress_light")) {
      violations.push({ code: "ACTION_NOT_ALLOWED", topicId: item.topicId, message: `Action ${item.action} is not allowed for ${item.topicId} in this ${status} plan.` });
    }
    actions.set(item.topicId, item.action);
  }
  if (violations.length) return { violations, decisions: [], placement: { sessions: [], unscheduled: [] } };
  const decisions = decisionsFor(state, actions).map((decision) => {
    const item = output.items.find(({ topicId }) => topicId === decision.topicId);
    return item ? { ...decision, rationale: { ...item.rationale } } : decision;
  });
  const placement = schedule(decisions, state.days, input.availability, state.unfinished);
  if (placement.unscheduled.length) {
    const unplaced = placement.unscheduled.reduce((sum, topic) => sum + topic.minutes, 0);
    const changes = output.items.map(({ topicId, action }) => `${topicId}: ${action}`).join(", ") || "none";
    violations.push({ code: "OVER_CAPACITY", message: `${unplaced} rounded minutes cannot be placed before the exam. Rejected changes: ${changes}. Keep those cuts and add at least ${unplaced} more rounded minutes of reductions using other unprotected topics. Return the complete changed-topic list.` });
  }
  return { violations, decisions, placement };
}
