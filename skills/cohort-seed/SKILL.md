---
name: cohort-seed
description: Generate reproducible simulated Back on Track cohorts with dated academic events and engine-backed recovery plans. Use for cohort fixtures or an explicitly requested demo reseed in this repository.
---

Use the maintained generator in [prisma/cohort.ts](../../prisma/cohort.ts); do not recreate it in a one-off script. Read [AGENTS.md](../../AGENTS.md), [data rules](../../docs/specs/data.md) and [engine rules](../../docs/specs/engine.md) before changing fixtures.

Call `await generateCohort({ seed, count, shares })` in memory first. Defaults are 300 students, seed `back-on-track-2026`, and shares `on_track: 0.6`, `drifting: 0.2`, `recovering: 0.1`, `gone_quiet: 0.1`. Shares sum to one; count stays within the fixed unique name pool. Noninteger allocations use largest remainders, with stable segment order breaking ties. A different seed or mix is a fixture experiment; preserve the approved default demo and personas unless the user asks to change them.

Run `npm test -- tests/cohort.test.ts` and `npm run check`. Verify identical input gives identical dated rows/ids, unique simulated names, intended mix, future events ignored as of earlier now, and recovering Progress corresponds to a checked-done final piece of an actual null-triage engine plan built at 9 October 2026 18:00 Lagos. No live AI, network randomness or global Math.random replacement belongs in generation.

For database loading, inspect the complete seed runner and its target environment first. Run `npm run db:seed` only within an explicitly requested reseed or the already-authorized initial project seed. It clears academic/application data, retains AiCache and restores the demo clock. Never substitute a partial cohort, run migrate reset, print connection strings or infer permission to alter another environment. Use the seed verification script once available to compare logical rows across two runs and check cache retention.
