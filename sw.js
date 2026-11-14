/* Chavruta service worker: app-shell precache, network-first data, cache-first static assets. */
"use strict";

const CACHE_VERSION = "v4-5fd77f";
const SHELL_CACHE = "chavruta-shell-" + CACHE_VERSION;
const ASSET_CACHE = "chavruta-assets-" + CACHE_VERSION;
const DATA_CACHE = "chavruta-data-" + CACHE_VERSION;
const ALL_CACHES = [SHELL_CACHE, ASSET_CACHE, DATA_CACHE];

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./print.css",
  "./personalize.js",
  "./personalize.css",
  "./manifest.webmanifest",
  "./pwa.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(ALL_CACHES);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("chavruta-") && !keep.has(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isDataRequest(url) {
  return url.pathname.indexOf("/data/") !== -1 && /\.(?:js|json|jsonl)$/i.test(url.pathname);
}

function isStaticAsset(url) {
  if (url.pathname.endsWith("/sw.js")) return false;
  if (isDataRequest(url)) return false;
  return /\.(?:css|js|woff2?|ttf|otf|png|svg|ico|webp|jpe?g|gif|webmanifest)$/i.test(url.pathname);
}

function isHtmlRequest(request, url) {
  if (request.mode === "navigate") return true;
  if (request.destination === "document") return true;
  return /\.html?$/i.test(url.pathname) || url.pathname.endsWith("/chavruta-app/");
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (isHtmlRequest(request, new URL(request.url))) {
      const fallback = await cache.match("./index.html") || await cache.match("./");
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }
  if (!isSameOrigin(url)) return;
  if (url.pathname.endsWith("/sw.js")) return;

  if (isHtmlRequest(request, url)) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }
  if (isDataRequest(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});
