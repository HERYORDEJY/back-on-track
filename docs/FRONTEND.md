# Frontend

Screens, copy, languages, offline behaviour and accessibility. Product voice is in `PRODUCT_SENSE.md`; what the engine computes is in `specs/engine.md`.

## Principles

- Mobile first. Check every screen at 375 px and 1280 px wide.
- Light: no images or web fonts on learner screens, system font stack, client components only where interaction needs them.
- Works offline after the first load.
- Learner UI works in English and Nigerian Pidgin; published course and topic titles stay English. Read-aloud covers the plan session/summary and infeasible summary/next step; other screens have screen-reader labels.

## Shared components (`components/shared`)

| Component | Where | Behaviour |
| --- | --- | --- |
| SimulatedBadge | every page | "Simulated data" label, always visible |
| ClockControl | header, every page | Shows the simulated date and week, with +1 day, +3 days, Jump to week (forward only) and Reset (calls demo reset) |
| PersonaSwitcher | landing | The 3 personas with a one-line situation each |
| LanguageSwitch | landing and every learner screen | Landing uses a `lang` cookie, default English. Learner screens use the student's saved language (`PATCH /api/students/[id]`); offline changes use the bilingual snapshot and queue for sync, last write wins |
| ReadAloud | plan and infeasible screens | Reads tonight's session plus plan summary, or infeasible summary plus next step, with `speechSynthesis`; for Pidgin use an English (Nigeria) voice if available, else any English voice; screen-reader labels remain available where speech isn't supported |

After any mutation or clock change, call `router.refresh()`.

## Screens

### Landing (`/`)

PersonaSwitcher, a Start demo button (calls demo reset, then opens Amaka), and a link to the advisor view.

Current D1 shell: both message files, landing-cookie language control, SimulatedBadge and the three approved persona descriptions are implemented. ClockControl now shows the real persisted simulated date/week and provides day/week advances, loading, limit and retry states. After a failed mutation, it refreshes the date before permitting another jump because a lost response does not prove the mutation failed. Reset now calls the atomic demo endpoint with loading/error/retry states; it and clock jumps disable one another during a mutation. As approved on 2026-10-05, learner navigation and Start demo activate with the working D2 screen; the advisor link activates with D4. All remain in scope; the shell shows no invented demo actions. Helpers/key parity, bilingual server rendering and clock API are checked. Browser verification passed at 375 and 1280 px in English/Pidgin with no horizontal overflow; both language choices persisted after reload. The +1 day and Reset controls completed, restored the expected date, and disabled other clock actions while pending. Public verification also passed: +3 days/Reset, both language choices after reload, and 375/1280 px layouts. This is foundation verification; learner/offline/advisor flows remain to build. Pidgin copy still needs the maintainer's human review.

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
- Only today's session can be changed; earlier sessions are locked. Reversing a done check-in to missed removes only the Progress that check-in created. Delayed offline check-ins and same-day re-plan timing remain pending decisions in `PLANS.md`.
- Course facts derived from demo weights, dates and prerequisite links are labelled simulated; source readings are traceable through their links.

Infeasible screen: honest summary, work that fits through the next assessment due date in prerequisite-first priority order, and the rest under "Won't fit before {date}". No session is scheduled after that due date or on/after the exam. Next step: "Your advisor has been told. Ask about an extension or a study break." Read the summary and next step aloud. On the next visit after that date, re-plan for the following assessment; the exam is the next assessment after the final quiz. MIVA's published guidance and its approval/deadline limits are in `RESEARCH.md`; do not promise eligibility or an extension. Never show the word "infeasible".

### Advisor (`/advisor`)

- Header metric from `specs/risk.md`, labelled simulated.
- Band filter through links (`?band=high|medium|low`).
- Rows: name, call-priority band word and colour, top 2 reasons, last active, plan status and escalation. Numeric scores are used only to sort, never displayed.
- Drawer (`?student=<id>`): activity timeline, missed sessions, plan status, escalation, outreach draft in the student's language with the next step in English, Copy and Mark contacted.
- Advisor screens are English only.
- Goal and context never appear in advisor responses or screens. Outreach edits stay in the text box; Copy copies the edited text and Mark contacted saves the final message.

## Languages

Pure engine templates for summaries, rationales, reminders, deadline/change warnings and labelled simulated bases are in both message files, with key/parameter parity checked. They are not yet rendered on learner pages; all new Pidgin copy still needs human review.

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
- Check-ins and language changes made offline go into a queue and replay their respective PATCH requests when the browser fires `online`. Check-ins are stamped with simulated time at sync. The treatment of check-ins from an earlier date is pending in `PLANS.md`; never silently discard a queued mutation.
- Delete my data clears that student's browser snapshot, queued check-ins/language edits and service-worker cached learner pages on this device, as well as the server data listed in `specs/data.md`; an offline reload must not restore deleted input.
- Wrap every `localStorage` call in try/catch; the page must work without it.

## Accessibility

- Tap targets at least 44 px, visible focus, every input labelled, WCAG AA contrast.
- Colour is never the only signal: risk bands also show the word.
- Run TalkBack through the demo path once before the freeze.

## States

Every async action shows loading and error states, and every error offers a retry.

## Performance budget

Chrome's Slow 4G profile stays usable. Lighthouse on mobile: performance 80+, accessibility 90+.

## Tests

- `tests/i18n.test.ts`: every key in `en.json` exists in `pcm.json`, and the reverse.
- Verify landing-cookie versus student-language behavior, offline language switching/sync, privacy-panel parity, hidden numeric score and goal/context excluded from advisor views, both read-aloud views, deletion clearing snapshots/queues/cached pages, same-day reversal and earlier-session locking. The learner's own goal remains visible. Delayed-sync and same-day re-plan cases need the pending decisions first.
- `tests/e2e/demo.spec.ts` (local, `DEMO_MODE=true`): Start demo; Amaka's plan has `data-status="cut"` and shows in Pidgin; switch to English; go offline, mark tonight's session done, see the offline note, go back online; +3 days; the change summary shows; Tunde shows the infeasible message; the first advisor row is Tunde. Assert structure, never AI wording.

Test ids: `start-demo`, `build-plan`, `plan-status` (with `data-status`), `language-switch`, `session-done`, `offline-note`, `clock-plus-3`, `change-summary`, `infeasible-message`, `advisor-row`.
