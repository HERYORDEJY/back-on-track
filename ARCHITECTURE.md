# Architecture

Back on Track is one Next.js app with three parts sharing one Postgres database: the learner flow, the advisor view, and the recovery engine underneath both. This file says where code goes and why the big decisions were made. Domain rules live in `docs/specs/`.

## Layers

```text
app/  (Server Components, route handlers)        components/  (UI)
  |  calls                                         |  client components call /api routes only
  v
lib/services/   load data -> run domain logic -> save. The only layer that mixes I/O and logic.
  |
  +--> lib/engine/  lib/risk/    pure domain logic: no I/O, `now` passed in
  +--> lib/ai/                   OpenAI calls and the response cache
  +--> lib/db.ts  lib/clock.ts   Prisma client, simulated clock
  +--> lib/i18n.ts               pure: t() and date formatting over messages/*.json
```

Import rules, enforced with `no-restricted-imports` in the ESLint config:

| Module | May import | Must never import |
| --- | --- | --- |
| `lib/engine` | its own files, `lib/i18n` | `lib/db`, `lib/ai`, `lib/clock`, `lib/services`, `app`, `components`, Node or browser APIs |
| `lib/risk` | its own files, `lib/engine`, `lib/i18n` | same as `lib/engine` |
| `lib/ai` | its own files, `lib/db` (for the cache) | `lib/services`, `app`, `components` |
| `lib/services` | `lib/engine`, `lib/risk`, `lib/ai`, `lib/db`, `lib/clock`, `lib/i18n` | `app`, `components` |
| `app` (server code) | `lib/services`, `lib/i18n`, `components` | `lib/db`, `lib/ai` directly |
| Client components (`"use client"`) | `lib/i18n`, `lib/offline`, shared types | `lib/services`, `lib/db`, `lib/ai`, `lib/clock` |

`eslint.config.mjs` checks aliases and relative layer imports. Client boundaries also use an AST restriction triggered by the `"use client"` directive; unit tests exercise both rejected and permitted imports. `lib/utils.ts` contains UI class-name helpers only and is not a domain dependency. Pure layers also reject I/O globals and Node/framework imports.

## Repo layout

```text
app/
  layout.tsx                       header: ClockControl, SimulatedBadge; registers the service worker
  page.tsx                         landing: PersonaSwitcher, Start demo, advisor link
  learner/[studentId]/page.tsx     intake, plan, check-in, infeasible screen
  advisor/page.tsx                 ranked list (?band=), student drawer (?student=)
  api/
    clock/route.ts                 GET now; POST { jumpDays } | { toWeek }
    demo/reset/route.ts            POST: restore personas, reset the clock
    plan/route.ts                  POST { studentId }: build and save a new plan version
    sessions/[id]/route.ts         PATCH { status: "done" | "missed" }
    students/[id]/route.ts         PATCH { language | goal | context | availability | hoursVary }; DELETE: Delete my data
    advisor/outreach/route.ts      POST { studentId }: draft and save a message
    advisor/outreach/[id]/route.ts PATCH { contacted: true, message }: save final edited message
components/
  ui/  learner/  advisor/  shared/  (SimulatedBadge, ClockControl, PersonaSwitcher, LanguageSwitch, ReadAloud)
lib/
  services/  plans.ts students.ts advisor.ts demo.ts
  engine/    config.ts types.ts time.ts backlog.ts capacity.ts rules.ts basis.ts triage.ts validate.ts fallback.ts schedule.ts plan.ts
  risk/      config.ts score.ts reasons.ts metric.ts
  ai/        client.ts schemas.ts prompts.ts cache.ts
  db.ts  clock.ts  i18n.ts  offline.ts  types.ts (shared UI/service contracts)
messages/    en.json pcm.json
public/      sw.js
prisma/      schema.prisma seed.ts course.ts personas.ts cohort.ts
scripts/     docs-check.mjs demo-warm.ts
tests/       fixtures/ engine/ risk/ i18n.test.ts ai-privacy.test.ts e2e/demo.spec.ts
docs/        PRODUCT_SENSE.md PLANS.md FRONTEND.md RESEARCH.md specs/ references/
AGENTS.md  ARCHITECTURE.md  CAPSTONE_PROJECT_BRIEF.md  CODEX_LOG.md  README.md  .env.example
```

## Where code goes

- Pages read data through `lib/services` in Server Components. API routes exist only for mutations and the clock.
- Route handlers validate input with zod, call one service function, and return JSON. Errors return `{ "error": { "code": string, "message": string } }` with a 4xx or 5xx status, never a stack trace.
- Components render; they never compute plans, scores or dates.
- Pages and routes that read the clock or the database are dynamic (`export const dynamic = "force-dynamic"`). Never cache them.
- After a mutation or a clock change, client components call `router.refresh()`.
- UI copy comes only from `messages/*.json`; no hard-coded strings in components.
- `lib/engine/triage.ts` builds the AI context and applies the result; the OpenAI call itself lives in `lib/ai/client.ts`.
- `lib/offline.ts` runs in the browser only.

