import type { Language } from "@/lib/i18n";
import type { PlanView } from "@/lib/types";

export const LEARNER_PAGE_CACHE = "back-on-track-learner-pages-v1";
const STORAGE_PREFIX = "back-on-track:student:";

export type OfflineRisk = {
  band: "high" | "medium" | "low";
  reasons: { code: string; params: Record<string, string | number> }[];
  lastActivity: string | null;
  escalated: boolean;
};
export type PlanSnapshot = { version: 1; studentId: string; view: PlanView; risk: OfflineRisk | null };
export type PendingOfflineMutation =
  | { kind: "checkin"; sessionId: string; sessionDate: string; status: "done" | "missed" }
  | { kind: "language"; language: Language };
export type OfflineMutation = PendingOfflineMutation & { id: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Device data for one learner. All reads and writes tolerate disabled storage. */
export function studentStoragePrefix(studentId: string) {
  return `${STORAGE_PREFIX}${studentId}:`;
}

function storageKey(studentId: string, suffix: "snapshot" | "queue") {
  return `${studentStoragePrefix(studentId)}${suffix}`;
}

export function savePlanSnapshot(studentId: string, view: PlanView, risk: OfflineRisk | null): boolean {
  try {
    localStorage.setItem(storageKey(studentId, "snapshot"), JSON.stringify({ version: 1, studentId, view, risk } satisfies PlanSnapshot));
    return true;
  } catch { return false; }
}

export function readPlanSnapshot(studentId: string): PlanSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(studentId, "snapshot"));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || value.studentId !== studentId || !record(value.view)) return null;
    const student = value.view.student;
    const plan = value.view.plan;
    if (!record(student) || student.id !== studentId || (student.language !== "en" && student.language !== "pcm") || typeof value.view.today !== "string") return null;
    if (plan !== null && (!record(plan) || !Array.isArray(plan.sessions) || !Array.isArray(plan.weekSessions) || !Array.isArray(plan.items) || !Array.isArray(plan.warnings) || !Array.isArray(plan.unscheduled) || !Array.isArray(plan.reminders))) return null;
    return value as PlanSnapshot;
  } catch { return null; }
}

function validMutation(value: unknown): value is OfflineMutation {
  if (!record(value) || typeof value.id !== "string") return false;
  if (value.kind === "language") return value.language === "en" || value.language === "pcm";
  return value.kind === "checkin" && typeof value.sessionId === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(value.sessionDate)) && (value.status === "done" || value.status === "missed");
}

/** `null` means the saved queue is corrupt or storage is unavailable; never overwrite it. */
export function readMutationQueue(studentId: string): OfflineMutation[] | null {
  try {
    const raw = localStorage.getItem(storageKey(studentId, "queue"));
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(validMutation) ? value : null;
  } catch { return null; }
}

export function queuedLanguage(studentId: string): Language | null {
  const queue = readMutationQueue(studentId);
  const latest = queue?.findLast((item) => item.kind === "language");
  return latest?.kind === "language" ? latest.language : null;
}

export function enqueueMutation(studentId: string, mutation: PendingOfflineMutation): OfflineMutation | null {
  const queue = readMutationQueue(studentId);
  if (!queue) return null;
  const next: OfflineMutation = { ...mutation, id: crypto.randomUUID() } as OfflineMutation;
  const kept = queue.filter((item) => mutation.kind === "language"
    ? item.kind !== "language"
    : item.kind !== "checkin" || item.sessionId !== mutation.sessionId);
  try {
    localStorage.setItem(storageKey(studentId, "queue"), JSON.stringify([...kept, next]));
    return next;
  } catch { return null; }
}

export function removeMutation(studentId: string, mutationId: string): boolean {
  const queue = readMutationQueue(studentId);
  if (!queue) return false;
  try {
    localStorage.setItem(storageKey(studentId, "queue"), JSON.stringify(queue.filter(({ id }) => id !== mutationId)));
    return true;
  } catch { return false; }
}

export type SyncResult = { synced: number; late: number; pending: number; issue: "conflict" | "network" | "storage" | null };

export async function syncMutationQueue(studentId: string, send: typeof fetch = fetch): Promise<SyncResult> {
  const queue = readMutationQueue(studentId);
  if (!queue) return { synced: 0, late: 0, pending: 0, issue: "storage" };
  let synced = 0;
  let late = 0;
  for (const mutation of queue) {
    try {
      const path = mutation.kind === "checkin" ? `/api/sessions/${encodeURIComponent(mutation.sessionId)}` : `/api/students/${encodeURIComponent(studentId)}`;
      const body = mutation.kind === "checkin"
        ? { status: mutation.status, offlineSessionDate: mutation.sessionDate }
        : { language: mutation.language };
      const response = await send(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      if (!response.ok) return { synced, late, pending: queue.length - synced, issue: response.status === 409 || response.status === 404 ? "conflict" : "network" };
      if (mutation.kind === "checkin") {
        const view = await response.clone().json().catch(() => null) as { today?: string } | null;
        if (view?.today && view.today > mutation.sessionDate) late++;
      }
      if (!removeMutation(studentId, mutation.id)) return { synced, late, pending: queue.length - synced, issue: "storage" };
      synced++;
    } catch { return { synced, late, pending: queue.length - synced, issue: "network" }; }
  }
  return { synced, late, pending: 0, issue: null };
}

export async function prepareLearnerPage(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("MessageChannel" in window)) return false;
  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);
    const worker = registration?.active;
    if (!worker) return false;
    const assets = [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]")]
      .map((element) => element instanceof HTMLScriptElement ? element.src : element.href)
      .filter((url) => url.startsWith(`${location.origin}/_next/static/`));
    return await new Promise<boolean>((resolve) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); resolve(false); }, 15_000);
      channel.port1.onmessage = (event: MessageEvent<{ ready?: boolean }>) => {
        clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data?.ready === true);
      };
      worker.postMessage({ type: "PREPARE_LEARNER", url: location.href, assets: [...new Set(assets)] }, [channel.port2]);
    });
  } catch { return false; }
}

export async function clearAllDemoLocalData(): Promise<boolean> {
  let cleared = true;
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) {
        try { localStorage.removeItem(key); }
        catch { cleared = false; }
      }
    }
  } catch { cleared = false; }
  try { if ("caches" in window) await caches.delete(LEARNER_PAGE_CACHE); }
  catch { cleared = false; }
  window.dispatchEvent?.(new Event("back-on-track:reset"));
  return cleared;
}

export async function clearStudentLocalData(studentId: string): Promise<boolean> {
  let cleared = true;
  const prefix = studentStoragePrefix(studentId);
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) {
        try { localStorage.removeItem(key); }
        catch { cleared = false; }
      }
    }
  } catch { cleared = false; }

  try {
    if ("caches" in window) {
      const path = `/learner/${encodeURIComponent(studentId)}`;
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          const url = new URL(request.url);
          if (url.pathname === path || url.pathname.startsWith(`${path}/`)) await cache.delete(request);
        }
      }
    }
  } catch { cleared = false; }
  return cleared;
}
