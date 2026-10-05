import { decisionsFor, type PlanState } from "./triage";
import { schedule } from "./schedule";
import type { Action, PlanInput } from "./types";

export function fallbackTriage(input: PlanInput, state: PlanState) {
  const actions = new Map<string, Action>();
  const place = () => {
    const decisions = decisionsFor(state, actions);
    return { decisions, ...schedule(decisions, state.days, input.availability, state.unfinished) };
  };
  let result = place();
  const priority = [...state.unfinished].sort((a, b) => a.examWeight - b.examWeight || b.week - a.week || a.order - b.order);
  for (const topic of priority.filter(({ id }) => !state.protectedIds.has(id))) {
    if (!result.unscheduled.length) return result;
    actions.set(topic.id, "skip");
    result = place();
  }
  for (const topic of priority.filter(({ id }) => state.protectedIds.has(id))) {
    if (!result.unscheduled.length) return result;
    actions.set(topic.id, "compress_light");
    result = place();
  }
  return result;
}
