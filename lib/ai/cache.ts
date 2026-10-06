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

export async function readCache(key: string): Promise<unknown | null> {
  return (await getDb().aiCache.findUnique({ where: { key } }))?.response ?? null;
}

export async function writeCache(key: string, response: unknown): Promise<void> {
  const json = response as Prisma.InputJsonValue;
  await getDb().aiCache.upsert({ where: { key }, update: { response: json }, create: { key, response: json } });
}
