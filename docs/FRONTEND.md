# Frontend

Screens, copy, languages, offline behaviour and accessibility. Product voice is in `PRODUCT_SENSE.md`; what the engine computes is in `specs/engine.md`.

## Principles

- Mobile first. Check every screen at 375 px and 1280 px wide.
- Light: no images or web fonts on learner screens, system font stack, client components only where interaction needs them.
- Works offline after the first load.
- Learner UI works in English and Nigerian Pidgin; published course and topic titles stay English. Read-aloud covers the plan session/summary and infeasible summary/next step; other screens have screen-reader labels.

## Visual direction

The [staged D6 design instruction](D6-UI-Overhaul-Task-Documentation/DESIGN.md) defines the look and layout through implementation. Its line, stops, palette and component rules supersede earlier visual notes here. The supplied file moves to its final location after the whole D6 task is complete, as the maintainer requested.

Language switching uses a two-part plate in the header. It persists the same learner or landing choice, including queued offline changes, and exposes a retry when saving fails.

## Shared components (`components/shared`)

| Component | Where | Behaviour |
| --- | --- | --- |
| SimulatedBadge | demo bar, every page | "Simulated data" label, always visible |
| ClockControl | demo bar, every page | Shows the simulated date and week, with +1 day, +3 days, Jump to week (forward only) and Reset (calls demo reset). Below 1024 px its controls open under the Clock toggle |
| PersonaSwitcher | landing | The 3 personas with a one-line situation each |
| LanguageSwitch | landing and every learner screen | Landing uses a `lang` cookie, default English. Learner screens use the student's saved language (`PATCH /api/students/[id]`); offline changes use the bilingual snapshot and queue for sync, last write wins |
| ReadAloud | plan and infeasible screens | Reads tonight's session plus plan summary, or infeasible summary plus next step, with `speechSynthesis`; for Pidgin use an English (Nigeria) voice if available, else any English voice; screen-reader labels remain available where speech isn't supported |
| Mark, SessionLine, MiniLine, TimeBars, NightBlock, Notice, Chip, Meter, Signal, Travel | pages as designed | Shared visual blocks. Pure display helpers supply progress, line stops and bar widths; the services add their read-only data to view models |

After any mutation or clock change, call `router.refresh()`.

## Screens

### Landing (`/`)

PersonaSwitcher, a Start demo button (calls demo reset, then opens Amaka), and a link to the advisor view.

Current D1 shell: both message files, landing-cookie language control, SimulatedBadge and the three approved persona descriptions are implemented. ClockControl now shows the real persisted simulated date/week and provides day/week advances, loading, limit and retry states. After a failed mutation, it refreshes the date before permitting another jump because a lost response does not prove the mutation failed. Reset now calls the atomic demo endpoint with loading/error/retry states; it and clock jumps disable one another during a mutation. As approved on 2026-10-05, learner navigation and Start demo activate with the working D2 screen; the advisor link activates with D4. All remain in scope; the shell shows no invented demo actions. Helpers/key parity, bilingual server rendering and clock API are checked. Browser verification passed at 375 and 1280 px in English/Pidgin with no horizontal overflow; both language choices persisted after reload. The +1 day and Reset controls completed, restored the expected date, and disabled other clock actions while pending. Public verification also passed: +3 days/Reset, both language choices after reload, and 375/1280 px layouts. This is foundation verification; learner/offline/advisor flows remain to build. Pidgin copy still needs the maintainer's human review.

D2 update: Start demo now resets the personas and opens Amaka; each persona has a working learner link. The thin learner page reads the saved student language and shows the goal, summary, next session, topic actions/reasons/course bases/source links, warnings and unplaced work. It builds through `/api/plan` with loading and retry states. Amaka's Pidgin cut and Tunde's honest infeasible result were verified in the browser at 375 and 1280 px without horizontal overflow. The full intake, check-in, learner language switch, read-aloud and offline behavior remain D3. The shared header still uses the landing cookie, so on a direct Amaka visit it can show English controls above her Pidgin content; D3's learner-language control must resolve that before the full-loop exit.

