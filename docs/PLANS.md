# Plans

The source of truth for the build: what's done, what's next, and what gets cut when time runs short. Update the status table and progress record in the same change as the work. Use plan mode before each milestone's main feature. Programme requirements are in [the capstone brief](../CAPSTONE_PROJECT_BRIEF.md).

## Status

`not started` → `in progress` → `built` → `tested` (unit tests green) → `demo-verified` (works on the demo path, on a phone). Also use `blocked`, `deferred` or `abandoned` with a reason and the condition for resuming, where applicable. Documentation and research tasks use `done` only after their stated checks pass.

| Area | Status | Notes |
| --- | --- | --- |
| Scaffold, CI, deploy | demo-verified | Local check/build and [remote CI](https://github.com/HERYORDEJY/back-on-track/actions/runs/37300003442) pass (137 tests); public landing/clock/reset return 200 and interactive checks pass at 375/1280 px |
| Data model and seed (course, personas, cohort) | in progress | Schema migrated; selected-source course/persona definitions pass 12 tests. Complete 303-student seed loaded; 9 cohort tests and two identical reseeds/cache-retention verification pass |
| Simulated clock and demo reset | demo-verified | Persisted forward clock, API and bilingual controls built; 32 clock/API tests pass and live concurrent advances verified. Atomic persona reset implemented; two identical live resets preserve cohort study rows/cache; local +1 day and public +3 days/Reset loading and success verified at 375 px |
| Languages (message files, switch) | in progress | Bilingual helpers and landing cookie control built; 4 helper tests pass; English/Pidgin cookie persistence and 375/1280 px layout verified locally and publicly; learner/offline switching pending |
| Recovery engine | tested | Pure buildPlan/scheduler/protection/sparse validation/fallback/infeasible paths; 48 tests including all three persona outcomes. Service budget/live AI/browser exit pending |
| AI calls, cache, `DEMO_MODE` | in progress | Structured triage/outreach clients, strict schemas, redaction, canonical cache and cache-only mode implemented; unit tests green. Live generation blocked by OpenAI `429 credit_balance_exhausted`; production cache warm remains D5 |
| Learner flow (intake, plan, check-in, re-plan) | in progress | D2 plan service/API and thin saved-hours learner page built; Start demo and persona links active. Full intake, check-in and re-plan remain D3 |
| Infeasible screen | in progress | Tunde's honest summary, assessment-focused work and unplaced minutes render in the browser; read-aloud and full D3 treatment pending |
| Offline plan and check-in queue | not started | |
| Read-aloud | not started | |
| Risk score and advisor view | not started | |
| Privacy panel and Delete my data | not started | |
| Demo hardening (cache warm, Lighthouse, TalkBack) | not started | |
| Pitch assets (video, slides, README) | not started | |

## Current progress

Build starts on 2026-10-04. Work happens as the maintainer is available; no daily hours are promised. The maintainer estimates about two weeks until submission, but the official date is unconfirmed. The D1-D7 labels below are ordered milestones and commit tags, not fixed calendar days. Preserve the engine checkpoint, feature freeze and dedicated pitch preparation even if elapsed time changes.

| Task | State | Evidence / what remains |
| --- | --- | --- |
| Review complete starting folder | done | All original docs and the checker reviewed; docs check passed; complete starting point confirmed |
| Read capstone brief and record maintainer decisions | done | Routed docs aligned with the supplied decisions; docs check and consistency review completed; remaining behavior questions explicitly listed below |
| Research public management material and MIVA facts | done | Primary sources/licensing limits recorded in `docs/RESEARCH.md`; maintainer selected BCcampus/University of Minnesota on 2026-10-05 |
| Local foundation scaffold | tested | [D1 foundation plan](plans/d1-foundation.md), approved dependencies/lockfile, strict Next/Tailwind/shadcn shell, 20 passing tests and lint boundaries, scripts and CI configuration. Production build passed; 375/1280 px English/Pidgin layout and language persistence verified locally |
| Database and simulated clock | tested | [Database/clock plan](plans/d1-database-clock.md), valid schema/client, applied additive migration, rolled-back provenance test, 32 clock/API tests, live forward/concurrent requests and production build. Local +1 day/Reset and 375/1280 px bilingual UI verified |
| Course and persona definitions | tested | [Task plan](plans/d1-course-personas.md), attributed [36-reading mapping](plans/d1-course-mapping.md), pure fresh typed definitions and 12 integrity tests. Mapping approved; engine outcomes pass; complete database loading/reseeding verified |
| Pure recovery engine | tested | [Engine plan](plans/d2-engine.md), code-owned inherited deadline order and shared rounded placement; 48 tests including Amaka cut / Tunde infeasible / Zainab fit. Full suite 114 tests; service/AI/browser checks remain |
| Complete cohort skill/seed | tested | [Task plan](plans/d1-cohort-seed.md), approved packages, pure generator with 9 tests, 303 simulated students loaded and two identical logical reseeds with cache retention verified; skill manually validated, stock validator needs PyYAML |
| Atomic demo reset | tested | [Reset plan](plans/d1-demo-reset.md), strict API/error privacy and layer tests, two identical Neon resets after temporary persona mutations; cohort study records/AiCache preserved. Local +1 day/public +3 days and Reset loading/successful restoration verified |
| Infrastructure access | demo-verified | Implementation commits through aacdeb3 pushed; [CI passed](https://github.com/HERYORDEJY/back-on-track/actions/runs/37300003442) with 137 tests. Neon migration/seed/reset verified; configured Production DATABASE_URL and public runtime verified |
| Personal commit-message skill | tested | `git-commit-message` is installed under the personal Codex system skills directory. Existing YAML parser validates skill/UI metadata and independent staged-only dry run passes. Stock validator lacks PyYAML; no dependency or application milestone changed |
| D2 AI/cache, plan service and thin learner page | tested | [Task plan](plans/d2-learner-service.md); approved pinned OpenAI SDK; 155 tests, required checks and production build pass. Demo-mode browser path verified for Amaka cut/Tunde infeasible and Start demo/reset at 375/1280 px. Live AI request hit `429 credit_balance_exhausted`, so live-source and 20-second exit remain unverified |
| Official submission date, judging rubric, team/pre-build rules | pending | Maintainer has no explicit rubric and gave no confirmed rules/date |
| Demo mapping and remaining behavior choices | pending | Source and exact mapping approved. Delayed offline check-ins, same-day re-planning and cache deletion ownership still need decisions |

After each work session, record completed tasks, the current task, next steps, blockers, pending decisions and any cuts here and in `CODEX_LOG.md`. Do not erase deferred or abandoned work; keep its reason and date. No feature has been cut or abandoned. Landing actions are deferred until their scheduled working destinations exist, as the maintainer approved on 2026-10-05.

D1 foundation completed on 2026-10-05 under the approved sequencing adjustment. Public URL: [back-on-track-one.vercel.app](https://back-on-track-one.vercel.app). All 137 tests, required checks, production build and remote CI pass. Production landing, clock and reset return 200; public +3 day/Reset and English/Pidgin reload persistence verified at 375/1280 px with no horizontal overflow. Two identical complete reseeds and persona resets preserve their specified cache/cohort boundaries. Clock restored to 19 October 18:00 Lagos.

Next task: after API credits are available, rerun the bounded live Amaka plan and verify an `ai` or `cache` source within the D2 budget. Then D3 builds full intake, check-in, re-plan, bilingual learner switching, read-aloud and offline behavior. The local `.env` has a configured key/model (model lookup returned HTTP 200), but structured generation returned `429 credit_balance_exhausted` on 2026-10-06; the maintainer said they will add credits. Delayed offline check-ins, same-day re-planning and cache deletion remain unanswered; no policy was assumed. Physical Android/TalkBack and complete demo/offline checks remain scheduled for D5. No feature was cut or abandoned.

Follow-up: dependency audit reports 9 high-severity tooling-chain entries; no automatic incompatible fixes applied. ESLint 9 is a temporary compatibility pin. Details and upstream references are in [library notes](references/next-eslint.md).

## Build sequence

### D1: foundation and a live URL — completed 2026-10-05

- [x] Preserve the existing local documentation commit, configure main/origin; add the `package.json` scripts listed in `AGENTS.md`
- [x] Scaffold Next.js (App Router, TypeScript strict), Tailwind and shadcn/ui
- [x] Connect Prisma to Neon
- [x] ESLint `no-restricted-imports` rules for the layers in `ARCHITECTURE.md`, with boundary tests
- [x] GitHub Actions running `npm ci` and `npm run check`
- [x] Vercel runtime/env verification and public showcase URL
- [x] Prisma schema for every model; first migration
- [x] `lib/clock.ts`, `/api/clock` and ClockControl, including atomic Reset
- [x] Seed the course and personas (`specs/data.md`)
- [x] Build the cohort generator as a Codex skill; seed 300 students with time-stamped events (manual skill validation; stock validator lacks PyYAML)
- [x] `lib/i18n.ts`, `messages/en.json`, `messages/pcm.json`, landing LanguageSwitch, `tests/i18n.test.ts` (learner switch waits for the learner flow)
- [x] Bilingual landing persona descriptions, SimulatedBadge and `/api/demo/reset` with header Reset
- [ ] Start demo and learner links: deferred to the working D2 learner screen (maintainer approved 2026-10-05)
- [ ] Advisor link: deferred to the working D4 advisor screen (maintainer approved 2026-10-05)

Exit (sequencing approved 2026-10-05): the deployed URL shows the personas, the clock moves forward, header Reset restores the demo, reseeding gives identical data, CI is green, and the landing page switches between English and Pidgin. Start demo/learner links are activated with D2 and the advisor link with D4; all remain in scope.

### D2: engine and a thin learner flow

- [x] Activate landing PersonaSwitcher/learner links and Start demo (reset, then open Amaka) once the learner screen works

- [x] `lib/engine` as pure functions with tests: time rules, backlog, capacity, protected topics, basis, validator, fallback, scheduler
- [x] `lib/ai`: client, schemas, prompts, cache, `DEMO_MODE`; `tests/ai-privacy.test.ts` (live generation check pending credits)
- [x] `buildPlan` with retries and fallback; the infeasible path; persona tests
- [x] `lib/services/plans.ts`, `POST /api/plan`, and a plain page showing the plan

Exit: Amaka's scenario returns a valid `cut` plan in the browser within the 20-second live plan budget and instantly in `DEMO_MODE`. Every kept or shortened minute is scheduled before the exam after rounding. Forcing an AI failure still returns the fallback plan. Persona tests are green. Current evidence: demo-mode Amaka cut and Tunde infeasible plans render; all planned cut minutes fit, and forced live `429` used fallback. Browser mutation takes several seconds because Neon is remote. The live `ai` source/budget check awaits account credits.

Checkpoint: if this exit cannot be met within the remaining build time, the advisor screen becomes a slide mockup and D3/D4 both go to the learner flow. Log the cut and update the demo steps in `PRODUCT_SENSE.md` and the local demo test in the same change. Golden rules take precedence over the cut list, which takes precedence over the script.

### D3: learner experience, in two parallel threads

- [ ] Intake: minutes per weekday (required), "my hours change every week", goal and context (optional)
- [ ] Plan view in the order set in `FRONTEND.md`, with Localized text in the chosen language
- [ ] Check-in: done or missed; Progress rows for finished topics; `lastSeenAt`
- [ ] Re-plan on effectively missed sessions, with a change summary; the weekly hours prompt
- [ ] Reminders panel
- [ ] ReadAloud
- [ ] Infeasible screen
- [ ] Every learner string in both message files

Exit: the full loop works for all 3 personas at 375 px and 1280 px, in English and Pidgin.

### D4: advisor view and privacy, in two parallel threads

- [ ] Activate the landing advisor link once the advisor screen works

- [ ] `lib/risk` with tests (`specs/risk.md`)
- [ ] `lib/services/advisor.ts`; advisor page with the ranked list, band filter and student drawer
- [ ] Outreach: AI draft in the student's language; edit locally, Copy the edited text, Mark contacted saves the final message
- [ ] Header metric, labelled simulated
- [ ] Learner side: the "What your advisor sees" panel and Delete my data

Exit: 300 students load in under 1 second; every High-risk student shows at least 2 reasons; after the demo path Tunde is first; after jumping to Week 10, on-track students are still low risk.

### D5: demo hardening, then feature freeze

- [ ] Run `npm run demo:warm` against production, then set `DEMO_MODE=true` there; keep a preview deployment on live AI
- [ ] Offline: `public/sw.js`, plan snapshot, check-in queue and sync
- [ ] Low-bandwidth pass on Chrome's Slow 4G profile; Lighthouse on mobile
- [ ] Accessibility pass, including TalkBack through the demo path once
- [ ] Loading, empty and error states
- [ ] Copy pass in both languages; a human checks every Pidgin string
- [ ] Playwright demo test, run locally
- [ ] Check on a mid-range Android phone and a laptop

Exit: the demo path runs 3 times in a row with nothing off-script, the plan opens in airplane mode, and Lighthouse on mobile scores accessibility 90+ and performance 80+. Then freeze features.

### D6: pitch and proof, no new features

- [ ] Record a 2-minute backup video of the demo
- [ ] 5 slides: the person, the live demo, why it works and the constraints it meets, how Codex built it, the pilot ask
- [ ] Review every cached demo response in English and Pidgin
- [ ] README: problem, demo link, engine rules, constraints, Codex workflow, how to run locally
- [ ] Turn `CODEX_LOG.md` into the 30-second Codex segment of the pitch
- [ ] 5 timed rehearsals; drill the Q&A

Exit: the pitch runs under 3 minutes twice in a row; video, slides and README are final.

### D7: submit and present

- [ ] Final check from a clean browser and a phone
- [ ] Submit as the rules require
- [ ] Keep the backup video and slides available offline

Exit: submitted, with time left for anything that broke.

## Cut order

When behind, cut from the top:

1. The re-plan change summary (keep re-planning itself).
2. Advisor band filter and the drawer's activity timeline (keep the list, reasons and drafts).
3. AI-drafted outreach, replaced by the template in `specs/ai.md`.
4. The reminders panel, replaced by the next session only.
5. The whole advisor screen, replaced by a static mockup in the slides.

Never cut: the validator and fallback, the simulated clock, `DEMO_MODE` caching, the offline plan view, the Pidgin switch, read-aloud for the plan and infeasible screen, a rehearsed demo path, the backup video, D6. Allowed cuts change the demo path; update `PRODUCT_SENSE.md` and its test together. No cuts have been applied.

## Parallel threads

Days 3 and 4 run two Codex threads in separate worktrees. Each stays in its lane:

| Thread | May edit |
| --- | --- |
| Learner UI (Day 3) | `app/learner/**`, `components/learner/**`, `messages/**` |
| Re-plan logic (Day 3) | `lib/engine/**`, `tests/engine/**`, `lib/services/plans.ts`, `app/api/plan/**`, `app/api/sessions/**` |
| Advisor UI (Day 4) | `app/advisor/**`, `components/advisor/**`, `app/api/advisor/**`, `lib/services/advisor.ts`, `messages/**` |
| Risk score (Day 4) | `lib/risk/**`, `tests/risk/**` |

The risk thread returns reason codes and params; the advisor UI thread adds their message templates. Shared files (`prisma/schema.prisma`, `lib/db.ts`, `lib/clock.ts`, `lib/i18n.ts`, `components/ui/**`, `package.json`) change only in the main thread.

## Codex evidence for the pitch

Capture as you build, not on Day 6:

- [ ] These docs committed on Day 1: a short `AGENTS.md` map with the deeper docs behind it, adapted from OpenAI's harness-engineering layout
- [ ] Plan mode before each day's main feature; screenshot one plan
- [ ] The cohort generator as a Codex skill, with its SKILL.md in the repo
- [ ] Parallel threads on Days 3 and 4, in separate worktrees
- [ ] One MCP server, such as Playwright, so Codex can run and inspect the demo path
- [ ] A `CODEX_LOG.md` row for every task
- [ ] Three numbers for the pitch: commits made with Codex, parallel threads run, tests Codex wrote

## Open questions

Facts not yet confirmed. Until they are, use neutral placeholder wording and never state them as MIVA policy. Published evidence and its limits live in `docs/RESEARCH.md`.

- [x] Start and working pattern: 2026-10-04, as availability allows; no fixed daily hours
- [ ] Official submission date (about two weeks is the maintainer's estimate)
- [ ] Deliverables and judging criteria
- [ ] Team and pre-build policy
- [ ] A call with a MIVA success advisor through the organizers
- [x] Select a publicly available management source: BCcampus / University of Minnesota, approved 2026-10-05
- [x] Confirm the exact [36-reading mapping](plans/d1-course-mapping.md): approved 2026-10-05; complete seed loaded
- [x] Public MIVA advisor/study-break/deferment guidance researched; recorded with limitations in `docs/RESEARCH.md`
- [ ] Partner confirmation of eligibility/windows for the demo scenario and any assignment-extension procedure; public guidance does not guarantee a break or extension
- [ ] Which languages, phones and data budgets MIVA students actually have
- [x] Feasibility order: code owns prerequisite/deadline/weight/course order, approved 2026-10-05; engine/AI contract updated
- [ ] Delayed offline first check-in: permit its later sync despite earlier-session edit locking, or reject with a visible conflict
- [ ] Today's missed session: immediate re-plan with preserved same-day editability, or wait until tomorrow before re-planning it
- [ ] Delete my data: decide how to remove shared AiCache entries derived from deleted user free text while preserving unrelated warmed demo entries
- [x] Confirm `OPENAI_MODEL` is configured and accessible: read-only model lookup returned HTTP 200 on 2026-10-05
- [ ] Confirm a live-AI spending budget before warming the cache; account currently returns `credit_balance_exhausted`, and the maintainer plans to add credits

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-03 | Added the student's goal, a basis for every reason, offline use, English and Pidgin, read-aloud and the privacy panel | Every requirement in the capstone brief maps to a feature |
| 2026-10-03 | End-to-end tests run locally only | Invention sprint: protect the demo, skip production hardening |
| 2026-10-04 | Split the single AGENTS.md into a short map plus `docs/` | Codex loads only what a task needs; each fact has one home |
| 2026-10-04 | The AI writes both languages in one call; plan text stored as `{ en, pcm }` | The language switch in the demo must not re-plan |
| 2026-10-04 | Time rules: events dated after now are ignored; the clock moves forward only | The advisor view stays believable when the clock jumps |
| 2026-10-04 | Start today, work as availability allows; D1-D7 are milestone tags; maintain explicit progress, pending, deferred and abandoned records | Maintainer's working pattern; submission is estimated at about two weeks, not a confirmed deadline |
| 2026-10-04 | Golden rules precede cut order, which precedes the script; read-aloud cannot be cut; approved cuts update the script and its test | Maintainer resolved the scope conflict |
| 2026-10-04 | Schedule feasibility uses every rounded non-skipped minute; prerequisites always precede dependants and inherit their earliest deadline | Total available minutes alone can promise work the scheduler cannot place |
| 2026-10-04 | One 20-second live plan budget; sparse AI items contain only cuts/shortening; unlisted topics are kept by code | Bound retry latency and reduce generated output |
| 2026-10-04 | Infeasible plans show work that fits through the next assessment date, list the rest and re-plan after that date; the exam can follow the final quiz | Honest next step without promising a complete catch-up |
| 2026-10-04 | Limit and redact free text; remove app-collected data on deletion while retaining course Progress/Submission; reload simulated personas | Maintainer clarified privacy and demo reset semantics |
| 2026-10-04 | Landing language cookie; student language on learner screens; queue offline language edits; published course/topic titles stay English | Language changes must work without a network or re-plan |
| 2026-10-04 | Both sides see call priority, reasons, last activity and escalation; no numeric score; goal/context and outreach working notes stay private | Clarifies advisor transparency |
| 2026-10-04 | Only today's sessions are editable; Progress records have check-in provenance; Mark contacted saves the edited message | Makes reversal precise without altering earlier course records |
| 2026-10-04 | Define zero-capacity, never-active, missing-deadline and empty-adherence behavior in the risk spec | Maintainer resolved undefined risk edge cases |
| 2026-10-05 | Approve the pinned D1 dependency set and the subsequent ESLint 9.39.5 replacement | Foundation packages approved explicitly; React plugin crashes with ESLint 10.12.0. Support/advisory limits recorded, no unrelated packages added |
| 2026-10-05 | Use webpack dev/build and generate Next route types before typecheck; disable generated agent rules | Verified build mode in this environment and checks before the first build; preserve the repo's authored instruction map |
| 2026-10-05 | Overshooting clock jumps stop at the specified limit; later day jumps stay there | Maintainer chose clamping rather than rejection before clock implementation |
| 2026-10-05 | Approve seedrandom 3.0.5 and development types 3.0.8 | Isolated deterministic PRNG and strict types for the documented cohort generator |
| 2026-10-05 | Approve the exact 36-reading mapping, simulated estimates/weights/prerequisites and assessment dates | Maintainer reviewed the concrete mapping before database loading |
| 2026-10-05 | Use BCcampus / University of Minnesota Principles of Management for the labelled 36-topic, 12-week adaptation | Maintainer selected the researched source; exact mapping prepared separately for review, with published titles and attribution |
| 2026-10-05 | Complete D1 with header Reset; activate Start demo/learner links with D2 and the advisor link with D4 | Maintainer resolved navigation preceding its scheduled destination screens; features remain in scope |
| 2026-10-05 | Allow services to import only pure course/persona seed definitions; runner, loader and cohort imports remain forbidden | Maintainer approved the narrow allowance needed for atomic reset; import boundaries now test it |
| 2026-10-05 | Code owns prerequisite-first ordering, followed by inherited assessment deadline, exam weight and stable course order | Maintainer chose deterministic ordering for all feasibility checks, AI proposals and fallback; no AI order field |
| 2026-10-06 | Add pinned `openai` 7.28.0 for the D2 Responses API structured-output adapter | Maintainer approved the dependency; installed Zod 4 is supported. No schema, threshold or persona changed |

## Later

Ideas outside scope, newest first:

- WhatsApp and SMS reminders (SMS for basic phones)
- More languages: Hausa, Yoruba, Igbo, French
- LMS integration, advisor accounts, more than one course
- Partial topic progress
- Extension and study-break requests from inside the app
