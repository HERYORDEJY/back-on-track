# AI spec (`lib/ai`)

Two AI calls: triage for plans and outreach for advisors. Both go through a cache and both have a deterministic fallback, so the app never needs the network to show a plan or a message. Server only.

D2 implementation (2026-10-06): `openai` 7.28.0 was approved and pinned for Responses API structured parsing with the existing Zod 4.6.5. Strict schemas, bilingual prompts, canonical cache keys, length enforcement, privacy redaction, shared service budget and cache-only `DEMO_MODE` are built and unit tested. The browser returns a valid Amaka cut plan through fallback when the live API fails. A read-only lookup confirmed the configured model, but live generation returned `429 credit_balance_exhausted`; verify a live AI-sourced plan after credits are available. Production `demo:warm` remains D5 and must wait for budget approval.

## Calls

| Call | Used by | Input | Output |
| --- | --- | --- | --- |
| triage | the engine, injected by `lib/services/plans.ts` | `TriageContext` (`specs/engine.md`), plus violations on a retry | Sparse changed-topic actions and Localized rationales, plus a Localized summary; code owns topic order |
| outreach | `lib/services/advisor.ts` | Risk reasons (codes and params), plan status, the student's language | A message in the student's language starting with `{firstName}`, and one next step in English for the advisor |

## Client (`client.ts`)

- Exports `triage` (the engine's `TriageFn`) and `outreach`. Each reads the cache, calls OpenAI only when allowed, enforces lengths, writes the cache, and returns `null` when there is no valid output.
- OpenAI calls use the Responses API with Structured Outputs: `client.responses.parse({ model: process.env.OPENAI_MODEL, input, text: { format: zodTextFormat(Schema, name) } })`.
- Plan creation has one 20-second elapsed-time budget, shared by the first attempt and up to two correction retries. `lib/services/plans.ts` owns that budget outside the pure engine; each live attempt receives the remaining time via `AbortSignal`, never a fresh 20 seconds. Expiry, network error, refusal or parse failure returns `null` and selects deterministic fallback. `DEMO_MODE` remains cache-only and instant. The live Day 2 exit uses 20 seconds.
- Outreach retains a 15-second per-call timeout and deterministic template fallback; it does not consume a plan's budget.

## Schemas (`schemas.ts`)

```ts
export const Action = z.enum(["keep", "compress_light", "compress_heavy", "skip"]);
export const ChangedAction = z.enum(["compress_light", "compress_heavy", "skip"]);
export const Localized = z.object({ en: z.string(), pcm: z.string() });

export const TriageOutput = z.strictObject({
  items: z.array(z.object({ topicId: z.string(), action: ChangedAction, rationale: Localized })),
  summary: Localized,
});

export const OutreachOutput = z.object({ message: z.string(), nextStep: z.string() });
```

- `items` contains only shortened or skipped unfinished topics, each at most once. Code expands unlisted unfinished topics to `keep`, with template rationale and computed basis; a fit response has no changed items. Missing change items are valid defaults, not a `MISSING_TOPIC` violation.
- The maintainer chose code-owned ordering on 2026-10-05. There is no `order` field. Code computes the same prerequisite/deadline/weight/course order for all classification, validation and fallback placement; strict parsing rejects an unexpected generated order.
- Pin zod to the major version that `openai/helpers/zod` supports in the installed SDK.
- No length limits inside schemas sent to OpenAI. State limits in the prompt and enforce them after parsing, trimming at a sentence boundary: rationale 20 words, summary 60, message 80, next step 20.

## Prompts (`prompts.ts`)

- One function per call, plus `PROMPT_VERSION`. Bump it whenever a prompt changes.
- Triage: explain actions/factors; list only shortening/skipping, leaving other topics to code's keep defaults; protected topics may only be kept or lightly shortened. Prefer skipping low exam weight and change only what is needed for the rounded work to schedule. Prerequisites always precede dependants and inherit their earliest deadline. Write changed-topic rationales and summary in English and everyday Nigerian Pidgin, using only input facts and distinguishing simulated course metadata. On retry, quote violations and request a complete corrected sparse response.
- Outreach: a short, warm message from the advisor to the student in the student's language, based on the reasons, starting with `{firstName}`; plus one concrete next step for the advisor, in English.
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
- Because the AI writes both languages in one call, one cached response covers English and Pidgin.

## Fallbacks

- Triage: the engine's fallback (`specs/engine.md`), source `fallback`.
- Outreach: `outreach.fallback.message` in the student's language, "{firstName}, I noticed {reason}. Can we talk this week about a plan that fits your time?", where `{reason}` is the top risk reason in that language; and `outreach.fallback.nextStep`, "Call this week and offer a catch-up plan."

## `demo:warm` (`scripts/demo-warm.ts`)

- Runs the demo path from `PRODUCT_SENSE.md` with live AI against the database `DATABASE_URL` points at: demo reset; Amaka's first plan; mark tonight's session done; +3 days; Amaka's re-plan; Zainab's plan; Tunde's plan (no AI); outreach for Tunde; demo reset again.
- Run it locally with `DEMO_MODE` unset and `DATABASE_URL` pointing at production, on Day 5 and after any prompt change.
- The cache keys depend on stable seed ids (`specs/data.md`). Reseeding with the same ids keeps the cache valid.

## Tests

- `tests/ai-privacy.test.ts` (above).
- Cache keys: the same input gives the same key; any change in prompt version, model or input gives a different key.
- Length enforcement trims at a sentence boundary.
- Parse failure, timeout and a `DEMO_MODE` miss all return `null`.
- Sparse changes expand to keep defaults; duplicate change items and protected actions are rejected. An unexpected order field fails strict parsing; code-owned prerequisite/order invariants have engine tests. The shared budget never resets between attempts, expiry uses fallback, and domain code never reads a clock for elapsed time.