D3 update (2026-10-06): the full online learner view replaces the thin page. Intake has prefilled daily minutes, quick presets, a variable-hours average, bounded optional goal/context and a privacy hint. The plan puts tonight's action first, then its summary, weekly sessions, warnings, expandable topic reasons and source facts, workload and pending reminders. Done/missed check-ins support same-day reversal; earlier sessions lock, and missed work re-plans on a later visit starting tomorrow with a change summary. The shared header reads the saved learner language on a direct visit; switching it persists through the student API without rebuilding the plan. The infeasible view shows the next step and unplaced work; ReadAloud covers the required summary/session text. Local browser checks passed the three persona outcomes, Zainab's saved language switch, Amaka's check-in/reversal/+3 day re-plan and variable-hours intake. All three learner pages had no horizontal overflow at 375 px; 1280 px was also checked. Offline snapshots and queued mutations, audible device and TalkBack checks remain D5.

### Learner (`/learner/[studentId]`)

No current plan: show the intake, prefilled from the student record.

- Minutes per weekday are required, with at least one day of 20 minutes or more; quick presets help on a phone.
- "My hours change every week" takes one average for every day and turns on a weekly prompt to update hours.
- Goal and a one-line context are optional, capped at 80 and 120 characters respectively. Hint: do not include names, phone numbers or employers. Advisors never see these fields.
- The main button reads "Get me back on track" and builds the plan.

Plan screen, top to bottom:

1. The student's goal.
2. Tonight's session: minutes, topics, Done and Missed buttons, ReadAloud.
3. This week's sessions.
4. Deadline warnings.
5. Each topic: action (kept, shortened or skipped), the rationale and the basis.
6. Counts of kept, shortened and skipped topics.
7. A required-versus-available bar.
8. "What your advisor sees": call-priority band, reasons, last activity and escalation, in the learner's language. Numeric scores stay internal; outreach drafts are the advisor's private working notes.
9. Delete my data, behind a confirmation (behaviour in `specs/data.md`).

Also on the plan screen:

- After a re-plan, a change-summary banner.
- When hours vary and the plan is 7 or more days old, a banner asking the student to update this week's hours.
- An in-app reminders panel listing reminders for pending sessions.
- Only today's session can be edited online; earlier sessions are locked. Reversing a done check-in to missed removes only the Progress that check-in created. A missed session stays editable today and can trigger re-planning on the next visit starting tomorrow. A check-in saved offline can sync on a later day while that session still belongs to the current plan, with a visible late-sync note; a superseded plan leaves a visible, retained queue conflict.
- Course facts derived from demo weights, dates and prerequisite links are labelled simulated; source readings are traceable through their links.

Infeasible screen: honest summary, work that fits through the next assessment due date in prerequisite-first priority order, and the rest under "Won't fit before {date}". No session is scheduled after that due date or on/after the exam. Next step: "Your advisor has been told. Ask about an extension or a study break." Read the summary and next step aloud. On the next visit after that date, re-plan for the following assessment; the exam is the next assessment after the final quiz. MIVA's published guidance and its approval/deadline limits are in `RESEARCH.md`; do not promise eligibility or an extension. Never show the word "infeasible".

### Advisor (`/advisor`)

- Header metric from `specs/risk.md`, labelled simulated.
- Band filter through links (`?band=high|medium|low`).
- Rows: name, call-priority band word and colour, top 2 reasons, last active, plan status and escalation. Numeric scores are used only to sort, never displayed.
- Drawer (`?student=<id>`): activity timeline, missed sessions, plan status, escalation, outreach draft in the student's language with the next step in English, Copy and Mark contacted.
- Advisor screens are English only.
- Goal and context never appear in advisor responses or screens. Outreach edits stay in the text box; Copy copies the edited text and Mark contacted saves the final message.

