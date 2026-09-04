"use client";

import { useEffect } from "react";

/**
 * Registers /public/sw.js, which caches avatar photos and the app logo on
 * this device (Cache Storage API) so repeat views don't re-download them
 * every navigation. See sw.js for how and why.
 *
 * Renders nothing — this only runs the registration side effect once on
 * mount. Registration is skipped outright in dev (so local edits to images
 * during development are never masked by a stale cached copy) and on any
 * WebView old enough not to support service workers at all, in which case
 * the app simply falls back to loading avatars/logo uncached, exactly as
 * before this feature existed.
 */
export function ImageCacheRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort only — an embedded WebView that refuses registration
      // (or a network hiccup fetching the worker script) just means this
      // device never gets the local cache; the app works the same either
      // way, only without the caching speedup.
    });
  }, []);

  return null;
}
