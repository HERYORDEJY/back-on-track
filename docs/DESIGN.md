# Design: the line

How Back on Track looks, and the task that gets it there. What each screen does (behaviour, offline, languages, tests) stays in `FRONTEND.md`. Where the two files disagree about how something looks or where it sits, this file wins and `FRONTEND.md` gets corrected (see "Doc updates").

This instruction, its reference and the before/after captures are in their final `docs/` locations after the completed D6 implementation.

Reference frames: [design/reference.html](design/reference.html). Open it in a browser and look at all nine frames before changing anything. This file names them by id (`#f-plan`, `#f-advisor` and so on). If the reference and this file differ, this file wins. The golden rules in `AGENTS.md` outrank both.

## Why

The first build uses shadcn's defaults, so it looks like any other app built with them: pale and generic, with nothing drawn from this product. Most other capstone entries will share that look. From here on, the look comes from the product's own idea.

## The idea

Back on Track is drawn as a line. Every student has one line from Week 1 to the exam, and every study session is a stop on it. Falling behind, tonight's session, a missed day and a deadline are all positions on that line.

The shapes come from rail wayfinding: a line, stops, sign plates, a service notice. Wayfinding is built to be read in one glance by tired people in a hurry, which describes our student at 10 p.m.

Six rules decide everything else:

1. **Draw the line from real data.** Stops, fills and positions come from sessions, progress and dates. Nothing on a line is decoration.
2. **Yellow means now.** `lamp` marks what is current or next: tonight's session, the course's current week, the plan that fits, the student to call first, and the one next action on a screen. Nothing else is yellow.
3. **Night holds one message.** The plan screen and the can't-catch-up screen each have exactly one `night` block, holding what matters most right now. No other screen has a large dark area.
4. **Shape carries state, words confirm it.** Filled, ringed, dashed and barred shapes each mean one thing, and each has a text label. Colour is never the only signal.
5. **Dashed means demo equipment.** The clock, the simulated-data label and anything else that exists only for the demo has a dashed outline on `mist`. Product controls never do.
6. **Nothing is downloaded for looks.** System fonts, CSS shapes, no image files. The tab icon is the only image in the app.

The metaphor lives in the shapes only. Never use rail words in copy ("station", "ticket", "platform", "journey") and never draw a train.

## Tokens

Define these as CSS custom properties in `app/globals.css` and expose them to Tailwind the way this repo's Tailwind version does it. Use no colour outside this table.

| Token | Hex | Use | Contrast |
| --- | --- | --- | --- |
| `paper` | `#FFFFFF` | Page and control backgrounds | |
| `night` | `#0F1F4D` | All text, borders, the travelled line, the night block | 15.9:1 on paper |
| `lamp` | `#FFC72C` | "Now" (rule 2). Always carries `night` text or a `night` outline | night on lamp 10.2:1 |
| `lamp-wash` | `#FFEDB8` | Only the week column behind the landing lines | slate on it 6.3:1 |
| `rail` | `#A9B3CC` | Line not yet travelled; 1 px rules between rows | Supporting only, never the sole signal |
| `slate` | `#49557A` | Secondary text, missed and rest marks, demo outlines | 7.3:1 on paper, 6.5:1 on mist |
| `mist` | `#EEF1F8` | Demo bar, selected advisor row, disabled controls | |
| `night-soft` | `#D5DCF2` | Secondary text on night | 11.6:1 on night |
| `error` | `#B3261E` | Form and system errors only. Never for missed sessions, priority or anything about a student | 6.5:1 on paper |

Map shadcn's variables so any primitive left untouched stays on palette:

| shadcn variable | Token |
| --- | --- |
| `background`, `card`, `popover`, `primary-foreground` | `paper` |
| `foreground`, `card-foreground`, `popover-foreground`, `primary`, `secondary-foreground`, `accent-foreground`, `input`, `ring` | `night` |
| `secondary`, `muted`, `accent` | `mist` |
| `muted-foreground` | `slate` |
| `destructive` | `error` |
| `border` | `rail` |
| `radius` | 8 px |