D4 implementation (2026-10-07): the landing links to the English-only advisor call list. The page gives the action a strong heading, a compact simulated metric, band filters and ranked rows; the detail drawer keeps reasons, dated activity, missed sessions and the editable outreach note together. Local browser checks at 1280 px and 375 px found no page overflow; the drawer opens with focus and readable content at 375 px. A live simulated Tunde plan placed him first, and editing then marking his fallback outreach note contacted persisted the edited text after reload. At Week 10, the metric read 23 of 31, and all 180 on-track cohort rows were Low. Reset returned to Week 7. The learner panel showed Tunde the same band, reasons, last activity and escalation, and Delete my data returned to a landing confirmation. Human Pidgin copy review remains D5; the whole-project UI overhaul awaits the D6 instruction.

D5 response-size pass (2026-10-08): the advisor list still scores all 303 learners against the current simulated clock, then renders 40 rows per page after the chosen band filter. Page links keep the band and preserve the current page through the detail drawer. The local production-browser path verified page 2 and return to Tunde on page 1. A local response fell to 80,583 bytes from the earlier 478,659-byte public all-row response; warm first byte was still 2.07 seconds, so Slow 4G and public timing remain D5 work.

D5 public performance check (2026-10-08): the deployed first page was 80,583 bytes uncompressed and 6,765 bytes with gzip; public first-byte readings varied from 1.47 to 3.09 seconds across page requests. A throttled 375 px Playwright run loaded the advisor page in 6.9 seconds, rendered 40 rows and showed the page control without overflow. Chrome's built-in mobile Lighthouse scored landing, Amaka's Pidgin plan and advisor at 99 performance / 100 accessibility in a clean Incognito window. The normal Chrome profile scored Amaka's plan at 78 performance because installed extensions contributed most of the unused JavaScript; do not treat that run as a product score. The later Android check is recorded below.

D5 region follow-up (2026-10-08): after the functions moved to `cle1` near the demo database, five following public advisor requests had a 0.86-second median first byte; the initial request took 3.76 seconds. A 375 px headless Chromium run with emulated Slow 4G loaded in 3.49 seconds, rendered 40 rows and had no horizontal overflow. The prior clean-profile Lighthouse result remains 99 performance / 100 accessibility; it was not rerun after this deployment. The cache-only public demo sequence passed and reset. See the [measurement record](plans/d5-advisor-performance.md); cold latency remains above one second.

## Languages

Pure engine templates for summaries, rationales, reminders, deadline/change warnings and labelled simulated bases are in both message files, with key/parameter parity checked and rendered on learner pages. All new Pidgin copy still needs human review.

- `messages/en.json` and `messages/pcm.json` have exactly the same keys. Keys are dot-separated by screen (`plan.tonight.title`); parameters use braces (`{minutes}`).
- `t(key, language, params)` and `formatDate(date, language)` live in `lib/i18n.ts`.
- Plan text from the engine is Localized; render `text[language]`.
- Pidgin strings are plain, everyday Pidgin. A human checks every Pidgin string before the showcase.
- The landing cookie does not override a student's saved language. Offline language switching uses both languages in the saved snapshot, queues the new preference with check-ins, and syncs with last write wins.
- UI wording for engine terms: backlog is "work you've missed"; `compress_light` and `compress_heavy` are "shortened"; `skip` is "skipped".

## Copy

- Follow the voice in `PRODUCT_SENSE.md`.
- Numbers carry units ("40 min"). Dates read "Mon 19 Oct".
- Sentence case, short sentences, no jargon.

## Offline

