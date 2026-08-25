"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;
const TILES = ["cyan", "magenta", "violet", "ember"] as const;
type Tile = (typeof TILES)[number];
const TILE_COLOR: Record<Tile, string> = {
  cyan: "rgb(var(--color-cyan))",
  magenta: "rgb(var(--color-magenta))",
  violet: "rgb(var(--color-violet))",
  ember: "rgb(var(--color-ember))",
};
const FLASH_MS = 550;

export function MemoryRaceGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [phase, setPhase] = useState<"preview" | "input">("preview");
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [taps, setTaps] = useState<Tile[]>([]);
  const [shake, setShake] = useState(false);
  const sequenceKey = payload ? (payload.sequence as string[]).join(",") : "";

  // A new sequence arrived (ours or the rival's) — flash it, then let the
  // player start tapping it back.
  useEffect(() => {
    if (!payload) return;
    const sequence = payload.sequence as string[];
    setTaps([]);
    setPhase("preview");
    setPreviewIndex(-1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    sequence.forEach((_, i) => {
      timers.push(setTimeout(() => setPreviewIndex(i), i * FLASH_MS));
      timers.push(setTimeout(() => setPreviewIndex(-1), i * FLASH_MS + FLASH_MS * 0.6));
    });
    timers.push(setTimeout(() => setPhase("input"), sequence.length * FLASH_MS + 150));
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
      sendAction("submit_sequence", { taps: next });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 350);
      setTaps([]);
    }
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgb(var(--color-ink-muted))" }}>
            {phase === "preview" ? "Memorize the sequence…" : `Reproduce it — ${sequence.length} taps`}
          </p>

          <motion.div
            animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: 200 }}
          >
            {TILES.map((tile, i) => {
              const active = phase === "preview" && sequence[previewIndex] === tile;
              return (
                <button
                  key={tile}
                  onClick={() => tap(tile)}
                  disabled={phase !== "input"}
                  style={{
                    width: 94,
                    height: 94,
                    borderRadius: 18,
                    border: "none",
                    background: TILE_COLOR[tile],
                    opacity: phase === "preview" && !active ? 0.28 : 1,
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
