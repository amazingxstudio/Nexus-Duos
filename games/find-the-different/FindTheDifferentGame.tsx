"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Circle, Square, Triangle, Star, Heart, Hexagon, Diamond, type LucideIcon } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap } from "@/lib/haptics";

const DURATION_MS = 90 * 1000;
const COLS = 8;
// Packed tight and with no per-cell box around them (see the shared panel
// below) — a small gap is the whole point: it's what makes the grid read
// as one dense field of icons to scan instead of a set of easy-to-isolate
// slots, which is what made the odd one too easy to spot before. Bumped
// alongside the 8x8 grid for a bit more breathing room between cells;
// CELL is sized down to keep the whole board around 300-320px wide on a
// typical 360-390px phone (8*32 + 7*8 = 312).
const CELL = 32;
const GAP = 8;

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

  const kind = payload.kind as "shape" | "glyph" | "rotate";
  const oddIndex = payload.odd_index as number;
  const gridSize = payload.grid_size as number;
  const accent = (payload.accent as string) ?? "cyan";
  const color = ACCENT_COLOR[accent] ?? ACCENT_COLOR.cyan;

  // Shape rounds use the *same* icon everywhere — the odd cell is only a
  // subtle rotation away from the rest, not a different silhouette, so it
  // can't be spotted from its outline alone.
  const BaseIcon = kind === "shape" ? SHAPES[payload.base_shape as string] ?? Circle : null;
  const OddIcon = kind === "shape" ? SHAPES[payload.odd_shape as string] ?? BaseIcon : null;
  const oddRotation = (payload.odd_rotation as number) ?? 0;
  const baseGlyph = payload.base_glyph as string | undefined;
  const oddGlyph = payload.odd_glyph as string | undefined;
  // Rotate rounds render the *same* character in every cell — the odd one
  // is just flipped 180°, so there's no separate base/odd pair to track.
  const rotateGlyph = payload.glyph as string | undefined;

  function select(index: number) {
    if (status !== "active") return;
    if (index === oddIndex) {
      hapticTap("medium");
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgb(var(--color-ink-muted))" }}>
            Tap the one that&apos;s different
          </p>
          {/* One shared panel behind the whole grid — no per-cell box, so
              there's nothing pre-segmenting the grid into easy-to-scan
              slots. The icons/glyphs just sit packed together on one
              continuous surface, which is what actually makes finding the
              odd one take real scanning. */}
          <div className="glass-panel" style={{ padding: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
                gap: GAP,
                width: boardWidth,
              }}
            >
              {Array.from({ length: gridSize }).map((_, i) => {
                const isOdd = i === oddIndex;
                const isWrong = wrongIndex === i;
                return (
                  <motion.button
                    key={i}
                    onClick={() => select(i)}
                    disabled={status !== "active"}
                    animate={isWrong ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
                    transition={{ duration: 0.28 }}
                    style={{
                      width: CELL,
                      height: CELL,
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: status === "active" ? "pointer" : "default",
                    }}
                  >
                    {kind === "shape" ? (
                      (() => {
                        const Icon = isOdd ? OddIcon! : BaseIcon!;
                        const rotation = isOdd ? oddRotation : 0;
                        const iconColor = isWrong ? "rgb(var(--color-magenta))" : color;
                        return (
                          <Icon
                            size={22}
                            color={iconColor}
                            fill={iconColor}
                            fillOpacity={0.18}
                            strokeWidth={2}
                            style={{ transform: `rotate(${rotation}deg)` }}
                          />
                        );
                      })()
                    ) : kind === "glyph" ? (
                      <span className="stat-mono" style={{ fontSize: 20, fontWeight: 700, color: isWrong ? "rgb(var(--color-magenta))" : color }}>
                        {isOdd ? oddGlyph : baseGlyph}
                      </span>
                    ) : (
                      <span
                        className="stat-mono"
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: isWrong ? "rgb(var(--color-magenta))" : color,
                          display: "inline-block",
                          transform: isOdd ? "rotate(180deg)" : "none",
                        }}
                      >
                        {rotateGlyph}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
