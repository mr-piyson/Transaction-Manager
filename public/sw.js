/* eslint-disable no-restricted-globals */
/**
 * Transaction Manager — service worker.
 *
 * Caching policy (deliberately conservative for a financial ERP):
 *
 *   navigations  → network-first with a timeout, then the precached /offline
 *                  page. Page HTML is NEVER written to the cache: it contains
 *                  user-specific financial data and this app is frequently
 *                  used on shared terminals.
 *   /_next/static→ cache-first. Content-hashed filenames make this safe.
 *   icons/fonts  → stale-while-revalidate.
 *   /api/*       → network-only. tRPC payloads and uploads are never cached,
 *                  so the app can never show stale money.
 *
 * Bump VERSION whenever the caching rules or the precache list change: it
 * names the caches and makes the activate handler drop the previous
 * generation (and its stale entries) on the next load.
 */

const VERSION = "v2";
const STATIC_CACHE = `tm-static-${VERSION}`;
const RUNTIME_CACHE = `tm-runtime-${VERSION}`;

const OFFLINE_URL = "/offline.html";
const NAVIGATION_TIMEOUT_MS = 5000;

/**
 * Precached during install so the app has a usable fallback while offline.
 *
 * The offline page is a plain static HTML file on purpose: serving a Next.js
 * document for a *different* URL makes the client router try to load the
 * target route's chunks, which fails offline and shows an application error
 * instead of the offline notice. A standalone file has no router, so it just
 * renders.
 */
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// ---------------------------------------------------------------------------
// Install / activate
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // addAll() is atomic — one 404 would reject the whole install. Add the
      // entries individually so a missing optional asset cannot break the SW.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            // Offline during install: the entry is simply skipped.
          }
        }),
      );

      // On the very first install there is no active worker, so take over
      // immediately and claim the open pages. On updates we deliberately stay
      // in "waiting" until the user accepts the update — otherwise the new
      // worker would swap in mid-session and the "reload to update" prompt
      // would never be seen.
      if (!self.registration.active) {
        await self.skipWaiting();
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("tm-") && !key.endsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------------------------------------------------------------------------
// Messages (from the page)
// ---------------------------------------------------------------------------

self.addEventListener("message", (event) => {
  const type = event.data?.type;

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  // Called on sign-out so nothing from the previous session survives on the
  // device.
  if (type === "CLEAR_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("tm-"))
            .map((key) => caches.delete(key)),
        );
      })(),
    );
  }
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/** Network requests that must never be served from a cache. */
function isExcluded(url, request) {
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/uploads/")) return true;
  // Range requests (media scrubbing) break when served from the cache.
  if (request.headers.has("range")) return true;
  return false;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|svg|webp|avif|ico)$/i.test(
      url.pathname,
    )
  );
}

/** Fetch with a hard timeout so a hanging network cannot block the UI. */
async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function handleNavigation(request) {
  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
    // The document is intentionally NOT written to the cache: it carries
    // user-specific financial data and this app is often used on shared
    // terminals.
    return response;
  } catch {
    // Offline (or too slow). Fall back to the precached offline page.
    const cached = await caches.match(OFFLINE_URL, { cacheName: STATIC_CACHE });

    if (cached) return cached;

    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
        '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
        "<h1>You are offline</h1><p>Please reconnect and try again.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  // Cache-first: hashed build assets never change under the same URL.
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached ?? Response.error();
  }
}

async function handleRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET requests are cacheable.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin traffic is left to the network untouched.
  if (url.origin !== self.location.origin) return;

  if (isExcluded(url, request)) return;

  // Navigations (page loads, client-side router prefetches handled by the
  // browser as 'navigate' mode).
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Immutable build output and icons: serve from cache first.
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Everything else that is same-origin and GET: serve stale content while
  // refreshing in the background.
  event.respondWith(handleRevalidate(request));
});
