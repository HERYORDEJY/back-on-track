# Engine spec (`lib/engine`)

Builds and re-builds a student's catch-up plan. Pure: no Prisma, no fetch, no clock reads, no browser APIs. `now` is always an argument, and the AI is injected as a function. May import `lib/i18n` (pure) for templates and dates.

Implemented pure D2 dependency for D1's recovering cohort: tests cover calendar/as-of work, protection, labelled basis, code-owned deadline inheritance, rounded placement, sparse validation, fallback, retries, focused infeasible results and change summaries. Null-triage persona fixtures pass cut/infeasible/fit without metadata tuning. The D2 service enforces the elapsed-time budget; a live Amaka `ai` cut validated and scheduled within 20 seconds. D3 adds today-only check-in/provenance and next-day re-planning after missed work, with browser verification. Controlled course input is expected to have valid unique topics and acyclic prerequisites; integrity checks reject a cycle rather than generating an invalid plan.

## Terms

| Term | Definition |
| --- | --- |
| Today | The calendar date of `now` in Africa/Lagos (`YYYY-MM-DD`) |
| Week | Whole weeks from `course.startDate` to today, plus 1, clamped to 1-12 |
| Done topic | A topic with a Progress row whose `completedAt` is at or before `now` |
| Backlog ("work you've missed") | Topics in weeks up to and including the current week that aren't done |
| Remaining | Topics in weeks after the current week that aren't done |
| Plan days | Every calendar day from today to the day before `course.examDate` |
| Capacity | Sum of the student's minutes over the plan days, using availability by weekday; a display number, never a feasibility decision |
| Required | Sum of `estMinutes` over backlog and remaining |
| Next coursework | The earliest assessment of kind assignment or quiz with `dueDate` on or after today |
| Next assessment | The earliest assessment of any kind, including the exam, with `dueDate` on or after today; the focus of an infeasible plan |
| Protected topic | A not-done topic that is (a) a prerequisite of any not-done topic, (b) covered by the next coursework when its weight is 0.15 or more, or (c) in the top third of all 36 topics by `examWeight`. Never skipped; minimum action factor 0.7, with resulting minutes rounded |
| Floor | Sum of rounded `estMinutes` x 0.7 over protected topics, for display; feasibility requires actually scheduling the protected minimum |
| Action | `keep` (x1.0), `compress_light` (x0.7), `compress_heavy` (x0.5, unprotected only), `skip` (x0, unprotected only) |
| Status | `fit`: all-keep work schedules fully before the exam after rounding. `cut`: validated cuts schedule fully. `infeasible`: the protected minimum cannot be fully scheduled under the agreed ordering policy |
| Source | `ai`, `cache` or `fallback` |
| Localized | `{ en: string; pcm: string }`. Every learner-facing string the engine returns is Localized |

## Config (`config.ts`)

```ts
export const ENGINE = {
  courseworkProtectWeight: 0.15,
  examWeightProtectFraction: 1 / 3,
  protectedMinFactor: 0.7,
  minBlockMinutes: 20,
  maxAiRetries: 2,
  planBudgetMs: 20_000, // enforced by the service/AI wrapper, not a clock read in the engine
  reminderTime: "20:00",
  timeZone: "Africa/Lagos",
} as const;

export const ACTION_FACTOR = { keep: 1, compress_light: 0.7, compress_heavy: 0.5, skip: 0 } as const;
```

## Types (`types.ts`)