Delete the `.dark` block. In the root layout's `viewport` export set `colorScheme: "light"` and `themeColor: "#0F1F4D"`.

### Type

One family, the system stack: `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif`. Weights 400, 700 and 800 only. Sentence case everywhere. Everything is left-aligned except button labels and the day cells in the intake. Put `font-variant-numeric: tabular-nums lining-nums` on every duration, date and count. No text below 14 px.

| Role | Size / line height (px) | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| figure | 68 / 68 | 800 | -0.035em | The minutes in the night block; the unit at 0.4em |
| display | 34 / 36. Wide: 54 / 55 on the landing, 40 / 42 on intake and advisor | 800 | -0.02em (-0.03em at 54) | One per screen |
| say | 23 / 28 | 800 | -0.015em | A sentence in the night block |
| heading | 21 / 25 | 800 | -0.01em | Section headings |
| name | 19 / 23 | 800 | -0.01em | Person names, the goal |
| subheading | 17 / 22 | 800 | 0 | Group heads, drawer parts |
| body | 16 / 24; a lede is 17 to 19 px at 1.45 | 400; 700 for emphasis | 0 | |
| detail | 14 / 20 | 400 | 0 | Secondary lines, in `slate` |

### Shape and space

| Thing | Value |
| --- | --- |
| Plates: buttons, inputs, notices, panels, and the night block from 600 px up | Radius 8 px; 2 px `night` border (the night block has none) |
| Flags, tags, the checkbox | Radius 4 px |
| Stops, chips, signal dots | Circle or full pill |
| Night block below 600 px | Full bleed, radius 0 |
| Rules | 1 px `rail` between ordinary rows; separated advisor rows each have their own `rail` outline; 2 px `night` to open a group or a table |
| Demo equipment | 2 px dashed `slate` |
| Tap targets | 44 px minimum; primary buttons 48 px tall |
| Spacing | 4 px steps; gutter 16 px (40 px wide); 28 px between blocks |
| Focus | 3 px `night` outline, 3 px offset; `lamp` inside the night block |
| Shadows, blur, decorative gradients | None. Three CSS patterns are allowed, in `app/globals.css` only: the hatched "course as written" bar, the dashed gap segment and the deadline ring |

Breakpoints: below 600 px is "phone"; 600 to 1023 px is one centred 600 px column; 1024 px and up is "wide".

## Building blocks

Build each block once in `components/shared` and use it everywhere. Port the reference CSS for the line, stops, mini line, time bars, meter and travel loader into `app/globals.css` under `@layer components` with the same class names; write the rest as Tailwind utilities. The reference uses container queries only so its frames can sit side by side; the app uses the breakpoints above.

