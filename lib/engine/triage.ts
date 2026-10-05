import { ENGINE } from "./config";
import { getWork } from "./backlog";
import { capacity } from "./capacity";
import { courseBasis, rationale } from "./basis";
import { planDays } from "./time";
import { actionMinutes, inheritedDeadlines, nextAssessment, priorityOrder, protectedTopics } from "./rules";
import type { Action, Decision, PlanInput, TriageContext } from "./types";

export function planState(input: PlanInput) {
  const work = getWork(input);
  const days = planDays(work.today, input.course.examDate);
  const coursework = nextAssessment(input.assessments, work.today, true);
  const highIds = new Set([...input.topics].sort((a, b) => b.examWeight - a.examWeight || a.order - b.order).slice(0, Math.ceil(input.topics.length * ENGINE.examWeightProtectFraction)).map(({ id }) => id));
  return {
    ...work, days, coursework, highIds,
    assessment: nextAssessment(input.assessments, work.today),
    protectedIds: protectedTopics(input.topics, work.unfinished, coursework),
    deadlines: inheritedDeadlines(work.unfinished, input.assessments, work.today),
    capacityMin: capacity(days, input.availability),
  };
}
export type PlanState = ReturnType<typeof planState>;

export function decisionsFor(state: PlanState, actions = new Map<string, Action>()): Decision[] {
  const ordered = priorityOrder(state.unfinished.filter(({ id }) => actions.get(id) !== "skip"), state.deadlines);
  const skipped = state.unfinished.filter(({ id }) => actions.get(id) === "skip").sort((a, b) => a.order - b.order);
  return [...ordered, ...skipped].map((topic) => {
    const action = actions.get(topic.id) ?? "keep";
    return { topicId: topic.id, action, minutes: actionMinutes(topic, action), basis: courseBasis(topic, state.unfinished, state.coursework, state.highIds), rationale: rationale(action, topic, state.coursework) };
  });
}

export function triageContext(input: PlanInput, state: PlanState, status: "fit" | "cut"): TriageContext {
  return {
    today: state.today, week: state.week, examDate: input.course.examDate, status,
    nextCoursework: state.coursework ? { title: state.coursework.title, dueDate: state.coursework.dueDate, weight: state.coursework.weight } : null,
    student: { ...input.student }, requiredMin: state.requiredMin, capacityMin: state.capacityMin,
    deficitMin: Math.max(0, state.requiredMin - state.capacityMin),
    topics: state.unfinished.map((topic) => ({ id: topic.id, title: topic.title, week: topic.week, estMinutes: topic.estMinutes, examWeightPct: Math.round(topic.examWeight * 100), protected: state.protectedIds.has(topic.id), basis: courseBasis(topic, state.unfinished, state.coursework, state.highIds).en, prereqIds: [...topic.prereqIds], deadline: state.deadlines.get(topic.id) ?? null })),
  };
}
