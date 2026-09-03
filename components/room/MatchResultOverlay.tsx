"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Trophy, Frown, Minus, Swords, Home, RefreshCw, Check, UserPlus } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { playWinSound, playLoseSound, playDrawSound, playConfettiPopSound, playFireworkBoomSound } from "@/lib/sound";
import { hapticNotify } from "@/lib/haptics";

const FIREWORK_COLORS = ["rgb(var(--color-cyan))", "rgb(var(--color-magenta))", "rgb(var(--color-violet))", "rgb(var(--color-ember))"];

/** One firework explosion: a ring of particles thrown outward from a single
 * origin point, plus a quick radial "flash" at the origin so the burst
 * itself reads as an explosion rather than particles simply appearing.
 * Kept purely to CSS transforms/opacity (translate + scale, both
 * compositor-only properties) instead of a canvas + requestAnimationFrame
 * loop — canvas fireworks look nicer per-frame but redraw the whole scene
 * every tick, which is exactly the kind of continuous main-thread work
 * that visibly drops frames on the low/mid-range Android phones most
 * Telegram users are actually on. This scales to as many simultaneous
 * bursts as needed for the price of a single layout pass. */
function FireworkBurst({ x, y, color, delay, big }: { x: number; y: number; color: string; delay: number; big?: boolean }) {
  const particleCount = big ? 22 : 14;
  const spread = big ? 120 : 80;
  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => {
        // Evenly spaced around the circle with a little jitter, rather than
        // fully random angles, so the burst reads as a clean radial ring
        // (like a real firework) instead of a random spatter.
        const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const distance = spread * (0.55 + Math.random() * 0.55);
        return {
          id: i,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance + distance * 0.18, // slight downward drift — gravity, not a perfect sphere
          size: (big ? 4 : 3) + Math.random() * 4,
          duration: 0.9 + Math.random() * 0.5,
        };
      }),
    [particleCount, spread]
  );

  return (
    <div className="pointer-events-none absolute overflow-visible" style={{ left: `${x}%`, top: `${y}%` }}>
      {/* Flash — a brief bright disc at the origin, gone almost immediately,
          selling the "pop" moment the particles are launching from. */}
      <motion.span
        initial={{ opacity: 0.9, scale: 0 }}
        animate={{ opacity: 0, scale: big ? 3.2 : 2.2 }}
        transition={{ duration: 0.35, delay, ease: "easeOut" }}
        style={{ position: "absolute", left: 0, top: 0, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: "50%", background: color, filter: "blur(1px)" }}
      />
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy, scale: 0.4 }}
          transition={{ duration: p.duration, delay, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      ))}
    </div>
  );
}

/** Full celebration sequence for a win — three staggered FireworkBursts at
 * different positions/times (a small one, then two bigger ones a beat
 * later) instead of a single burst, which is what actually makes this read
 * as "fireworks" rather than "confetti". Positions/colors/delays are all
 * generated once via useMemo so this never re-triggers mid-animation from
 * an unrelated re-render of the overlay. */
