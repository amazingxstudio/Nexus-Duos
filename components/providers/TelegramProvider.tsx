"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore, AuthedUser } from "@/store/useAuthStore";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        disableVerticalSwipes?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        HapticFeedback?: { impactOccurred: (style: string) => void };
        colorScheme: "light" | "dark";
      };
    };
  }
}

interface AuthResponse {
  token: string;
  user: AuthedUser;
}

/**
 * Boots the Telegram Mini App SDK, locks the viewport into an app-like
 * shell, then exchanges initData for a Nexus Duos session via
 * POST /auth/telegram (see app/routes/auth.py on the backend).
 */
export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      // Running outside Telegram (e.g. local browser dev) — skip silently.
      setStatus("error", "NOT_IN_TELEGRAM");
      return;
    }

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.("#06060B");
    tg.setBackgroundColor?.("#06060B");

    async function authenticate() {
      setStatus("authenticating");
      try {
        const res = await apiFetch<AuthResponse>("/auth/telegram", {
          method: "POST",
          body: JSON.stringify({ init_data: tg!.initData }),
        });
        setSession(res.token, res.user);
      } catch (err) {
        setStatus("error", err instanceof Error ? err.message : "AUTH_FAILED");
      }
    }

    void authenticate();
  }, [setSession, setStatus]);

  return <>{children}</>;
}