Service functions:

| File | Functions |
| --- | --- |
| `plans.ts` | `getPlanView(studentId)`, `createPlan(studentId)`, `checkIn(sessionId, status)` |
| `students.ts` | `updateStudent(id, patch)`, `deleteStudentData(id)` |
| `advisor.ts` | `listStudents({ band })`, `getStudentDetail(id)`, `draftOutreach(studentId)`, `markContacted(outreachId, message)` |
| `demo.ts` | `resetDemo()` |
| `clock.ts` | `getClockView()`, `changeClock(jump)`; returns preformatted bilingual dates and available future weeks |

## Data model

`Localized` is a Json column holding `{ "en": string, "pcm": string }`. Every learner-facing text stored on a plan is Localized, so switching language never changes the plan.

Published course and topic titles remain English. Each selected reading has a source reference; demo weeks, study estimates, prerequisites, assessments and exam weights are labelled simulated. The source selection and adaptation are tracked in `docs/RESEARCH.md`.

| Model | Fields |
| --- | --- |
| Course | id, code, title, startDate, examDate, sourceTitle?, sourceUrl?, sourceLicense? |
| Topic | id, courseId, week, order, title, estMinutes, examWeight, prereqIds String[], sourceRefs Json (`[{ section, url }]`) |
| Assessment | id, courseId, title, kind (assignment, quiz, exam), dueDate, weight, topicIds String[] |
| Student | id, name, context? (max 120 characters), goal? (max 80), language (en, pcm), isSimulated, segment?, availability Json? (`{ mon..sun: minutes }`, absent after deletion), hoursVary, lastSeenAt?, escalatedAt? |
| Progress | id, studentId, topicId, completedAt, sessionId?; unique (studentId, topicId). `sessionId` identifies a check-in-created row; seed/university rows have no session provenance |
| Submission | id, studentId, assessmentId, submittedAt; unique (studentId, assessmentId). A row means it was submitted at submittedAt |
| Plan | id, studentId, version, isCurrent, simNow, status (fit, cut, infeasible), source (ai, fallback, cache), requiredMin, capacityMin, summary Localized, changeSummary Localized?, warnings Localized[], focusAssessmentId?, focusDueDate?, unscheduled Json (`[{ topicId, minutes }]`) |
| PlanItem | id, planId, topicId, action, minutes, basis Localized, rationale Localized |
| Session | id, planId, date (`YYYY-MM-DD`), minutes, pieces Json (`[{ topicId, minutes, isLast }]`), status (pending, done, missed), checkedAt? |
| Reminder | id, studentId, sessionId, at, text Localized |
| Outreach | id, studentId, message, nextStep, contacted, createdAt |
| AiCache | key (primary), response Json, createdAt |
| Setting | key (primary), value |

Every timestamp is read "as of now" (time rules in `docs/specs/data.md`).

The initial Prisma schema and migration are implemented. Localized arrays (`warnings`) and structured lists (`sourceRefs`, `pieces`, `unscheduled`) use JSON arrays in Json columns; services validate their shape. IDs are explicit strings so seeds can remain deterministic. Uniqueness protects topic order, student/topic progress, student/assessment submissions, plan versions/items and one session per plan/date. Personalised AiCache deletion is still pending and is not implemented by the initial schema.

Removing sessions must preserve retained Progress records: clear their session provenance rather than cascading deletion into university course records. Today-only reversal deletes rows with that session's provenance, never independent course records.

## Key flows

1. Build a plan (`POST /api/plan`): `createPlan` loads the course, topics, assessments, student and events; takes `now` from `getNow()`; redacts the student's name, emails and phone numbers from goal and context; runs `buildPlan(input, triage)` with a triage wrapper sharing one 20-second elapsed-time budget across all attempts; then in one transaction saves the new current version, its items, sessions, reminders and unscheduled work. Set `escalatedAt` for an infeasible plan, clear it for fit/cut, and set `lastSeenAt`. Domain logic never reads elapsed wall-clock time.
2. Open the plan page: `getPlanView` returns the intake when no current plan exists or hours were cleared. Re-plan for effective missed sessions or changed hours, and on the first visit after an infeasible plan's focus deadline passes. Same-day missed-session/reversal behavior is an explicit pending decision in `docs/PLANS.md`; do not silently choose it during implementation.
3. Check in (`PATCH /api/sessions/[id]`): only today's session is editable. Set status and `checkedAt` to simulated now, create Progress for fully finished topics with `sessionId` provenance, and set `lastSeenAt`. Reversing done to missed deletes only that session's Progress rows. Earlier sessions are locked; handling delayed offline first check-ins is pending in `docs/PLANS.md`.
4. Offline mutations: `lib/offline.ts` queues check-ins and language edits and replays them when online. Check-ins receive simulated time at sync; language edits use last write wins. Deletion clears that student's snapshot, queued mutations and service-worker cached learner pages on that device.
5. Advisor list: `listStudents` loads students, events and current-plan sessions, computes risk, then sorts and filters. Numeric scores stay internal. Advisor responses expose call-priority band, reasons, last activity and escalation, never goal or context; the learner panel exposes the same fields for that student.
6. Outreach (`POST /api/advisor/outreach`): `draftOutreach` builds the input from risk reasons, calls `outreach` from `lib/ai` (cache, `DEMO_MODE` and fallback as in `docs/specs/ai.md`), replaces `{firstName}`, and saves the Outreach row.
7. Mark contacted: save the final edited outreach message with the contacted flag. Unsaved edits stay in the text box; Copy copies that edited text.
8. Demo reset (`POST /api/demo/reset`): `resetDemo`, defined in `docs/specs/data.md`.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon in production) |
| `OPENAI_API_KEY` | Server only; never prefix with `NEXT_PUBLIC_` |
| `OPENAI_MODEL` | Model id for both AI calls; never hard-code a model |
| `DEMO_MODE` | `true`: AI calls read AiCache only and fall back on a miss |

