# D6 learner and advisor feedback pass

Started 2026-10-08 after the maintainer's review of the learner screens. Their five clarifications in the conversation supersede conflicting staged D6 presentation rules. This pass is one UI task across learner and advisor views; it leaves the later data/AI extension visible as pending work.

## Decisions

- Use the existing Travel motion in one reusable, lightly tinted whole-screen modal wait state for major requests, including advisor detail loading. Keep Copy immediate and show an inline outcome.
- Reuse Button variants for actions. Give check-in reversal an unadorned secondary style. Use type, rules and shapes to distinguish ordinary copy, course/assessment titles, recommended actions, priority and plan status without status colours.
- Keep the published title **Assignment 2**. Explain time and deadline facts directly, with singular/plural warning templates and no displayed backlog ratio.
- Show Principles of Management, allocated minutes and the relevant actions in Tonight. Give skipped and kept topic groups distinct treatments. Align the learner's advisor-visible reasons and activity.
- Only Close details dismisses the advisor drawer. Preserve focus inside it, prevent Escape/backdrop dismissal and hide it immediately before URL navigation.
- Allow another outreach draft after Mark contacted, capped at two generated drafts per learner per Monday–Sunday simulated Africa/Lagos week using existing Outreach rows. Show the latest saved message and its draft date honestly. The current schema does not hold contact time or reply/discussion context.

## Implementation and checks

The shared overlay and emphasis components, Button variant, learner/advisor layout and copy, risk presentation parameters, warning template selection, weekly outreach guard and 429 response are implemented. Plan arithmetic, risk thresholds and AI prompts remain unchanged. Unit tests cover warning grammar, risk reason values, week boundary and weekly limit. The isolated local demo test covers drawer dismissal and the rest of the learner/advisor path. `npm run check`, production build and the isolated e2e demo test are required before commit.

## Pending data and AI work

1. Approve an additive Prisma migration for actual `contactedAt`, a structured outreach outcome (reply/no reply/call/meeting), advisor discussion notes and their authorship/time. Decide how edits and corrections are retained.
2. Add an advisor feedback form and recent-activity timeline entries backed by that data. Show actual last contact time separately from draft creation time. Define how a draft used outside the app becomes a recorded contact.
3. Feed only approved, minimal previous-contact context to later outreach prompts. Keep names, emails, phone numbers and free-form sensitive details out of AI input; update the prompt version and cache key, fallback behaviour and privacy tests.
4. Revisit the two-draft guard if multiple advisors can draft concurrently. The current request-time count and disabled UI handle normal single-advisor use but do not reserve a slot transactionally across concurrent requests.

This pending work is not part of this UI pass because the maintainer explicitly asked to defer major backend and database changes. It needs approval under `AGENTS.md` before changing `prisma/schema.prisma`.
