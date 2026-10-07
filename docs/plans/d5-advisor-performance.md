# D5 advisor response-size pass

The dynamic advisor page currently renders all 303 ranked students in one request. A warm public request returned about 479 KB of HTML/RSC and took 2.1–3.1 seconds end to end from this connection. The existing service read was 0.86–0.89 seconds locally; changing the risk computation or clock semantics for speed is unwarranted.

1. Keep scoring the full cohort on each request so band, order and the simulated metric reflect the current clock. Render a bounded 40-row page after filtering. Preserve the chosen band and page when opening/closing a detail drawer; reset to page 1 when changing bands. Clamp invalid or out-of-range page queries.
2. Add minimal accessible page controls and count copy in both message files. Keep the existing D4 visual direction; the whole-product UI overhaul remains D6.
3. Extend the local production-browser demo test for page navigation and drawer state, then run `npm run check`, build and e2e. Compare public response size and timing after deployment. Record the measured result and any remaining latency honestly.

No dependency, schema, risk threshold or persona change is planned.

## Local result (2026-10-08)

The 40-row response is 80,583 bytes, versus 478,659 bytes from the public full-list page before this change, an 83% reduction. A warm local production request still took 2.07 seconds to first byte; the service itself scored all 303 rows in 0.86–0.94 seconds on its second and third calls. Pagination improves the transmitted page and avoids hundreds of rendered rows on a phone, but the remote database/server response remains the dominant latency. The production build and local browser demo pass, including page 2, drawer open/close with the page query preserved, and return to Tunde on page 1. Public deployment timing, Slow 4G and Lighthouse remain to verify.
