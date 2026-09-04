// Local, on-device cache for avatar photos and the app logo/icons.
//
// Why a service worker instead of a fetch()+IndexedDB cache: avatars are
// loaded as plain CSS `background-image: url(...)` pointing straight at
// Telegram's own CDN (t.me / *.telegram.org), which doesn't send this app's
// origin permission to read the response (no CORS headers). A page-level
// fetch() of those URLs would either be rejected outright or come back as
// an unreadable "opaque" body, so there'd be nothing to build a blob: URL
// from. A service worker doesn't have that problem: it intercepts the exact
// request the browser was already going to make for that <img>/background
// image, and can cache the (possibly opaque) response and hand it straight
// back on the next request — the browser can still paint an opaque
// response's bytes even though this script itself can never read them.
//
// This intentionally never talks to our own backend and never stores
// anything server-side; everything below lives only in this device's
// browser storage (the Cache Storage API), scoped to this origin.

const CACHE_NAME = "nexus-duos-image-cache-v1";
const CACHE_PREFIX = "nexus-duos-image-cache-";

function isCacheableImageRequest(request) {
  if (request.method !== "GET") return false;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  // Covers avatars rendered as real <img> elements and the app logo/icons
  // loaded through next/image (as /_next/image?url=...) — modern browsers
  // report this reliably for same-origin image loads.
  if (request.destination === "image") return true;

  // Fallback for avatars, which this app renders as CSS background-image
  // rather than <img> — some WebViews (notably older/embedded ones, which
  // is what this app runs inside via Telegram) don't tag those requests
  // with destination "image", so they're matched by host instead.
  const isTelegramCdn = url.hostname === "t.me" || /(^|\.)telegram\.org$/.test(url.hostname);
  if (isTelegramCdn) return true;

  // The app's own bundled logo, requested directly (unoptimized <img>/CSS
  // use) rather than through next/image.
  if (url.origin === self.location.origin && /^\/logo-mark\.webp$/.test(url.pathname)) return true;

  return false;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Always kick off a network refresh, whether or not we already have a
  // cached copy — this is what keeps the local cache current: the next
  // time this same avatar/logo is requested, the freshest copy fetched
  // here is already sitting in the cache, with no separate "is it stale
  // yet" bookkeeping needed. Opaque cross-origin responses (status 0,
  // Telegram's CDN with no CORS headers) are cacheable too, even though
  // their body can't be inspected here.
  const revalidate = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    // Serve the local copy immediately; `revalidate` above still runs in
    // the background.
    return cached;
  }

  const network = await revalidate;
  if (network) return network;

  // No cached copy and the network attempt failed (fully offline first
  // load, etc.) — let the browser's normal broken-image handling take
  // over rather than hanging the request.
  return fetch(request);
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheableImageRequest(request)) return;
  event.respondWith(staleWhileRevalidate(request));
});