`.env` is git-ignored. `.env.example` lists every variable with a placeholder.

## Existing infrastructure

Maintainer-provided on 2026-10-04; verification updated on 2026-10-05:

- GitHub: [HERYORDEJY/back-on-track](https://github.com/HERYORDEJY/back-on-track), SSH remote `git@github.com:HERYORDEJY/back-on-track.git`. SSH access and GitHub CLI authentication verified; remote returned no refs on the latest check. Existing local docs commit `81926f5` and scaffold commit `d3943a7` preserved on main; origin configured. No scaffold push yet.
- Vercel: [back-on-track project](https://vercel.com/heryordejys-projects/back-on-track).
- Neon project: `plain-wind-52121770`. Maintainer configured ignored `.env`; connectivity and initially empty public schema verified. Migration `20261005000000_foundation` applied with migrate deploy; migration status is current. Session deletion/progress retention verified with rolled-back fixtures; no course/persona/cohort seed yet.
- OpenAI: API key created; configure secrets outside the repo. No model or spending budget confirmed yet.

Vercel browser inspection timed out; no deployment or environment change is claimed. The local bilingual landing needs no secrets.

## Stack

- Next.js (App Router), TypeScript `strict`. Server Components by default; `"use client"` only where interaction needs it.
- Tailwind + shadcn/ui; primitives in `components/ui` come from shadcn. System font stack, no web fonts.
- Prisma + Postgres (Neon). One Prisma client, in `lib/db.ts`.
- OpenAI Responses API with Structured Outputs and zod schemas.
- date-fns for dates, seedrandom for seed data, tsx for scripts.
- Vitest for unit tests; one Playwright test for the demo path, run locally.
- npm, Node 24 pinned in `.nvmrc` and CI. Vercel is the deployment target; deployment is pending.

Pinned foundation packages and maintainer approvals are in [the D1 plan](docs/plans/d1-foundation.md). Dev/build use Next's supported webpack mode because Turbopack's local CSS worker port is blocked here. Typecheck generates Next route types first. `agentRules: false` preserves the authored AGENTS.md. Compatibility/advisory follow-ups are in [the library notes](docs/references/next-eslint.md).

Prisma 7 generates into ignored `lib/generated/prisma`; postinstall/build regenerate it without needing secrets. `prisma.config.ts` loads `.env` quietly and only supplies a datasource when configured, so CI can generate/test without Neon. `getDb()` lazily creates one adapter/client. Never import it into UI or domain code.

## Testing

- Unit (Vitest): engine, risk, i18n key parity, AI payload privacy, cache keys. Each spec lists its required tests.
- End to end (Playwright): the demo path only, run locally (`docs/FRONTEND.md`).
- CI (GitHub Actions): `npm ci` and `npm run check`.

## Decisions and why

Read these before "fixing" something that looks odd.

1. **The AI judges, code calculates.** Language models miscount minutes and dates. Code computes and validates every plan, so a bad AI answer can never reach a student.
2. **Postgres on Neon, not SQLite.** Vercel's serverless functions can't keep writes to a local database file.
3. **No PWA or i18n library.** Each costs setup time in a short invention sprint. A hand-written service worker and two JSON message files cover one offline view and two languages.
4. **The AI writes both languages in one call.** Plan text is stored as `{ en, pcm }`, so the language switch never re-plans and works offline.
5. **A simulated clock in the database.** The demo has to move time. Every "now" goes through `getNow()`, and events dated after now are ignored, so the clock can jump without corrupting data.
6. **The clock only moves forward.** Going back means demo reset, which keeps plans and events consistent.
7. **`DEMO_MODE` cache.** The stage network can't be trusted, and a cache hit is instant.
8. **Nigerian Pidgin as the second language.** The build is Nigeria-first and the maintainer can check every Pidgin string. More languages come after a pilot.
9. **No logins.** A persona switcher removes friction for judges; auth adds nothing to the proof of concept.
10. **Risk is computed on read, never stored.** It always matches the current simulated date.
11. **Infeasible plans flag the advisor automatically and say so.** There's no "tell my advisor" button to forget to press.
