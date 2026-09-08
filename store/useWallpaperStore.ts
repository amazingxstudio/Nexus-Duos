import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WallpaperMode = "original" | "telegram_sync" | "custom";

interface WallpaperState {
  /** Set entirely from the Telegram bot (see backend/app/wallpaper.py) —
   * this app has no upload UI. Mirrored from GET /settings by
   * WallpaperLayer.tsx, and persisted here so the last known mode applies
   * immediately on next launch, before that fetch even resolves. */
  mode: WallpaperMode;
  /** Fully-built `/profile/wallpaper` URL for the current custom
   * wallpaper — already includes the `?v=` cache-busting version and the
   * session token as a query param (a plain <img>/CSS background-image
   * request can't carry a custom Authorization header, see
   * dependencies.require_auth_image on the backend). Persisted alongside
   * `mode`/`customUpdatedAt` so WallpaperLayer can start decoding the last
   * known image immediately on next launch rather than waiting on the
   * settings fetch. Null whenever there's no custom image on file. */
  customUrl: string | null;
  /** Mirrors UserWallpaper.updated_at from the backend — the version this
   * app's whole wallpaper caching strategy is built on (see
   * WallpaperLayer.tsx and routes/profile.py's GET /profile/wallpaper):
   * it changes only when the user actually replaces their wallpaper via
   * the bot, so it's what decides whether `customUrl` needs rebuilding. */
  customUpdatedAt: string | null;
  /** Whether the *current* wallpaper (whichever `mode` is active) reads as
   * light overall — null means "no override, use the manual/Telegram-sync
   * theme choice as normal" (this is always the case for "original" mode).
   * For "custom" it mirrors UserWallpaper.is_light from GET /settings
   * (precomputed at upload time — see backend/app/wallpaper.py); for
   * "telegram_sync" it's computed client-side from the same theme colors
   * the gradient itself is built from (see
   * lib/telegramTheme.ts#wallpaperGradientIsLight). Persisted for the same
   * no-flash-on-launch reason as customUrl above; read by
   * ThemeProvider.tsx to decide the app's text/panel contrast. */
  detectedIsLight: boolean | null;
  setMode: (mode: WallpaperMode) => void;
  setCustom: (url: string | null, updatedAt: string | null) => void;
  setDetectedIsLight: (v: boolean | null) => void;
}

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set) => ({
      mode: "original",
      customUrl: null,
      customUpdatedAt: null,
      detectedIsLight: null,
      setMode: (mode) => set({ mode }),
      setCustom: (customUrl, customUpdatedAt) => set({ customUrl, customUpdatedAt }),
      setDetectedIsLight: (detectedIsLight) => set({ detectedIsLight }),
    }),
    { name: "nexus-duos-wallpaper" }
  )
);