| Block | Reference class | Rules |
| --- | --- | --- |
| Demo bar | `.demo` | First thing on every page. Holds "Simulated data", the simulated date and week, and the clock controls. Below 1024 px the controls sit behind a "Clock" toggle with `aria-expanded`; from 1024 px they are inline. `SimulatedBadge` and `ClockControl` now live inside it |
| Mark | `.mark` | A short line ending in a lamp stop, then "Back on Track". Links to `/` |
| Language switch | `.lang` | A two-part plate; the chosen language is filled `night` |
| Button | `.btn` | `now` (lamp: the next primary action), `plain` (paper plate), `text` (underlined navigation), and `quiet` (unadorned secondary action without link styling). Heights 48 and 44 px. Disabled: `mist` fill, `rail` border, `slate` label. Reuse `components/ui/button.tsx` |
| Field | `.input`, `.check`, `.days` | 2 px `night` border, 48 px tall, 16 px text. Label above in 800, hint below in `slate`. Error: `error` border plus a bold `error` message linked with `aria-describedby` |
| Notice | `.notice` | An outlined plate for anything the plan tells the student: a deadline warning, "plan updated", "update your hours". Bold first sentence, then the detail. `notice--error` is for failures only and carries a "Try again" button |
| Flag, tag, chip | `.stop__flag`, `.board__first`, `.chip` | The "Tonight" flag and the "Call first" tag are lamp with `night` text. The chip (outlined pill with a ring) is for device state: "Saved on this phone" |
| Night block | `.night` | Rule 3. States below |
| Line and stops | `.line`, `.stop` | States and contents below |
| Mini line | `.mini` | A whole course in one short line: `night` fill to the last week fully done, a ring at that point, a lamp tick at the course's current week, a bar at the exam. Give it a text equivalent: `role="img"` with an `aria-label`, or visible text beside it |
| Time bars | `.time` | Up to three bars on one scale, the largest value at full width: the course as written (hatched `slate`), the time you have (`night`), this plan (lamp with a `night` outline). The value sits in text beside each bar |
| Meter | `.meter` | What happened to a topic: full, 70%, 50% or empty |
| Signal | `.signal` | Call priority: three dots, filled 3, 2 or 1 for high, medium or low, always followed by the word |
| Travel and BusyOverlay | `.travel`, `.busy-overlay` | The shared animated stop is a separate child centered above its action description in a light, whole-screen modal overlay for major requests. BusyOverlay sets its critical vertical layout and track size in the component so the order holds during a language refresh before CSS finishes applying. The page stays visible under an 18% night tint but cannot receive pointer or keyboard actions until the request settles. Advisor Copy also shows this overlay while clipboard work is pending and then gives inline success/error feedback |

The tab icon, `app/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0F1F4D"/><path d="M5 16h11" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="21" cy="16" r="6" fill="#FFC72C" stroke="#fff" stroke-width="3"/></svg>
```

### Stops

| Stop | Marker | Text |
| --- | --- | --- |
| Planned session | 18 px ring | Date in 700, minutes, topics on the next line |
| Tonight: today's session, not yet checked in | 28 px lamp disc with a `night` border | The same, plus the "Tonight" flag |
| Done | `night` disc with a white tick | The same, plus "Done" at the right in `slate` |
| Missed | 3 px dashed `slate` ring | Date and minutes in `slate`, "Missed" at the right. No topics. No red |
| Coursework due | 24 px ring with a centre dot | Date, then "{assessment} due, {weight}% of your grade" |
| Day with no study time | A short `slate` tick beside the line | "{date}, no study time" in `slate` |
| Collapsed sessions | Dashed segment, no marker | "{n} more sessions" in `slate` |
| Final exam | 28 x 8 px `night` bar | Date, "Final exam" |

Segments between stops are `night` behind today and `rail` ahead.

What goes on the line, in date order:

1. **Past.** Each date from Monday of the current week to yesterday that had a planned session, shown as done or missed. Take the session from the plan version that was current on that date (the highest version built on or before it).
2. **Window.** Today and the next 6 days, from the current plan: a stop for each session and a rest tick for each day the student gave 0 minutes.
3. **Tail.** "{n} more sessions" if any fall before the next row; the next coursework stop; "{n} more sessions" for what is left; the exam. A coursework date inside the window sits there instead, after that day's session.

Markup is an `<ol>` with one `<li>` per row. Markers are `aria-hidden`; the state is in the text.

Motion: when a plan version first renders, its stops fade in from top to bottom (300 ms each, 45 ms apart, the delay capped at 600 ms). Key the list by plan version so it replays after a re-plan. Besides this, only the travel loader and a 1 px press on buttons move. Under `prefers-reduced-motion: reduce` nothing moves.

### Night block states

