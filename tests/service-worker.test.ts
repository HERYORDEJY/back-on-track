import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers = new Map<string, (event: { request: { url: string; method: string; mode: string }; respondWith: (response: Promise<Response>) => void }) => void>();
  const stored = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (request: { url: string }) => stored.get(request.url)?.clone()),
    put: vi.fn(async (request: { url: string }, response: Response) => { stored.set(request.url, response.clone()); }),
    add: vi.fn(),
  };
  const fetcher = vi.fn(async () => new Response("<html>Saved plan</html>", { status: 200 }));
  const deleteCache = vi.fn(async () => true);
  const claim = vi.fn(async () => {});
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "http://localhost" }, clients: { claim }, addEventListener: (name: string, handler: typeof handlers extends Map<string, infer T> ? T : never) => handlers.set(name, handler) },
    caches: { open: async () => cache, delete: deleteCache }, fetch: fetcher, URL, Response,
  });
  function dispatch(url: string, mode = "navigate"): Promise<Response> | null {
    let response: Promise<Response> | null = null;
    handlers.get("fetch")?.({ request: { url, method: "GET", mode }, respondWith: (value) => { response = value; } });
    return response;
  }
  async function activate() {
    let settled: Promise<unknown> | null = null;
    handlers.get("activate")?.({ waitUntil: (value: Promise<unknown>) => { settled = value; } } as never);
    await settled;
  }
  return { dispatch, activate, fetcher, cache, deleteCache, claim };
}

describe("learner service worker", () => {
  it("discards the old bilingual page and asset caches on activation", async () => {
    const subject = worker();
    await subject.activate();
    expect(subject.deleteCache).toHaveBeenCalledWith("back-on-track-learner-pages-v1");
    expect(subject.deleteCache).toHaveBeenCalledWith("back-on-track-static-v1");
    expect(subject.claim).toHaveBeenCalledOnce();
  });
  it("does not intercept API or advisor requests", () => {
    const subject = worker();
    expect(subject.dispatch("http://localhost/api/plan")).toBeNull();
    expect(subject.dispatch("http://localhost/advisor")).toBeNull();
    expect(subject.fetcher).not.toHaveBeenCalled();
  });

  it("keeps the last successful learner page for a later offline navigation", async () => {
    const subject = worker();
    const path = "http://localhost/learner/amaka";
    expect(await (await subject.dispatch(path))?.text()).toContain("Saved plan");
    expect(subject.cache.put).toHaveBeenCalledOnce();
    subject.fetcher.mockRejectedValueOnce(new Error("offline"));
    expect(await (await subject.dispatch(path))?.text()).toContain("Saved plan");
    expect(subject.cache.put).toHaveBeenCalledOnce();
  });
});
