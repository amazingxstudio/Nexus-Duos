"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useMessagesStore } from "@/store/useMessagesStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useWallpaperStore, WallpaperMode } from "@/store/useWallpaperStore";
import { wallpaperGradientFromTheme } from "@/lib/telegramTheme";

interface SettingsResponse {
  settings: { wallpaper_mode?: WallpaperMode; wallpaper_updated_at?: string | null };
}

/** Resolves once `url` has fully loaded and decoded — never rejects, so a
 *  failed/expired image just means the caller keeps showing whatever was
 *  already there instead of clearing to blank. This is the whole
 *  no-flicker trick: the visible background only ever gets swapped to a
 *  URL that's already known to render. */
function preloadImage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Single mount point for the per-user wallpaper (see backend/app/wallpaper.py
 * — set entirely from the Telegram bot, no upload UI here). Mounted once at
 * the app root (app/layout.tsx, right alongside AmbientBackground) so it
 * never remounts when navigating between Chat and Game, or when the chat
 * sheet opens/closes.
 *
 * Renders nothing at all outside Chat (the global MessagePanel sheet) and
 * Game (a /room/[code] match in progress) — every other page keeps using
 * the plain global AmbientBackground underneath, untouched. Renders nothing
 * for "original" mode even while active, for the same reason: that
 * AmbientBackground is already there and already correct.
 */
export function WallpaperLayer() {
  const pathname = usePathname();
  const chatOpen = useMessagesStore((s) => s.openTarget !== null);
  const isActive = chatOpen || pathname?.startsWith("/room/") === true;

  const token = useAuthStore((s) => s.token);
  const telegramThemeParams = useThemeStore((s) => s.telegramThemeParams);

  const mode = useWallpaperStore((s) => s.mode);
  const customUrl = useWallpaperStore((s) => s.customUrl);
  const customUpdatedAt = useWallpaperStore((s) => s.customUpdatedAt);
  const setMode = useWallpaperStore((s) => s.setMode);
  const setCustom = useWallpaperStore((s) => s.setCustom);

  // Only ever updated once a candidate image has fully decoded — this
  // (not customUrl/mode directly) is what actually gets painted, so
  // switching wallpapers never shows a blank frame while the new one loads.
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);

  // Pulls the authoritative mode/version from the server. Whatever was
  // persisted from last session (via useWallpaperStore's own persist
  // middleware) already painted the instant this component mounted — this
  // just brings it in line with anything set more recently from the bot
  // (e.g. a wallpaper uploaded while this Mini App wasn't even open).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<SettingsResponse>("/settings", { token })
      .then((res) => {
        if (cancelled) return;
        setMode(res.settings.wallpaper_mode ?? "original");
        const updatedAt = res.settings.wallpaper_updated_at ?? null;
        if (!updatedAt) {
          setCustom(null, null);
        } else if (updatedAt !== customUpdatedAt) {
          // The version query param is the whole caching strategy (see
          // routes/profile.py's GET /profile/wallpaper) — it only changes
          // when the user actually replaces their wallpaper, so the
          // browser fetches this exact URL once per version and serves
          // every later load straight from its own HTTP cache.
          const url = `${API_URL}/profile/wallpaper?v=${encodeURIComponent(updatedAt)}&token=${encodeURIComponent(token)}`;
          setCustom(url, updatedAt);
        }
      })
      .catch(() => {
        // Cold-start Render instance, offline, etc. — keep showing
        // whatever was already persisted/rendered rather than erroring.
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Preloads whichever image is currently the "custom" target, regardless
  // of whether Chat/Game is even on screen right now — so the very first
  // time this layer becomes active, the image is already decoded and
  // ready to paint instantly instead of only starting the fetch then.
  useEffect(() => {
    if (mode !== "custom" || !customUrl) {
      if (mode !== "custom") setRenderedImageUrl(null);
      return;
    }
    let cancelled = false;
    preloadImage(customUrl).then((url) => {
      if (!cancelled && url) setRenderedImageUrl(url);
    });
    return () => { cancelled = true; };
  }, [mode, customUrl]);

  if (!isActive) return null;

  if (mode === "custom" && renderedImageUrl) {
    return <div className="wallpaper-layer" style={{ backgroundImage: `url(${renderedImageUrl})` }} />;
  }

  if (mode === "telegram_sync") {
    const gradient = wallpaperGradientFromTheme(telegramThemeParams);
    if (gradient) return <div className="wallpaper-layer" style={{ backgroundImage: gradient }} />;
  }

  // "original" — or telegram_sync/custom with nothing ready to paint yet —
  // render nothing and let the existing global AmbientBackground show
  // through, exactly like every page outside Chat/Game.
  return null;
}
