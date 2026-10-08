# D5 local demo-test database isolation

The local Playwright demo used the configured `.env` database, which is the same Neon database used by Production. Its Amaka Delete my data step correctly removed her owned AI cache entry. This made later public `DEMO_MODE=true` runs fall back, despite the earlier successful warm. The bug is test setup, not cache deletion behavior.

1. Add a failing guard test, then require the Playwright server to use a dedicated loopback `back_on_track_e2e` database. Reject remote targets, a production URL match and unexpected database names before any browser mutation. Do not reuse an already-running app server.
2. Start local Postgres using the installed binaries, apply the existing migrations and seed to that database. Run `npm run check`, production build and the full Playwright path against it. Document local setup and the cache-loss root cause.
3. Restore Amaka’s public Production cache only after isolation is verified, then run the cache-only public path three times with a reset after each run. Keep the whole-product UI overhaul in D6.

No new dependency, schema, persona, risk threshold or golden-rule change is planned. The previously approved $5 warm cap remains the limit for any further live AI use; first check whether recovery is possible from the current cache or logs.

## Root cause and isolation result (2026-10-08)

The configured production database had only two AI cache entries after the local browser test: one owned by Zainab and one by Tunde. Amaka's cache had been deleted by that test's explicit Delete my data step. The test database guard now accepts only a direct loopback PostgreSQL URL named `back_on_track_e2e`; Playwright overrides the app server's database URL, uses port 3100, and refuses to reuse an existing server. A failing guard test preceded the fix. A local PostgreSQL 17 test cluster on port 5433 received the existing two migrations and deterministic seed (303 students, 36 topics, 30 recovery plans). Production restoration and repeat-run proof remain below.

A three-repeat browser run exposed another shared-fixture issue: Playwright started the repeats in parallel, so one reset or deletion changed another run's plan. The config now uses one worker to serialize the demo flow before any repeat-run result is counted.

With one worker, all six cases across three repeats passed in 32 seconds. A read-only Production check afterward still showed exactly the two pre-existing Zainab/Tunde cache rows, confirming the local test did not touch that database. Amaka's row remains absent until the public warm is restored.
