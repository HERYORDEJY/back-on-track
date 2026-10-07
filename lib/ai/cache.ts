import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { PROMPT_VERSION } from "./prompts";
import type { Prisma } from "@/lib/generated/prisma/client";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item ?? null)).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export function cacheKey(call: "triage" | "outreach", model: string, input: unknown, version = PROMPT_VERSION): string {
  return createHash("sha256").update(canonicalJson({ call, version, model, input })).digest("hex");
}

export async function readCache(key: string, studentId?: string): Promise<unknown | null> {
  if (!studentId) return (await getDb().aiCache.findUnique({ where: { key } }))?.response ?? null;
  return getDb().$transaction(async (tx) => {
    const cached = await tx.aiCache.findUnique({ where: { key } });
    if (cached) await tx.aiCacheUse.upsert({
      where: { key_studentId: { key, studentId } }, update: {}, create: { key, studentId },
    });
    return cached?.response ?? null;
  }, { timeout: 10_000 });
}

export async function writeCache(key: string, response: unknown, studentId?: string): Promise<void> {
  const json = response as Prisma.InputJsonValue;
  if (!studentId) {
    await getDb().aiCache.upsert({ where: { key }, update: { response: json }, create: { key, response: json } });
    return;
  }
  await getDb().$transaction(async (tx) => {
    await tx.aiCache.upsert({ where: { key }, update: { response: json }, create: { key, response: json } });
    await tx.aiCacheUse.upsert({
      where: { key_studentId: { key, studentId } }, update: {}, create: { key, studentId },
    });
  }, { timeout: 10_000 });
}