```ts
type PlanInput = {
  now: Date;                                   // always before the exam date
  course: { startDate: string; examDate: string };
  topics: Topic[];                             // all 36
  assessments: Assessment[];
  availability: Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", number>;
  progress: { topicId: string; completedAt: Date }[];
  student: { goal?: string; context?: string }; // names already removed by lib/services
  previous?: { decisions: Decision[]; sessions: { date: string; topicIds: string[] }[] };
};

type Decision = { topicId: string; action: Action; minutes: number; basis: Localized; rationale: Localized };

type PlannedSession = {
  date: string;
  minutes: number;
  pieces: { topicId: string; minutes: number; isLast: boolean }[];
  reminder: { at: Date; text: Localized };
};

type PlanResult = {
  status: "fit" | "cut" | "infeasible";
  source: "ai" | "cache" | "fallback";
  decisions: Decision[];
  sessions: PlannedSession[];
  warnings: Localized[];
  focusAssessmentId?: string;                  // infeasible plan's next assessment, including exam
  focusDueDate?: string;
  unscheduled: { topicId: string; minutes: number }[]; // empty for fit/cut
  summary: Localized;
  changeSummary?: Localized;
  requiredMin: number;
  capacityMin: number;
  escalate: boolean;
};

type TriageFn = (ctx: TriageContext, violations?: Violation[]) =>
  Promise<{ output: TriageOutput; source: "ai" | "cache" } | null>;
```

`TriageOutput` is defined in `specs/ai.md`. `fallbackTriage` is not a `TriageFn`; `buildPlan` calls it directly whenever the injected function returns `null` or keeps failing validation.

## buildPlan(input, triage)

1. Compute today, week, done topics, backlog, remaining, plan days, display capacity and required.
2. Mark protected topics. Compute rounded minutes once as `round(estMinutes x factor)`; every feasibility check uses these exact minutes and the same scheduler, including the 20-minute block rule.
3. Try scheduling all unfinished topics at keep before the exam. Full placement gives `fit`; skip step 4. All decisions are keep with template rationales and code-generated bases; AI may write the summary, never the order.
4. If all-keep placement failed, check the protected minimum (protected topics at compress_light, unprotected topics skipped) with the same scheduler. Success permits `cut`. Failure returns `infeasible` without an AI call: target the next assessment's unfinished topics and prerequisites, each at keep in prerequisite-first priority order; schedule only through its due date, bounded by the day before the exam. Show unplaced work under "Won't fit before {date}", persist focus assessment/date, and set `escalate=true`. The exam can be the next assessment after the final quiz. With no assessment remaining, use protected work and the exam cutoff as a safeguard.
5. For fit or cut, obtain triage output within the shared budget. Fit items must be empty; cut items contain only changed topics. For a cut, code also supplies the selected-minute total of its already-feasible deterministic fallback as a placement target, plus exact minute savings for each allowed topic action. AI chooses the topics; these numbers only guide its choice. Expand omitted unfinished topics to keep with template rationale and computed basis, then order in code as below.
6. Validate the expanded decisions and actual scheduler placement. On violations retry up to twice with quoted violations, within the single 20-second budget injected through the service/AI wrapper. An `OVER_CAPACITY` correction quotes the rejected changed actions and the additional unplaced minutes. If the budget expires, triage returns null, or the third response is invalid, use fallback and source fallback.
7. Fit/cut results must have zero unscheduled minutes: every non-skipped minute is placed before the exam. Attach basis and deadline warnings; capacity never overrides a failed placement check.
8. Summary: AI/cache summary where returned, otherwise fit/cut templates; infeasible always uses the honest template. Add a change summary when previous is given. A fit/cut result has `escalate=false`; the service clears any prior escalation.

Ordering is code-owned (maintainer approved 2026-10-05): topological prerequisite-first order; among eligible topics, earliest inherited upcoming coursework deadline, then higher exam weight, earlier week and stable course order. A prerequisite recursively inherits the earliest deadline of its unfinished dependants. All status prechecks, proposal validation, fallback and infeasible scheduling use this policy. AI never supplies an order. Order can affect placement when daily remnants under 20 minutes are unused; never treat display capacity as proof of feasibility.

## Triage context (`triage.ts`)

Builds the AI input and maps the output back to decisions. Makes no calls and never sees a name.

