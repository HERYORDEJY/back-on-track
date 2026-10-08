# Data spec: time rules, clock, seed and demo reset

## Time rules

The simulated clock is the only "now". Everything time-stamped is read as of now:

- A topic is done when its Progress row has `completedAt` at or before now.
- An assessment is submitted when its Submission row has `submittedAt` at or before now.
- A session check-in counts when `checkedAt` is at or before now (effective status: `specs/engine.md`).
- `lastSeenAt` and `escalatedAt` count only when at or before now.
- Seeded cohort events may be dated after the demo start. They "happen" when the clock passes them, so the advisor view stays believable at any simulated date.
- Outreach `createdAt` is the simulated draft creation time. The current `contacted` flag and edited message do not record when contact happened or whether the learner replied. Draft count is limited to two rows per learner per Monday–Sunday Africa/Lagos simulated week. Contact timing, reply outcome and call/meeting notes need a separately approved schema change; until then the UI labels the draft date honestly.

## Simulated clock (`lib/clock.ts`)

- Setting `clock` holds an ISO timestamp. `getNow()` reads it and is the only source of "now". Never use `new Date()` or `Date.now()` for "now"; they're fine for createdAt-style metadata.
- Every timestamp the engine or risk reads (`completedAt`, `submittedAt`, `checkedAt`, `lastSeenAt`, `escalatedAt`) is set from `getNow()`.
- Opening the plan, submitting the intake and checking in set `lastSeenAt`.
- Demo start: `2026-10-19T18:00:00+01:00`, Monday of Week 7, before tonight's 20:00 reminder.
- The clock moves forward only: `jumpDays(n)` with n of 1 or more, and `jumpToWeek(w)` with w after the current week, landing on Monday 18:00 of that week. It never passes `2026-11-30T18:00:00+01:00`, the day before the exam. Overshooting jumps stop at that limit (maintainer approved 2026-10-05); further day jumps remain at the limit. Going back means demo reset.
- Calendar dates are Africa/Lagos `YYYY-MM-DD`; timestamps are stored in UTC.

Implemented D1: the first migration initialises Setting `clock` at demo start. `getNow()` rejects missing/corrupt clock data; updates take a row lock inside a transaction so concurrent jumps see each other's committed result. The API validates exactly one positive whole-day or future-week jump and returns no-store views; errors contain no database details. Week numbers are calendar weeks counted from 7 September; 30 November is Week 13, after the 12 teaching weeks. Header options stop at the clock limit.

Verification: 19 clock tests and 13 API-contract tests pass. Live concurrent requests each advanced the persisted clock once. Live clock checks had left it on 25 October; the complete seed subsequently restored the specified demo start. No standalone backward reset was used. `scripts/db-verify.ts` verifies progress retention/null provenance after session deletion with fixtures rolled back; it is a local database check, not a CI/e2e suite. Course/persona/cohort seeding and demo reset are verified; D4 adds Delete my data.

## Course (`prisma/course.ts`)

- id `smpl201`, code `SMPL 201`, title "Principles of Management (sample course)", shown in the UI as "Sample course".
- Learning content uses the BCcampus / University of Minnesota Principles of Management edition, selected by the maintainer on 2026-10-05, with section URLs and attribution. Source/licence limits are in `docs/RESEARCH.md`. Do not invent learning content or present this adaptation as an approved MIVA course.
- Week 1 starts Monday 2026-09-07; 12 weeks; exam on Tuesday 2026-12-01.
- Approved demo mapping (2026-10-05): 36 topics, 3 a week, ids `t01` to `t36` in course order. `estMinutes` 60-100 with a mean of about 80. `examWeight` 0.01-0.06 each, summing to 1. About one topic in four is a prerequisite of a later topic. These minutes, weights, prerequisites, dates and assessments are simulated demo metadata, not claims from a source book or MIVA. Keep published course/topic titles English; mark any locally added examples as demo adaptations. Source choice and the exact [mapping](../plans/d1-course-mapping.md) are approved; database loading is pending.

Implemented D1 definitions: `getCourseSeed()` returns fresh typed course/topics/assessments; 2,880 total minutes, mean 80, normalized weights and nine prerequisite parents. Date-only academic boundaries use midnight Africa/Lagos. `getPersonaSeed()` preserves the fixed persona attributes below and provides stable academic record ids, null session provenance and completions on Tuesday/Thursday/Sunday at 21:00 Lagos of each completed teaching week. Only Zainab has a seeded a1 submission, at 21:00 Lagos on 2 October. Twelve definition tests cover data integrity and independent deterministic fixtures. Pure engine persona tests now pass Amaka cut / Tunde infeasible / Zainab fit at demo start with null triage, without tuning. The complete seed is loaded into Neon and reseeding identity is verified; demo reset remains pending.

