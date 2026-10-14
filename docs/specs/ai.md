# AI spec (`lib/ai`)

Two AI calls: triage for plans and outreach for advisors. Both go through a cache and both have a deterministic fallback, so the app never needs the network to show a plan or a message. Server only.

D7 English-only pause (2026-10-13): prompt version `d7-en-v1` asks for English-only triage and outreach. Triage cache entries contain `{ en }` text and are expanded to the existing `{ en, pcm }` engine/storage shape with the English text in both fields. Old bilingual cache entries remain stored but are isolated by the prompt version and strict English schema; `DEMO_MODE` falls back on a miss until the new path is warmed. Outreach uses English in the prompt and cache input even for a learner whose retained database preference is `pcm`. Restore bilingual prompts/schema with another version after human review and rewarm the demo path. No production warm was authorized by this pause.

D2 implementation (2026-10-06): `openai` 7.28.0 was approved and pinned for Responses API structured parsing with the existing Zod 4.6.5. Strict schemas, bilingual prompts, canonical cache keys, length enforcement, privacy redaction, shared service budget and cache-only `DEMO_MODE` are built and unit tested. The first live Amaka proposal cut exactly to the displayed capacity but failed `OVER_CAPACITY`: 60 rounded minutes remained unplaced because daily fragments under the 20-minute block minimum cannot be reused. Prompt version `d2-v2` explained this distinction; a later valid live cut and cache-only replay passed. D5 added the missing `demo:warm` runner. Luna repeatedly returned under-cut plans on the full demo path, so version `d5-v6` gives cut triage an exact reduction target and per-action savings; the chosen actions still require complete code validation. With `gpt-6-sol` and `reasoning.effort=none`, the local live warm and cache-only replay passed under the maintainer's $5 cap. The first public Production replay returned Amaka `fallback`, so the public live-AI path warmed both Amaka plans directly. A new [Production deployment](https://vercel.com/heryordejys-projects/back-on-track/D6uDPeWtjkZ9Go6vQ54Mtfm5DZuL) restored `DEMO_MODE=true`; the full public replay then returned `cache` for both Amaka plans and Tunde outreach, and reset the simulated personas/clock.

## Calls

| Call | Used by | Input | Output |
| --- | --- | --- | --- |
| triage | the engine, injected by `lib/services/plans.ts` | `TriageContext` (`specs/engine.md`), plus violations on a retry | Sparse changed-topic actions and English rationales/summary, expanded to Localized for the engine; code owns topic order |
| outreach | `lib/services/advisor.ts` | Risk reasons (codes and params), plan status, active English language | An English message starting with `{firstName}`, and one next step in English for the advisor |

The current outreach input does not include earlier messages, contact dates, learner replies or advisor call notes. The advisor UI shows the latest saved note and allows another draft after a contact is marked, within two drafts per learner per simulated Lagos week. A later data and AI task must store actual contact time and structured advisor feedback, then explicitly choose privacy-safe context for later drafts and version the prompt/cache key. Do not describe the draft creation date as the contact date.

## Client (`client.ts`)