```ts
type TriageContext = {
  today: string; week: number; examDate: string; status: "fit" | "cut";
  nextCoursework: { title: string; dueDate: string; weight: number } | null;
  student: { goal?: string; context?: string };
  capacityMin: number; requiredMin: number; deficitMin: number;   // display deficit = max(0, required - capacity), not feasibility
  placementTargetMin?: number; // for cut: selected minutes in a feasible fallback
  topics: { id: string; title: string; week: number; estMinutes: number;
            examWeightPct: number; protected: boolean; basis: string;
            prereqIds: string[]; deadline: string | null;
            cutSavingsMin: { light: number; heavy?: number; skip?: number } }[];  // allowed actions only; inherited deadline; simulated basis
};
```

## Validator (`validate.ts`)

Each violation has a code, the `topicId` where relevant, and a one-line message that is quoted back to the AI on a retry.

| Code | Meaning |
| --- | --- |
| `DUPLICATE_TOPIC` | More than one sparse change item names the same unfinished topic |
| `UNKNOWN_TOPIC` | An item names a topic outside backlog and remaining |
| `ACTION_NOT_ALLOWED` | `skip` or `compress_heavy` on a protected topic, an explicit keep in sparse change items, or any changed item when status is fit |
| `OVER_CAPACITY` | The shared scheduler leaves any rounded non-skipped minute unplaced before the exam |

Unlisted topics are valid keep defaults; there is no `MISSING_TOPIC` violation. AI output has no `order` field; strict schema parsing rejects extra fields. Code-owned order must cover every non-skipped topic once and satisfy prerequisites; integrity tests cover those invariants. The provisional `BAD_ORDER` and `PREREQUISITE_ORDER` AI violation codes are removed.

## Fallback (`fallback.ts`)

Deterministic:

1. Start with every topic at `keep`.
2. While the shared scheduler cannot place every rounded non-skipped minute, skip the unprotected topic with the lowest exam weight (ties: later week first, then course order).
3. Still not placeable: compress_light the protected topic with the lowest exam weight and repeat the same placement check. Never skip protected work or compress it heavily. If the protected minimum still cannot be placed under the agreed policy, return the infeasible path.
4. Prerequisites always first. Use a topological priority order; among eligible topics choose earliest inherited coursework deadline, then higher exam weight, then earlier week and stable course order. A prerequisite recursively inherits the earliest deadline of anything depending on it.
5. Rationales from templates: `rationale.skip`, `rationale.shorten`, `rationale.keepFor` (when the next coursework covers the topic) and `rationale.keep`. In infeasible plans, use an assessment-focused rationale rather than claiming that every kept target fits: `rationale.keepFor` for the focused assessment (including the exam) or `rationale.prereqFor` for its prerequisites. Unplaced minutes remain explicit.

## Basis (`basis.ts`)

One basis per decision; the first matching rule wins:

1. A prerequisite of a not-done topic: `basis.prereq`, "Needed before {topic}" (the earliest dependant).
2. Covered by the next coursework: `basis.coursework`, "Needed for {assessment} ({weight}%, due {date})".
3. In the top third by `examWeight`: `basis.examHigh`, "High exam weight: about {pct}% of the exam".
4. Otherwise: `basis.examLow`, "Low exam weight: about {pct}% of the exam".

`pct` is `round(examWeight x 100)`; `date` uses `formatDate`.

## Scheduler (`schedule.ts`)

