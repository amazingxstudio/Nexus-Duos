"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore, AuthedUser } from "@/store/useAuthStore";

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
      /** Device-level safe area (notches, status bar, home indicator). */
      safeAreaInset?: { top: number; bottom: number; left: number; right: number };
      /** Bot API 8.0+. Space to avoid Telegram's own floating UI (the
       * header's Close/collapse/⋮ controls in fullscreen mode) — separate
       * from the device's safeAreaInset above. This is the one that
       * matters for content sitting under a fullscreen header. */
      contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
      onEvent?: (eventType: string, callback: () => void) => void;
      offEvent?: (eventType: string, callback: () => void) => void;
    }; };
  }
}
interface AuthResponse { token: string; user: AuthedUser; }

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setStatus = useAuthStore((s) => s.setStatus);
  const hasRestoredSession = useAuthStore((s) => Boolean(s.token && s.user));

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      if (!hasRestoredSession) setStatus("error", "NOT_IN_TELEGRAM");
      return;
    }
    tg.ready(); tg.expand(); tg.requestFullscreen?.(); tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.("#06060B"); tg.setBackgroundColor?.("#06060B");

    // Mirror Telegram's safe-area insets onto CSS variables ourselves —
    // belt and suspenders alongside the --tg-*-inset-* vars Telegram's own
    // script sets, so pages relying on --app-safe-* (see globals.css) stay
    // correct even on a client where that hasn't landed on the CSS side
    // yet, and so they update live when entering/exiting fullscreen.
    function syncSafeAreaVars() {
      const root = document.documentElement.style;
      const safe = tg!.safeAreaInset;
      const content = tg!.contentSafeAreaInset;
      if (safe) {
        root.setProperty("--tg-safe-area-inset-top", `${safe.top}px`);
        root.setProperty("--tg-safe-area-inset-bottom", `${safe.bottom}px`);
        root.setProperty("--tg-safe-area-inset-left", `${safe.left}px`);
        root.setProperty("--tg-safe-area-inset-right", `${safe.right}px`);
      }
      if (content) {
        root.setProperty("--tg-content-safe-area-inset-top", `${content.top}px`);
        root.setProperty("--tg-content-safe-area-inset-bottom", `${content.bottom}px`);
        root.setProperty("--tg-content-safe-area-inset-left", `${content.left}px`);
        root.setProperty("--tg-content-safe-area-inset-right", `${content.right}px`);
      }
    }
    syncSafeAreaVars();
    tg.onEvent?.("safeAreaChanged", syncSafeAreaVars);
    tg.onEvent?.("contentSafeAreaChanged", syncSafeAreaVars);
    tg.onEvent?.("fullscreenChanged", syncSafeAreaVars);

    async function authenticate() {
      if (!hasRestoredSession) setStatus("authenticating");
      try {
        const res = await apiFetch<AuthResponse>("/auth/telegram", { method: "POST", body: JSON.stringify({ init_data: tg!.initData }) });
        setSession(res.token, res.user);
      } catch (err) {
        if (!hasRestoredSession) setStatus("error", err instanceof Error ? err.message : "AUTH_FAILED");
      }
    }
    void authenticate();

    return () => {
      tg.offEvent?.("safeAreaChanged", syncSafeAreaVars);
      tg.offEvent?.("contentSafeAreaChanged", syncSafeAreaVars);
      tg.offEvent?.("fullscreenChanged", syncSafeAreaVars);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
