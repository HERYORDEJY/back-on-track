# Back on Track

A proof of concept for the Andela x OpenAI Codex Accelerator capstone, “Learning That Stays With You”. A learner who has fallen behind gets a catch-up plan that fits their available hours, and an advisor sees who needs a call. MIVA Open University is the intended first partner.

The D1 foundation is in progress. The local app provides a bilingual landing shell, three labelled simulated learner profiles and a database-backed simulated clock. The initial schema/migration is applied on Neon. The approved course/persona/cohort seed is loaded on Neon; the pure recovery engine passes all three persona outcomes. Plan service/learner navigation, advisor view, demo reset and offline use are pending. Full status and decisions are in [docs/PLANS.md](docs/PLANS.md).

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

Copy `.env.example` to `.env`; configure secrets outside Git. Use `npx --no-install tsx scripts/db-verify.ts` for the local, rolled-back provenance check. Clock jumps are forward only and stop at the day before the exam. `npm run db:seed` loads the complete deterministic simulated dataset, retains AiCache and restores the clock; it replaces academic/application records. `npx --no-install tsx scripts/seed-verify.ts` performs two full reseeds and checks identical rows/cache retention. Demo reset, demo-warm and local Playwright implementations remain pending. Do not use the reset command against an existing database.

## Project map

Read [AGENTS.md](AGENTS.md) before working, then follow its routing table. [ARCHITECTURE.md](ARCHITECTURE.md) defines layers and the data model. [The capstone brief](CAPSTONE_PROJECT_BRIEF.md) records programme requirements, and [CODEX_LOG.md](CODEX_LOG.md) records development tasks.

All personas, cohort events and course estimates/weights/prerequisites/assessment dates are simulated. The approved [36-reading adaptation](docs/plans/d1-course-mapping.md) links BCcampus / University of Minnesota readings with attribution and licensing/access limits. No MIVA-approved curriculum or measured learner outcomes are claimed. The reusable [cohort skill](skills/cohort-seed/SKILL.md) follows the maintained generator/specs.
