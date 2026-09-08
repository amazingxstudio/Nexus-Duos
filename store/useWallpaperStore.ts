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
  setMode: (mode: WallpaperMode) => void;
  setCustom: (url: string | null, updatedAt: string | null) => void;
}

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set) => ({
      mode: "original",
      customUrl: null,
      customUpdatedAt: null,
      setMode: (mode) => set({ mode }),
      setCustom: (customUrl, customUpdatedAt) => set({ customUrl, customUpdatedAt }),
    }),
    { name: "nexus-duos-wallpaper" }
  )
);
