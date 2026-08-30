"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Hand, Hourglass } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap } from "@/lib/haptics";

const DURATION_MS = 90 * 1000;
const TILES = ["cyan", "magenta", "violet", "ember"] as const;
type Tile = (typeof TILES)[number];
const TILE_COLOR: Record<Tile, string> = {
  cyan: "rgb(var(--color-cyan))",
  magenta: "rgb(var(--color-magenta))",
  violet: "rgb(var(--color-violet))",
  ember: "rgb(var(--color-ember))",
};
// Slowed down from the original pass — the previous timing (550ms/tile, no
// lead-in) read as "too fast to feel fair". A clear "get ready" beat before
// the flashing starts, plus a longer hold per tile, fixes both "it's too
// fast" and "I can't tell when the round actually started".
const READY_MS = 900;
const FLASH_MS = 750;
const GAP_BEFORE_INPUT_MS = 350;

type Phase = "ready" | "preview" | "input";

export function MemoryRaceGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [phase, setPhase] = useState<Phase>("ready");
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [taps, setTaps] = useState<Tile[]>([]);
  const [shake, setShake] = useState(false);
  const sequenceKey = payload ? (payload.sequence as string[]).join(",") : "";

  // A new sequence arrived (ours or the rival's) — run through ready → preview → input.
  useEffect(() => {
    if (!payload) return;
    const sequence = payload.sequence as string[];
    setTaps([]);
    setPhase("ready");
    setPreviewIndex(-1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("preview"), READY_MS));
    sequence.forEach((_, i) => {
      const base = READY_MS + i * FLASH_MS;
      timers.push(setTimeout(() => setPreviewIndex(i), base));
      timers.push(setTimeout(() => setPreviewIndex(-1), base + FLASH_MS * 0.65));
    });
    timers.push(setTimeout(() => setPhase("input"), READY_MS + sequence.length * FLASH_MS + GAP_BEFORE_INPUT_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceKey]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const sequence = payload.sequence as Tile[];

  function tap(tile: Tile) {
    if (phase !== "input" || status !== "active") return;
    const next = [...taps, tile];
    setTaps(next);
    if (next.length < sequence.length) return;

    const matches = next.every((t, i) => t === sequence[i]);
    if (matches) {
      hapticTap("medium");
      sendAction("submit_sequence", { taps: next });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 350);
      setTaps([]);
    }
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  const phaseMeta: Record<Phase, { label: string; icon: typeof Eye; color: string }> = {
    ready: { label: "Get ready…", icon: Hourglass, color: "rgb(var(--color-ink-muted))" },
    preview: { label: "Watch closely…", icon: Eye, color: "rgb(var(--color-violet))" },
    input: { label: "Your turn — tap it back!", icon: Hand, color: "rgb(var(--color-cyan))" },
  };
  const PhaseIcon = phaseMeta[phase].icon;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
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

          <motion.div
            animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              width: 220,
              boxSizing: "content-box",
              padding: 10,
              borderRadius: 22,
              border: phase === "input" ? "2px solid rgb(var(--color-cyan) / 0.6)" : "2px solid transparent",
              boxShadow: phase === "input" ? "0 0 22px rgb(var(--color-cyan) / 0.25)" : "none",
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
          >
            {TILES.map((tile) => {
              const active = phase === "preview" && sequence[previewIndex] === tile;
              return (
                <button
                  key={tile}
                  onClick={() => tap(tile)}
                  disabled={phase !== "input"}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 18,
                    border: "none",
                    background: TILE_COLOR[tile],
                    opacity: phase === "preview" && !active ? 0.28 : phase === "ready" ? 0.5 : 1,
                    transform: active ? "scale(1.08)" : "scale(1)",
                    boxShadow: active ? `0 0 26px ${TILE_COLOR[tile]}` : "none",
                    transition: "opacity 0.15s, transform 0.15s, box-shadow 0.15s",
                    cursor: phase === "input" ? "pointer" : "default",
                  }}
                />
              );
            })}
          </motion.div>

          <div style={{ display: "flex", gap: 6 }}>
            {sequence.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: i < taps.length ? "rgb(var(--color-ink-primary))" : "rgb(var(--color-ink-primary) / 0.18)",
                }}
              />
            ))}
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
