"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Circle, Square, Triangle, Star, Heart, Hexagon, Diamond, type LucideIcon } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;
const COLS = 4;
const CELL = 62;
const GAP = 10;

// Matches the shape names the backend picks from SHAPE_PAIRS. Plain
// geometric icons instead of emoji — several emoji (diamonds, 5-point
// stars) are close to rotationally symmetric and made the "odd one"
// invisible; these render identically on every device either way.
const SHAPES: Record<string, LucideIcon> = { circle: Circle, square: Square, triangle: Triangle, star: Star, heart: Heart, hexagon: Hexagon, diamond: Diamond };
const ACCENT_COLOR: Record<string, string> = {
  cyan: "rgb(var(--color-cyan))",
  magenta: "rgb(var(--color-magenta))",
  violet: "rgb(var(--color-violet))",
  ember: "rgb(var(--color-ember))",
};

export function FindTheDifferentGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const baseShape = payload.base_shape as string;
  const oddShape = payload.odd_shape as string;
  const oddIndex = payload.odd_index as number;
  const gridSize = payload.grid_size as number;
  const accent = (payload.accent as string) ?? "cyan";
  const color = ACCENT_COLOR[accent] ?? ACCENT_COLOR.cyan;

  const BaseIcon = SHAPES[baseShape] ?? Circle;
  const OddIcon = SHAPES[oddShape] ?? Square;

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
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgb(var(--color-ink-muted))" }}>
            Tap the shape that&apos;s different
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
              gap: GAP,
              width: boardWidth,
            }}
          >
            {Array.from({ length: gridSize }).map((_, i) => {
              const Icon = i === oddIndex ? OddIcon : BaseIcon;
              return (
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: status === "active" ? "pointer" : "default",
                  }}
                >
                  <Icon size={30} color={color} fill={color} fillOpacity={0.18} strokeWidth={2} />
                </motion.button>
              );
            })}
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
