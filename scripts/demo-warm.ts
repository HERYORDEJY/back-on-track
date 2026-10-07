import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { getDb } from "@/lib/db";
import { createPlan, getPlanView, checkInSession } from "@/lib/services/plans";
import { draftOutreach } from "@/lib/services/advisor";
import { changeClock } from "@/lib/services/clock";
import { resetDemo } from "@/lib/services/demo";

type WarmOperations = {
  resetDemo: () => Promise<unknown>;
  createPlan: typeof createPlan;
  checkInSession: (sessionId: string, status: "done") => Promise<unknown>;
  changeClock: (jump: { jumpDays: 3 }) => Promise<unknown>;
  getPlanView: typeof getPlanView;
  draftOutreach: (studentId: string) => Promise<{ source: string }>;
  hasTundeOutreachCache: () => Promise<boolean>;
};

export function assertLiveWarmEnvironment(env: Record<string, string | undefined>): void {
  if (env.DEMO_MODE === "true") throw new Error("Unset DEMO_MODE before demo:warm");
  for (const key of ["DATABASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL"] as const) {
    if (!env[key]) throw new Error(`${key} is required for demo:warm`);
  }
}

function validSource(source: string) {
  return source === "ai" || source === "cache";
}

async function resetWithRetry(reset: WarmOperations["resetDemo"]): Promise<void> {
  try { await reset(); }
  catch { await reset(); }
}

/** Run the precise demo path, then restore the personas and clock. */
export async function runDemoWarm(operations: WarmOperations) {
  await resetWithRetry(operations.resetDemo);
  try {
    const first = await operations.createPlan("amaka");
    if (first.plan?.status !== "cut") throw new Error("Amaka's first plan was not a cut plan");
    if (!validSource(first.plan.source)) throw new Error("Amaka's first plan used fallback");
    const featured = first.plan.featuredSession;
    if (!featured || featured.date !== first.today || !featured.editable) throw new Error("Amaka has no editable session today");
    await operations.checkInSession(featured.id, "done");
    await operations.changeClock({ jumpDays: 3 });
    const replan = await operations.getPlanView("amaka");
    if (!replan.plan || replan.plan.version <= first.plan.version || !replan.plan.changeSummary) throw new Error("Amaka's re-plan has no change summary");
    if (!validSource(replan.plan.source)) throw new Error("Amaka re-plan used fallback");

    const zainab = await operations.createPlan("zainab");
    if (zainab.plan?.status !== "fit") throw new Error("Zainab's plan did not fit");
    const tunde = await operations.createPlan("tunde");
    if (tunde.plan?.status !== "infeasible") throw new Error("Tunde's plan was not infeasible");
    const draft = await operations.draftOutreach("tunde");
    if (!validSource(draft.source)) throw new Error("Tunde outreach used fallback");
    if (!await operations.hasTundeOutreachCache()) throw new Error("Tunde outreach cache ownership was not recorded");
    return { firstSource: first.plan.source, replanSource: replan.plan.source, outreachCached: true };
  } finally {
    await resetWithRetry(operations.resetDemo);
  }
}

async function main() {
  dotenv.config({ quiet: true });
  assertLiveWarmEnvironment(process.env);
  const db = getDb();
  try {
    const result = await runDemoWarm({
      resetDemo, createPlan, checkInSession, changeClock, getPlanView, draftOutreach,
      hasTundeOutreachCache: async () => (await db.aiCacheUse.count({ where: { studentId: "tunde" } })) > 0,
    });
    process.stdout.write(`Demo cache warm passed: Amaka ${result.firstSource}/${result.replanSource}; Tunde outreach cached; personas and clock reset.\n`);
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    const message = error instanceof Error && /^(Unset DEMO_MODE|DATABASE_URL|OPENAI_API_KEY|OPENAI_MODEL|Amaka|Zainab|Tunde)/.test(error.message)
      ? error.message : "Demo warm failed; check the database and AI configuration";
    process.stderr.write(`${message}. If warming started, the final demo reset was attempted.\n`);
    process.exitCode = 1;
  });
}