| State | Label | Content | Actions |
| --- | --- | --- | --- |
| Session pending today | Tonight | Figure "{minutes} min"; "Starting with {topic}" | `now` Done, `plain` Missed |
| Checked in as done | Tonight | Figure "Done"; "Next: {date}, {minutes} min" | `text` Change to missed |
| Checked in as missed | Tonight | Say "Marked as missed. Your plan will make room for this from tomorrow." | `text` Change to done |
| No session today | Today | Say "No study time today."; "Next: {date}, {minutes} min, starting with {topic}" | None |
| Can't catch up | None | The plan summary: its first sentence as say, the rest as body | Listen only |

Figures and the word "Done" are `lamp`; other text is `paper`, with `night-soft` for secondary words. Listen (the `ReadAloud` component) is a `text` button at the top right of the block, or under the text on the can't-catch-up screen.

## Screens

Every page starts with the demo bar, then a header with the mark on the left. Learner pages and the landing reserve the language switch for after the Pidgin review; the 2026-10-13 English-only pause hides it. The advisor page has a `text` link "Student view" to `/`.

### Landing (`#f-landing`, `#f-landing-w`)

1. Display line, then the lede.
2. `now` button "Start demo" and `text` link "Advisor view".
3. The people: a lamp flag "The course is at Week {week}" above a `lamp-wash` column at the course's current week, then one row per persona with the name, the one-line situation, a mini line, "Done through Week {n}" (or "Not started yet") and "Open plan". The whole row is one link.

Wide: two columns, the text on the left (5 parts) and the people on the right (6 parts). The flag must stay inside its container at every week from 1 to 12.

### Intake (`#f-intake`)

1. Display "Let's get you back on track.", then the lede.
2. "Minutes you can study each day": seven day cells in one row, each a day label above a centred number input (`inputmode="numeric"`). Below, the weekly total, updated as the student types. Then "Or set every day to" with `plain` 44 px buttons for 20, 40, 60 and 90 min.
3. Checkbox "My hours change every week". When ticked, the seven cells become one field, "Minutes on a typical day".
4. "Your goal" (optional, 80 characters) with its hint. "Anything else we should know" (optional, 120 characters).
5. A full-width `now` button, "Get me back on track".

While the plan builds: the button is disabled and reads "Building your plan", with the travel loader under it. After 8 seconds add "Still working. This can take up to 20 seconds." On failure: an error notice with "Try again"; the inputs keep their values. Wide: one 600 px column aligned to the left gutter.

### Plan (`#f-plan`, `#f-plan-w`, `#f-replan`)

Top to bottom. This order replaces the list in `FRONTEND.md`.

1. Only when they apply: the "Saved on this phone" chip (offline), the "plan updated" notice (after a re-plan), the "update your hours" notice.
2. The goal: "Your goal" as detail, the goal as name. Omit when empty.
3. The night block.
4. "Your time before the exam": the plan summary, then the time bars.
5. "Your week": the line.
6. Deadline warnings, each a notice.
7. "What's in your plan, and why": native `<details>` groups put actionable work (Kept in full and Shortened) before Skipped. The actionable group with the earliest scheduled topic appears first; both open. Skipped is last and closed. Topics within each actionable group follow their first scheduled session. A group head has a meter, the name and the count. A topic has its name in 700, "{minutes} of {estimate} min" at the right, the rationale, then the basis as detail with a 3 px `rail` rule on its left. Omit empty groups.
8. "What your advisor sees": an outlined panel with the signal and "{Level} priority for a call", then the reasons and "Last active {when}" as a dash list.
9. A `text` button, "Delete my data". Its confirmation is a dialog plate (paper, 2 px `night` border, no shadow) with `plain` "Delete my data" and `text` "Cancel".

The separate reminders panel goes: the night block and the line already show every reminder. The kept, shortened and skipped counts now live in the group heads.

Wide: two columns. Left, 400 px and sticky: items 1 to 4. Right, up to 620 px: items 5 to 9, with the line capped at 540 px.

Keep `data-testid="plan-status"` and its `data-status` on the element that wraps the plan.

### Can't catch up (`#f-cant`)

