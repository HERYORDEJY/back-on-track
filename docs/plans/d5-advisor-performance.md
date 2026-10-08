# D5 advisor response-size pass

The dynamic advisor page currently renders all 303 ranked students in one request. A warm public request returned about 479 KB of HTML/RSC and took 2.1–3.1 seconds end to end from this connection. The existing service read was 0.86–0.89 seconds locally; changing the risk computation or clock semantics for speed is unwarranted.

1. Keep scoring the full cohort on each request so band, order and the simulated metric reflect the current clock. Render a bounded 40-row page after filtering. Preserve the chosen band and page when opening/closing a detail drawer; reset to page 1 when changing bands. Clamp invalid or out-of-range page queries.
2. Add minimal accessible page controls and count copy in both message files. Keep the existing D4 visual direction; the whole-product UI overhaul remains D6.
3. Extend the local production-browser demo test for page navigation and drawer state, then run `npm run check`, build and e2e. Compare public response size and timing after deployment. Record the measured result and any remaining latency honestly.

No dependency, schema, risk threshold or persona change is planned.

## Local result (2026-10-08)

The 40-row response is 80,583 bytes, versus 478,659 bytes from the public full-list page before this change, an 83% reduction. A warm local production request still took 2.07 seconds to first byte; the service itself scored all 303 rows in 0.86–0.94 seconds on its second and third calls. Pagination improves the transmitted page and avoids hundreds of rendered rows on a phone, but the remote database/server response remains the dominant latency. The production build and local browser demo pass, including page 2, drawer open/close with the page query preserved, and return to Tunde on page 1. Public deployment timing, Slow 4G and Lighthouse remain to verify.

## Function region follow-up (2026-10-08)

The current public advisor response reports `cpt1::iad1` in `x-vercel-id`:
the request entered from Cape Town and ran in Vercel's default `iad1`
function region. The configured Neon host identifies `us-east-2`. Vercel
lists `cle1` as its matching compute region and recommends running functions
near their database. A read-only run of the unchanged 303-student service
against the isolated loopback database took 220 ms cold, then 127 and 121 ms;
the earlier remote Neon service took 0.86–0.94 seconds warm. Two public page
requests before the change took 3.57 and 1.58 seconds to first byte. This is
evidence for a region mismatch, not a measured post-change improvement.

Set the project's function region to `cle1` in `vercel.json`. Keep all clock
and advisor reads dynamic and the full cohort scored on every list request.
After deployment, repeat public first-byte and Slow 4G measurements, check
the reported execution region, and replay the demo path. Record the result
before marking the D5 latency item complete. No dependency, schema, threshold,
persona or copy change is involved.

Local verification: `npm run check` passed 241 tests, `npm run build` passed,
and both isolated production-browser demo tests passed. The deployment and
post-change latency measurement remain open.

## Public verification (2026-10-08)

Commit `a2276e8` is on `origin/main`, and its [CI run](https://github.com/HERYORDEJY/back-on-track/actions/runs/37741218348)
passed. Public landing, learner and advisor responses returned HTTP 200 with
`cle1` as the function region in `x-vercel-id`. The first advisor request took
3.76 seconds to first byte. Five following requests took 2.38, 1.06, 0.86,
0.82 and 0.74 seconds; the warm median was 0.86 seconds, but cold and some
warm requests still exceed one second. The HTML response stayed about 83 KB.

At 375 px, a fresh headless Chromium page under emulated Chrome Slow 4G
network conditions loaded in 3.49 seconds, rendered 40 rows and had no
horizontal overflow. The earlier 6.9-second throttled run used a different
session, so treat the comparison as directional. The clean-profile mobile
Lighthouse result for this unchanged page remains 99 performance and 100
accessibility from before the region change; Lighthouse was not rerun.

The public `DEMO_MODE=true` API path returned Amaka `cache/cache`, Zainab
`fit`, Tunde `infeasible` and Tunde outreach `cache`. The final reset returned
the clock to Week 7 at the demo start. Region placement and the D5
low-bandwidth pass are verified; a strict one-second response for every
request remains unmet and is recorded as a demo limitation.
