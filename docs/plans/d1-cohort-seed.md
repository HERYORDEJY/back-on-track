# D1 cohort skill and complete seed plan

Prepared 2026-10-05 before implementation. Course mapping is approved and all three persona outcomes pass the pure engine. The recovering cohort can now use actual fallback plans.

1. Ask before adding pinned `seedrandom` 3.0.5 (isolated deterministic PRNG) and development-only `@types/seedrandom` 3.0.8 (strict TypeScript types), as required by AGENTS.md. Do not replace global Math.random. No other dependency/schema change is planned.
2. Build deterministic `generateCohort({ seed, count, shares })` in `prisma/cohort.ts`, following every segment/time rule in the data spec. Use fixed unique Nigerian name combinations, stable ids, as-of-dated events, and the actual null-triage engine at 9 October 18:00 Lagos for recovering plans. Pure generation does no database/network I/O.
3. Package the reusable workflow in a SKILL.md under `skills/cohort-seed/` inside this repo as requested by the data spec. Point to the maintained generator/specs and document in-memory verification before database changes; avoid duplicated mechanics or invented permissions. Validate the skill using skill-creator tooling.
4. Test same-seed determinism, mix/count/name/language/hour/event integrity, future on-track coursework and recovering Progress tied to actual final pieces/check-ins. In-memory risk fixtures reuse the generator later.
5. Implement the complete `prisma/seed.ts` transaction: clear all seeded application/academic data except AiCache, insert course/personas/all 300 cohort students and their real engine-backed events/plans, restore clock. Verify reseeding gives identical logical rows and AiCache is retained, without exposing secrets. Never label a partial load a complete seed.
6. Update affected docs/status/log and run checks/build before the task commit. Demo reset/landing navigation follow as their own task.

The maintainer approved both exact dependency pins on 2026-10-05; installation follows the engine task commit. Live AI/model/budget and unresolved check-in/deletion choices are not needed for deterministic cohort generation and remain pending.