The plan screen with these differences:

- The night block holds the summary (last row of the states table) and keeps `data-testid="infeasible-message"`.
- The time bars have two rows, the course as written and the time you have. There is no lamp bar, because no plan fits.
- The line's heading is "Until {assessment}". Tonight's stop carries the Done and Missed buttons. Its tail is: "{n} more sessions", the coursework stop, "Won't fit before {date}: {n} topics" (a dashed segment with `night` text), the exam.
- "What's in your plan, and why" has two groups: "In this plan" (open) and "Won't fit before {date}" (closed).
- "About a study break" follows, with the placeholder wording until the process is confirmed (see `PLANS.md`).
- The word "infeasible" never appears.

### Advisor (`#f-advisor`)

English only.

1. Display "Who to call this week", then the adherence sentence from `specs/risk.md` as the lede.
2. Filter plates: Everyone, High, Medium, Low, each with its count. The current one is filled `night`.
3. The table, with a 2 px `night` rule under the header and a 12 px vertical gutter between individually outlined rows:

| Column | Content |
| --- | --- |
| Student | The name in 800, linking to the drawer (the whole row is clickable too); "Last active {when}" as detail; the "Call first" tag on escalated students |
| Where they are | A mini line; "Week {n} of 12", plus ", on a catch-up plan" when they have one |
| Priority | The signal and the word |
| Reasons | The top two reasons, or "No current call-priority concerns" |

There is no score column and no status colour. Priority uses the shared signal and a weight/line shape; plan status has its own outlined marker. The selected row is `mist` with a 6 px `night` bar on its left edge.

4. The drawer: up to 590 px wide with a 2 px `night` left border and a pale, noninteractive scrim. It opens immediately with the selected row's name, signal, last activity, plan status and bulleted priority reasons, while an inline Travel state precedes the slower outreach, missed-session and activity data. Failed detail reads offer Retry in the drawer. The rest holds editable outreach, Copy, Mark contacted and the weekly draft count, plus dated activity including the latest saved outreach note. Escape and scrim clicks do not close it. Opening from any row preserves the list's scroll position. The close button hides it and updates the URL immediately; selecting the same learner reopens it. Filter and Next/Previous navigation show the shared loading state. After Mark contacted, offer "Draft another message" until the two-per-learner weekly limit is reached. The draft creation date is labelled as such because contact time is not stored yet.

Write "they" for students; the app holds no gender. An empty filter shows "No students at this priority." Below 768 px each row stacks its cells; nothing more is needed at that width. Keep `data-testid="advisor-row"` on each row.

## Never

- Shadows, blur, glass, or gradients beyond the three patterns.
- A colour outside the tokens, including Tailwind's default palette.
- A radius above 8 px on anything but a circle, a pill or a bar.
- A card around a section, or a card inside a card. Sections are separated by space and rules.
- Decorative icons, emoji, illustrations, avatars or initials in circles. The only glyphs are CSS shapes: the tick, the chevron on a group, the marks in this file.
- All-caps text, letter-spaced labels, a small label above every heading, monospace or serif type.
- Centred body text.
- Spinners, skeleton shimmer, or toasts for results the screen itself shows.
- Hover-only information.
- Yellow for anything but "now". Red or green for anything about a student.
- More than one night block on a screen.
- New dependencies.

## Guardrails

- Keep plan arithmetic, risk thresholds, AI prompt behaviour and the Prisma schema unchanged. The maintainer's feedback authorizes singular/plural warning selection, plain-time risk reason parameters and a 429 outreach draft limit using the existing Outreach rows.
- The only logic allowed is in "Data the screens need": pure, tested helpers and read-only view-model fields.
- Every string comes from the message files, in both languages.
- Keep every existing `data-testid`. Add `clock-toggle` to the demo bar's toggle.
- Radix primitives stay where they provide behaviour (the delete dialog, the drawer on narrow screens). Replace every use of shadcn's Card, Badge, Alert, Skeleton and toast with the blocks above.
- The offline snapshot stores everything the plan screen now renders, so the offline plan looks the same as the online one.

