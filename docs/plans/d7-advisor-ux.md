# D7 advisor and plan-list refinement

The maintainer requested on 2026-10-14 that every advisor navigation and async action show progress, list rows have visible separation, learner details open from row data before slower fields arrive, reasons have bullets and empty copy, and plan topics put recommended work first.

## Plan before implementation

1. Reproduce missing filter feedback and slow first drawer open in browser tests. Keep a regression for pagination and outreach actions. Add a service-route privacy test for the new detail request.
2. Move priority filters inside the advisor navigation boundary. Open a drawer immediately from the selected row's public name, priority, activity, status and reasons. Fetch private advisor details after opening through a no-store endpoint; show the shared progress line in the drawer, with retry on failure. Retain direct-link and close/reopen behavior.
3. Give advisor rows a vertical gap so each priority rule belongs to one learner. Label the final column "Reasons", use a concise empty state in both row and drawer, and render drawer reasons with visible list markers.
4. Keep the engine's schedule unchanged. Order the learner's actionable topic groups before skipped work and sort topics within each group by first scheduled appearance, with stable topic-id fallback. Test the display order with an intentionally shuffled item fixture.
5. Update the routed UI/design/architecture docs and status log. Run `npm run check`, production build and the isolated local browser demo, then make one D7 commit.

## Decision notes

"Reasons" is a clearer scan label than "Why" or "Reason(s)". A learner with no risk signal gets "No current call-priority concerns" rather than an empty cell. The row supplies only the public fields already visible on the list; outreach and event details load after the drawer opens. The list order and risk thresholds do not change.

## Verification

The browser regression first showed that priority filters lacked the shared wait state and the drawer waited for its full detail read. The new flow displays the row preview before an intentionally delayed 1.2-second detail response, then fills in outreach and history. Browser cases also cover pagination in both directions, row separation, reason bullets and empty copy, clipboard feedback, and actionable plan groups before skipped work. The route test checks input/error behavior and advisor detail privacy; the display unit test shuffles topics to prove first-session ordering.

`npm run check` passed typecheck, lint, 260 tests and docs links. `npm run build` passed. All ten isolated Playwright demo cases passed against the local loopback test database. No dependency, schema, AI prompt, plan arithmetic or risk threshold changed. The existing D6 design captures remain historical; no new image assets were needed.
