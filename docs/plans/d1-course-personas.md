# D1 course and persona definitions plan

Prepared 2026-10-05 before implementation. The maintainer selected the BCcampus / University of Minnesota *Principles of Management* readings for a labelled 36-topic, 12-week demo adaptation.

1. Verify selected section titles and direct reading URLs against the public source. Preserve English titles and attribution; store references, not textbook bodies. Record the noncommercial/share-alike licence and exception caveat.
2. Prepare a reviewable mapping of three readings per demo week. Estimates, exam weights, prerequisite links and assessments are simulated. Initial estimates stay within 60–100 minutes, averaging 80; weights sum to one. These are initial fixtures, not a claim that persona outcomes have already passed engine tests.
3. Add pure, typed `prisma/course.ts` and `prisma/personas.ts` definitions. Preserve all approved persona attributes. Spread completed topics across their teaching weeks at 21:00 Lagos, use explicit stable ids and null session provenance, and omit submissions for missed assignments.
4. Test source/metadata completeness, prerequisite integrity, assessment coverage, persona completion dates and deterministic fresh fixtures. Do not use the database or call AI in these tests.
5. Update research, data spec, architecture, plans and Codex log with evidence. Run `npm run check` before the task commit. Present the exact mapping for review before loading it; no dependency or schema change is needed.

The complete `db:seed` runner and demo reset remain pending. The recovering cohort needs the tested fallback engine; its ordering choice is still unresolved. Do not substitute invented plans, seed a partial cohort under the full-seed command or tune personas/rules to produce target statuses.
