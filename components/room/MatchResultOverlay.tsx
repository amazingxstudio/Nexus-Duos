"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Frown, Minus, Swords, Home, RefreshCw, Check, UserPlus } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { playWinSound, playLoseSound, playDrawSound, playConfettiPopSound } from "@/lib/sound";
import { hapticNotify } from "@/lib/haptics";

const CONFETTI_COLORS = ["rgb(var(--color-cyan))", "rgb(var(--color-magenta))", "rgb(var(--color-violet))", "rgb(var(--color-ember))"];

/** 15-20 small squares/dots that pop out from the center and scatter,
 * rotating and fading over ~1-1.5s — purely decorative, so it renders
 * itself once from a fixed random layout (useMemo) rather than reacting
 * to any state. */
function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 70 + Math.random() * 100;
        return {
          id: i,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size: 5 + Math.random() * 5,
          rotation: (Math.random() - 0.5) * 520,
          round: Math.random() < 0.5,
          delay: Math.random() * 0.12,
          duration: 0.9 + Math.random() * 0.5,
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy, rotate: p.rotation }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: "50%",
            top: "36%",
            width: p.size,
            height: p.size,
            borderRadius: p.round ? "50%" : 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

const DEFEAT_COLORS = ["rgb(var(--color-ink-faint))", "rgb(var(--color-magenta-dim))"];

/** A handful of muted particles that droop downward and fade, slower and
 * quieter than the win confetti — visually distinct in tone without being
 * unkind about it. Same particle-system approach as ConfettiBurst above,
 * just falling instead of scattering outward. */
function DefeatDroop() {
  const particles = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: i,
        color: DEFEAT_COLORS[i % DEFEAT_COLORS.length],
        x: (Math.random() - 0.5) * 160,
        fall: 60 + Math.random() * 50,
        width: 4 + Math.random() * 3,
        height: 8 + Math.random() * 6,
        delay: Math.random() * 0.4,
        duration: 1.5 + Math.random() * 0.6,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 0.65, x: p.x, y: -8, rotate: 0 }}
          animate={{ opacity: 0, y: p.fall, rotate: (Math.random() - 0.5) * 40 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            left: "50%",
            top: "32%",
            width: p.width,
            height: p.height,
            borderRadius: 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

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
  const [friendBusy, setFriendBusy] = useState(false);

  const title = didWin === null ? "Draw" : didWin ? "Victory" : "Defeat";
  const accent = didWin === null ? "text-ink-primary" : didWin ? "text-cyan" : "text-magenta";
  const glow = didWin === null ? "" : didWin ? "shadow-glow-cyan" : "shadow-glow-magenta";
  const Icon = didWin === null ? Minus : didWin ? Trophy : Frown;

  // Fire the result sound + haptic once, right as the overlay mounts. The
  // confetti pop is timed slightly after the win chime so it reads as a
  // follow-up beat synced to the burst, not a third sound competing with it.
  useEffect(() => {
    if (didWin === null) { playDrawSound(); hapticNotify("warning"); }
    else if (didWin) {
      playWinSound();
      hapticNotify("success");
      const t = setTimeout(() => playConfettiPopSound(), 140);
      return () => clearTimeout(t);
    }
    else { playLoseSound(); hapticNotify("error"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The button previously always started as "Add as friend", even when the
  // two players were already friends from an earlier match — check once on
  // mount instead of assuming.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ is_friend: boolean }>(`/players/friends/status?user_id=${encodeURIComponent(opponentId)}`, { token })
      .then((res) => { if (!cancelled) setFriendAdded(res.is_friend); })
      .catch(() => {
        // Non-critical — leave the button in its default "Add as friend"
        // state on failure rather than blocking the overlay on it.
      });
    return () => { cancelled = true; };
  }, [opponentId, token]);

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
  // this goes through /players/friends' user_id lookup path both ways.
  async function toggleFriend() {
    if (friendBusy) return;
    setFriendBusy(true);
    try {
      if (friendAdded) {
        await apiFetch("/players/friends/remove", { method: "POST", token, body: JSON.stringify({ user_id: opponentId }) });
        setFriendAdded(false);
      } else {
        await apiFetch("/players/friends", { method: "POST", token, body: JSON.stringify({ user_id: opponentId }) });
        setFriendAdded(true);
      }
    } catch {
      // Non-critical — leave the button tappable again on failure.
    } finally {
      setFriendBusy(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/90 backdrop-blur-glass">
      {didWin === true && <ConfettiBurst />}
      {didWin === false && <DefeatDroop />}
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
          <button onClick={toggleFriend} disabled={friendBusy} className="flex items-center gap-1.5 text-xs text-ink-muted disabled:opacity-60">
            {friendAdded ? <Check size={12} className="text-cyan" /> : <UserPlus size={12} />}
            <span className={friendAdded ? "text-cyan" : ""}>{friendAdded ? "Added ✓" : "Add as friend"}</span>
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
