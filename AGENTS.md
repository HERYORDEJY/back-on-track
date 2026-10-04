# AGENTS.md: Back on Track

Back on Track is a proof of concept for the Andela x OpenAI Codex Accelerator capstone, "Learning That Stays With You" (Engagement track), with MIVA Open University as the first partner. A student who has fallen behind gets a catch-up plan that fits the hours they really have, the plan adjusts when they slip again, and advisors see who needs a call this week. The final goal is a live demo that wins the showcase and opens a pilot conversation with MIVA.

This file is the map, not the manual. Read it before every task, then open the docs the routing table points to for the area you're touching. If a task conflicts with the docs, or the code disagrees with them, stop and ask.

Requirement priority: golden rules, then the cut list, then the current demo script. Any allowed cut must update the script and its test in the same change.

## Routing table

| If your task touches... | Read first |
| --- | --- |
| Programme requirements and the submitted idea | [CAPSTONE_PROJECT_BRIEF.md](CAPSTONE_PROJECT_BRIEF.md) |
| What to build next, status, cut order, parallel threads | [docs/PLANS.md](docs/PLANS.md) |
| Published course material, partner facts and unconfirmed policies | [docs/RESEARCH.md](docs/RESEARCH.md) |
| New files, where code goes, layers, data model, environment | [ARCHITECTURE.md](ARCHITECTURE.md) |
| `lib/engine/`, plans, re-planning, scheduling | [docs/specs/engine.md](docs/specs/engine.md) |
| `lib/risk/`, the advisor list, the header metric | [docs/specs/risk.md](docs/specs/risk.md) |
| `lib/ai/`, prompts, the cache, `DEMO_MODE`, `demo:warm` | [docs/specs/ai.md](docs/specs/ai.md) |
| `prisma/`, seed data, the simulated clock, demo reset, Delete my data | [docs/specs/data.md](docs/specs/data.md) |
| Any screen, copy, offline, languages, read-aloud, accessibility | [docs/FRONTEND.md](docs/FRONTEND.md) |
| A judgment call no spec answers (copy, edge cases, what to cut) | [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md) |
| A library that behaves differently than you expect | [docs/references/](docs/references/README.md) |

## Golden rules

1. Code does the arithmetic, the AI does the judgment. The AI identifies topics to shorten or skip and explains those changes; code keeps unlisted topics, computes minutes and checks the complete schedule after rounding.
2. Every AI output is validated. Invalid output gets up to 2 retries with the violations quoted within one 20-second plan budget, then a deterministic fallback. The engine always returns a plan.
3. "You can't make it in time" is a valid answer. When protected work can't fit before the exam, say so, offer a study break and flag the advisor.
4. The live demo never waits on the network. `DEMO_MODE` serves cached AI responses and falls back on a miss.
5. Simulated data is labelled as simulated wherever it appears.
6. Domain logic is pure and tested. `lib/engine` and `lib/risk` do no I/O, take `now` as an argument, and every rule has a unit test.
7. Scope is locked. Ideas outside scope go in the Later list in `docs/PLANS.md`, not into the code.
8. Built for real conditions: works offline after first load, pages stay light, every screen is usable on a basic Android phone.
9. No one is locked out. Irregular hours still get a plan and "can't make it" still gets a next step. Learner UI works in English and Nigerian Pidgin; published course and topic titles stay in English. Read-aloud covers tonight's session and the plan summary, plus the infeasible summary and next step. Other screens have screen-reader labels.
10. Private and traceable. AI calls receive no names, emails or phone numbers. Students see the same call-priority band, reasons, last activity and escalation as advisors; numeric scores stay internal and outreach drafts are private working notes. Advisors never see goal or context. Every reason in a plan shows the course fact it rests on.

## Never build

Logins or auth, LMS integration, sending WhatsApp, SMS or email, more than one course, languages beyond English and Nigerian Pidgin, a native app, payments, admin tools, production hardening (end-to-end tests in CI, monitoring, load testing).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start locally |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .`, including the layer import rules in `ARCHITECTURE.md` |
| `npm test` | `vitest run` |
| `npm run docs:check` | `node scripts/docs-check.mjs`: doc links resolve, every spec is routed, this file stays under 120 lines |
| `npm run check` | typecheck + lint + test + docs:check; run before every commit |
| `npm run test:e2e` | `playwright test`, local only; needs a seeded database and `DEMO_MODE=true` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (production) |
| `npm run db:seed` | `tsx prisma/seed.ts`: clears and re-inserts all seed data except AiCache |
| `npm run db:reset` | `prisma migrate reset --force && npm run db:seed` |
| `npm run demo:warm` | `tsx scripts/demo-warm.ts`: fills AiCache for the demo path (`docs/specs/ai.md`) |

If a script is missing, add it to `package.json` with exactly this name.

## How to work

- Use plan mode for any task touching more than one file; build only after the plan.
- One task, one commit. Conventional Commits tagged with the build day: `feat(engine): add capacity calculator [D2]`.
- Update the docs your change affects in the same commit, and the status table in `docs/PLANS.md` when an area changes state.
- A decision made outside the repo (a chat, a call) only counts once it's written into these docs.
- Add a row to `CODEX_LOG.md` for every task.
- Fixing a bug: write the failing test first. Never weaken, skip or delete a test to get green.
- Keep diffs small; don't reformat files you aren't changing.
- Ask before: adding a dependency; changing `prisma/schema.prisma` after Day 1; changing a golden rule, a threshold, a persona or anything under "Never build".
- Parallel threads stay in their lanes, listed in `docs/PLANS.md`.

## Done means

- `npm run check` is green, and the e2e demo test still passes once it exists.
- The exit criteria for the task's part of the day in `docs/PLANS.md` are met.
- Affected docs are updated and `CODEX_LOG.md` has a row, including why any new dependency was added.
