"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { LoadingProgress } from "@/components/ui/LoadingProgress";

// Shown one line at a time below the logo, each fading/rising in after the
// last — purely a mood-setting intro, not status copy (that's LoadingProgress's job).
const INTRO_LINES = ["Where duels begin.", "Two players. One winner."];

/**
 * One polished, full-screen gate rendered above all page content while the
 * Telegram session is still resolving — replaces the scattered per-page
 * "Signing you in…" fallback text/disabled states that used to live in
 * app/page.tsx, app/find/page.tsx, etc. Once auth resolves to
 * "authenticated", this renders {children} and gets out of the way.
 *
 * There's no more dedicated "couldn't sign in" screen here — an "error"
 * status just keeps showing the same loading view as everything else
 * pre-auth, rather than swapping to troubleshooting copy.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);

  if (status === "authenticated") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[200] flex min-h-dvh items-center justify-center bg-void px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-xs flex-col items-center gap-6 text-center"
      >
        {/* Hero logo slot — see /public/logo-mark.webp, a tight crop of
            the wordmark. The box below is sized to the asset's own
            101:48 crop ratio, so object-cover has nothing left to
            trim — the wordmark fills the frame edge-to-edge instead
            of floating small inside it. This is the very first thing
            every player sees, so it's rendered with priority (no
            lazy-load blank flash) at full quality. rounded-2xl +
            overflow-hidden gives the frame itself curved corners — no
            outer glow ring around it anymore, just the frame itself. */}
        <div className="relative aspect-[101/48] w-64 overflow-hidden rounded-2xl">
          <Image src="/logo-mark.webp" alt="Nexus Duos" fill priority quality={100} className="object-cover" sizes="256px" />
        </div>

        <div className="flex flex-col gap-1">
          {INTRO_LINES.map((line, i) => (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm text-ink-muted"
            >
              {line}
            </motion.p>
          ))}
        </div>

        <LoadingProgress label={status === "authenticating" ? "Signing you in…" : "Loading…"} />
      </motion.div>
    </div>
  );
}
