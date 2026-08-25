"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;
const COLS = 4;
const CELL = 62;
const GAP = 10;

export function FindTheDifferentGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const emoji = payload.emoji as string;
  const oddIndex = payload.odd_index as number;
  const gridSize = payload.grid_size as number;

  function select(index: number) {
    if (status !== "active") return;
    if (index === oddIndex) {
      sendAction("select_cell", { index });
    } else {
      setWrongIndex(index);
      setTimeout(() => setWrongIndex(null), 300);
    }
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;
  const boardWidth = COLS * CELL + (COLS - 1) * GAP;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgb(var(--color-ink-muted))" }}>
            Tap the one that&apos;s upside-down
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
              gap: GAP,
              width: boardWidth,
            }}
          >
            {Array.from({ length: gridSize }).map((_, i) => (
              <motion.button
                key={i}
                onClick={() => select(i)}
                disabled={status !== "active"}
                animate={wrongIndex === i ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.28 }}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 14,
                  border: `1px solid ${wrongIndex === i ? "rgb(var(--color-magenta) / 0.5)" : "rgb(var(--color-ink-primary) / 0.1)"}`,
                  background: "rgb(var(--color-surface))",
                  fontSize: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: status === "active" ? "pointer" : "default",
                  transform: i === oddIndex ? "rotate(180deg)" : "none",
                }}
              >
                {emoji}
              </motion.button>
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
