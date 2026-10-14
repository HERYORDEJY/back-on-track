const LEARNER_PAGES = "back-on-track-learner-pages-v2";
const STATIC_ASSETS = "back-on-track-static-v2";
const OLD_CACHES = ["back-on-track-learner-pages-v1", "back-on-track-static-v1"];

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  await Promise.all(OLD_CACHES.map((name) => caches.delete(name)));
  await self.clients.claim();
})()));

function learnerPath(pathname) {
  return /^\/learner\/[^/]+\/?$/.test(pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_ASSETS);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return await cache.match(request) ?? Response.error();
      }
    })());
    return;
  }

  if (request.mode === "navigate" && learnerPath(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(LEARNER_PAGES);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        const saved = await cache.match(request);
        if (saved) return saved;
        return Response.error();
      }
    })());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_LEARNER") return;
  event.waitUntil((async () => {
    let ready = false;
    try {
      const page = new URL(event.data.url);
      if (page.origin !== self.location.origin || !learnerPath(page.pathname)) throw new Error("Invalid learner URL");
      const pageCache = await caches.open(LEARNER_PAGES);
      const response = await fetch(page.href, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Page unavailable");
      await pageCache.put(page.href, response);
      const assets = Array.isArray(event.data.assets) ? event.data.assets : [];
      const staticCache = await caches.open(STATIC_ASSETS);
      await Promise.all(assets.filter((value) => typeof value === "string").map(async (value) => {
        const asset = new URL(value, self.location.origin);
        if (asset.origin !== self.location.origin || !asset.pathname.startsWith("/_next/static/")) return;
        await staticCache.add(asset.href);
      }));
      ready = true;
    } catch { /* The page stays online; the registration UI offers retry. */ }
    event.ports[0]?.postMessage({ ready });
  })());
});