- `public/sw.js`, registered from the root layout. Navigation requests to `/learner/*` are network first, with the cached copy as fallback. Never cache `/api` requests.
- After the plan renders, `lib/offline.ts` saves a snapshot (Localized text included) in `localStorage`.
- Offline, show the plan with a "Saved on this phone" note.
- Check-ins and language changes made offline go into a queue and replay their respective PATCH requests when the browser fires `online`. Check-ins are stamped with simulated time at sync, including an original session check-in replayed on a later day (maintainer choice, 2026-10-07). The learner sees a late-sync note. A superseded plan or failed replay keeps the action queued with a visible conflict/retry state; never silently discard it.
- Delete my data clears that student's browser snapshot, queued check-ins/language edits and service-worker cached learner pages on this device, as well as the server data listed in `specs/data.md`; an offline reload must not restore deleted input.
- Wrap every `localStorage` call in try/catch; the page must work without it.

D5 implementation (2026-10-07): a versioned plan snapshot and service-worker learner page/static cache support a later offline visit. The local production-browser test reopened Amaka's plan offline at 375 px, queued a Pidgin switch and Done check-in, advanced the simulated clock three days, then confirmed sync, the late-sync note and change summary. It also checked the advisor first row, Amaka's device snapshot/cache deletion, demo Reset and no horizontal overflow at 375/1280 px. The development hot-reload server does not provide a reliable offline hydration path; run `npm run build` before `npm run test:e2e`.

D5 physical Android check (2026-10-08): on an Android 9 JKM-LX2, the public Amaka cut plan rendered in Pidgin at a 360 px CSS viewport with no horizontal overflow. Airplane-mode navigation and reload reopened its saved plan; Done queued offline and synced after reconnect, clearing the queue. The first network-toggle attempt briefly showed Chrome's no-internet page, followed by successful controlled offline navigation/reload. The maintainer heard the session read-aloud. Demo Reset cleared the device's learner page cache and returned Amaka to intake while preserving the AI cache. The original phone accessibility service and network settings were restored. See the [phone record](plans/d5-phone-check.md).

## Accessibility

- Tap targets at least 44 px, visible focus, every input labelled, WCAG AA contrast.
- Colour is never the only signal: risk bands also show the word.
- Android spot check: TalkBack launched and the maintainer heard speech. ADB touch injection did not establish a full TalkBack gesture traversal; the maintainer asked to skip the remaining traversal on 2026-10-08. Keep semantic labels and visible focus in the D6 whole-product review.

## States

Every async action shows loading and error states, and every error offers a retry.

D5 route pass (2026-10-08): the shared shell now has a lightweight loading state, an unexpected-error boundary with retry and a home link, and a not-found page for invalid learner/route URLs. Their copy follows the layout's English or Pidgin language without an extra data request; the error page never renders exception details. Reduced-motion users see a still progress rule. At 375 px, the invalid learner page rendered in both languages without overflow. An unavailable local loopback database triggered the advisor error boundary with its retry and home controls. Existing in-page mutations and advisor empty lists retain their own states. Human Pidgin review remains open.

## Performance budget

Chrome's Slow 4G profile stays usable. Lighthouse on mobile: performance 80+, accessibility 90+.

## Tests

- `tests/i18n.test.ts`: every key in `en.json` exists in `pcm.json`, and the reverse.
- Verify landing-cookie versus student-language behavior, offline language switching/sync, privacy-panel parity, hidden numeric score and goal/context excluded from advisor views, both read-aloud views, deletion clearing snapshots/queues/cached pages, same-day reversal and earlier-session locking. The learner's own goal remains visible. Delayed-sync and same-day re-plan cases need the pending decisions first.
- `tests/e2e/demo.spec.ts` (local production build, `DEMO_MODE=true`): Start demo; Amaka's plan has `data-status="cut"` and shows in Pidgin; switch to English; reopen offline, switch to Pidgin and mark tonight's session done; +3 simulated days while offline; reconnect, see late sync and the change summary; Tunde shows the infeasible message and ranks first for advisors; delete Amaka's data and confirm her device copy is gone; Reset. Assert structure, never AI wording.

Test ids: `start-demo`, `build-plan`, `plan-status` (with `data-status`), `language-switch`, `session-done`, `offline-note`, `clock-plus-3`, `clock-toggle`, `change-summary`, `infeasible-message`, `advisor-row`.