| Id | Title | Kind | Due | Weight | Covers |
| --- | --- | --- | --- | --- | --- |
| `a1` | Assignment 1 | assignment | 2026-10-04 | 0.15 | `t01`-`t12` (Weeks 1-4) |
| `a2` | Assignment 2 | assignment | 2026-11-01 | 0.15 | `t13`-`t24` (Weeks 5-8) |
| `a3` | Quiz | quiz | 2026-11-22 | 0.20 | `t25`-`t33` (Weeks 9-11) |
| `exam` | Final exam | exam | 2026-12-01 | 0.50 | all topics |

## Personas (`prisma/personas.ts`)

Fixed ids, no plan at the demo start (the demo builds it). Progress rows for the done weeks are spread across those weeks, none after `lastSeenAt`. `lastSeenAt` is at 21:00 Lagos on the date shown.

| Id | Name | Context | Goal | Language | Done | Coursework | Minutes per weekday | lastSeenAt | Status at demo start |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `amaka` | Amaka Okafor | Nurse in Lagos, two children, night shifts | Promotion to senior nursing officer | `pcm` | Weeks 1-3 | `a1` missed | Mon-Fri 40, Sat 0, Sun 90 | 2026-09-27 | `cut` |
| `tunde` | Tunde Adeyemi | Civil servant in Abuja | A policy analyst role | `en` | Week 1 | `a1` missed | 20 every day | 2026-09-13 | `infeasible` |
| `zainab` | Zainab Bello | Software developer in Kano | A move into product management | `en` | Weeks 1-5 | `a1` submitted 2026-10-02 | 60 every day | 2026-10-17 | `fit` |

If a persona test fails, propose tuning topic `estMinutes`, `examWeight` or prerequisite links and ask first, as required by the engine spec. Never tune rules or personas to force the result without approval.

## Intake and completion provenance

- Goal is optional, max 80 characters; context is optional, max 120. The UI warns against names, phone numbers and employers. Redact names, emails and phone numbers before AI calls (`specs/ai.md`). Advisors never receive goal or context.
- Availability requires at least one day with 20 minutes or more. Cleared availability means return to intake, not silently reuse old hours.
- `Progress.sessionId` is nullable provenance. Seed/university course records have no creating session. Completing the last full piece creates a row attributed to that check-in; changing today's done session to missed deletes only rows attributed to it. Earlier sessions are locked. Deleting sessions must not delete retained Progress; clear provenance instead.
- Fit/cut plans clear `escalatedAt`; infeasible plans set it. Persist the focus assessment/date and unplaced work so the next visit can re-plan after that date passes.
- A missed session stays editable through its own day and can trigger re-planning on the next visit starting tomorrow (maintainer choice, 2026-10-06). A queued offline check-in may sync after its session day when the learner reconnects (maintainer choice, 2026-10-07): the request carries the original session date, which must match the still-current plan's session; future or superseded sessions remain locked. The check-in and any Progress use simulated time at sync, and the learner sees a late-sync note. Ordinary online edits to earlier sessions remain locked. If the plan changed before replay, keep the queued action and show a visible conflict.

## Cohort (`prisma/cohort.ts`)

`await generateCohort({ seed, count, shares })` is a pure asynchronous deterministic function: 300 students with seed `back-on-track-2026` give the same rows on every run. Package it as a Codex skill (SKILL.md) so it can be re-run with another segment mix. Risk tests call it in memory.

| Segment | Share | Done by the demo start | After the demo start | Coursework | Minutes per day | lastSeenAt |
| --- | --- | --- | --- | --- | --- | --- |
| `on_track` | 60% | Through Week 6 or 7 | Completes each week's topics during that week; submits `a2` and `a3` 2-3 days early | `a1` submitted | 45-120 | 0-3 days before the demo start |
| `drifting` | 20% | Through Week 4 or 5 | Nothing | 30% missed `a1` | 20-60 | 4-10 days before |
| `recovering` | 10% | Through Week 3 or 4 when its plan was built, then whatever the plan's check-ins complete | Keeps following its plan; 70% submit `a2` and `a3` a day early | 50% missed `a1` | 30-60 | 0-2 days before |
| `gone_quiet` | 10% | Through Week 1, 2 or 3 | Nothing | `a1` missed | 15-45 | 15-40 days before |

