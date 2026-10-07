import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { TriageContext, TriageFn, Violation } from "@/lib/engine/types";
import { cacheKey, readCache, writeCache } from "./cache";
import { limitOutreach, limitTriage, OutreachOutput, TriageOutput } from "./schemas";
import { outreachPrompt, triagePrompt, type OutreachContext } from "./prompts";

function configuredModel(): string | null { return process.env.OPENAI_MODEL?.trim() || null; }
function client(): OpenAI | null { return process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 }) : null; }

export async function triage(context: TriageContext, violations: Violation[] = [], signal?: AbortSignal, studentId?: string): ReturnType<TriageFn> {
  const model = configuredModel();
  if (!model) return null;
  const key = cacheKey("triage", model, { context, violations });
  try {
    const cached = TriageOutput.safeParse(await readCache(key, studentId));
    if (cached.success) return { output: cached.data, source: "cache" };
    if (process.env.DEMO_MODE === "true" || signal?.aborted) return null;
    const sdk = client();
    if (!sdk) return null;
    const response = await sdk.responses.parse({ model, input: triagePrompt(context, violations), text: { format: zodTextFormat(TriageOutput, "triage") } }, { signal });
    const parsed = TriageOutput.safeParse(response.output_parsed);
    if (!parsed.success) return null;
    const output = limitTriage(parsed.data);
    await writeCache(key, output, studentId);
    return { output, source: "ai" };
  } catch { return null; }
}

export async function outreach(context: OutreachContext, signal?: AbortSignal, studentId?: string): Promise<{ output: typeof OutreachOutput._output; source: "ai" | "cache" } | null> {
  const model = configuredModel();
  if (!model) return null;
  const key = cacheKey("outreach", model, context);
  try {
    const cached = OutreachOutput.safeParse(await readCache(key, studentId));
    if (cached.success) return { output: cached.data, source: "cache" };
    if (process.env.DEMO_MODE === "true" || signal?.aborted) return null;
    const sdk = client();
    if (!sdk) return null;
    const response = await sdk.responses.parse({ model, input: outreachPrompt(context), text: { format: zodTextFormat(OutreachOutput, "outreach") } }, { signal });
    const parsed = OutreachOutput.safeParse(response.output_parsed);
    if (!parsed.success) return null;
    const output = limitOutreach(parsed.data);
    await writeCache(key, output, studentId);
    return { output, source: "ai" };
  } catch { return null; }
}
