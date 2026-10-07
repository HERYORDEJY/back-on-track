# D5 production demo cache warm

Started 2026-10-07. `package.json` already listed `demo:warm`, but its script file was missing. This task adds the runner required by [the AI spec](../specs/ai.md) and [the D5 plan](../PLANS.md), then verifies its sequence and warms the production database under the maintainer's $5 cap. The whole-project UI overhaul remains deferred to D6.

## Build order

1. Add a runner with an injectable demo sequence: reset, build Amaka's plan, mark the featured session done, move the simulated clock three days, open her re-plan, build Zainab and Tunde, draft Tunde's outreach, and reset in a `finally` block. Assert the scripted plan states, change summary and cache-backed Amaka outputs so a fallback cannot silently count as a warm.
2. Reject `DEMO_MODE=true` or missing live model/key/database configuration before mutating the database. Print a concise result without private goal/context or AI-generated text.
3. Test exact sequencing, failure cleanup and guardrails with injected operations. Run `npm run check` and a production build.
4. Review the runnable command and expected AI call bound with the maintainer for a spending limit, then run against the production database. Verify cache ownership and reset state. Configure production demo mode after the warm succeeds.

## Boundaries

- The existing `DATABASE_URL` selects the target. Never print its value or any API key.
- Tunde's infeasible plan is a valid fallback. Zainab's fit plan may need no triage call. Amaka's cut and re-plan must be from live AI or cache, and Tunde's outreach must have a cache ownership row after drafting.
- No schema change, new dependency or production configuration change is part of the runner implementation.

## Verification checkpoint

The runner, live-mode/configuration guard and injectable sequence are built. Mocked tests pass for exact persona steps, fallback rejection, transient reset retry and final reset after a started warm. A guarded CLI smoke test with `DEMO_MODE=true` exited before database or AI access.

Live Luna attempts exposed a 20-second timeout with default reasoning and valid-schema cuts that still left 50–220 rounded minutes unplaced. The engine now supplies the selected-minute total of a feasible fallback plus exact savings for every permitted action; validation still decides whether the AI's chosen topics schedule. Retries quote the rejected actions and additional unplaced minutes. Triage uses `reasoning.effort=none`; prompt version `d5-v6` prevents earlier invalid cache entries from shadowing the revised request. With the maintainer's $5 cap, `OPENAI_MODEL=gpt-6-sol DEMO_MODE=false npm run demo:warm` passed: Amaka `ai/ai`, Tunde outreach cached, then reset. A separate cache-only replay returned Amaka `cache/cache`, Zainab `fit`, Tunde `infeasible`, and outreach `cache`. A read-only database check confirmed the simulated clock at 19 October 2026 18:00 Lagos, zero persona plans/outreach, and Amaka/Tunde cache ownership.

The first public Production check returned Amaka `fallback` despite local cache replay. The cause of that input/key difference was not established. Production was temporarily redeployed with `DEMO_MODE=false`; the public API path returned Amaka `cut/ai` for both versions, Zainab `fit`, Tunde `infeasible`, and outreach `cache`, then reset. Production was redeployed again with `DEMO_MODE=true`. The [final deployment](https://vercel.com/heryordejys-projects/back-on-track/D6uDPeWtjkZ9Go6vQ54Mtfm5DZuL) is Ready, and a full public replay returned Amaka `cut/cache` twice and Tunde outreach `cache` before resetting. [GitHub CI](https://github.com/HERYORDEJY/back-on-track/actions/runs/37690351139) passed. Preview remains unconfigured for live AI because its key and database variables are Production-only; widening those credentials to Preview is separate from this approved warm.