- Each plan day's budget is the student's minutes for that weekday.
- Return sessions plus unplaced minutes per topic. All callers use this same placement result; fit/cut requires an empty unplaced list. Infeasible placement uses its next-assessment horizon, always bounded by the exam cutoff.
- Place topics in decision order, skipping `skip`. A topic may span days. Stop filling a day once its remaining budget is under 20 minutes; a topic's last piece may be shorter than 20.
- One session per day that has work, with one reminder at 20:00 Africa/Lagos: `reminder.text`, "Tonight: {minutes} min, starting with {topic}".
- Deadlines are warnings, never failures. When a kept or shortened topic covered by upcoming coursework finishes after its due date, `plan.deadlineWarning.one` or `.many` says how many topics needed for the assessment are scheduled late, names that assessment and due date, and suggests asking the advisor whether an extension is possible. The singular template says "1 topic"; the plural template says "{n} topics". Assessment names remain published titles in English.
- Prerequisites precede dependent topics even if doing so pushes a dependant beyond its own coursework deadline; report the missed deadline. A truncated topic in the infeasible view is listed with its unplaced minutes and never marked fully complete (`isLast=false` until all its rounded minutes are placed).

## Session status and re-plan (`time.ts`)

- Effective status as of `now`: a session marked `done` or `missed` with `checkedAt` at or before now keeps that status; otherwise a session dated before today is `missed`; otherwise it's `pending`.
- `lib/services` re-plans when the current plan has an effectively missed session, or when the student changes their hours. The new plan becomes the current version; the old one stops being current.
- An infeasible plan also re-plans on the first visit after its focus assessment due date passes, even if there were no missed sessions. The new target is the following assessment, including the exam after the final quiz.
- Only today's session is editable. Done-to-missed reversal deletes only Progress rows created by that session (`sessionId` provenance); earlier sessions are locked. Today's missed session stays editable, then can trigger re-planning on the next visit starting tomorrow. Delayed offline first check-ins remain pending in `docs/PLANS.md`.
- Change summary: `plan.changeSummary`, "Moved {moved} topics, shortened {shortened}, dropped {dropped}." Moved counts topics scheduled in both plans whose first session date changed; shortened counts topics whose action changed from `keep` to a compress action; dropped counts topics whose action changed to `skip`.
- A topic is done when the session holding its last piece is marked done. Partial topics aren't tracked.

## Templates

English text for the engine's message keys. Every key also exists in `messages/pcm.json`.

| Key | English |
| --- | --- |
| `plan.summary.fit` | Everything fits in your time. Prerequisites come first, followed by deadline priority. |
| `plan.summary.cut` | This plan schedules about {scheduledHours} hours before the exam. It keeps {kept} topics, shortens {shortened} and skips {skipped}. |
| `plan.summary.infeasible` | The core work won't fit before the exam. Here is what fits before {assessment} on {date}; the rest is listed below. Your advisor has been told. Ask about an extension or a study break. |
| `plan.wontFit` | Won't fit before {date} |
| `plan.nextStep.infeasible` | Your advisor has been told. Ask about an extension or a study break. |
| `rationale.keep` | Kept: it fits your time |
| `rationale.keepFor` | Kept: needed for {assessment} |
| `rationale.prereqFor` | Kept: needed before a topic for {assessment} |
| `rationale.shorten` | Shortened to fit your time |
| `rationale.skip` | Skipped: low exam weight |

## Tests (`tests/engine/`)

- One test per term, validator code, fallback step, basis rule and scheduler rule.
- Effective session status before, on and after the session date, including a check-in dated after now.
- Rounded-minute placement, unusable daily remnants, display capacity never accepting incomplete work, prerequisite inheritance/order, sparse keep defaults and duplicate changes, infeasible unplaced work/cutoff/expired focus date, and the shared budget with no domain clock reads. Ordering-sensitive tests use the approved code-owned policy.
- Same-day completion provenance/reversal and locked earlier sessions; next-day re-planning after a missed session. Delayed offline cases await their pending decision.
- Retry path: invalid output twice then valid gives source `ai`; invalid three times gives `fallback`; `null` gives `fallback`.
- Persona tests: `buildPlan` with a triage stub that returns `null`, at the demo start, gives `cut` for amaka, `infeasible` for tunde and `fit` for zainab. If one fails, tune the seed data in `specs/data.md` (and ask first), never the engine rules.
