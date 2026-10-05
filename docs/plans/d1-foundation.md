# D1 foundation plan

Prepared 2026-10-05 before implementation. D1 is a milestone, not a one-day promise. Scope and layer boundaries follow `ARCHITECTURE.md`; progress is tracked in `docs/PLANS.md`.

## Sequence

1. Verify the existing remote and local runtime, preserve the supplied docs, add ignore rules, and use a local main branch with the existing origin. The remote was reached over SSH and returned no refs; a local documentation commit `81926f5` was subsequently found and is preserved. Node 24.14.0 and npm 11.9.0 are available.
2. Obtain the dependency approval required by `AGENTS.md`. Install only the approved pinned foundation set and save the lockfile. Do not use a release candidate, automatic CLI defaults, new auth or deployment services.
3. Scaffold App Router/strict TypeScript at the existing repo root, Tailwind 4, a shadcn-derived button, ESLint layer restrictions, Vitest, all required npm script names, and GitHub Actions (`npm ci`, `npm run check`; no e2e in CI).
4. Build the bilingual language/template/date helpers and key-parity tests. Implement a light landing shell using the approved persona descriptions, an always-visible simulated-data label and an English/Pidgin cookie switch. Enable demo actions only when backed by the real services, not invented plans.
5. Configure stable Prisma 7/Postgres and the simulated-clock service/API/control with meaningful boundary tests. Verify infrastructure access, configure secrets without printing them, and use a non-destructive migration path. Database work depends on access and the schema decisions below.
6. Complete course/persona/cohort seeding, demo reset and a deployed URL after the dependencies, source adaptation and affected schema behavior have been approved. Recovering-cohort seed plans depend on the engine; report that dependency explicitly rather than inventing them.
7. Run typecheck, lint, unit tests, docs check and production build; inspect the landing at 375/1280 px. Preserve the existing documentation commit, then commit the scaffold as its own task after checks pass. Keep every incomplete D1 exit criterion visible.

## Dependencies approved on 2026-10-05

Exact package versions were read from the npm registry; compatibility was checked against the linked official docs. Node 24 is used locally and proposed for CI.

| Packages / versions | Purpose |
| --- | --- |
| `next@16.3.8`, `react@19.3.0`, `react-dom@19.3.0` | App Router application and UI runtime |
| `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3`, `postcss@8.5.28` | CSS pipeline without external fonts or a large asset bundle |
| `class-variance-authority@0.7.1`, `clsx@2.1.1`, `tailwind-merge@3.7.0`, `@radix-ui/react-slot@1.3.3` | Minimal helpers required by the shadcn button source |
| `typescript@5.9.3`, `@types/node@24.19.1`, `@types/react@19.3.0`, `@types/react-dom@19.3.0` | Strict types matching the application/runtime families |
| `eslint@9.39.5`, `eslint-config-next@16.3.8` | Next linting plus enforced architecture boundaries; replacement ESLint pin explicitly approved after the bundled React plugin crashed on 10.12.0 |
| `vitest@5.0.3`, `tsx@4.23.15` | Unit tests and typed scripts |
| `prisma@7.10.0`, `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`, `pg@8.23.1`, `@types/pg@8.23.1`, `dotenv@18.0.5` | Matching stable ORM/client/driver for existing Neon Postgres and script environment loading |
| `zod@4.6.5`, `date-fns@4.4.0` | Route/input validation and date helpers in the specified stack |

OpenAI SDK, seedrandom, Playwright and deployment CLI packages are not part of this installation request; request them when their work is concrete. The required npm script names will exist, but commands for unbuilt later features must not report success or imply those features are ready.

Sources: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Next ESLint](https://nextjs.org/docs/app/api-reference/config/eslint), [Tailwind setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [shadcn button registry](https://ui.shadcn.com/r/styles/new-york/button.json), [Prisma 7 integration](https://docs.prisma.io/docs/ai/prompts/nextjs). Prisma CLI 7.10.0 was verified to exist and matches the client/adapter; the default latest release candidate is excluded. The maintainer explicitly approved the listed D1 packages before registration or installation.

ESLint 9.39.5 was separately approved on 2026-10-05. It is an end-of-life compatibility pin; the installed React plugin calls an API removed in ESLint 10. The actual failure, build-mode choice and 9 dependency audit entries are recorded in [library notes](../references/next-eslint.md). No force upgrade/downgrade or extra dependency was added.

## Landing design

- Palette: paper `#F6F8FC`, navy ink `#13213A`, blue action `#315FCB`, pale blue line `#D8E3F5`, green confirmation `#1A705D`, amber caution `#9A5C00`.
- Type: one system sans-serif stack, clear sentence-case headings, compact supporting text, no web-font requests.
- Layout: left-aligned study-oriented introduction followed by distinct persona rows; primary action adjacent to the learner choices, language switch in the header. Stack naturally at 375 px. The emphasis belongs to tonight's achievable step, not a dashboard of invented statistics.
- Accessibility: minimum 44 px controls, visible focus, labelled language choice, readable contrast and no decorative motion. No stock images, generic feature-card grid, gradient hero or artificial metric.
- Review against the brief: the three actual learner situations make this an entry to a recovery workflow. Keep marketing copy short; do not expose implementation status as a product feature or pretend a plan exists before its service is built.

## Pending prerequisites and exit criteria

- Dependency approval was received on 2026-10-05 for the exact set above. Any additional package still needs approval.
- Public reading source/demo mapping, AI/code order, delayed offline first check-ins, same-day re-planning and personalised-cache deletion remain unanswered; do not infer answers from the instruction to start D1.
- Neon/Vercel access and runtime secrets are not yet verified. No secret should be pasted into logs or tracked by Git.
- Source and cache policy decisions affect seed/migrations. The recovering cohort requires a tested fallback engine even though its seed is listed under D1.
- Complete D1 only when the deployed personas, moving clock/reset, deterministic full seed, bilingual landing and green CI actually work. A checked local scaffold is progress, not the complete milestone.
