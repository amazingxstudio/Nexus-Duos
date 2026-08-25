"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Frown, Minus, Swords, Home, Loader2 } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useAuthStore } from "@/store/useAuthStore";

interface MatchResultOverlayProps {
  myScore: number;
  opponentScore: number;
  didWin: boolean | null;
  gameKey: string;
  opponentId: string;
}

// Win / Lose / Draw each get their own short clip, played once as this
// overlay mounts. Files live in the frontend repo's public folder:
//   public/sounds/win.mp3
//   public/sounds/lose.mp3
//   public/sounds/draw.mp3
// Anything under /public is served from the site root, so these resolve
// to /sounds/win.mp3 etc. — no other code changes needed once the three
// files are dropped in.
const SOUND_SRC = { win: "/sounds/win.mp3", lose: "/sounds/lose.mp3", draw: "/sounds/draw.mp3" } as const;

export function MatchResultOverlay({ myScore, opponentScore, didWin, gameKey, opponentId }: MatchResultOverlayProps) {
  const socket = useSocket();
  const soundEnabled = useAuthStore((s) => s.user?.settings.sound_enabled ?? true);
  const [rematch, setRematch] = useState<"idle" | "sent" | "declined">("idle");

  const title = didWin === null ? "Draw" : didWin ? "Victory" : "Defeat";
  const accent = didWin === null ? "text-ink-primary" : didWin ? "text-cyan" : "text-magenta";
  const glow = didWin === null ? "" : didWin ? "shadow-glow-cyan" : "shadow-glow-magenta";
  const Icon = didWin === null ? Minus : didWin ? Trophy : Frown;

  // Plays exactly once, right as the result becomes visible — honors the
  // Sound Effects toggle in Settings. Paused on unmount so it never bleeds
  // into whatever screen comes next (e.g. a rematch getting accepted).
  useEffect(() => {
    if (!soundEnabled) return;
    const src = didWin === null ? SOUND_SRC.draw : didWin ? SOUND_SRC.win : SOUND_SRC.lose;
    const audio = new Audio(src);
    audio.play().catch(() => {
      // Playback can be blocked in some in-app browser contexts — the
      // result is still fully shown visually either way, so this is safe
      // to ignore.
    });
    return () => audio.pause();
  }, [didWin, soundEnabled]);

  // "Duel Again" reuses the existing invite:send flow (see
  // InviteListener.tsx + app/sockets.py) with the same game and opponent
  // pre-filled via is_rematch, instead of sending both players back
  // through Find/Voting. Acceptance is handled globally by InviteListener
  // (it navigates both sockets to the new room) — this component only
  // needs to know if the invite gets declined, to unstick its own button.
  useEffect(() => {
    if (!socket) return;
    function onDeclined() { setRematch("declined"); }
    socket.on("invite:declined", onDeclined);
    return () => { socket.off("invite:declined", onDeclined); };
  }, [socket]);

  function sendRematch() {
    if (rematch === "sent") return;
    socket?.emit("invite:send", { to_user_id: opponentId, game_key: gameKey, is_rematch: true });
    setRematch("sent");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/90 backdrop-blur-glass">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`glass-panel flex flex-col items-center gap-4 border p-8 text-center ${didWin === null ? "border-white/10" : didWin ? "border-cyan/30" : "border-magenta/30"} ${glow}`}
      >
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
          className={`icon-badge h-16 w-16 border ${didWin === null ? "border-white/10" : didWin ? "border-cyan/40" : "border-magenta/40"}`}
        >
          <Icon size={28} strokeWidth={2} className={accent} />
        </motion.span>
        <p className={`font-display text-3xl font-bold ${accent}`}>{title}</p>
        <p className="stat-mono text-2xl text-ink-primary">
          {myScore} <span className="text-ink-faint">–</span> {opponentScore}
        </p>
        <div className="mt-2 flex gap-3">
          {rematch === "sent" ? (
            <span className="btn-primary pointer-events-none opacity-70">
              <Loader2 size={16} className="animate-spin" />
              Waiting for rival…
            </span>
          ) : (
            <button onClick={sendRematch} className="btn-primary">
              <Swords size={16} strokeWidth={2.25} />
              {rematch === "declined" ? "Declined — Try Again" : "Duel Again"}
            </button>
          )}
          <Link href="/" className="btn-ghost"><Home size={16} strokeWidth={2.25} />Home</Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
