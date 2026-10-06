# D2 AI, plan service and thin learner plan

Prepared 2026-10-05 before implementation. The pure engine and three persona outcomes are tested; this task connects them to the seeded database and browser. The existing scope and D2 exit in `docs/PLANS.md` govern the work.

1. Add the pinned OpenAI SDK after the required dependency approval. Build strict schemas, bilingual prompts, canonical cache keys, sentence-boundary length limits and cache-only `DEMO_MODE`. The service redacts names, emails and phone numbers before an engine or cache input is formed.
2. Give the service one 20-second elapsed-time budget across the initial triage and two correction retries. Pass remaining time to each attempt, and let refusals, parse/network failures, expiry and cache misses select the tested deterministic fallback. Test privacy, retries, cache identity and the deadline.
3. Load the seeded student/course/events using the simulated clock; build a plan, persist its version, decisions, sessions and reminders in one transaction, and update activity/escalation. Add a strict `POST /api/plan` route and a read service for the learner page. Leave check-in and re-plan mutations for D3, where same-day and delayed offline rules are still pending.
4. Show a small bilingual learner page using the saved student language, goal, plan summary, first session, decisions with basis, and the honest infeasible path. Add Start demo and persona links only once the page works. Keep the page light and responsive.
5. Verify a forced AI failure and cache-only mode, the live Amaka plan within 20 seconds, a 375 px/1280 px browser path and the required checks. Update the status table, affected docs and `CODEX_LOG.md`; create one D2 commit with the required commit-message skill.

The live AI call is a bounded D2 verification call. Production cache warming, offline check-ins, full intake, read-aloud, advisor work and deletion stay on their scheduled milestones. No schema, rule, threshold or persona changes are planned.
