# D5 physical phone check

## Scope

Verify the public demo on the connected Android 9 JKM-LX2 at its 360 px CSS viewport. Exercise a cached learner plan, airplane-mode reopen and queued check-in sync, speech, and width. Restore the phone settings and reset the demo afterward. Record the evidence in `docs/FRONTEND.md`, the D5 tracker, and `CODEX_LOG.md`.

## Result, 2026-10-08

- Amaka's cached cut plan rendered in Pidgin with tonight's 40-minute session. Read-aloud changed to its active state, and the maintainer heard speech from the phone.
- With airplane mode enabled, a controlled navigation and reload reopened the saved plan. Done queued offline and synced after reconnect; the button reflected the saved check-in. The local queue then emptied.
- A first network-toggle attempt briefly showed Chrome's no-internet page. The controlled offline navigation and reload both passed; this transient should not be presented as a flawless first attempt.
- The 360 px browser viewport had equal document and viewport widths. TalkBack was enabled and its tutorial dismissed; the maintainer heard speech and asked to skip further TalkBack interaction. ADB touch injection could activate controls but did not establish a complete TalkBack gesture traversal.
- Restored the exact original accessibility-service list, confirmed airplane mode disabled, removed the temporary debugging port, and used the phone's Reset demo control. The plan returned to intake, with no queued action or learner page cache. Reset preserves the Production AI cache.

## Follow-up

Human Pidgin copy review and full-page advisor latency remain open D5 work. The whole-product visual overhaul awaits the maintainer's D6 instruction.
