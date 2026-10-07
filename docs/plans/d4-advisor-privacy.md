# D4 advisor and privacy plan

Started 2026-10-06. The D4 exit is in [the build plan](../PLANS.md); the binding rules are in the [risk spec](../specs/risk.md), [AI spec](../specs/ai.md), [data spec](../specs/data.md) and [frontend guide](../FRONTEND.md).

## Outcome

An advisor can see a simulated, ranked call list, inspect the reasons and activity for one learner, draft an editable outreach note and mark it contacted. A learner can see the same call-priority facts and delete app-collected data. No advisor response contains goal or context, and no numeric score or outreach draft appears on the learner side.

## Build order and ownership

1. **Risk thread, isolated worktree:** implement pure `lib/risk/{config,score,reasons,metric}.ts` and `tests/risk/**`. Keep all thresholds exactly as specified. Take `now` as input, filter future events, expose score only to the service for sorting, and return reason codes with params. Cover every boundary, sorting, cohort mix and Week-10 check.
2. **Advisor thread, isolated worktree:** implement `lib/services/advisor.ts`, `app/advisor/**`, `components/advisor/**`, `app/api/advisor/**` and bilingual message keys. Use one batched data load for the list. Advisor projections explicitly select fields; omit goal and context from both list and detail. Show the metric, filter, list and detail drawer, then draft/edit/Copy/Mark contacted with API validation, loading and retry states. Use the stronger call-list hierarchy in `FRONTEND.md` at 375 and 1280 px. The service consumes risk exports after integration.
3. **Main thread:** integrate both lanes and shared files. Add the landing advisor link, learner "What your advisor sees" panel and Delete my data UI/API/service, shared contracts and tests. The panel consumes the same risk projection as the advisor. Update architecture/spec/docs, run the full checks and verify the demo path in a browser.

Risk/advisor interface: `scoreRisk(input, now)` returns `{ score, band, reasons, lastActivity, escalated }`; `sortRisk(a, b)` sorts escalation, score and oldest activity; `adherenceMetric(plans, now)` returns `{ kept, total } | null`. The reason shape is `{ code, points, params }`. Both threads may refine TypeScript input shapes within their lanes; the main thread resolves the shared contract at integration.

## Cache ownership decision

The maintainer approved a small Prisma ownership table on 2026-10-06. Link each cached response used by a learner to that learner; on deletion, remove their ownership and delete an entry only when it has no other owner. Preserve unrelated warmed demo entries. The existing database has three pre-ownership rows with hashed keys that cannot be attributed safely. The maintainer approved removing those three rows once in the migration; the migration refuses a larger legacy purge. D5 will warm the demo cache again.

## Verification

- Unit tests for all risk boundaries, future-event filtering, no activity, zero capacity, empty metric, cohort distribution and sorting.
- Service/API tests for advisor projections, outreach validation/fallback/edit persistence and learner parity/deletion boundaries. Never expose numeric score, goal or context in rendered advisor data.
- `npm run check` before the D4 commit, production build, local browser verification at 375 and 1280 px, and the D4 exit checks: 300 students under one second, High rows with at least two reasons, Tunde first after the demo path, on-track cohort still low at Week 10.
- Keep the current demo state restorable with Reset; document any timing or device limitation honestly.

## Result (2026-10-07)

The advisor list, band filter, detail drawer, editable outreach, learner parity panel and Delete my data are integrated. The approved AiCacheUse migration applied and removed the three unattributed legacy entries. The advisor thread used a separate worktree; sandbox approval blocked a second worktree, so the risk thread completed in an isolated local clone and only its risk files/tests were copied into main.

The pure risk suite has 23 tests. A local browser run confirmed Tunde first after his infeasible plan, saved an edited outreach note and found the same risk facts on his learner page. Delete my data returned to a landing confirmation. At Week 10, the simulated metric read 23 of 31 and all 180 on-track cohort learners were Low; Reset restored Week 7. The advisor view and drawer were checked at 375 and 1280 px with no page overflow. Warm 303-student service calls took 0.86–0.89 seconds after consolidating student facts into one explicit database query. Full production-mode page requests took 1.9–2.1 seconds warm and 4.2 seconds cold against remote Neon, so the visible page remains over the strict 1-second target and is a D5 performance follow-up. The demo cache needs warming in D5 after the approved legacy purge.

The first live reseed verification exposed cascade removal of AiCacheUse links. The seed now restores ownership after inserting the same stable learner ids; two complete Neon reseeds then retained the cache fixture and ownership and restored the demo clock.
