# D5 route loading and recovery states

Started 2026-10-08. D5 calls for loading, empty and error states. The advisor band and timeline already have empty copy, and in-page mutations already show progress and retry controls. The remaining route-level gaps are slow page navigation, an invalid learner URL and an unexpected page render failure. This task adds those states without beginning the deferred D6 visual overhaul.

1. Add lightweight loading content inside the shared page shell, with English and Pidgin text selected by the layout language. Do not fetch data or start AI work for the loading state.
2. Add a route error boundary with a retry and a home link. Do not reveal an exception message to users. Add a not-found page for invalid learner or route URLs with a home link.
3. Keep the existing palette and system font. Respect reduced motion, keyboard focus and 44 px targets. Check a missing learner URL in English and Pidgin at 375 px, then run typecheck, lint, tests, docs check and a production build.

No dependency, schema, persona, threshold, golden rule or scope change is planned. The maintainer's whole-product visual instruction remains reserved for D6.

## Verification

Root route loading, error and not-found files now share bilingual copy that follows the layout language. The error boundary retries without showing an exception; both recovery screens link to the demo start. Loading animation stops under reduced motion. Existing advisor filters and detail sections retain their empty copy, while existing mutations keep their progress/retry controls.

`npm run check` passed 241 tests and `npm run build` passed. A local production server using the isolated `back_on_track_e2e` database rendered a missing learner URL in English and Pidgin at 375 px; the Pidgin page had no horizontal overflow. A second local server pointed at an unavailable loopback database and rendered the advisor route error boundary with a retry and home link. Both temporary servers were stopped. Human Pidgin review remains part of D5.