## Data the screens need

Read-only additions. Pure helpers go in `lib/engine` with unit tests; services put the results into the view models. No schema change and no new route.

| For | Field | Definition |
| --- | --- | --- |
| Landing rows, advisor rows | `doneThroughWeek` | The highest week w for which every topic in weeks 1 to w is done as of now; 0 if none |
| Mini line | Positions | Fill and ring at `doneThroughWeek / totalWeeks`; the lamp tick at `(week - 1) / totalWeeks`; clamp both so the markers stay inside the line |
| Time bars | `requiredMin`, `capacityMin`, `plannedMin` | The first two are stored on the plan; `plannedMin` is the sum of the plan's item minutes. A bar's width is its value over the largest value shown |
| The line | `stops` | The list defined under "Stops", built by one pure helper from the student's plans, sessions, availability, assessments and `now` |
| Topic groups | Items grouped by action, with counts | From the current plan's items |
| Advisor rows | `hasCurrentPlan`, `escalated`, `lastActive` | Existing data |

Add `formatDuration(minutes, language)` to `lib/i18n.ts`: under 60 minutes "40 min"; whole hours "36 h"; otherwise "29 h 40 min".

## Copy

The reference frames show the English copy in place, and the tables above give the templates. Strings stay in the message files:

- Reuse an existing key where one already says the same thing.
- Add every new key to both message files, draft the Pidgin, and list each new Pidgin string under "Pidgin strings to check" in `PLANS.md` for a human to confirm.
- Where a count can be 1, use separate keys for one and many: "1 more session" and "{n} more sessions", "1 topic" and "{n} topics".
- Format durations with `formatDuration` and dates with `formatDate`.

Strings that appear in no frame:

| Where | English |
| --- | --- |
| Landing, a persona with no week fully done | Not started yet |
| Intake, after 8 seconds of building | Still working. This can take up to 20 seconds. |
| Night block, when the language is Pidgin | Listen in English |
| Delete dialog | Cancel |
| Can't catch up, the first topic group | In this plan |
| Advisor drawer below 1200 px | Back to the list |
| Advisor, a filter with no students | No students at this priority. |

## Rollout

Work in this order: one commit per phase, `npm run check` green before each, commit rules as in `AGENTS.md`. If a screen isn't built yet, skip its step and build it to this design when its day comes.

### Phase 0: baseline

- With a seeded database and `DEMO_MODE=true`, walk the demo path and save a screenshot at each of these points, at 375 x 812 and at 1280 x 800, into `docs/design/before/`: the landing, the intake, Amaka's plan, Tunde's can't-catch-up screen, the advisor page with Tunde open. Use Playwright at a device scale of 1.
- In the task summary, count what is about to go: shadows, gradient utilities, radii above 8 px, `lucide-react` imports outside `components/ui`, default-palette colour classes, hex colours, uppercase or tracked labels, and uses of Card, Badge, Alert, Skeleton and toast.

Exit: ten "before" images are committed.

### Phase 1: tokens and primitives

- Tokens, the shadcn mapping, no `.dark` block, the `viewport` export.
- Base styles on `body`: the font stack, `night` on `paper`, lining numerals, the focus ring.
- Button variants; input, checkbox, select, textarea and dialog restyled.

Exit: every screen has moved to the palette and the new buttons and fields. No layout has changed.

### Phase 2: building blocks

- The blocks in `components/shared`, with the ported CSS in `app/globals.css`.
- `app/icon.svg`.
- The helpers and their unit tests: `doneThroughWeek`, the stops builder, `formatDuration`.

Exit: the helpers are tested and the demo bar and mark are in the root layout.

### Phase 3: learner screens

