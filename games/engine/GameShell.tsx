"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { WifiOff, LogOut, X, Ban, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveRoomStore } from "@/store/useActiveRoomStore";

interface GameShellProps {
  remainingMs: number | null;
  totalMs: number;
  myScore: number;
  opponentScore: number;
  opponentDisconnected?: boolean;
  /** True once the match has been voided (a player left while the other
   * side was already disconnected) — replaces the whole shell with a
   * neutral "match cancelled" screen instead of the normal game view. */
  cancelled?: boolean;
  /** Bumped by useGameMatch every time the rival sends a turn-nudge —
   * shakes the whole screen briefly as the reminder. */
  nudgeSignal?: number;
  /** Exit button, after the confirm dialog. Server decides forfeit vs.
   * void based on whether the rival is still connected. */
  onLeave: () => void;
  children: React.ReactNode;
}

export function GameShell({ remainingMs, totalMs, myScore, opponentScore, opponentDisconnected, cancelled, nudgeSignal, onLeave, children }: GameShellProps) {
  const router = useRouter();
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const shakeControls = useAnimation();
  const pct = remainingMs !== null ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 100;
  const urgent = pct < 20;

  // Whose face goes next to which score — my own photo comes straight off
  // the auth store, the rival's comes off whichever side of the active
  // room *isn't* me. Reading this here (rather than threading a
  // photoUrl prop through all 8 *Game.tsx callers) means every game gets
  // the avatar for free the moment GameShell is upgraded, with zero
  // changes needed anywhere else.
  const myUserId = useAuthStore((s) => s.user?.id);
  const myPhotoUrl = useAuthStore((s) => s.user?.photo_url);
  const room = useActiveRoomStore((s) => s.room);
  const opponentPhotoUrl = room ? (room.player1.id === myUserId ? room.player2?.photo_url : room.player1.photo_url) : null;

  useEffect(() => {
    if (!nudgeSignal) return;
    shakeControls.start({ x: [0, -14, 14, -10, 10, -6, 6, 0], transition: { duration: 0.5, ease: "easeInOut" } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudgeSignal]);

  function confirmLeave() {
    onLeave();
    setConfirmingLeave(false);
    // Deliberately no router.push("/") here — the whole point of leaving is
    // to forfeit, and the person forfeiting needs to see that result too
    // (or the "match cancelled" screen, if the rival was already
    // disconnected). Navigating away immediately used to unmount this
    // screen — and tear down the socket listeners with it — before the
    // server's game_finished/game_cancelled broadcast could ever arrive,
    // so the leaver never saw their own Defeat/cancelled screen even
    // though the match ended exactly as intended. Now we just wait: the
    // `cancelled` branch above and each game's own MatchResultOverlay
    // (driven by `status === "finished"`) pick this up automatically,
    // and their own "Home" button is what actually navigates away.
  }

  if (cancelled) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="icon-badge h-16 w-16 border border-white/10">
          <Ban size={26} className="text-ink-muted" />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-ink-primary">Match cancelled</p>
          <p className="mt-1 text-sm text-ink-muted">Your rival's connection dropped before the match finished — nothing was recorded either way.</p>
        </div>
        <button onClick={() => router.push("/")} className="btn-primary">Home</button>
      </div>
    );
  }

  return (
    <motion.div
      animate={shakeControls}
      className="relative flex h-full min-h-0 flex-col overflow-y-auto px-4"
      // Header now sits in NORMAL document flow instead of being
      // absolutely positioned over a ResizeObserver-measured padding
      // reservation. That measured-padding approach (a) depended on the
      // ResizeObserver firing and re-rendering before first paint, which
      // this app's actual Telegram WebView doesn't reliably guarantee,
      // and (b) still left the header and the centering region below as
      // two independent layout calculations that could disagree — in
      // practice the score pills ended up floating over the top of the
      // game board instead of sitting cleanly above it (reported live,
      // reproducing in every game). Normal flow can't overlap by
      // definition: the header takes exactly the height it renders at,
      // and the board area below only ever gets what's actually left —
      // no measuring, no timing window, no drift. paddingTop clears
      // Telegram's own floating back/collapse/⋮ controls the same way
      // the old header's `top` offset used to.
      style={{
        paddingTop: "calc(1.25rem + var(--app-safe-top, 0px))",
        paddingBottom: "calc(2rem + var(--app-safe-bottom, 0px))",
      }}
    >
      <div className="flex shrink-0 items-center justify-between">
        <ScorePill label="You" score={myScore} accent="cyan" photoUrl={myPhotoUrl} />
        <span className="font-display text-xs uppercase tracking-widest text-ink-faint">VS</span>
        <ScorePill label="Rival" score={opponentScore} accent="magenta" photoUrl={opponentPhotoUrl} />
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-3">
        <div className="glass-panel h-2 flex-1 overflow-hidden rounded-full">
          <motion.div
            className={`h-full rounded-full ${urgent ? "bg-magenta" : "bg-gradient-to-r from-cyan to-violet"}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: "linear" }}
          />
        </div>
        <button
          onClick={() => setConfirmingLeave(true)}
          aria-label="Exit match"
          className="icon-badge h-9 w-9 shrink-0 bg-white/5 text-ink-muted"
        >
          <LogOut size={16} />
        </button>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <AnimatePresence>
          {opponentDisconnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-ember/30 bg-ember/10 px-4 py-2 text-center text-sm text-ember"
            >
              <WifiOff size={14} />
              Opponent disconnected — waiting to reconnect…
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex min-h-0 flex-1 overflow-y-auto">
          {/* m-auto (not items-center/justify-center on the parent) is
              deliberate: margin-auto centers this box in both axes when it
              fits, but — unlike items-center/justify-center — the auto
              margins simply collapse toward zero instead of going negative
              when the content is TALLER than the space left below the
              header above, instead of overflowing upward past this
              container's own top edge. overflow-y-auto on the parent means
              anything still too tall even after that scrolls locally
              within this region instead of spilling out. */}
          <div className="m-auto w-full">{children}</div>
        </div>
      </div>

      <AnimatePresence>
        {confirmingLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-void/80 backdrop-blur-glass px-6"
            onClick={() => setConfirmingLeave(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="glass-panel flex w-full max-w-xs flex-col items-center gap-4 p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="icon-badge h-12 w-12 border border-magenta/30 bg-magenta/10">
                <LogOut size={20} className="text-magenta" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-ink-primary">Leave this match?</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {opponentDisconnected
                    ? "Your rival is already gone, so nothing will be recorded."
                    : "Your rival is still here — leaving now counts as a forfeit (a loss for you, a win for them)."}
                </p>
              </div>
              <div className="flex w-full gap-2">
                <button onClick={() => setConfirmingLeave(false)} className="btn-ghost flex-1"><X size={14} />Stay</button>
                <button onClick={confirmLeave} className="btn-primary flex-1 !bg-magenta">Leave</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScorePill({ label, score, accent, photoUrl }: { label: string; score: number; accent: "cyan" | "magenta"; photoUrl?: string | null }) {
  return (
    <motion.div
      key={score}
      initial={{ scale: 1.08 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`glass-panel inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-4 ${accent === "cyan" ? "border-cyan/30" : "border-magenta/30"}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface-raised bg-cover bg-center ${accent === "cyan" ? "border-cyan/40" : "border-magenta/40"}`}
        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
      >
        {!photoUrl && <User size={13} strokeWidth={1.75} className="text-ink-muted" />}
      </span>
      <span className="whitespace-nowrap text-[11px] uppercase tracking-wide text-ink-muted">{label}</span>
      <span className={`stat-mono ml-0.5 whitespace-nowrap text-lg font-semibold ${accent === "cyan" ? "text-cyan" : "text-magenta"}`}>{score}</span>
    </motion.div>
  );
}