function Fireworks() {
  const bursts = useMemo(
    () => [
      { x: 50, y: 38, color: FIREWORK_COLORS[0], delay: 0 },
      { x: 26, y: 30, color: FIREWORK_COLORS[1], delay: 0.32, big: true },
      { x: 74, y: 26, color: FIREWORK_COLORS[2], delay: 0.5, big: true },
      { x: 50, y: 20, color: FIREWORK_COLORS[3], delay: 0.78 },
    ],
    []
  );

  // A second and third "boom" layered under the confetti-pop sound (fired
  // by the parent on mount) so the two later, bigger bursts get their own
  // audible beat instead of the whole sequence sharing one sound.
  useEffect(() => {
    const t1 = setTimeout(() => playFireworkBoomSound(), 320);
    const t2 = setTimeout(() => playFireworkBoomSound(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {bursts.map((b, i) => (
        <FireworkBurst key={i} x={b.x} y={b.y} color={b.color} delay={b.delay} big={b.big} />
      ))}
    </div>
  );
}

const DEFEAT_COLORS = ["rgb(var(--color-ink-faint))", "rgb(var(--color-magenta-dim))"];

/** A handful of muted particles that droop downward and fade, slower and
 * quieter than the win fireworks — visually distinct in tone without being
 * unkind about it. Same particle-system approach as FireworkBurst above,
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

// Spam-prevention (spec D.16a): after sending an invite/rematch, block the
// button for this many seconds (shown as a countdown) before it can be
// tapped again — independent of whether the rival has responded yet, so a
// silent/slow rival doesn't leave the button stuck disabled indefinitely
// the way it used to.
const REMATCH_COOLDOWN_SECONDS = 5;

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
  const [cooldown, setCooldown] = useState(0);

  const title = didWin === null ? "Draw" : didWin ? "Victory" : "Defeat";
  const accent = didWin === null ? "text-ink-primary" : didWin ? "text-cyan" : "text-magenta";
  const glow = didWin === null ? "" : didWin ? "shadow-glow-cyan" : "shadow-glow-magenta";
  const Icon = didWin === null ? Minus : didWin ? Trophy : Frown;
  // Drives both the card border/glow *and* the ambient liquid wash behind
  // it below — one source of truth for "what color is this outcome" so the
  // card and its background blobs never fall out of sync with each other.
  const rgbVar = didWin === null ? "var(--color-violet)" : didWin ? "var(--color-cyan)" : "var(--color-magenta)";

  // Fire the result sound + haptic once, right as the overlay mounts. The
  // confetti/firework "pop" is timed slightly after the win chime so it
  // reads as a follow-up beat synced to the burst, not a third sound
  // competing with it.
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

  // 5-second cooldown countdown — ticks down to 0 regardless of whether a
  // response ever arrives; see REMATCH_COOLDOWN_SECONDS above.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function requestRematch() {
    if (cooldown > 0) return;
    socket?.emit("invite:send", { to_user_id: opponentId, game_key: gameKey, is_rematch: true });
    setRematch("waiting");
    setCooldown(REMATCH_COOLDOWN_SECONDS);
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
      {/* ---- Liquid ambient wash ----
          Two large, softly-blurred color blobs drifting slowly behind the
          card — the same "something vivid and moving behind the glass"
          principle globals.css already relies on for AmbientBackground, just
          tuned to this outcome's color and confined to the overlay instead
          of the whole app. This is what keeps the card reading as glass
          (refracting something) instead of a flat tinted rectangle, even in
          the couple of seconds after the fireworks/confetti have finished. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{ width: 340, height: 340, top: "18%", left: "8%", background: `rgb(${rgbVar} / 0.22)` }}
        animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{ width: 300, height: 300, bottom: "16%", right: "6%", background: `rgb(${rgbVar} / 0.16)` }}
        animate={{ x: [0, -20, 0], y: [0, 18, 0] }}
        transition={{ duration: 10.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {didWin === true && <Fireworks />}
      {didWin === false && <DefeatDroop />}

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`glass-panel relative flex flex-col items-center gap-4 overflow-hidden border p-8 text-center ${didWin === null ? "border-white/10" : didWin ? "border-cyan/30" : "border-magenta/30"} ${glow}`}
      >
        {/* A single light sweep across the card face on mount — the
            "refraction" cue that sells liquid glass rather than frosted
            plastic. Reuses the same shimmer keyframe the primary button
            already relies on (see .btn-primary::after in globals.css), just
            applied once here instead of looping on hover. zIndex is set
            explicitly (rather than left to flow) because .glass-panel > *
            in globals.css already forces every direct child to z-index: 1
            so real content clears the panel's own ::before/::after glass
            highlight — without overriding it here, this sweep would land at
            that same z-index: 1 as the icon/text/buttons below it and,
            being first in DOM order, paint *behind* all of them instead of
            sweeping across on top. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 2, background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 48%, transparent 66%)", backgroundSize: "220% 100%" }}
          initial={{ backgroundPosition: "150% 0" }}
          animate={{ backgroundPosition: "-50% 0" }}
          transition={{ duration: 1.1, delay: 0.25, ease: "easeInOut" }}
        />

        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
          className="relative"
        >
          {/* Concentric "liquid ring" halo behind the result icon — two
              rings breathing slightly out of phase with each other reads as
              more alive than a single static glow, without costing more
              than two extra absolutely-positioned elements. */}
          {didWin !== false && (
            <>
              <motion.span
                aria-hidden="true"
                className={`absolute -inset-2 rounded-full border ${didWin === null ? "border-violet/30" : "border-cyan/30"}`}
                animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                aria-hidden="true"
                className={`absolute -inset-4 rounded-full border ${didWin === null ? "border-violet/20" : "border-cyan/20"}`}
                animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0.05, 0.35] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
            </>
          )}
          <span className={`icon-badge relative h-16 w-16 border ${didWin === null ? "border-white/10" : didWin ? "border-cyan/40" : "border-magenta/40"}`}>
            <Icon size={28} strokeWidth={2} className={accent} />
          </span>
        </motion.span>

        <p className={`font-display text-3xl font-bold tracking-tight ${accent}`}>{title}</p>
        <p className="stat-mono text-2xl text-ink-primary">
          {myScore} <span className="text-ink-faint">–</span> {opponentScore}
        </p>

        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <button onClick={requestRematch} disabled={cooldown > 0} className="btn-primary disabled:opacity-60">
              {rematch === "waiting" && cooldown === 0 ? <RefreshCw size={16} strokeWidth={2.25} className="animate-spin" /> : <Swords size={16} strokeWidth={2.25} />}
              {cooldown > 0 ? `Duel Again (${cooldown}s)` : "Duel Again"}
            </button>
            <Link href="/" className="btn-ghost"><Home size={16} strokeWidth={2.25} />Home</Link>
          </div>
          <button onClick={toggleFriend} disabled={friendBusy} className="flex items-center gap-1.5 text-xs text-ink-muted disabled:opacity-60">
            {friendAdded ? <Check size={12} className="text-cyan" /> : <UserPlus size={12} />}
            <span className={friendAdded ? "text-cyan" : ""}>{friendAdded ? "Added" : "Add as friend"}</span>
          </button>
          <AnimatePresence mode="wait">
            {rematch === "waiting" && (
              <motion.p key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Check size={12} className="text-cyan" />Waiting for your rival to confirm…
              </motion.p>
            )}
            {rematch === "declined" && (
              <motion.p key="declined" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-magenta">
                Rival declined the rematch.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
