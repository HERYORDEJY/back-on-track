# Back on Track

A proof of concept for the Andela x OpenAI Codex Accelerator capstone, “Learning That Stays With You”. A learner who has fallen behind gets a catch-up plan that fits their available hours, and an advisor sees who needs a call. MIVA Open University is the intended first partner.

The D1 foundation is in progress. The local app provides a bilingual landing shell, three labelled simulated learner profiles and a database-backed simulated clock. The initial schema/migration is applied on Neon. Plan creation, persona navigation, advisor view, demo reset, database seeding and offline use are pending. Full status and decisions are in [docs/PLANS.md](docs/PLANS.md).

## Run locally

Use Node 24 (see `.nvmrc`) and npm:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. English is the default; the language selector saves a `lang` cookie. The landing can render without secrets and shows a retry state when the clock is unavailable. For the clock, configure `DATABASE_URL` in ignored `.env` and apply the migration with `npm run db:deploy` to a new database. Postinstall/build generate the Prisma client without requiring a connection string.

```sh
npm run check
npm run build
```

The check command runs strict types, Next/architecture linting, Vitest tests and documentation validation. [GitHub Actions](https://github.com/HERYORDEJY/back-on-track/actions/runs/37252741926) passed with 54 tests on commit `255a6c1`.

[Recorded Vercel deployment](https://back-on-track-4n90nbkz7-heryordejys-projects.vercel.app): deployment completed, but the generated URL redirects unauthenticated requests to Vercel sign-in. Deployed runtime/database behavior and a public showcase URL are still unverified.

Copy `.env.example` to `.env`; configure secrets outside Git. Use `npx --no-install tsx scripts/db-verify.ts` for the local, rolled-back provenance check. Clock jumps are forward only and stop at the day before the exam. Database seeding/reset, demo-warm and local Playwright script names are registered, but their implementations/dependencies are pending. Do not use the reset command against an existing database.

## Project map

Read [AGENTS.md](AGENTS.md) before working, then follow its routing table. [ARCHITECTURE.md](ARCHITECTURE.md) defines layers and the data model. [The capstone brief](CAPSTONE_PROJECT_BRIEF.md) records programme requirements, and [CODEX_LOG.md](CODEX_LOG.md) records development tasks.

All demo personas and future cohort/course estimates are simulated. Published course content must be selected and attributed before seeding; no MIVA curriculum or measured student outcomes are claimed.
