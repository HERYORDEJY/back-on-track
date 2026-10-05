# D2 pure engine plan

Prepared 2026-10-05 before implementation. D1's recovering cohort requires actual fallback plans, so build this dependency before the complete seed runner. The maintainer approved the exact course mapping and code-owned topic order.

1. Reconcile engine/AI docs: no generated `order` field; all prechecks, proposal validation, fallback and infeasible scheduling use the same prerequisite-first order with inherited coursework deadlines, exam weight, week and stable course order.
2. Define pure engine contracts/config, Lagos calendar/as-of-time helpers, backlog/capacity and protected-work rules. No database, network, generated Prisma or simulated-clock reads in the domain layer.
3. Build prerequisite/deadline ordering and the shared scheduler with rounded minutes, 20-minute daily-remnant rule, last pieces, exam cutoff and explicit unplaced work. Test ordering-sensitive placement and truncated topics.
4. Build labelled course bases, bilingual templates, sparse-change validation, deterministic fallback and assessment-focused infeasible results. Test each protection/action/basis/fallback rule, warnings and focus deadlines.
5. Assemble injected `buildPlan` with at most three validation attempts and null-to-fallback behavior. The service owns elapsed-time budget/abort; no domain wall-clock reads. Test retries, default keep expansion and nonmutation.
6. Run all three approved persona fixtures at demo start through null-triage fallback. If outcomes differ, stop and propose metadata tuning for approval rather than changing rules/personas.
7. Update progress/specs/log, run checks and commit the pure engine task. No dependency, schema change, live AI integration or service check-in/deletion behavior is included.

Delayed offline check-ins, same-day re-plan timing and personalised cache deletion remain pending. The cohort skill/full seed/reset follow the tested fallback; D2's browser/live-AI exit remains pending.
