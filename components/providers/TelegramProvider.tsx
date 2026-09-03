"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore, AuthedUser } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";

declare global {
  interface Window {
    Telegram?: { WebApp: {
      ready: () => void; expand: () => void; disableVerticalSwipes?: () => void;
      setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void;
      initData: string; initDataUnsafe: Record<string, unknown>;
      HapticFeedback?: {
        impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
        notificationOccurred: (type: "error" | "success" | "warning") => void;
        selectionChanged: () => void;
      };
      colorScheme: "light" | "dark";
      /** Bot API 6.4+. Reads the device clipboard through Telegram's native
       * bridge — needed because the standard navigator.clipboard.readText()
       * is blocked inside Telegram's in-app WebView on most platforms. */
      readTextFromClipboard?: (callback: (text: string) => void) => void;
      /** Bot API 8.0+. Expands the WebView to true fullscreen (hides
       * Telegram's own compact WebView chrome) — the in-chat inline
       * "Open" button launches compact by default, so the app has to
       * request this itself once loaded to match the persistent
       * chat-list "Open" button's fullscreen launch. */
      requestFullscreen?: () => void;
      isFullscreen?: boolean;
      /** Bot API 8.0+. Additional inset (on top of safeAreaInset) needed to
       * avoid Telegram's OWN floating UI — the fullscreen mode's back
       * caret / "⋮" more-options button that sit directly on top of the
       * WebView content with no reserved header space. This is what
       * top/bottom-right corner elements need to offset against; plain
       * device safe-area (notch) isn't enough for them. */
      contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
      safeAreaInset?: { top: number; bottom: number; left: number; right: number };
      /** Bot API 6.1+. Standard event bus — used here to re-read the insets
       * above whenever they change (entering/exiting fullscreen, rotation),
       * and to pick up live theme/back-button changes. */
      onEvent?: (eventType: string, callback: () => void) => void;
      offEvent?: (eventType: string, callback: () => void) => void;
      BackButton?: {
        show: () => void;
        hide: () => void;
        onClick: (cb: () => void) => void;
        offClick: (cb: () => void) => void;
        isVisible: boolean;
      };
    }; };
  }
}
interface AuthResponse { token: string; user: AuthedUser; }

// Retry/backoff for the initial sign-in request (spec A.2) — a cold-start
// Render instance or a flaky connection (common enough on the VPN
// workaround most Myanmar users are on) can fail the very first attempt
// even though a second one a moment later would succeed. Rather than
// surface the old "login failed" error state on the first hiccup, this
// retries a few times with increasing delay before giving up and handing
// control to AuthGate's existing (network/cold-start) error copy.
const AUTH_RETRY_DELAYS_MS = [1000, 2000, 4000];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setStatus = useAuthStore((s) => s.setStatus);
  const hasRestoredSession = useAuthStore((s) => Boolean(s.token && s.user));
  const setTelegramColorScheme = useThemeStore((s) => s.setTelegramColorScheme);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      if (!hasRestoredSession) setStatus("error", "NOT_IN_TELEGRAM");
      return;
    }
    tg.ready(); tg.expand(); tg.requestFullscreen?.(); tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.("#06060B"); tg.setBackgroundColor?.("#06060B");

    // Telegram's WebView doesn't actually populate the standard CSS
    // env(safe-area-inset-*) variables (0px always, confirmed Telegram-iOS
    // bug), so we read the insets from Telegram's own JS bridge instead and
    // republish them as CSS vars any component can use. contentSafeAreaInset
    // in particular is what pages need to avoid the fullscreen mode's own
    // floating back/"⋮" buttons, which safeAreaInset (device notch only)
    // doesn't account for. Re-applied on the change events since insets
    // shift when fullscreen/orientation changes after mount.
    function applySafeAreaVars() {
      const zero = { top: 0, bottom: 0, left: 0, right: 0 };
      const safe = tg!.safeAreaInset ?? zero;
      const content = tg!.contentSafeAreaInset ?? zero;
      const root = document.documentElement.style;
      (["top", "bottom", "left", "right"] as const).forEach((side) => {
        root.setProperty(`--tg-safe-area-inset-${side}`, `${safe[side]}px`);
        root.setProperty(`--tg-content-safe-area-inset-${side}`, `${content[side]}px`);
      });
    }
    applySafeAreaVars();
    tg.onEvent?.("safeAreaChanged", applySafeAreaVars);
    tg.onEvent?.("contentSafeAreaChanged", applySafeAreaVars);
    tg.onEvent?.("fullscreenChanged", applySafeAreaVars);

    // Theme auto-sync (spec A.5) — mirrors Telegram's own light/dark
    // colorScheme into the theme store. Read once immediately, then kept
    // live via themeChanged; ThemeProvider.tsx decides whether to actually
    // USE this value (only when telegramSyncEnabled is on — see the
    // Settings page toggle), but it costs nothing to keep it current
    // regardless of whether sync is currently on, so flipping the toggle
    // on doesn't need to wait for the next themeChanged event to catch up.
    function applyTelegramColorScheme() {
      setTelegramColorScheme(tg!.colorScheme === "light" ? "light" : "dark");
    }
    applyTelegramColorScheme();
    tg.onEvent?.("themeChanged", applyTelegramColorScheme);

    async function authenticate() {
      if (!hasRestoredSession) setStatus("authenticating");

      for (let attempt = 0; attempt <= AUTH_RETRY_DELAYS_MS.length; attempt++) {
        try {
          const res = await apiFetch<AuthResponse>("/auth/telegram", { method: "POST", body: JSON.stringify({ init_data: tg!.initData }) });
          setSession(res.token, res.user);
          return;
        } catch (err) {
          const isLastAttempt = attempt === AUTH_RETRY_DELAYS_MS.length;
          if (isLastAttempt) {
            if (!hasRestoredSession) setStatus("error", err instanceof Error ? err.message : "AUTH_FAILED");
            return;
          }
          await delay(AUTH_RETRY_DELAYS_MS[attempt]);
        }
      }
    }
    void authenticate();

    return () => {
      tg.offEvent?.("safeAreaChanged", applySafeAreaVars);
      tg.offEvent?.("contentSafeAreaChanged", applySafeAreaVars);
      tg.offEvent?.("fullscreenChanged", applySafeAreaVars);
      tg.offEvent?.("themeChanged", applyTelegramColorScheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
