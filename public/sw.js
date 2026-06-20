/// <reference lib="webworker" />

const CACHE_NAME = "quoska-shell-v2";

// Static assets to cache on install (app shell)
const SHELL_ASSETS = ["/", "/login", "/manifest.json", "/icons/favicon.svg"];

// Install: cache the app shell (skip in development)
self.addEventListener("install", (event) => {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    // Don't cache anything in dev — avoids stale asset headaches
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch: skip all caching in development
self.addEventListener("fetch", (event) => {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return; // Let the browser handle it normally
  }
  const url = new URL(event.request.url);

  // API calls: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET responses
          if (event.request.method === "GET" && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Authenticated routes: always network-first (never serve stale cached pages)
  if (url.pathname.startsWith("/app/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }),
  );
});
