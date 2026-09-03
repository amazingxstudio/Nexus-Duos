"use client";

import { useEffect } from "react";
import { useThemeStore, resolveAdaptiveTheme } from "@/store/useThemeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const telegramSyncEnabled = useThemeStore((s) => s.telegramSyncEnabled);
  const telegramColorScheme = useThemeStore((s) => s.telegramColorScheme);

  useEffect(() => {
    function apply() {
      // Telegram sync (when on) always wins over the manual mode picker —
      // see the Settings page, which disables the manual buttons while
      // this is on so the two can't visibly disagree.
      const resolved = telegramSyncEnabled ? telegramColorScheme : mode === "adaptive" ? resolveAdaptiveTheme() : mode;
      document.documentElement.classList.toggle("theme-light", resolved === "light");
    }
    apply();
    // Adaptive mode's day/night boundary still needs a periodic recheck;
    // harmless no-op re-application when Telegram sync is on instead.
    const interval = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode, telegramSyncEnabled, telegramColorScheme]);

  return <>{children}</>;
}
