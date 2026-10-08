# Plans

The source of truth for the build: what's done, what's next, and what gets cut when time runs short. Update the status table and progress record in the same change as the work. Use plan mode before each milestone's main feature. Programme requirements are in [the capstone brief](../CAPSTONE_PROJECT_BRIEF.md).

## Status

`not started` → `in progress` → `built` → `tested` (unit tests green) → `demo-verified` (works on the demo path, on a phone). Also use `blocked`, `deferred` or `abandoned` with a reason and the condition for resuming, where applicable. Documentation and research tasks use `done` only after their stated checks pass.

| Area | Status | Notes |
| --- | --- | --- |
| Scaffold, CI, deploy | demo-verified | Local check/build and [D2 remote CI](https://github.com/HERYORDEJY/back-on-track/actions/runs/37422104658) pass (155 tests); public landing/clock/reset and D2 learner routes return 200. D1 interactive and D2 local browser checks pass at 375/1280 px |
| Data model and seed (course, personas, cohort) | tested | Schema and approved D4 ownership migration applied; selected-source course/persona definitions and 303-student seed pass. Two live reseeds retain the cache and Amaka ownership fixture, restore the clock and return identical seeded rows |
| Simulated clock and demo reset | demo-verified | Persisted forward clock, API and bilingual controls built; 32 clock/API tests pass and live concurrent advances verified. Atomic persona reset implemented; two identical live resets preserve cohort study rows/cache; local +1 day and public +3 days/Reset loading and success verified at 375 px |
| Languages (message files, switch) | in progress | Learner header reads each student's saved language and PATCH switch persists it without rebuilding a plan; local Zainab English/Pidgin and direct Amaka/Tunde visits verified. D5 browser test covers offline switching and replay; human Pidgin review remains |
| Recovery engine | demo-verified | Pure buildPlan/scheduler/protection/sparse validation/fallback/infeasible paths and D3 next-day re-plan/change summary tested; local browser +3 day path verified |
| AI calls, cache, `DEMO_MODE` | demo-verified | After the local e2e isolation fix, an approved public live-AI rewarm restored Amaka's two entries. The Ready `DEMO_MODE=true` deployment passed three consecutive public cache-only runs with Amaka cache/cache and Tunde outreach cache, each followed by reset |
| Learner flow (intake, plan, check-in, re-plan) | demo-verified | D3 daily/variable intake, check-in and safe reversal, next-day re-plan/change summary, weekly sessions, reminders and bilingual plan UI pass 179 tests and the local browser path. D5 offline queue passes local and physical Android checks |
| Infeasible screen | demo-verified | Tunde's honest summary, next step, assessment-focused sessions and unplaced work render locally; read-aloud control is present. The phone speech spot check covered Amaka's session, not Tunde's infeasible text |
| Offline plan and check-in queue | demo-verified | Unit/local production-browser tests cover snapshots, Done/Missed, language edits, later-day replay, conflicts and cleanup. A physical Android 9 airplane-mode reopen, queued Done and reconnect sync passed at 360 px ([phone check](plans/d5-phone-check.md)) |
| Read-aloud | tested | Session/summary and infeasible summary/next step are wired to speechSynthesis with en-NG preference for Pidgin and an unsupported-device message; the maintainer heard Amaka's session read aloud on Android. Tunde's infeasible speech was not auditioned |
| Risk score and advisor view | demo-verified | 23 pure risk tests; 303-row local call list, Tunde first after his infeasible plan, 180/180 on-track Low at Week 10, 375/1280 px browser checks. After `cle1` placement, five following public first-byte readings had a 0.86 s median; the initial request took 3.76 s. Strict one-second latency is not reliable |
| Privacy panel and Delete my data | demo-verified | Learner/advisor parity and edited outreach verified in browser. Approved AiCacheUse migration applied; Tunde deletion cleared app data; D5 browser test confirms Amaka's local snapshot and cached learner page clear on Delete my data |
| Demo hardening (cache warm, Lighthouse, TalkBack) | in progress | Isolated local Playwright passes three serial repeats; the restored Production cache passes three public runs. Clean-profile mobile Lighthouse scored 99 performance / 100 accessibility on landing, Amaka plan and advisor. Android offline/speech spot checks passed; further TalkBack interaction was skipped at the maintainer's request |
| Pitch assets (video, slides, README) | not started | |
| Visual design (the line) | in progress | Phases 0–3 are built. The maintainer's learner review authorized a [feedback pass](plans/d6-feedback-pass.md): clearer plan/advisor copy and status hierarchy, shared blocking overlay, advisor drawer close behavior and a two-draft weekly guard. Phase 4 full visual review and Phase 5 proof/capture remain; supplied docs stay staged until D6 is complete |

## Current progress

Build starts on 2026-10-04. Work happens as the maintainer is available; no daily hours are promised. The maintainer estimates about two weeks until submission, but the official date is unconfirmed. The D1-D8 labels below are ordered milestones and commit tags, not fixed calendar days. Preserve the engine checkpoint, feature freeze and dedicated pitch preparation even if elapsed time changes.

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
| D2 AI/cache, plan service and thin learner page | demo-verified | [Task plan](plans/d2-learner-service.md); approved pinned OpenAI SDK; local demo-mode browser path verified for Amaka cut/Tunde infeasible and Start demo/reset at 375/1280 px, plus the revised cached Pidgin cut in the browser. Revised prompt produced a valid live `ai` Amaka cut in 18.9 seconds; cache-only engine replay and saved API returned valid `cache` plans. `npm run check` passes with 156 tests and build passes. The [prior implementation CI](https://github.com/HERYORDEJY/back-on-track/actions/runs/37422104658) passed; [GitHub Actions](https://github.com/HERYORDEJY/back-on-track/actions) tracks this follow-up's remote result |
| D3 online learner loop | demo-verified | [Task plan](plans/d3-learner-loop.md); 179 tests, `npm run check` and production build pass. Local browser built all three persona outcomes, saved Zainab's language switch, checked Amaka done/reversal and +3 day change summary, used variable-hours intake, and restored the demo. No horizontal overflow at 375/1280 px. One transient reset 503 succeeded on retry; audio, offline queue and physical Android checks remain D5 |
| Language control and visual direction | in progress | The D6 two-part language plate replaces the earlier page-turn transition; saved learner and offline language switching still pass the browser demo. Learner visual review is the next gate |
| D4 advisor and privacy | demo-verified | [Task plan](plans/d4-advisor-privacy.md); risk and advisor lanes integrated, approved ownership migration deployed, local Tunde call-list/outreach/deletion path verified at 375/1280 px. At Week 10, 180/180 on-track rows were Low and metric was 23 of 31. Warm 303-row service reads met the 1-second target; full page HTTP remains slower. Live reseed ownership check, 219 tests, `npm run check` and production build passed |
| D5 offline learner flow | demo-verified | [Task plan](plans/d5-offline.md); production-browser Playwright path passes through online build, 375 px offline reopen, queued Pidgin switch and Done, +3 day late sync and change summary, Tunde first on advisor list, deletion of Amaka's local snapshot/cache and demo reset. [Android check](plans/d5-phone-check.md) passed airplane-mode reopen and queued Done sync at 360 px; other D5 hardening remains |
| D5 physical phone check | done | [Phone check](plans/d5-phone-check.md); Android 9 cached plan reopened by offline navigation/reload, Done queued and synced on reconnect, spoken session heard by the maintainer, no 360 px overflow. Original accessibility/network settings and demo intake restored. The maintainer waived the remaining TalkBack gesture traversal |
| D5 demo cache warmer | demo-verified | [Task plan](plans/d5-cache-warm.md); approved public rewarm restored Amaka's two owned entries after the former local test deletion. `DEMO_MODE=true` deployment passed three consecutive public cache-only runs and resets; read-only database check confirms ownership and start state |
| D5 advisor response-size pass | demo-verified | [Measurement](plans/d5-advisor-performance.md); 40-row pages cut response size 83%. The deployed function now runs in `cle1`; warm public first byte reached 0.74–1.06 s in four of five following samples, while the first took 3.76 s. The 375 px emulated Slow 4G page loaded in 3.49 s with no overflow; cache-only public replay and reset passed |
| D5 e2e database isolation | demo-verified | [Task plan](plans/d5-e2e-isolation.md); the guard now targets only a named loopback database. Three serial local browser repeats passed without changing Production, then approved public rewarm restored Amaka's two entries and three cache-only public runs passed |
| D5 route loading and recovery states | locally tested | [Task plan](plans/d5-route-states.md); root loading, error/retry and not-found/home states use the layout language. Local production browser verified invalid learner URL in English/Pidgin at 375 px without overflow, plus the advisor error state against an unavailable loopback database. Human Pidgin review remains |
| Official submission date, judging rubric, team/pre-build rules | pending | Maintainer has no explicit rubric and gave no confirmed rules/date |
| Demo mapping and remaining behavior choices | tested | Source and exact mapping approved; next-day re-planning, cache ownership/deletion and later-day offline check-in replay decided. A superseded-plan action remains queued with a visible conflict |

After each work session, record completed tasks, the current task, next steps, blockers, pending decisions and any cuts here and in `CODEX_LOG.md`. Do not erase deferred or abandoned work; keep its reason and date. No feature has been cut or abandoned. Landing actions are deferred until their scheduled working destinations exist, as the maintainer approved on 2026-10-05.

D1 foundation completed on 2026-10-05 under the approved sequencing adjustment. Public URL: [back-on-track-one.vercel.app](https://back-on-track-one.vercel.app). All 137 tests, required checks, production build and remote CI pass. Production landing, clock and reset return 200; public +3 day/Reset and English/Pidgin reload persistence verified at 375/1280 px with no horizontal overflow. Two identical complete reseeds and persona resets preserve their specified cache/cohort boundaries. Clock restored to 19 October 18:00 Lagos.

Current task: D6 whole-project UI overhaul. The new [design instruction](D6-UI-Overhaul-Task-Documentation/DESIGN.md) has been read with all nine browser-rendered frames. Ten original screen screenshots are captured at 375 x 812 and 1280 x 800 against the isolated seeded demo database. Work follows the six-phase [D6 plan](plans/d6-ui-overhaul.md), with learner-screen review before the advisor phase. The D5 human Pidgin copy pass is deferred while D6 proceeds. The supplied instruction and reference remain in their current directory until the overhaul is fully complete, per the maintainer. No feature has been cut or abandoned.

D2 implementation commit `7d0c61e` is pushed. [GitHub CI](https://github.com/HERYORDEJY/back-on-track/actions/runs/37422104658) passed and Vercel reported deployment success. The public landing, Amaka and Tunde routes return 200; the public mutation path has not been exercised, so the local browser evidence remains the D2 interaction check.

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
- [x] Start demo and learner links: activated with the working D2 learner screen (maintainer approved 2026-10-05)
- [x] Advisor link: activated with the working D4 advisor screen (maintainer approved 2026-10-05)

Exit (sequencing approved 2026-10-05): the deployed URL shows the personas, the clock moves forward, header Reset restores the demo, reseeding gives identical data, CI is green, and the landing page switches between English and Pidgin. Start demo/learner links are activated with D2 and the advisor link with D4; all remain in scope.

### D2: engine and a thin learner flow

- [x] Activate landing PersonaSwitcher/learner links and Start demo (reset, then open Amaka) once the learner screen works

- [x] `lib/engine` as pure functions with tests: time rules, backlog, capacity, protected topics, basis, validator, fallback, scheduler
- [x] `lib/ai`: client, schemas, prompts, cache, `DEMO_MODE`; `tests/ai-privacy.test.ts` (live Amaka result validated within the shared budget)
- [x] `buildPlan` with retries and fallback; the infeasible path; persona tests
- [x] `lib/services/plans.ts`, `POST /api/plan`, and a plain page showing the plan

Exit met for the AI budget and plan paths: Amaka's live `ai` cut completed in 18.9 seconds; code placed every selected rounded minute before the exam. In `DEMO_MODE`, the same proposal replayed from cache with no OpenAI call, and the saved plan API returned source `cache`; a cache miss and forced failure still use fallback. Demo-mode Amaka cut and Tunde infeasible plans render in the browser at 375/1280 px, and persona tests pass. The plan API took 7.8 seconds locally because Neon is remote; cache-only is immediate relative to a live AI call, but not literally zero-latency. Production cache warming, phone/offline checks and performance work remain D5.

Checkpoint: if this exit cannot be met within the remaining build time, the advisor screen becomes a slide mockup and D3/D4 both go to the learner flow. Log the cut and update the demo steps in `PRODUCT_SENSE.md` and the local demo test in the same change. Golden rules take precedence over the cut list, which takes precedence over the script.

### D3: learner experience, in two parallel threads — online loop completed 2026-10-06

- [x] Intake: minutes per weekday (required), "my hours change every week", goal and context (optional)
- [x] Plan view in the order set in `FRONTEND.md`, with Localized text in the chosen language
- [x] Check-in: done or missed; Progress rows for finished topics; `lastSeenAt`
- [x] Re-plan on effectively missed sessions, with a change summary; the weekly hours prompt
- [x] Reminders panel
- [x] ReadAloud (control and speech text; audible device check D5)
- [x] Infeasible screen
- [x] Every learner string in both message files

Exit: the online loop works for all 3 personas locally at 375 px and 1280 px, with English and Pidgin learner copy. Browser checks covered each outcome and both language states; full offline/device and spoken-audio checks remain D5.

### D4: advisor view and privacy, in two parallel threads

- [x] Activate the landing advisor link once the advisor screen works
- [x] Give the advisor list and drawer a deliberate call-priority hierarchy using the visual direction in `FRONTEND.md`; check at 375 px and 1280 px without adding decorative weight

- [x] `lib/risk` with tests (`specs/risk.md`)
- [x] `lib/services/advisor.ts`; advisor page with the ranked list, band filter and student drawer
- [x] Outreach: AI draft in the student's language; edit locally, Copy the edited text, Mark contacted saves the final message
- [x] Header metric, labelled simulated
- [x] Learner side: the "What your advisor sees" panel and Delete my data

Exit on the warm demo path: the service returns 303 ranked students in 0.86–0.89 seconds; every High row has at least two reasons; after Tunde's infeasible plan he ranks first; at Week 10 all 180 on-track learners remain Low. The full production-mode page request took 1.9–2.1 seconds warm and 4.2 seconds cold against remote Neon. The visible page does not yet meet a strict 1-second interpretation of this target; carry that latency into D5 low-bandwidth/performance work rather than claiming a faster page.

### D5: demo hardening and offline reliability

- [x] Restore Amaka's Production cache after the former local e2e deletion ([runner plan](plans/d5-cache-warm.md)); approved public live rewarm restored two owned entries under the $5 cap
- [x] Re-verify a fresh Production deployment uses warmed Sol cache and `DEMO_MODE=true`; three consecutive public runs returned Amaka cache/cache and Tunde outreach cache, each followed by reset
- [ ] Configure Preview live-AI credentials only after separate approval; they are currently Production-only
- [x] Offline: `public/sw.js`, plan snapshot, check-in/language queue and sync ([task plan](plans/d5-offline.md)); local production-browser proof and physical Android airplane-mode check complete
- [x] Improve the measured full-page advisor latency and run the low-bandwidth/mobile checks; 40-row pages reduce response size 83%, deployed `cle1` warm first-byte samples reached 0.74–1.06 s in four of five following requests, and a 375 px emulated Slow 4G load took 3.49 s with 40 rows and no overflow ([measurement](plans/d5-advisor-performance.md)). Clean-profile mobile Lighthouse was 99 performance / 100 accessibility before the region change; cold latency remains above one second
- [x] Accessibility spot check: clean-profile mobile Lighthouse scored 100; TalkBack launched and the maintainer heard speech on Android. Remaining gesture traversal skipped at the maintainer's request ([record](plans/d5-phone-check.md))
- [x] Loading, empty and error states: route-level bilingual loading/retry/not-found added; advisor list/detail empties and mutation progress/retry states already present. Local production browser verified English/Pidgin missing learner and advisor failure screens
- [ ] Copy pass in both languages; a human checks every Pidgin string (deferred at the maintainer's request until after D6)
- [x] Playwright demo test, run locally in production mode
- [x] Check on a mid-range Android phone and a laptop; the [phone check](plans/d5-phone-check.md) includes offline reload/sync and 360 px width, while local production-browser tests cover the laptop path

Exit: the demo path runs 3 times in a row with nothing off-script, the plan opens in airplane mode, and Lighthouse on mobile scores accessibility 90+ and performance 80+. The whole-project visual pass and feature freeze follow in D6.

### D6: whole-project UI overhaul, then feature freeze

The [design instruction](D6-UI-Overhaul-Task-Documentation/DESIGN.md) and [phase plan](plans/d6-ui-overhaul.md) cover the landing, shared controls, learner journey, infeasible and offline states, and advisor view. The maintainer reviewed Phase 3, clarified the learner and advisor UX, and authorized the separate [feedback pass](plans/d6-feedback-pass.md). Phase 4 full visual review and Phase 5 design guard, local demo test, mobile Lighthouse 80/90 and ten after screenshots remain before feature freeze. Human Pidgin copy review remains a separate deferred D5 task.

#### Pidgin strings to check

The following D6 Phase 2 strings are draft copy for the deferred human pass: Clock; Don finish reach Week {done} of {total}. Course dey Week {week}.; Tonight; Done; Missed; {date}, no study time; {assessment} go due, na {weight}% of your grade; 1 more study session; {count} more study sessions; E no go fit before {date}: 1 topic; E no go fit before {date}: {count} topics; Final exam; Course as dem write am need; You get; This plan need; Keep everything; Shorten to 70%; Shorten to 50%; Skip am; High priority; Medium priority; Low priority; We dey build your plan.

The feedback pass replaces some short time labels above and adds `plan.time.fit/cut/infeasible`, `plan.deadlineWarning.one/many`, `plan.night.course/duration`, and the new major-action loading/status labels. Review the current `messages/pcm.json` values for these keys; the earlier phrases in this record show what changed, not final copy.

Phase 3 new and revised Pidgin strings (each still needs the deferred human check):

- `app.simulated`: Simulated data
- `language.short.en`: English
- `language.short.pcm`: Pidgin
- `landing.title`: Catch-up plan wey fit the hours wey you really get.
- `landing.description`: Three students don fall behind for the same course. Open one make you see the plan wey go help dem catch up.
- `landing.courseWeek`: Course dey Week {week}
- `landing.doneThrough`: Don finish reach Week {week}
- `landing.notStarted`: Never start yet
- `landing.person.amaka.context`: Nurse for Lagos, two children, night shifts
- `landing.person.tunde.context`: Civil servant for Abuja
- `landing.person.zainab.context`: Software developer for Kano
- `landing.openLearner`: Open plan
- `landing.openAdvisor`: Advisor view
- `time.bar.course`: Course as dem write am need
- `time.bar.available`: You get
- `time.bar.plan`: This plan need
- `plan.savedPhone`: We don save am for this phone
- `plan.goal`: Your goal
- `plan.time.title`: Your time before exam
- `plan.week`: Your week
- `plan.until`: Before {assessment}
- `plan.groups.title`: Wetin dey your plan, and why
- `plan.groups.skipped`: Wetin we skip
- `plan.groups.shortened`: Wetin we shorten
- `plan.groups.kept`: Wetin remain full
- `plan.groups.inPlan`: Wetin dey this plan
- `plan.topicCount.one`: 1 topic
- `plan.topicCount.many`: {count} topics
- `plan.topicMinutes`: {minutes} of {estimate} min
- `plan.night.today`: Today
- `plan.night.noStudy`: No study time today.
- `plan.night.next`: Next: {date}, {minutes}
- `plan.night.nextTopic`: Next: {date}, {minutes}, start with {topic}
- `plan.night.missed`: We mark am as missed. Your plan go make space for am from tomorrow.
- `plan.night.starting`: Start with
- `plan.break.title`: About study break
- `plan.break.description`: Study break go pause your course so you fit come back when you get more time. Your advisor fit explain how e go work for you.
- `learner.listen`: Listen
- `learner.listenEnglish`: Listen in English
- `learner.delete.keep`: Cancel
- `learner.delete.remove`: Delete my data
- `learner.intake.newTitle`: Make we help you catch up.
- `learner.intake.newLede`: Tell us the time wey you really get, even if e small. Plan wey fit na plan wey you fit follow.
- `learner.intake.dailyMinutes`: Minutes wey you fit study each day
- `learner.intake.typicalDay`: Minutes for normal day
- `learner.intake.weeklyTotal`: Na {duration} for one week.
- `learner.intake.setEveryDay`: Or set every day to
- `learner.intake.optional`: if you want
- `learner.intake.goalNew`: Your goal
- `learner.intake.goalHint`: Why you dey do this course? No put names, phone numbers or employers.
- `learner.intake.contextNew`: Anything else we suppose know
- `learner.intake.stillWorking`: We still dey work. E fit take up to 20 seconds.
- `learner.intake.failedTitle`: Your plan no build.
- `learner.intake.failedDetail`: We don save your answers.
- `learner.day.short.mon`: Mon
- `learner.day.short.tue`: Tue
- `learner.day.short.wed`: Wed
- `learner.day.short.thu`: Thu
- `learner.day.short.fri`: Fri
- `learner.day.short.sat`: Sat
- `learner.day.short.sun`: Sun
- `learner.checkIn.changeMissed`: Change am to missed
- `learner.checkIn.changeDone`: Change am to done

### D7: pitch and proof, no new features

- [ ] Record a 2-minute backup video of the demo
- [ ] 5 slides: the person, the live demo, why it works and the constraints it meets, how Codex built it, the pilot ask
- [ ] Review every cached demo response in English and Pidgin
- [ ] README: problem, demo link, engine rules, constraints, Codex workflow, how to run locally
- [ ] Turn `CODEX_LOG.md` into the 30-second Codex segment of the pitch
- [ ] 5 timed rehearsals; drill the Q&A

Exit: the pitch runs under 3 minutes twice in a row; video, slides and README are final.

### D8: submit and present

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

Never cut: the validator and fallback, the simulated clock, `DEMO_MODE` caching, the offline plan view, the Pidgin switch, read-aloud for the plan and infeasible screen, the dedicated whole-project UI milestone, a rehearsed demo path, the backup video, D7. Allowed cuts change the demo path; update `PRODUCT_SENSE.md` and its test together. No cuts have been applied.

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
- [x] Delayed offline first check-in: sync its original action on a later day while its session remains on the current plan, then show a late-sync note; approved 2026-10-07. Retain a superseded-plan conflict in the queue
- [x] Today's missed session: keep it editable today; re-plan on the next visit starting tomorrow (maintainer chose 2026-10-06)
- [x] Delete my data: add per-learner AiCache ownership and remove an entry only after its last owner is deleted; approved 2026-10-06. The three legacy rows may be removed once; migration refuses a larger purge
- [x] Confirm `OPENAI_MODEL` is configured and accessible: read-only model lookup returned HTTP 200 on 2026-10-05
- [ ] Confirm a live-AI spending budget before warming the cache; credits now work, but no warm budget has been set

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-06 | Re-plan a missed session starting tomorrow, while today's check-in stays editable | Prevents a same-day plan replacement from locking the student's chance to reverse the check-in |
| 2026-10-08 | Keep the supplied D6 instruction and reference in their staging directory until the overhaul is complete | Maintainer wants the old implementation available for comparison throughout the work; ten baseline screenshots preserve its appearance |
| 2026-10-08 | Draw the visual system from the product's line and stops within the bandwidth rules; put time above the week, group topics by outcome, fold reminders into the night block and line, and share one demo bar for the clock and simulated label | The reviewed D6 instruction defines the whole-product UI direction; existing behavior and data rules remain in force |
| 2026-10-08 | Apply the maintainer's learner/advisor feedback over conflicting D6 presentation rules; use a light blocking Travel overlay, plain time copy, singular warnings, visible-only drawer close and at most two outreach drafts per learner per simulated week | The reviewed screens exposed ambiguity and accidental-action risks; the existing Outreach rows can support a weekly cap without a schema change. Actual contact time and feedback-driven drafts remain pending data/AI work |
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

## Pending data and AI decision

Actual outreach contact time, learner response/call/meeting notes and their use in later AI drafts are deferred per the maintainer's request. See the [feedback pass](plans/d6-feedback-pass.md#pending-data-and-ai-work) for the proposed schema, UI, privacy and prompt steps. The current recent activity shows the saved message and its **draft date**, not a claimed contact date. `prisma/schema.prisma` requires separate approval under `AGENTS.md`.

## Later

Ideas outside scope, newest first:

- WhatsApp and SMS reminders (SMS for basic phones)
- More languages: Hausa, Yoruba, Igbo, French
- LMS integration, advisor accounts, more than one course
- Partial topic progress
- Extension and study-break requests from inside the app
