# D1 database and clock plan

Prepared 2026-10-05 before implementation, following [the foundation plan](d1-foundation.md). The maintainer configured the ignored `.env`; a read-only Postgres query verified connectivity and zero public tables. Preserve the existing scaffold commit `d3943a7`.

1. Define the 13 models/enums from `ARCHITECTURE.md`, including nullable completion provenance with `onDelete: SetNull`, optional availability, source references and plan focus/unplaced work. Do not implement unresolved personalised cache deletion or invent course data.
2. Configure Prisma 7's generated client and Postgres adapter with a lazy singleton. Generate the client for checks/builds without needing secrets; keep URLs outside the schema and logs.
3. Validate the schema and generate/review a migration from empty. Apply additive SQL to the verified empty database with migrate deploy, never reset. Verify migration status and provenance retention with isolated transaction fixtures rolled back afterwards.
4. Implement tested clock transformations, persisted clock access and `/api/clock`. Serialise concurrent advances so stale writes cannot move time backwards. The maintainer approved stopping an overshooting jump at the limit. Initial clock is the documented demo start. Reset awaits the real seed and is not a standalone clock rewind.
5. Add bilingual clock controls for implemented actions with loading/retry states; Reset awaits its real service. Route/page I/O stays behind services; components receive formatted dates/week values.
6. Run types/lint/tests/docs and production build; update affected specs, status and Codex log. Commit separately after checks.

Source/mapping, topic ordering, delayed offline check-ins, same-day re-planning and personalised cache deletion remain pending. Seed, recovering cohort, reset, plans, offline and deployment are outside this task's completion claim.
