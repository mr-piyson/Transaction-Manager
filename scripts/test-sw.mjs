#!/usr/bin/env node
//
// test-sw.mjs — exercises public/sw.js inside a mocked ServiceWorker
// environment. Run with: node scripts/test-sw.mjs
//
// Verifies the caching contract the ERP depends on:
//   1. navigations fall back to the precached /offline page when offline
//   2. /_next/static assets are served from the cache (cache-first)
//   3. /api/* is never cached and never served from the cache
//   4. cross-origin requests are left untouched
//   5. the activate step drops caches from older versions

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = readFileSync(join(ROOT, "public", "sw.js"), "utf8");

const ORIGIN = "https://app.example.com";

// --- Minimal CacheStorage mock ---------------------------------------------

class FakeCache {
  constructor() {
    this.store = new Map();
  }
  key(request) {
    return typeof request === "string"
      ? request
      : new URL(request.url).pathname;
  }
  async match(request) {
    return this.store.get(this.key(request)) ?? undefined;
  }
  async put(request, response) {
    this.store.set(this.key(request), response);
  }
  async delete(request) {
    return this.store.delete(this.key(request));
  }
  async addAll() {}
}

const cacheStorage = new Map();
const caches = {
  async open(name) {
    if (!cacheStorage.has(name)) cacheStorage.set(name, new FakeCache());
    return cacheStorage.get(name);
  },
  async keys() {
    return [...cacheStorage.keys()];
  },
  async delete(name) {
    return cacheStorage.delete(name);
  },
  async match(request, options) {
    const cache = options?.cacheName
      ? cacheStorage.get(options.cacheName)
      : [...cacheStorage.values()][0];
    return cache?.match(request);
  },
};

// --- Network mock ----------------------------------------------------------

let networkMode = "online";
const networkCalls = [];

function makeResponse(body, init = {}) {
  const response = new Response(body, {
    status: init.status ?? 200,
    headers: init.headers ?? { "Content-Type": "text/html" },
  });
  // Real browser fetch() responses are same-origin ("basic"); Node's Response
  // defaults to "default". The worker branches on this, so mirror the browser.
  Object.defineProperty(response, "type", { value: "basic" });
  return response;
}

async function fakeFetch(input) {
  const url =
    typeof input === "string" ? new URL(input, ORIGIN) : new URL(input.url);
  networkCalls.push(url.pathname);

  if (networkMode === "offline") throw new TypeError("Failed to fetch");

  if (url.pathname === "/offline.html") {
    return makeResponse("<html>offline page</html>");
  }
  if (url.pathname.startsWith("/_next/static/")) {
    return makeResponse("/* js chunk */", {
      headers: { "Content-Type": "application/javascript" },
    });
  }
  if (url.pathname.startsWith("/api/")) {
    return makeResponse('{"result":{}}', {
      headers: { "Content-Type": "application/json" },
    });
  }
  return makeResponse("<html>page</html>");
}

// --- ServiceWorker global mock --------------------------------------------

const listeners = { install: [], activate: [], fetch: [], message: [] };

const skipWaitingCalls = [];

const self = {
  addEventListener(type, handler) {
    listeners[type].push(handler);
  },
  skipWaiting: async () => {
    skipWaitingCalls.push(true);
  },
  clients: { claim: async () => {} },
  location: new URL(ORIGIN),
  // Mirrors the browser: `registration.active` is the currently active
  // worker (null during the very first install).
  registration: { active: null },
};

