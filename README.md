# Back on Track

A proof of concept for the Andela x OpenAI Codex Accelerator capstone, “Learning That Stays With You”. A learner who has fallen behind gets a catch-up plan that fits their available hours, and an advisor sees who needs a call. MIVA Open University is the intended first partner.

The D1 foundation is complete. D2 now has a tested AI/cache adapter, plan service and thin learner page. Start demo resets to Amaka; the browser shows her cut plan in Pidgin and Tunde's honest can't-fit path. The approved course/persona/cohort seed and atomic reset are loaded and verified on Neon. Live AI verification awaits account credits; fallback works. The full D3 learner flow, advisor view and offline use are pending. Full status and decisions are in [docs/PLANS.md](docs/PLANS.md).

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

The check command runs strict types, Next/architecture linting, Vitest tests and documentation validation. Local D2 checks and production build pass with 155 tests; [D2 GitHub Actions](https://github.com/HERYORDEJY/back-on-track/actions/runs/37422104658) passed too.

[Public Vercel URL](https://back-on-track-one.vercel.app): the D1 bilingual landing, persisted clock and atomic persona reset are verified. D2 is deployed; the landing and Amaka/Tunde learner routes return 200. Plan building and Start demo were verified locally in the browser; the public mutation path has not yet been exercised. The advisor link activates with D4. Generated deployment URLs require Vercel sign-in.

Copy `.env.example` to `.env`; configure secrets outside Git. Use `npx --no-install tsx scripts/db-verify.ts` for the local, rolled-back provenance check. Clock jumps are forward only and stop at the day before the exam. `npm run db:seed` loads the complete deterministic simulated dataset, retains AiCache and restores the clock; it replaces academic/application records. `npx --no-install tsx scripts/seed-verify.ts` performs two full reseeds and checks identical rows/cache retention. `npx --no-install tsx scripts/demo-reset-verify.ts` exercises the narrower persona-only reset and checks cohort/cache retention; it restores personas and clears outreach. Demo-warm and local Playwright implementations remain pending. Do not use the reset command against an existing database.

## Project map

Read [AGENTS.md](AGENTS.md) before working, then follow its routing table. [ARCHITECTURE.md](ARCHITECTURE.md) defines layers and the data model. [The capstone brief](CAPSTONE_PROJECT_BRIEF.md) records programme requirements, and [CODEX_LOG.md](CODEX_LOG.md) records development tasks.

All personas, cohort events and course estimates/weights/prerequisites/assessment dates are simulated. The approved [36-reading adaptation](docs/plans/d1-course-mapping.md) links BCcampus / University of Minnesota readings with attribution and licensing/access limits. No MIVA-approved curriculum or measured learner outcomes are claimed. The reusable [cohort skill](skills/cohort-seed/SKILL.md) follows the maintained generator/specs.
