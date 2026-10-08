# Back on Track

A proof of concept for the Andela x OpenAI Codex Accelerator capstone, “Learning That Stays With You”. A learner who has fallen behind gets a catch-up plan that fits their available hours, and an advisor sees who needs a call. MIVA Open University is the intended first partner.

The D1 foundation and D2 thin learner flow are complete. Start demo resets to Amaka; the browser shows her cut plan in Pidgin and Tunde's honest can't-fit path. The approved course/persona/cohort seed and atomic reset are loaded and verified on Neon. With the configured OpenAI key, a valid live Amaka cut plan completed within the 20-second AI budget; cache-only replay and the saved plan API returned the same fully scheduled cut. The deterministic fallback remains available. The full D3 learner loop, advisor view and offline use are pending. Full status and decisions are in [docs/PLANS.md](docs/PLANS.md).

## Run locally

Use Node 24 (see `.nvmrc`) and npm:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. English is the landing default; the language selector saves a `lang` cookie. Learner plan text uses each student's saved language. Configure `DATABASE_URL`, `OPENAI_API_KEY` and `OPENAI_MODEL` in ignored `.env`; `DEMO_MODE=true` reads only the shared AI cache and uses deterministic fallback on a miss. Apply the migration with `npm run db:deploy` to a new database. Postinstall/build generate the Prisma client without requiring a connection string.

```sh
npm run check
npm run build
```

The check command runs strict types, Next/architecture linting, Vitest tests and documentation validation. The D2 live-plan follow-up passes locally with 156 tests and a production build. The [prior implementation GitHub Actions run](https://github.com/HERYORDEJY/back-on-track/actions/runs/37422104658) passed with 155 tests; [GitHub Actions](https://github.com/HERYORDEJY/back-on-track/actions) tracks the follow-up's remote result.

[Public Vercel URL](https://back-on-track-one.vercel.app): the bilingual landing, learner flow, advisor call list, persisted clock and atomic demo reset are deployed. The D5 public demo path passed three consecutive cache-only runs after an approved rewarm and isolated local browser-test fix; each run reset the simulated state. Generated deployment URLs require Vercel sign-in.

Copy `.env.example` to `.env`; configure secrets outside Git. Use `npx --no-install tsx scripts/db-verify.ts` for the local, rolled-back provenance check. Clock jumps are forward only and stop at the day before the exam. `npm run db:seed` loads the complete deterministic simulated dataset, retains AiCache and restores the clock; it replaces academic/application records. `npx --no-install tsx scripts/seed-verify.ts` performs two full reseeds and checks identical rows/cache retention. `npx --no-install tsx scripts/demo-reset-verify.ts` exercises the narrower persona-only reset and checks cohort/cache retention; it restores personas and clears outreach. `npm run demo:warm` requires `DEMO_MODE=false`, a configured model/key/database and an approved live-AI budget. Do not use the reset command against an existing database.

The local Playwright demo must use a separate PostgreSQL database named `back_on_track_e2e` on a loopback address. Start a local PostgreSQL server on port 5433, create that database, then point `DATABASE_URL` at it for `npm run db:deploy` and `npm run db:seed`. Run `npm run build` before `npm run test:e2e`. The test defaults to the current OS user's `postgresql://<user>@127.0.0.1:5433/back_on_track_e2e`; set `E2E_DATABASE_URL` if your local user, port or credentials differ. It rejects a remote or differently named target and uses port 3100 for the app. Never direct the browser deletion test at the Production database.

## Project map

Read [AGENTS.md](AGENTS.md) before working, then follow its routing table. [ARCHITECTURE.md](ARCHITECTURE.md) defines layers and the data model. [The capstone brief](CAPSTONE_PROJECT_BRIEF.md) records programme requirements, and [CODEX_LOG.md](CODEX_LOG.md) records development tasks.

All personas, cohort events and course estimates/weights/prerequisites/assessment dates are simulated. The approved [36-reading adaptation](docs/plans/d1-course-mapping.md) links BCcampus / University of Minnesota readings with attribution and licensing/access limits. No MIVA-approved curriculum or measured learner outcomes are claimed. The reusable [cohort skill](skills/cohort-seed/SKILL.md) follows the maintained generator/specs.
