"use client";

import { useEffect } from "react";
import { useThemeStore, resolveAdaptiveTheme } from "@/store/useThemeStore";
import { useWallpaperStore } from "@/store/useWallpaperStore";
import { applySyncedCssVars, clearSyncedCssVars, computeSyncedCssVars, syncedChromeColorHex } from "@/lib/telegramTheme";

// App defaults for Telegram's own native header/WebView background chrome
// (tg.setHeaderColor/setBackgroundColor) — used whenever Telegram sync is
// off, so turning sync off visibly reverts Telegram's own chrome too, not
// just the in-app content.
const DEFAULT_CHROME_HEX = { dark: "#06060B", light: "#FFFFFF" };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const telegramSyncEnabled = useThemeStore((s) => s.telegramSyncEnabled);
  const telegramColorScheme = useThemeStore((s) => s.telegramColorScheme);
  const telegramThemeParams = useThemeStore((s) => s.telegramThemeParams);
  // Light/dark verdict for whichever wallpaper is actually on screen right
  // now (see WallpaperLayer.tsx and useWallpaperStore's doc comment) —
  // null for "original" wallpaper mode, meaning no override here.
  const wallpaperIsLight = useWallpaperStore((s) => s.detectedIsLight);

  useEffect(() => {
    function apply() {
      // A non-"original" wallpaper wins over everything below it — text
      // and panels need to stay readable against whatever's actually
      // visible behind them, which the manual mode picker / Telegram
      // theme sync can't know about (neither has any idea a photo
      // wallpaper is even on screen). Falls through to the existing
      // manual-mode-or-Telegram-sync resolution whenever there's no
      // active wallpaper override (wallpaperIsLight is null).
      const resolved =
        wallpaperIsLight !== null
          ? wallpaperIsLight ? "light" : "dark"
          : telegramSyncEnabled ? telegramColorScheme : mode === "adaptive" ? resolveAdaptiveTheme() : mode;
      const isLight = resolved === "light";
      document.documentElement.classList.toggle("theme-light", isLight);

      const tg = window.Telegram?.WebApp;
      if (telegramSyncEnabled && telegramThemeParams) {
        // Full theme-param sync (not just the light/dark flag above) —
        // overrides this app's own CSS tokens with Telegram's actual
        // current palette; see lib/telegramTheme.ts for exactly what gets
        // mapped (background/surfaces, text, the primary accent/button
        // color that also drives the bottom nav + ambient "wallpaper"
        // glow, and button text).
        applySyncedCssVars(computeSyncedCssVars(telegramThemeParams));
        const chrome = syncedChromeColorHex(telegramThemeParams);
        if (chrome) { tg?.setHeaderColor?.(chrome); tg?.setBackgroundColor?.(chrome); }
      } else {
        clearSyncedCssVars();
        const chrome = isLight ? DEFAULT_CHROME_HEX.light : DEFAULT_CHROME_HEX.dark;
        tg?.setHeaderColor?.(chrome); tg?.setBackgroundColor?.(chrome);
      }
    }
    apply();
    // Adaptive mode's day/night boundary still needs a periodic recheck;
    // harmless no-op re-application otherwise.
    const interval = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode, telegramSyncEnabled, telegramColorScheme, telegramThemeParams, wallpaperIsLight]);

  return <>{children}</>;
}
