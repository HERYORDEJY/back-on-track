# D5 offline learner flow

Started 2026-10-07. This task implements the offline learner behavior in [the D5 build plan](../PLANS.md), [frontend guide](../FRONTEND.md), [data spec](../specs/data.md) and [demo path](../PRODUCT_SENSE.md). The maintainer deferred the whole-project UI overhaul to a separate D6 milestone; this task keeps existing screen structure and style.

## Outcome

After a successful online plan visit on a basic phone, that learner can reopen the plan in airplane mode, read both languages, mark today's session Done or Missed, and see a clear saved-on-phone/pending state. On reconnection the app replays queued check-ins and language edits, refreshes the plan, and keeps visible retry/conflict feedback instead of silently losing an action. Delete my data and demo Reset clear relevant saved data and cached learner pages. No `/api` response enters the service-worker cache.

## Build order

1. Extend `lib/offline.ts` with versioned per-learner snapshots and an ordered mutation queue. Validate data on read, wrap storage operations in `try/catch`, coalesce unsent reversals of the same session, preserve unrelated learners, and expose explicit cleanup for Delete my data and full demo Reset. Write focused storage/queue tests before integration.
2. Add a small service worker and registration. Cache successful same-origin learner navigations and required static assets after first load; use network first for learner pages, cached HTML on failure, and never cache API requests. Registration failure must leave the online app usable. Test cache boundaries with a lightweight worker harness.
3. Make the learner plan use a saved snapshot when offline, with a bilingual saved-on-phone note and queued check-in state. Keep the server-rendered online path intact. Queue check-ins and learner language edits when offline; on network errors, avoid duplicate submissions by reconciling before retry. Replay on `online`, refresh after success and keep failed mutations visible.
4. The maintainer chose late replay on 2026-10-07. Allow only a queued check-in whose original date matches a session in the still-current plan, keep ordinary earlier-session edits locked, stamp it with simulated time at sync and show a late-sync note. Keep a superseded-plan conflict in the queue with visible feedback.
5. Verify the demo path locally in a browser: online first load, airplane-mode reopen, Done, reconnect/sync, +3-day re-plan, language change, reset and deletion. Check 375 px and 1280 px without doing the deferred visual overhaul. Run `npm run check` and production build before committing.

## Boundaries

- Store only the active learner's plan snapshot and queued app actions under their existing storage prefix. Published course titles remain English; localized plan text stays in both languages.
- Simulated time is assigned when a queued check-in syncs, per the data spec. Never infer the simulated date from the device clock.
- The service worker never caches API routes or advisor pages. The learner snapshot and cache are deleted for that learner by Delete my data; demo Reset clears all demo learner snapshots and queues on the current device.
- Production AI warming is a separate D5 task and waits for the maintainer's spending limit. The maintainer approved a pinned `@playwright/test` development dependency and its browser runtime for the local offline/demo test; no schema change is planned.

## Result

The production-mode local Playwright path passed on 2026-10-07: online build and English switch, offline reopen at 375 px, queued Pidgin switch and Done check-in, delayed sync after a three-day clock jump, change summary, Tunde's infeasible/advisor path, Amaka device-copy deletion and demo Reset. The 230-test unit suite, `npm run check` and production build passed. The development hot-reload server did not hydrate reliably on an offline reload, so the e2e test runs against a production build. Physical Android/airplane-mode testing remains in the parent D5 milestone.

D5 follow-up (2026-10-08): the original Playwright run used `.env`'s Production database and its Amaka Delete my data step removed her owned AI cache. The [isolation fix](d5-e2e-isolation.md) requires a named local test database and serial test workers. Three repeated local browser paths now pass without mutating Production. Public cache restoration remains in the parent D5 work.
