"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Hand, Hourglass } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap, hapticNotify } from "@/lib/haptics";

const DURATION_MS = 90 * 1000;
// A stuck pattern never blocks the match (spec D.21a) — matches
// memory_race/engine.py's ROUND_TIMEOUT_MS exactly (a beat longer than
// quick-math/guess-the-word: there's more to re-scan in a grid).
const ROUND_TIMEOUT_SECONDS = 9;
const READY_MS = 700;
// How long the whole pattern stays lit at once — this is a spatial
// "memorize the constellation" game now, not a Simon-style one-tile-at-a-
// time sequence, so everything flashes together and scales with how much
// there is to take in (bigger rounds get a bit more time).
const PREVIEW_BASE_MS = 900;
const PREVIEW_PER_CELL_MS = 150;
const PREVIEW_MAX_MS = 2400;
const GAP_BEFORE_INPUT_MS = 300;

type Phase = "ready" | "preview" | "input";

export function MemoryRaceGame({ matchId, roomCode, opponentId, opponentNickname, gameKey }: { matchId: string; roomCode: string; opponentId: string; opponentNickname: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const socket = useSocket();
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [phase, setPhase] = useState<Phase>("ready");
  const [selected, setSelected] = useState<number[]>([]);
  const [shake, setShake] = useState(false);
  const [skipMessage, setSkipMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const firedTimeoutRef = useRef<number | null>(null);
  const round = payload?.round as number | undefined;
  const gridSize = (payload?.grid_size as number | undefined) ?? 3;
  const cells = (payload?.cells as number[] | undefined) ?? [];
  const roundStartedAt = payload?.round_started_at as number | undefined;
  const cellCount = gridSize * gridSize;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // A new pattern arrived (ours, the rival's, or an auto-skip) — run through ready → preview → input.
  useEffect(() => {
    if (!payload) return;
    setSelected([]);
    setPhase("ready");
    const previewMs = Math.min(PREVIEW_MAX_MS, PREVIEW_BASE_MS + cells.length * PREVIEW_PER_CELL_MS);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("preview"), READY_MS));
    timers.push(setTimeout(() => setPhase("input"), READY_MS + previewMs + GAP_BEFORE_INPUT_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Brief "why did the pattern just change" toast for an auto-skip.
  useEffect(() => {
    const reason = payload?.last_skip_reason as string | undefined;
    if (!reason || round === undefined) return;
    setSkipMessage(reason === "TIMEOUT" ? "Time's up — new pattern" : "Both stuck — new pattern");
    const t = setTimeout(() => setSkipMessage(null), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Client-side timeout report — the server re-validates the elapsed time
  // itself (see memory_race/engine.py). Mirrors quick_math/guess_the_word.
  useEffect(() => {
    if (!roundStartedAt || status !== "active") return;
    const elapsedSec = (now - roundStartedAt) / 1000;
    if (elapsedSec >= ROUND_TIMEOUT_SECONDS && firedTimeoutRef.current !== roundStartedAt) {
      firedTimeoutRef.current = roundStartedAt;
      sendAction("round_timeout", {});
    }
  }, [now, roundStartedAt, status, sendAction]);

  // A wrong submission — shake, clear the picks, and let the server know
  // it counts toward the mutual-fail auto-skip (spec D.21a); this path
  // never persists state on its own (see match_runner.py), hence the
  // separate lightweight "wrong_attempt" report.
  useEffect(() => {
    if (!socket) return;
    function onRejected(data: { match_id: string; reason: string }) {
      if (data.match_id !== matchId) return;
      if (data.reason !== "WRONG_PATTERN") return;
      hapticNotify("error");
      setShake(true);
      setTimeout(() => setShake(false), 350);
      setSelected([]);
      sendAction("wrong_attempt", {});
    }
    socket.on("action_rejected", onRejected);
    return () => { socket.off("action_rejected", onRejected); };
  }, [socket, matchId, sendAction]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const litSet = new Set(cells);

  function toggleCell(i: number) {
    if (phase !== "input" || status !== "active") return;
    hapticTap("light");
    setSelected((prev) => {
      if (prev.includes(i)) return prev.filter((c) => c !== i);
      const next = [...prev, i];
      if (next.length === cells.length) {
        // Auto-submit the instant the right number of taps is in — same
        // low-friction "no separate confirm button" feel as the other
        // fast-paced games (quick math, word chain).
        hapticTap("medium");
        sendAction("submit_pattern", { cells: next });
      }
      return next;
    });
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  const phaseMeta: Record<Phase, { label: string; icon: typeof Eye; color: string }> = {
    ready: { label: "Get ready…", icon: Hourglass, color: "rgb(var(--color-ink-muted))" },
    preview: { label: "Memorize the pattern…", icon: Eye, color: "rgb(var(--color-violet))" },
    input: { label: "Tap back what lit up!", icon: Hand, color: "rgb(var(--color-cyan))" },
  };
  const PhaseIcon = phaseMeta[phase].icon;
  const boardSize = gridSize <= 3 ? 234 : gridSize === 4 ? 244 : 250;
  const gap = gridSize <= 4 ? 10 : 7;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: phaseMeta[phase].color,
            }}
          >
            <PhaseIcon size={15} />
            {phaseMeta[phase].label}
          </motion.div>

          {skipMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "rgb(var(--color-ember))", marginTop: -8 }}
            >
              {skipMessage}
            </motion.p>
          )}

          <motion.div
            animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gap,
              width: boardSize,
              boxSizing: "content-box",
              padding: 10,
              borderRadius: 22,
              border: phase === "input" ? "2px solid rgb(var(--color-cyan) / 0.6)" : "2px solid transparent",
              boxShadow: phase === "input" ? "0 0 22px rgb(var(--color-cyan) / 0.25)" : "none",
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
          >
            {Array.from({ length: cellCount }).map((_, i) => {
              const isLit = phase === "preview" && litSet.has(i);
              const isSelected = phase === "input" && selected.includes(i);
              const bg = isLit
                ? "rgb(var(--color-cyan))"
                : isSelected
                  ? "rgb(var(--color-violet))"
                  : "rgb(var(--color-surface-raised))";
              return (
                <button
                  key={i}
                  onClick={() => toggleCell(i)}
                  disabled={phase !== "input"}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 12,
                    border: "none",
                    background: bg,
                    transform: isLit || isSelected ? "scale(1.05)" : "scale(1)",
                    boxShadow: isLit ? "0 0 18px rgb(var(--color-cyan) / 0.7)" : isSelected ? "0 0 14px rgb(var(--color-violet) / 0.6)" : "none",
                    transition: "background 0.15s, transform 0.15s, box-shadow 0.15s",
                    cursor: phase === "input" ? "pointer" : "default",
                  }}
                />
              );
            })}
          </motion.div>

          <p className="stat-mono" style={{ fontSize: 12, color: "rgb(var(--color-ink-muted))" }}>
            {phase === "input" ? `${selected.length} / ${cells.length} tapped` : `${cells.length} tiles to remember`}
          </p>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} opponentNickname={opponentNickname} />
      )}
    </>
  );
}
