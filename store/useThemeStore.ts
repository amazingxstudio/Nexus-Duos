import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "adaptive";

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  /** When true, the resolved theme follows Telegram's own WebApp
   * colorScheme (light/dark) instead of `mode` below — see
   * TelegramProvider.tsx, which is the only place `telegramColorScheme`
   * is ever written, and ThemeProvider.tsx, which is the only place this
   * flag is read. Persisted like `mode` so the choice survives a reload;
   * defaults to false so existing installs keep today's dark-by-default
   * look until someone opts in from Settings. */
  telegramSyncEnabled: boolean;
  setTelegramSyncEnabled: (v: boolean) => void;
  /** Live mirror of Telegram's WebApp.colorScheme, kept current by
   * TelegramProvider's themeChanged listener. Not persisted — it's only
   * ever meaningful while running inside Telegram, so a fresh read on
   * every launch is exactly what's wanted (no stale value from last
   * session's Telegram theme leaking into this one before the real value
   * arrives). Falls back to "dark" if Telegram hasn't reported one yet. */
  telegramColorScheme: "light" | "dark";
  setTelegramColorScheme: (v: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark",
      setMode: (mode) => set({ mode }),
      telegramSyncEnabled: false,
      setTelegramSyncEnabled: (v) => set({ telegramSyncEnabled: v }),
      telegramColorScheme: "dark",
      setTelegramColorScheme: (v) => set({ telegramColorScheme: v }),
    }),
    {
      name: "nexus-duos-theme",
      // telegramColorScheme is intentionally excluded — see its doc
      // comment above for why it should never be restored from a
      // previous session.
      partialize: (state) => ({ mode: state.mode, telegramSyncEnabled: state.telegramSyncEnabled }),
    }
  )
);

/** Adaptive = light 6am–6pm local time, dark otherwise. Only used when
 * telegramSyncEnabled is off — see ThemeProvider.tsx. */
export function resolveAdaptiveTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}