- Recovering students have a current plan built by the engine with a triage function that returns `null` (fallback), at 2026-10-09 18:00 Lagos. About 80% of its sessions, past and future, are checked done at 21:00 on their date; the rest are left unchecked. A done session holding a topic's last piece adds a Progress row at that time.
- Names come from fixed lists of Nigerian first and last names (Yoruba, Igbo, Hausa and others); no two students share a full name. About 30% of students use `pcm`.
- Some students get different minutes on weekdays and weekends.
- Every seeded student, personas included, has `isSimulated = true`. Cohort students have a `segment`; personas don't.

Implemented D1: [cohort skill](../../skills/cohort-seed/SKILL.md), approved isolated seedrandom 3.0.5 and development types 3.0.8. Nine tests check stable rows/names/mix/hours/coursework, future events and real recovering final-piece provenance. Largest remainders allocate custom mixes; stable segment order breaks ties. Default language mix is exactly 90 Pidgin students. Initial progress is capped at pre-demo activity (recovering baseline before its 9 October plan); on-track Week-7 readers can read ahead. The skill frontmatter/links were manually verified; the stock skill-creator validator cannot run because PyYAML is absent.

## Seeding (`prisma/seed.ts`)

Idempotent: clears and reloads academic/demo tables, preserves AiCache and restores its AiCacheUse ownership links after the stable student ids are reinserted, then sets the clock to the demo start. Every run produces the same rows and ids.

Implemented transaction in `prisma/load-seed.ts`, invoked by the CLI runner without importing its side effects elsewhere. Verified on Neon: 303 students, 36 topics, 30 fallback plans and 1,360 sessions. `scripts/seed-verify.ts` compares every seeded model across two runs, retains an isolated AiCache fixture and its Amaka ownership unchanged, removes only that fixture, and checks the demo clock. The D4 ownership verification first failed because deleting/reinserting students cascaded the links; reloading the stable links fixed it. No reset/migration destruction was used.

## Demo reset (`lib/services/demo.ts`, `POST /api/demo/reset`)

Restores the personas from `personas.ts` (language, goal, context and availability included), deletes their plans, plan items, sessions and reminders and any Progress or Submission rows not in their seed, deletes every Outreach row, clears their `escalatedAt`, and sets the clock to the demo start. Cohort study data and AiCache are untouched; all Outreach rows are cleared as specified above. ClockControl's Reset calls it; Start demo will use the same endpoint when the learner destination exists.

Implemented as one transaction holding the clock row lock, serialised with forward jumps. Exact academic seed rows are restored, including missing or altered seed records, and persona plans cascade to their items/sessions. The endpoint accepts an empty body or strict empty object, rejects extra scope fields, returns no-store responses and generic retryable errors. `scripts/demo-reset-verify.ts` verified two identical resets on Neon after temporary changes to persona attributes, academic records, application plans and outreach; cohort study rows and an isolated cache fixture remained identical. The fixture was removed. D5 clears current-device learner snapshots, queues and cached pages after a successful Reset; if the device refuses cleanup, it shows a warning while the server reset remains complete.

## Delete my data (`DELETE /api/students/[id]`)

Deletes the student's plans, plan items, sessions, reminders and outreach; clears goal, context, availability/hours, `lastSeenAt` and `escalatedAt`, and resets the variable-hours preference. The current device clears that student's saved plan snapshot, queued check-ins/language edits and service-worker cached learner pages. Progress and Submissions remain as university course records; this POC seeds them and does not add an LMS integration. Session deletion clears retained Progress provenance rather than cascading into those records.

For a persona, reload its seed record after deletion so the demo can continue. This restores the persona's original simulated `lastSeenAt`, hours, goal and context; no user-entered text, hours or local queued mutations survive. Cohort app fields clear to null. After deletion, the device returns to the landing page and shows confirmation, so it does not immediately mark a new learner visit or leave the former plan visible. AiCacheUse records every learner who reads or writes a cached AI response. Deletion removes that learner's ownership and only deletes a response when no owner remains. The maintainer approved removing the three pre-ownership cache rows once; the migration refuses a larger purge. D5 must warm the demo cache again.

D4 verification (2026-10-07): the additive ownership migration applied successfully to Neon. The Tunde learner screen deleted app data, cleared current-device keys/pages and reached the landing confirmation; a fresh visit returned to intake. The DELETE route accepts an empty request stream and rejects nonempty data. Its transaction allows enough time for a cold Neon connection; the first browser attempt exposed both cases and regression tests cover them.
