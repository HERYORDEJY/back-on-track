# Plans

The source of truth for the build: what's done, what's next, and what gets cut when time runs short. Update the status table and progress record in the same change as the work. Use plan mode before each milestone's main feature. Programme requirements are in [the capstone brief](../CAPSTONE_PROJECT_BRIEF.md).

## Status

`not started` → `in progress` → `built` → `tested` (unit tests green) → `demo-verified` (works on the demo path, on a phone). Also use `blocked`, `deferred` or `abandoned` with a reason and the condition for resuming, where applicable. Documentation and research tasks use `done` only after their stated checks pass.

| Area | Status | Notes |
| --- | --- | --- |
| Scaffold, CI, deploy | not started | |
| Data model and seed (course, personas, cohort) | not started | |
| Simulated clock and demo reset | not started | |
| Languages (message files, switch) | not started | |
| Recovery engine | not started | |
| AI calls, cache, `DEMO_MODE` | not started | |
| Learner flow (intake, plan, check-in, re-plan) | not started | |
| Infeasible screen | not started | |
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
| Research public management material and MIVA facts | done | Primary sources verified; candidates, licensing/access limits and unknowns recorded in `docs/RESEARCH.md`; source selection remains pending |
| Application implementation | not started | No scaffold, package manifest, schema or tests yet |
| Infrastructure access | pending | GitHub, Vercel, Neon and OpenAI resources identified by the maintainer; access and configuration not yet verified |
| Official submission date, judging rubric, team/pre-build rules | pending | Maintainer has no explicit rubric and gave no confirmed rules/date |
| Source/demo mapping and remaining behavior choices | pending | Questions sent about source selection, ordering, delayed offline check-ins and same-day re-planning; cache deletion ownership still needs a decision |

After each work session, record completed tasks, the current task, next steps, blockers, pending decisions and any cuts here and in `CODEX_LOG.md`. Do not erase deferred or abandoned work; keep its reason and date. No feature has been cut or abandoned yet.

Next: prepare the D1 scaffold plan, verify the existing infrastructure, and request the dependency approval required by `AGENTS.md` before installation. Five clarification questions have been sent: source/demo adaptation, topic ordering, delayed offline check-ins, same-day re-planning and cache deletion. Await source selection before writing the course mapping; await the listed behavior choices before implementing their affected paths. The current folder still has no application code or local Git checkout; no commit has been created.

## Build sequence

### D1: foundation and a live URL

- [ ] Initialize the local Git checkout for the existing remote and commit these docs first; add the `package.json` scripts listed in `AGENTS.md`
- [ ] Scaffold Next.js (App Router, TypeScript strict), Tailwind and shadcn/ui; connect Prisma to Neon
- [ ] ESLint `no-restricted-imports` rules for the layers in `ARCHITECTURE.md`
- [ ] Vercel project with env vars; GitHub Actions running `npm ci` and `npm run check`
- [ ] Prisma schema for every model; first migration
- [ ] `lib/clock.ts`, `/api/clock` and ClockControl
- [ ] Seed the course and personas (`specs/data.md`)
- [ ] Build the cohort generator as a Codex skill; seed 300 students with time-stamped events
- [ ] `lib/i18n.ts`, `messages/en.json`, `messages/pcm.json`, LanguageSwitch, `tests/i18n.test.ts`
- [ ] Landing page with PersonaSwitcher, Start demo, advisor link, SimulatedBadge; `/api/demo/reset`

Exit: the deployed URL shows the personas, the clock moves forward, Start demo resets, reseeding gives identical data, CI is green, and the landing page switches between English and Pidgin.

### D2: engine and a thin learner flow

- [ ] `lib/engine` as pure functions with tests: time rules, backlog, capacity, protected topics, basis, validator, fallback, scheduler
- [ ] `lib/ai`: client, schemas, prompts, cache, `DEMO_MODE`; `tests/ai-privacy.test.ts`
- [ ] `buildPlan` with retries and fallback; the infeasible path; persona tests
- [ ] `lib/services/plans.ts`, `POST /api/plan`, and a plain page showing the plan

Exit: Amaka's scenario returns a valid `cut` plan in the browser within the 20-second live plan budget and instantly in `DEMO_MODE`. Every kept or shortened minute is scheduled before the exam after rounding. Forcing an AI failure still returns the fallback plan. Persona tests are green.

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
- [ ] Select a publicly available management source and confirm the demo mapping; do not invent learning content
- [x] Public MIVA advisor/study-break/deferment guidance researched; recorded with limitations in `docs/RESEARCH.md`
- [ ] Partner confirmation of eligibility/windows for the demo scenario and any assignment-extension procedure; public guidance does not guarantee a break or extension
- [ ] Which languages, phones and data budgets MIVA students actually have
- [ ] Feasibility order: code fixes prerequisite/deadline order, or AI proposes an order that code validates and falls back from; a different order can change placement under the 20-minute rule
- [ ] Delayed offline first check-in: permit its later sync despite earlier-session edit locking, or reject with a visible conflict
- [ ] Today's missed session: immediate re-plan with preserved same-day editability, or wait until tomorrow before re-planning it
- [ ] Delete my data: decide how to remove shared AiCache entries derived from deleted user free text while preserving unrelated warmed demo entries
- [ ] Confirm `OPENAI_MODEL` and a live-AI spending budget before warming the cache

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

## Later

Ideas outside scope, newest first:

- WhatsApp and SMS reminders (SMS for basic phones)
- More languages: Hausa, Yoruba, Igbo, French
- LMS integration, advisor accounts, more than one course
- Partial topic progress
- Extension and study-break requests from inside the app
