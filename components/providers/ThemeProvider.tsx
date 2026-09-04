"use client";

import { useEffect } from "react";
import { useThemeStore, resolveAdaptiveTheme } from "@/store/useThemeStore";
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

  useEffect(() => {
    function apply() {
      // Telegram sync (when on) always wins over the manual mode picker —
      // see the Settings page, which disables the manual buttons while
      // this is on so the two can't visibly disagree.
      const resolved = telegramSyncEnabled ? telegramColorScheme : mode === "adaptive" ? resolveAdaptiveTheme() : mode;
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
    // harmless no-op re-application when Telegram sync is on instead.
    const interval = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode, telegramSyncEnabled, telegramColorScheme, telegramThemeParams]);

  return <>{children}</>;
}
