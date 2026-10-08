# D6 whole-project UI overhaul

Started 2026-10-08. The working design instruction and nine visual frames stay in
[`docs/D6-UI-Overhaul-Task-Documentation/`](../D6-UI-Overhaul-Task-Documentation/)
through implementation. Move them to their final locations only after all D6
work and checks are complete, as the maintainer requested. Keep the original
application implementation available through Git history and the ten baseline
screenshots in the same working documentation directory.

## Sequence

Follow the phases and exit checks in the [staged design instruction](../D6-UI-Overhaul-Task-Documentation/DESIGN.md), one commit per phase:

1. Capture the ten original views at 375 x 812 and 1280 x 800 with device scale 1.
   Record the visual-pattern inventory and verify `npm run check`.
2. Apply the palette, type, focus, primitive controls and light-only viewport.
3. Add reusable line, stop, mini line, time, meter, signal, night, notice and
   demo-bar blocks, plus pure view-model helpers and tests.
4. Rebuild landing, intake, plan, infeasible and offline states. Keep both
   languages, every existing test id and the offline snapshot complete. Run the
   local demo test, capture learner views at both sizes, then pause for the
   review required by the design instruction.
5. Rebuild the English advisor list, filters and drawer at phone and wide sizes.
6. Add the design guard test, update the clock-toggle browser path, compare ten
   after views with the baseline, run mobile Lighthouse and the full checks.
   Reconcile routed docs, then move the supplied files to their final locations.

No new dependency, schema, route contract, AI, risk or plan arithmetic change is
part of this task. Use the isolated `back_on_track_e2e` database and
`DEMO_MODE=true` for browser verification. Keep the D5 human Pidgin copy pass
deferred; new D6 Pidgin strings are draft copy for that review.

## Phase 0 evidence

The ten screenshots are in the staged design directory's `design/before/` folder.
`node scripts/d6-capture.mjs before` resets the isolated demo and captures the
landing, intake, Amaka plan, Tunde can't-catch-up view and advisor with Tunde
open at both sizes. Each image has the requested viewport dimensions.

Inventory of current `app/` and `components/` source: 1 `box-shadow`; 0 shadow
utilities; 0 gradient utilities; 2 CSS radii above 8 px; 0 Lucide imports;
6 default-palette colour utilities; 135 hex-colour occurrences; 1 uppercase
label and 1 other tracked label; 0 uses of shadcn Card, Badge, Alert, Skeleton
or toast.

## Phase 1 evidence

The nine palette tokens and shadcn mapping now live in `app/globals.css` and
Tailwind's inline theme. The root viewport fixes light color scheme and the
night theme colour. Base text uses the system stack and lining numerals;
controls use the new 8 px plates, 2 px borders and 3 px focus outline.
`Button` now exposes only `now`, `plain` and `text` variants. Existing pages
retain their layouts while their colours, button variants and form fields move
to the new palette. The current page-turn and old section structures are
replaced in later phases, as the design instruction specifies.

`npm run check` passed 241 tests, the production build succeeded, and both
isolated local browser demo tests passed. Phone and wide screenshots were
inspected against the Phase 0 images; the final after screenshots will be
captured again once the full overhaul is complete.