- Exports `triage` (the engine's `TriageFn`) and `outreach`. Each reads the cache, calls OpenAI only when allowed, enforces lengths, writes the cache, and returns `null` when there is no valid output.
- OpenAI calls use the Responses API with Structured Outputs: `client.responses.parse({ model: process.env.OPENAI_MODEL, input, text: { format: zodTextFormat(Schema, name) } })`. Triage requests use `reasoning.effort=none` to fit the shared 20-second budget on the configured Sol model; outreach uses its normal model default.
- Plan creation has one 20-second elapsed-time budget, shared by the first attempt and up to two correction retries. `lib/services/plans.ts` owns that budget outside the pure engine; each live attempt receives the remaining time via `AbortSignal`, never a fresh 20 seconds. Expiry, network error, refusal or parse failure returns `null` and selects deterministic fallback. `DEMO_MODE` remains cache-only and instant. The live Day 2 exit uses 20 seconds.
- Outreach retains a 15-second per-call timeout and deterministic template fallback; it does not consume a plan's budget.

## Schemas (`schemas.ts`)

```ts
export const Action = z.enum(["keep", "compress_light", "compress_heavy", "skip"]);
export const ChangedAction = z.enum(["compress_light", "compress_heavy", "skip"]);
export const Localized = z.strictObject({ en: z.string(), pcm: z.string() });
const EnglishText = z.strictObject({ en: z.string() });

export const TriageOutput = z.strictObject({
  items: z.array(z.strictObject({ topicId: z.string(), action: ChangedAction, rationale: EnglishText })),
  summary: EnglishText,
});

export const OutreachOutput = z.object({ message: z.string(), nextStep: z.string() });
```

- `items` contains only shortened or skipped unfinished topics, each at most once. Code expands unlisted unfinished topics to `keep`, with template rationale and computed basis; a fit response has no changed items. Missing change items are valid defaults, not a `MISSING_TOPIC` violation.
- The maintainer chose code-owned ordering on 2026-10-05. There is no `order` field. Code computes the same prerequisite/deadline/weight/course order for all classification, validation and fallback placement; strict parsing rejects an unexpected generated order.
- Pin zod to the major version that `openai/helpers/zod` supports in the installed SDK.
- No length limits inside schemas sent to OpenAI. State limits in the prompt and enforce them after parsing, trimming at a sentence boundary: rationale 20 words, summary 60, message 80, next step 20.

## Prompts (`prompts.ts`)

- One function per call, plus `PROMPT_VERSION`. Bump it whenever a prompt changes.
- Triage: list only shortening/skipping, leaving other topics to code's keep defaults; protected topics may only be kept or lightly shortened. Prefer skipping low exam weight. Explain that displayed capacity and deficit are arithmetic figures, while the 20-minute block rule may leave daily fragments unusable. For a cut, code supplies its feasible fallback's remaining-minute total as a target and exact per-action savings; AI still chooses which topics to change, and code validates the resulting schedule. Prerequisites always precede dependants and inherit their earliest deadline. Write changed-topic rationales and summary in English during the pause, using only input facts and distinguishing simulated course metadata. On retry, quote violations, rejected actions and additional unplaced minutes, then request a complete corrected sparse response.
- Outreach: a short, warm English message from the advisor to the student, based on the reasons, starting with `{firstName}`; plus one concrete next step for the advisor, in English.
- Generated text follows the voice in `PRODUCT_SENSE.md`. It never mentions AI and never promises what an advisor can't deliver.

## Privacy

- Before any AI call, `lib/services` replaces the student's name (including its parts), emails and phone numbers in goal/context with placeholders such as `[name]`, `[email]` and `[phone]`, before building the engine input or cache input. Goal/context limits are 80/120 characters; the UI hints not to include names, phone numbers or employers. Raw free text is never sent or used as cache input. Advisors never receive goal or context.
- `lib/services/advisor.ts` inserts the first name into `{firstName}` after generation.
- `tests/ai-privacy.test.ts`: payloads for both calls and all personas contain no part of a student's name; add email/phone fixtures and verify placeholders, character limits and absence of raw text in prompt/cache inputs. Advisor view data excludes goal/context.

## Cache (`cache.ts`) and `DEMO_MODE`

- Key: sha256 of the call name, `PROMPT_VERSION`, the model and the canonical JSON (sorted keys) of the input, violations included.
- Read before every call; write after every valid response, after length enforcement.
- With `DEMO_MODE=true`: read only. On a miss, return `null` and never touch the network; the caller falls back.
- Source on the plan: `cache` when served from the cache, `ai` when freshly called, `fallback` otherwise.
- The active cache version contains English only. Existing bilingual cache rows remain stored under old prompt-version keys; the engine's localized storage shape remains for later restoration.
- D4 records an AiCacheUse row when a learner reads or writes a response. Delete my data removes that learner's ownership and only removes a response with no remaining owners. The maintainer approved deleting the three legacy unowned rows once during migration; D5 must warm the demo path again.
- Complete reseeding keeps AiCacheUse links for the same stable student ids. The live two-reseed check retains both a cache fixture and its learner ownership, so later Delete my data can still find it.

## Fallbacks

- Triage: the engine's fallback (`specs/engine.md`), source `fallback`.
- Outreach: `outreach.fallback.message` in active English, "{firstName}, I noticed {reason}. Can we talk this week about a plan that fits your time?", where `{reason}` is the top risk reason in English; and `outreach.fallback.nextStep`, "Call this week and offer a catch-up plan."
- For an escalated plan, adapt the advisor's third-person `ESCALATED` reason into a direct-address phrase before inserting it into that same fallback template.

## `demo:warm` (`scripts/demo-warm.ts`)

- Runs the demo path from `PRODUCT_SENSE.md` with live AI against the database `DATABASE_URL` points at: demo reset; Amaka's first plan; mark tonight's session done; +3 days; Amaka's re-plan; Zainab's plan; Tunde's plan (no AI); outreach for Tunde; demo reset again.
- Run it locally with `DEMO_MODE` unset or explicitly `false` and `DATABASE_URL` pointing at production, on Day 5 and after any prompt change. The current ignored `.env` sets `DEMO_MODE=true`; use a one-command `DEMO_MODE=false` override for the approved warm. The runner refuses `DEMO_MODE=true` or missing database/model/key configuration before changing data. It checks that Amaka's two plans and Tunde's outreach came from live AI or cache, checks Tunde's cache ownership, and resets the personas and clock in a `finally` block after a started warm.
- The 2026-10-07 local warm used `gpt-6-sol` and passed; the local cache-only replay returned Amaka `cache/cache`, Zainab `fit`, Tunde `infeasible`, and outreach `cache`. Because the first public Amaka replay missed those local-warmed entries, the public Production path was also warmed directly in a temporary live-AI deployment, then reset. The final Production deployment uses `DEMO_MODE=true`; the full public replay returned Amaka `cache/cache`, Zainab `fit`, Tunde `infeasible`, and outreach `cache`, then reset. The ignored local `.env` selects Sol.
- D5 follow-up (2026-10-08): a later local Playwright deletion test pointed at the shared Production database and removed Amaka's two owned cache entries. The [test isolation fix](../plans/d5-e2e-isolation.md) moved browser mutations to a named local database. An approved public live rewarm restored both entries under the existing $5 cap; the [Ready cache-only deployment](https://vercel.com/heryordejys-projects/back-on-track/3TXdEedmjabKyWawoeMmwUBM3QPY) passed three consecutive public replays and resets. Production `DEMO_MODE` is restored to `true`.
- The cache keys depend on stable seed ids (`specs/data.md`). Reseeding with the same ids keeps the cache valid.

## Tests

- `tests/ai-privacy.test.ts` (above).
- Cache keys: the same input gives the same key; any change in prompt version, model or input gives a different key.
- Length enforcement trims at a sentence boundary.
- Parse failure, timeout and a `DEMO_MODE` miss all return `null`.
- Sparse changes expand to keep defaults; duplicate change items and protected actions are rejected. An unexpected order field fails strict parsing; code-owned prerequisite/order invariants have engine tests. The shared budget never resets between attempts, expiry uses fallback, and domain code never reads a clock for elapsed time.
