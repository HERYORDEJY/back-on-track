# D1: atomic demo reset

Plan prepared before implementation on 2026-10-05. The maintainer approved services importing pure `prisma/course.ts` and `prisma/personas.ts` definitions; runner, loader and cohort imports remain forbidden.

1. Record and enforce this narrow layer allowance, with allowed and rejected import tests.
2. Add `resetDemo()` using one transaction and the same clock-row lock as forward jumps. Restore the three fresh persona definitions and their exact academic seed records; remove their plans (cascading items/sessions/reminders), clear all outreach, and restore the demo clock. Preserve cohort study data and AiCache. Missing clock or course data must fail atomically.
3. Add a no-store POST endpoint accepting an empty body or strict empty object, with generic retryable errors and contract tests. Add a bilingual header Reset button with loading/error/retry states and refresh after success. Start demo/navigation follow when their destination pages exist; do not introduce dead links.
4. Verify the real transaction using temporary persona plans/events, altered persona attributes, and outreach. Compare all cohort study rows and cache before/after, verify exact seed restoration and two identical resets. No schema or dependency change and no migration reset.
5. Run the required checks and production build; update affected docs, status and Codex log in this task's commit. D1 remains in progress until navigation, public runtime and interactive checks are complete.

Offline snapshots/queues do not exist yet. Their reset integration must be added with the offline feature before the demo freeze, so stale local data cannot overwrite restored personas.

Verification completed: 137 tests and required checks pass; production build includes the reset route. Neon restoration/retention and repeated resets pass. Local browser controls complete and show disabled/loading states; English/Pidgin persist after reload and both 375/1280 px layouts have no horizontal overflow. Production runtime remains pending DATABASE_URL configuration.
