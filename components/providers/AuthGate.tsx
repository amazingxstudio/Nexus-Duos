"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { LoadingProgress } from "@/components/ui/LoadingProgress";

/**
 * One polished, full-screen gate rendered above all page content while the
 * Telegram session is still resolving — replaces the scattered per-page
 * "Signing you in…" fallback text/disabled states that used to live in
 * app/page.tsx, app/find/page.tsx, etc. Once auth resolves to
 * "authenticated", this renders {children} and gets out of the way.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);

  if (status === "authenticated") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[200] flex min-h-dvh items-center justify-center bg-void px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-xs flex-col items-center gap-6 text-center"
      >
        <div className="relative flex items-center justify-center">
          <span className="absolute -inset-6 rounded-[2rem] border border-violet/40 opacity-40 animate-pulse-glow" />
          {/* Hero logo slot — see /public/logo-mark.webp, a tight crop of
              the wordmark. The box below is sized to the asset's own
              101:48 crop ratio, so object-cover has nothing left to
              trim — the wordmark fills the frame edge-to-edge instead
              of floating small inside it. This is the very first thing
              every player sees, so it's rendered with priority (no
              lazy-load blank flash) at full quality. rounded-2xl +
              overflow-hidden gives the frame itself curved corners. */}
          <div className="relative aspect-[101/48] w-44 overflow-hidden rounded-2xl">
            <Image src="/logo-mark.webp" alt="Nexus Duos" fill priority quality={100} className="object-cover" sizes="176px" />
          </div>
        </div>

        <div>
          <p className="font-display text-xs uppercase tracking-[0.35em] text-violet">Nexus Duos</p>
          <p className="mt-2 text-sm text-ink-muted">Real-time 1v1 duels, one tap away.</p>
        </div>

        {status === "error" ? (
          error === "NOT_IN_TELEGRAM" ? (
            <p className="text-xs text-ink-faint">Open this app from inside Telegram to sign in.</p>
          ) : (
            /* Covers every other auth failure (e.g. the very first request
               after a cold start timing out) — deliberately doesn't name
               the real cause. A VPN + reload nudges the client onto a
               fresh connection, and the arena-themed copy below is there
               to keep someone patient through the ~30s wait rather than
               bouncing off a raw error message. */
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-ink-faint">The arena&apos;s just stirring awake — give it a nudge:</p>
              <ol className="flex flex-col gap-1 text-xs text-ink-muted">
                <li>1. Turn on a VPN</li>
                <li>2. Tap the <span className="text-ink-primary">⋮</span> at the top of this page</li>
                <li>3. Tap <span className="text-ink-primary">Reload Page</span></li>
              </ol>
              <p className="mt-1 text-xs text-ink-faint">Give it about 30 seconds — you&apos;ll be in.</p>
            </div>
          )
        ) : (
          <LoadingProgress label={status === "authenticating" ? "Signing you in…" : "Loading…"} />
        )}
      </motion.div>
    </div>
  );
}
