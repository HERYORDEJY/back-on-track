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
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "http://localhost" }, addEventListener: (name: string, handler: typeof handlers extends Map<string, infer T> ? T : never) => handlers.set(name, handler) },
    caches: { open: async () => cache }, fetch: fetcher, URL, Response,
  });
  function dispatch(url: string, mode = "navigate"): Promise<Response> | null {
    let response: Promise<Response> | null = null;
    handlers.get("fetch")?.({ request: { url, method: "GET", mode }, respondWith: (value) => { response = value; } });
    return response;
  }
  return { dispatch, fetcher, cache };
}

describe("learner service worker", () => {
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