const sandbox = {
  self,
  caches,
  fetch: fakeFetch,
  Response,
  Request,
  URL,
  console,
  setTimeout,
  clearTimeout,
  AbortController,
  Promise,
  Event: class {},
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(SOURCE, sandbox);

// --- Helpers ---------------------------------------------------------------

function makeRequest(path, init = {}) {
  const url = new URL(path, ORIGIN);
  // Node's Request constructor rejects mode:"navigate" — strip it and define
  // it afterwards so the worker sees what the browser would send.
  const { mode, ...requestInit } = init;
  const request = new Request(url, requestInit);
  if (mode) {
    Object.defineProperty(request, "mode", { value: mode });
  }
  return request;
}

/**
 * Drives the worker's fetch handler and returns the resulting Response.
 *
 * Returns `null` when the worker did not call respondWith() — that is how
 * the browser is told to handle the request itself (excluded routes).
 */
async function dispatchFetch(request) {
  let resolveResponse;
  const promise = new Promise((resolve) => {
    resolveResponse = resolve;
  });

  let handled = false;
  listeners.fetch.forEach((handler) => {
    handler({
      request,
      respondWith: (value) => {
        handled = true;
        resolveResponse(value);
      },
      waitUntil: () => {},
    });
  });

  if (!handled) return null;
  return promise;
}

function installDone() {
  const done = new Promise((resolve) => {
    const handler = listeners.install[0];
    handler({
      waitUntil: (promise) => promise.then(resolve),
    });
  });
  return done;
}

// --- Tests -----------------------------------------------------------------

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

// Install the worker (precaches /offline and the icons).
await installDone();

await test("navigation falls back to the precached /offline page when offline", async () => {
  networkMode = "offline";
  try {
    const response = await dispatchFetch(
      makeRequest("/erp/invoices", { mode: "navigate" }),
    );
    const body = await response.text();
    assert.match(body, /offline page/);
  } finally {
    networkMode = "online";
  }
});

await test("navigation succeeds from the network when online", async () => {
  const response = await dispatchFetch(
    makeRequest("/erp/invoices", { mode: "navigate" }),
  );
  const body = await response.text();
  assert.match(body, /<html>page<\/html>/);
});

await test("navigations are never written to the cache", async () => {
  const runtime = await caches.open("tm-runtime-v2");
  assert.equal(runtime.store.size, 0, "runtime cache should stay empty");
});

await test("/_next/static assets are served cache-first", async () => {
  const request = makeRequest("/_next/static/chunks/app.js");

  const first = await dispatchFetch(request);
  assert.match(await first.text(), /js chunk/);

  // Now go offline: the cached copy must still be served.
  networkMode = "offline";
  try {
    const second = await dispatchFetch(
      makeRequest("/_next/static/chunks/app.js"),
    );
    assert.match(await second.text(), /js chunk/);
  } finally {
    networkMode = "online";
  }
});

await test("/api/* is never cached", async () => {
  const before = networkCalls.length;
  const response = await dispatchFetch(makeRequest("/api/trpc/invoice.list"));
  assert.equal(response, null, "API routes must bypass the worker entirely");

  const runtime = await caches.open("tm-runtime-v2");
  const staticCache = await caches.open("tm-static-v2");
  assert.equal(runtime.store.size, 0);
  assert.equal(staticCache.store.size > 0, true); // only the precache entries
  assert.equal(networkCalls.length, before, "the worker must not fetch it");
});

await test("cross-origin requests bypass the worker", async () => {
  let handled = false;
  const request = new Request("https://cdn.example.com/lib.js");
  listeners.fetch.forEach((handler) => {
    handler({
      request,
      respondWith: () => {
        handled = true;
      },
      waitUntil: () => {},
    });
  });
  assert.equal(handled, false, "cross-origin requests must not be intercepted");
});

await test("non-GET requests bypass the worker", async () => {
  let handled = false;
  const request = makeRequest("/api/trpc/invoice.create", { method: "POST" });
  listeners.fetch.forEach((handler) => {
    handler({
      request,
      respondWith: () => {
        handled = true;
      },
      waitUntil: () => {},
    });
  });
  assert.equal(handled, false, "POST requests must not be intercepted");
});

await test("the first install takes over immediately", async () => {
  assert.equal(
    skipWaitingCalls.length,
    1,
    "a worker with no predecessor must skipWaiting so it can claim the page",
  );
});

await test("an update waits until the page asks for it", async () => {
  // Simulate a second install over an already-active worker.
  self.registration.active = { state: "activated" };
  await installDone();
  assert.equal(
    skipWaitingCalls.length,
    1,
    "an update must stay in 'waiting' so the reload prompt stays visible",
  );
  self.registration.active = null;
});

await test("activate drops caches from older versions", async () => {
  await caches.open("tm-static-v0");
  await caches.open("tm-runtime-v0");

  await new Promise((resolve) => {
    listeners.activate[0]({ waitUntil: (promise) => promise.then(resolve) });
  });

  const keys = await caches.keys();
  assert.equal(keys.includes("tm-static-v0"), false);
  assert.equal(keys.includes("tm-runtime-v0"), false);
  assert.equal(keys.includes("tm-static-v2"), true);
});

// --- Report ----------------------------------------------------------------

let failed = 0;
for (const result of results) {
  if (result.ok) {
    console.log(`  ✓ ${result.name}`);
  } else {
    failed++;
    console.log(`  ✗ ${result.name}`);
    console.log(`    ${result.error.message}`);
  }
}

console.log(
  `\n${results.length - failed}/${results.length} service worker tests passed`,
);
process.exit(failed === 0 ? 0 : 1);
