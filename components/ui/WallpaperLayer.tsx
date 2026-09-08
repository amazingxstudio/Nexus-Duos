"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useWallpaperStore, WallpaperMode } from "@/store/useWallpaperStore";
import { wallpaperGradientFromTheme, wallpaperGradientIsLight } from "@/lib/telegramTheme";

interface SettingsResponse {
  settings: {
    wallpaper_mode?: WallpaperMode;
    wallpaper_updated_at?: string | null;
    // Precomputed server-side at upload time (see backend/app/wallpaper.py)
    // — only meaningful when wallpaper_mode is "custom"; null/absent
    // otherwise, same as "no photo on file".
    wallpaper_is_light?: boolean | null;
  };
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
 * never remounts while navigating between pages, opening the chat sheet, or
 * starting a match.
 *
 * Applies app-wide: every page sits on top of it the same way it already
 * sits on top of AmbientBackground (no per-page opt-in needed — none of the
 * page containers paint their own opaque background, so this shows through
 * everywhere, including behind the Message Panel's own translucent glass).
 * Renders nothing for "original" mode (or before an image/gradient is ready
 * to paint), letting the existing global AmbientBackground show through
 * underneath, exactly as before.
 *
 * Also drives the app's text/panel contrast: see the `detectedIsLight`
 * effect below, which pushes a light/dark verdict for whichever wallpaper
 * is actually active into useWallpaperStore for ThemeProvider.tsx to apply
 * — kept here rather than in ThemeProvider itself since this is the one
 * place that already knows which wallpaper is on screen and what its
 * measured/computed brightness is.
 */
export function WallpaperLayer() {
  const token = useAuthStore((s) => s.token);
  const telegramThemeParams = useThemeStore((s) => s.telegramThemeParams);

  const mode = useWallpaperStore((s) => s.mode);
  const customUrl = useWallpaperStore((s) => s.customUrl);
  const customUpdatedAt = useWallpaperStore((s) => s.customUpdatedAt);
  const setMode = useWallpaperStore((s) => s.setMode);
  const setCustom = useWallpaperStore((s) => s.setCustom);
  const setDetectedIsLight = useWallpaperStore((s) => s.setDetectedIsLight);

  // Only ever updated once a candidate image has fully decoded — this
  // (not customUrl/mode directly) is what actually gets painted, so
  // switching wallpapers never shows a blank frame while the new one loads.
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  // Mirrors settings.wallpaper_is_light verbatim — only meaningful while
  // mode === "custom", which the effect below is what actually enforces.
  const [customIsLight, setCustomIsLight] = useState<boolean | null>(null);

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
        setCustomIsLight(res.settings.wallpaper_is_light ?? null);
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

  // Preloads whichever image is currently the "custom" target as soon as
  // it's known, so the very first paint already has a decoded image ready
  // instead of only starting the fetch then.
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

  // Resolves to a light/dark verdict for whichever wallpaper is actually
  // active right now, or null (no override) for "original" — see the
  // detectedIsLight doc comment on useWallpaperStore for what each mode
  // sources its verdict from. Deliberately separate from the two effects
  // above: this one only needs to re-run when the *inputs to the verdict*
  // change, not on every settings poll or image decode.
  useEffect(() => {
    if (mode === "custom") {
      setDetectedIsLight(customIsLight);
    } else if (mode === "telegram_sync") {
      setDetectedIsLight(wallpaperGradientIsLight(telegramThemeParams));
    } else {
      setDetectedIsLight(null);
    }
  }, [mode, customIsLight, telegramThemeParams, setDetectedIsLight]);

  if (mode === "custom" && renderedImageUrl) {
    return <div className="wallpaper-layer" style={{ backgroundImage: `url(${renderedImageUrl})` }} />;
  }

  if (mode === "telegram_sync") {
    const gradient = wallpaperGradientFromTheme(telegramThemeParams);
    if (gradient) return <div className="wallpaper-layer" style={{ backgroundImage: gradient }} />;
  }

  // "original" — or telegram_sync/custom with nothing ready to paint yet —
  // render nothing and let the existing global AmbientBackground show
  // through instead.
  return null;
}
