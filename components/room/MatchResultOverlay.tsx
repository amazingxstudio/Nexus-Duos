"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Frown, Minus, Swords, Home, RefreshCw, Check, UserPlus } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { playWinSound, playLoseSound, playDrawSound } from "@/lib/sound";
import { hapticNotify } from "@/lib/haptics";

interface MatchResultOverlayProps {
  myScore: number;
  opponentScore: number;
  didWin: boolean | null;
  /** Needed to send a "play this exact game again" rematch invite. */
  gameKey: string;
  opponentId: string;
}

type RematchState = "idle" | "waiting" | "declined";

export function MatchResultOverlay({ myScore, opponentScore, didWin, gameKey, opponentId }: MatchResultOverlayProps) {
  const socket = useSocket();
  const token = useAuthStore((s) => s.token);
  const [rematch, setRematch] = useState<RematchState>("idle");
  const [friendAdded, setFriendAdded] = useState(false);

  const title = didWin === null ? "Draw" : didWin ? "Victory" : "Defeat";
  const accent = didWin === null ? "text-ink-primary" : didWin ? "text-cyan" : "text-magenta";
  const glow = didWin === null ? "" : didWin ? "shadow-glow-cyan" : "shadow-glow-magenta";
  const Icon = didWin === null ? Minus : didWin ? Trophy : Frown;

  // Fire the result sound + haptic once, right as the overlay mounts.
  useEffect(() => {
    if (didWin === null) { playDrawSound(); hapticNotify("warning"); }
    else if (didWin) { playWinSound(); hapticNotify("success"); }
    else { playLoseSound(); hapticNotify("error"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the rival declines our rematch request, reset the button instead of
  // leaving it stuck on "waiting" forever. invite:accepted is handled
  // globally by InviteListener (it routes both sides into the new room),
  // so there's nothing to do here on acceptance.
  useEffect(() => {
    if (!socket) return;
    function onDeclined(data: { by_user_id: string }) {
      if (data.by_user_id === opponentId) {
        setRematch("declined");
        setTimeout(() => setRematch("idle"), 2500);
      }
    }
    socket.on("invite:declined", onDeclined);
    return () => { socket.off("invite:declined", onDeclined); };
  }, [socket, opponentId]);

  function requestRematch() {
    if (rematch === "waiting") return;
    socket?.emit("invite:send", { to_user_id: opponentId, game_key: gameKey, is_rematch: true });
    setRematch("waiting");
  }

  // Only the opponent's user_id is on hand here (not their player_id), so
  // this goes through /players/friends' user_id lookup path.
  async function addFriend() {
    if (friendAdded) return;
    try {
      await apiFetch("/players/friends", { method: "POST", token, body: JSON.stringify({ user_id: opponentId }) });
      setFriendAdded(true);
    } catch {
      // Non-critical — leave the button tappable again on failure.
    }
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
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <button onClick={requestRematch} disabled={rematch === "waiting"} className="btn-primary disabled:opacity-60">
              {rematch === "waiting" ? <RefreshCw size={16} strokeWidth={2.25} className="animate-spin" /> : <Swords size={16} strokeWidth={2.25} />}
              Duel Again
            </button>
            <Link href="/" className="btn-ghost"><Home size={16} strokeWidth={2.25} />Home</Link>
          </div>
          <button onClick={addFriend} disabled={friendAdded} className="flex items-center gap-1.5 text-xs text-ink-muted disabled:text-cyan">
            {friendAdded ? <Check size={12} /> : <UserPlus size={12} />}
            {friendAdded ? "Added as friend" : "Add as friend"}
          </button>
          {rematch === "waiting" && (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Check size={12} className="text-cyan" />Waiting for your rival to confirm…
            </p>
          )}
          {rematch === "declined" && <p className="text-xs text-magenta">Rival declined the rematch.</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
