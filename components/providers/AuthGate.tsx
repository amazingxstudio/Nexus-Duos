"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { LoadingProgress } from "@/components/ui/LoadingProgress";

// Shown one line at a time below the logo, each fading/rising in after the
// last — purely a mood-setting intro, not status copy (that's LoadingProgress's job).
const INTRO_LINES = ["Where duels begin.", "Two players. One winner."];

// Plain names only (no store links on file) — shown on the connection-error
// screen below for players to search up themselves.
const VPN_SUGGESTIONS = ["Hidely VPN", "Ninja VPN", "SpeedTop VPN"];

/**
 * One polished, full-screen gate rendered above all page content while the
 * Telegram session is still resolving — replaces the scattered per-page
 * "Signing you in…" fallback text/disabled states that used to live in
 * app/page.tsx, app/find/page.tsx, etc. Once auth resolves to
 * "authenticated", this renders {children} and gets out of the way.
 *
 * "error" gets its own short, VPN-specific screen instead of sitting on
 * the generic loading view forever — TelegramProvider.tsx's retry/backoff
 * (see AUTH_RETRY_DELAYS_MS there) already absorbs a one-off flaky
 * request, so by the time status actually lands on "error" for a real
 * player it's very likely the connection itself (see that file's own
 * comment on why: a cold-start backend or the VPN workaround most Myanmar
 * players are already on can both fail the very first attempt). Excludes
 * the separate "not opened from inside Telegram" case, which isn't a
 * connectivity problem and VPN advice wouldn't fix.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);

  if (status === "authenticated") return <>{children}</>;

  if (status === "error" && error !== "NOT_IN_TELEGRAM") {
    return (
      <div className="fixed inset-0 z-[200] flex min-h-dvh items-center justify-center bg-void px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel flex w-full max-w-xs flex-col items-center gap-4 p-6 text-center"
        >
          <div className="icon-badge h-12 w-12 shrink-0 bg-cyan/15 text-cyan">
            <ShieldCheck size={22} />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-ink-primary">VPN ချိတ်ပြီးမှ ပြန်ဝင်ပါ</p>
            <p className="text-xs leading-relaxed text-ink-muted">
              လိုင်းပိုကောင်းစေရန် VPN ချိတ်ပြီး ဂိမ်းထဲ ပြန်ဝင်ကာ Refresh လုပ်ပေးပါ။
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {VPN_SUGGESTIONS.map((name) => (
              <span key={name} className="rounded-full border border-white/[0.16] bg-white/[0.06] px-3 py-1 text-[11px] text-ink-muted">
                {name}
              </span>
            ))}
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary mt-1 w-full">
            ပြန်စမ်းမယ်
          </button>
        </motion.div>
      </div>
    );
  }

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