- Landing, intake, plan, can't catch up, at phone and wide sizes.
- The offline snapshot holds the new fields.
- Message keys in both files; the Pidgin review list in `PLANS.md`.

Exit: the four screens match their frames in English and Pidgin, and the e2e demo test passes. The maintainer reviewed the learner screens through detailed feedback and authorized continuing into the advisor phase, superseding the earlier stop instruction.

### Phase 4: advisor

- The list, the filter and the drawer.

Exit: the page matches `#f-advisor` at 1280 px; the filter and the drawer work; the e2e demo test passes.

### Phase 5: prove it

- Add `tests/design.test.ts` (rules under "Done means").
- Update the e2e demo test for the clock toggle.
- Run Lighthouse on mobile for the plan page.
- Save "after" screenshots of the same ten views into `docs/design/after/`.
- Make the doc updates below.

Exit: everything under "Done means" is ticked.

### If time runs short

Cut from the top:

1. The wide two-column layouts for the landing and the plan (keep the single column).
2. The line-draw motion and the rest-day ticks.
3. Past stops from earlier plan versions (start the line at today).
4. Mini lines in advisor rows (keep "Week {n} of 12").

Never cut: the tokens, the night block, the line with its stop states, the time bars, the demo bar, `tests/design.test.ts`.

## Done means

- [x] Each screen matches its reference frames, with the maintainer's later feedback applied.
- [x] `tests/design.test.ts` passes. It reads every `.ts` and `.tsx` file under `app/` and `components/` and fails on: a `shadow` utility other than `shadow-none`; `bg-gradient-`; `backdrop-`; `blur-`; `rounded-xl`, `rounded-2xl` or `rounded-3xl`; `uppercase`; `tracking-wide`, `tracking-wider` or `tracking-widest`; `font-mono` or `font-serif`; a default-palette colour utility (such as `text-gray-500` or `bg-blue-600`); a hex colour (the `themeColor` in the root layout is the one exception); a `lucide-react` import outside `components/ui`. It also checks that `app/globals.css` has no `box-shadow` and exactly three `gradient(` uses.
- [x] Learner pages request no font files and no images except `icon.svg`.
- [x] Lighthouse on mobile for the plan page: 98 performance and 100 accessibility.
- [x] Every visible interactive element is at least 44 x 44 px on a 360 px wide screen and shows the focus ring from the keyboard.
- [x] Every stop, bar, meter, signal and mini line has a text equivalent.
- [x] With reduced motion on, nothing animates.
- [x] The plan looks the same offline as online.
- [x] `npm run check` is green and the e2e demo test passes.
- [x] The docs below are updated and `npm run docs:check` passes.

## Doc updates

Make these in the same commits as the work they describe.

- `AGENTS.md`: add a routing row, "Colour, type, spacing, or how any screen or component looks", linking to this staged file during implementation and to docs/DESIGN.md after D6 is complete.
- `FRONTEND.md`: point to this file for how things look. Replace the plan screen's ordered list with a pointer to "Plan" above. Remove the reminders panel. Move `SimulatedBadge` and `ClockControl` into the demo bar and `ReadAloud` into the night block. Describe the advisor rows as in "Advisor" above. Add `clock-toggle` to the test ids and note that the e2e test opens the clock toggle on narrow screens.
- `ARCHITECTURE.md`: add this staged design directory and `app/icon.svg` to the repo layout during implementation; list docs/DESIGN.md and docs/design/ after D6 is complete, along with the new blocks in `components/shared`.
- `PRODUCT_SENSE.md`: in the scope list, in-app reminders are now the night block and the line.
- `PLANS.md`: add a status row, "Visual design (the line)". Add the "Pidgin strings to check" list. Log these decisions: the look is drawn from the product's own idea within the bandwidth rules; the plan screen shows time above the week and groups topics by what happened to them; the reminders panel is folded into the night block and the line; the simulated-data label and the clock share one demo bar.
- `CODEX_LOG.md`: one row per phase.
