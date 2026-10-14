# D7 English-only pause

The maintainer requested on 2026-10-13 that the current demo use English alone while Pidgin copy is refined. This temporarily supersedes the bilingual demo requirement in `AGENTS.md` and the prior never-cut entry. It is a reversible pause, not removal of the Pidgin translation file, data fields or implementation.

## Plan before implementation

1. Add one explicit language gate. Hide the switch and make persisted cookies, learner preferences, old offline snapshots and route copy resolve to English. Keep the switch implementation and Pidgin messages in the repo.
2. Pause language mutations and replay while keeping old queued language edits parked and check-ins working. Version the learner page cache so an old Pidgin HTML page cannot be reopened as the current offline view.
3. Request and cache English-only AI text under a new prompt version. Expand English responses into the existing localized plan shape at the engine boundary. Existing bilingual cache rows and stored plans stay intact but are not selected by the new version.
4. Update the demo script and local browser test to prove the English-only path, including an old Pidgin preference, offline reopen, and advisor outreach. Preserve the busy-overlay layout regression through another major loading action.
5. Run `npm run check`, production build and the isolated local browser suite. Record the temporary exception and restoration path in the routed specs and `CODEX_LOG.md`.

## Restore later

Re-enable the language gate after the human Pidgin copy review, restore the bilingual AI prompt/schema with another prompt version, restore language mutation replay and the switch, then rewarm the demo cache and rerun the bilingual/offline browser path. Review existing saved outreach notes before showing them as active drafts. No schema migration is planned for this pause.

## Verification

The pause keeps the existing Pidgin messages, code paths, seed values, database fields and prior cache rows. Queued language edits remain stored but are hidden and never replayed while the pause is active. `npm run check` passed with 258 unit tests; the production build and all eight isolated local browser demo cases passed. The browser path confirmed English for Amaka's retained `pcm` seed, a saved Pidgin cookie, offline reopen and replay, English advisor drafting, and slider spacing at 375 and 1280 px. The current `DEMO_MODE` uses deterministic fallback when the new English cache key misses. No production cache warm or deployment was performed.
