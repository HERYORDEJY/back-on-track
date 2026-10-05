# Back on Track

A proof of concept for the Andela x OpenAI Codex Accelerator capstone, “Learning That Stays With You”. A learner who has fallen behind gets a catch-up plan that fits their available hours, and an advisor sees who needs a call. MIVA Open University is the intended first partner.

The D1 foundation is in progress. The local app currently provides the bilingual landing shell and three labelled, simulated learner profiles. Plan creation, persona navigation, advisor view, clock/reset, database seeding and offline use are not implemented yet. The full status and pending decisions are in [docs/PLANS.md](docs/PLANS.md).

## Run locally

Use Node 24 (see `.nvmrc`) and npm:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. The landing shell needs no secrets. English is the default; the language selector saves a `lang` cookie for Nigerian Pidgin or English.

```sh
npm run check
npm run build
```

The check command runs strict types, Next/architecture linting, Vitest tests and documentation validation. GitHub Actions has the same check workflow; it has not yet run on the remote.

Copy `.env.example` to `.env` when database/AI services are implemented; configure actual secrets outside Git. Database, demo-warm and local Playwright script names are registered as required by AGENTS.md, but their implementations/dependencies are pending. Do not use the reset command against an existing database.

## Project map

Read [AGENTS.md](AGENTS.md) before working, then follow its routing table. [ARCHITECTURE.md](ARCHITECTURE.md) defines layers and the data model. [The capstone brief](CAPSTONE_PROJECT_BRIEF.md) records programme requirements, and [CODEX_LOG.md](CODEX_LOG.md) records development tasks.

All demo personas and future cohort/course estimates are simulated. Published course content must be selected and attributed before seeding; no MIVA curriculum or measured student outcomes are claimed.
