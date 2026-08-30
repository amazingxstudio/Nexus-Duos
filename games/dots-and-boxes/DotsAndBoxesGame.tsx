"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap } from "@/lib/haptics";

const DURATION_MS = 6 * 60_000;
const NUDGE_AFTER_MS = 5000;
const NUDGE_COOLDOWN_MS = 3000;
const HIGHLIGHT_MS = 2000;

// Critical layout/sizing is done with inline styles rather than Tailwind
// utility classes. Those classes only exist in the compiled CSS if
// Tailwind's content scanner sees them in a scanned file — game boards live
// under /games/, and one missing folder in tailwind.config.ts's content
// list previously meant every such class here was silently dropped,
// collapsing the whole board to nothing visible. Inline styles always
// work regardless of that.
const DOT = 8;
const CELL = 27;

interface LastMove { type: "h" | "v"; row: number; col: number; by: string }

export function DotsAndBoxesGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, nudgeSignal, leaveMatch, nudgeOpponent } = useGameMatch({ matchId, roomCode });
  const [now, setNow] = useState(Date.now());
  const [turnStartedLocal, setTurnStartedLocal] = useState(Date.now());
  const [nudgeCooldownUntil, setNudgeCooldownUntil] = useState(0);
  const [highlighted, setHighlighted] = useState<{ type: "h" | "v"; row: number; col: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const turnUserId = (payload?.turn_user_id as string | null) ?? null;
  useEffect(() => { setTurnStartedLocal(Date.now()); }, [turnUserId]);

  // Highlight the rival's most recent line for a couple seconds so it
  // doesn't just silently appear on the board.
  const lastMove = (payload?.last_move ?? null) as LastMove | null;
  const lastMoveKey = lastMove ? `${lastMove.type}-${lastMove.row}-${lastMove.col}-${lastMove.by}` : "";
  useEffect(() => {
    if (!lastMove || lastMove.by === userId) return;
    setHighlighted({ type: lastMove.type, row: lastMove.row, col: lastMove.col });
    const t = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMoveKey]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const dots = payload.dots as number;
  const hLines = payload.h_lines as (string | null)[][];
  const vLines = payload.v_lines as (string | null)[][];
  const boxes = payload.boxes as (string | null)[][];
  const myTurn = turnUserId === userId;

  function drawLine(type: "h" | "v", row: number, col: number) {
    if (!myTurn || status !== "active") return;
    const lines = type === "h" ? hLines : vLines;
    if (lines[row][col] !== null) return;
    hapticTap("light");
    sendAction("draw_line", { type, row, col });
  }

  const showNudge = !myTurn && status === "active" && now - turnStartedLocal > NUDGE_AFTER_MS;
  const nudgeOnCooldown = now < nudgeCooldownUntil;
  function nudge() {
    if (nudgeOnCooldown) return;
    nudgeOpponent();
    setNudgeCooldownUntil(Date.now() + NUDGE_COOLDOWN_MS);
  }

  const gridDim = dots * 2 - 1;
  const trackSizes = Array.from({ length: gridDim }, (_, i) => (i % 2 === 0 ? DOT : CELL));
  const totalSize = trackSizes.reduce((a, b) => a + b, 0);
  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch} nudgeSignal={nudgeSignal}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: myTurn ? "rgb(var(--color-cyan))" : "rgb(var(--color-ink-muted))",
            }}
          >
            {myTurn ? "Your move" : "Rival's move"}
          </p>

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: trackSizes.map((s) => `${s}px`).join(" "),
                gridTemplateRows: trackSizes.map((s) => `${s}px`).join(" "),
                width: totalSize + 24,
                height: totalSize + 24,
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgb(var(--color-ink-primary) / 0.1)",
                background: "rgb(var(--color-surface))",
              }}
            >
              {Array.from({ length: gridDim }).map((_, gr) =>
                Array.from({ length: gridDim }).map((_, gc) => {
                  const isDotRow = gr % 2 === 0;
                  const isDotCol = gc % 2 === 0;
                  const key = `${gr}-${gc}`;
                  const cellStyle = { gridRow: gr + 1, gridColumn: gc + 1 } as const;

                  if (isDotRow && isDotCol) {
                  return (
                    <div
                      key={key}
                      style={{
                        ...cellStyle,
                        justifySelf: "center",
                        alignSelf: "center",
                        width: DOT - 2,
                        height: DOT - 2,
                        borderRadius: "50%",
                        background: "rgb(var(--color-ink-primary) / 0.45)",
                      }}
                    />
                  );
                }

                if (isDotRow && !isDotCol) {
                  const row = gr / 2, col = (gc - 1) / 2;
                  const owner = hLines[row][col];
                  const clickable = myTurn && owner === null;
                  const isHighlighted = highlighted?.type === "h" && highlighted.row === row && highlighted.col === col;
                  return (
                    <button
                      key={key}
                      onClick={() => drawLine("h", row, col)}
                      disabled={!clickable}
                      style={{
                        ...cellStyle,
                        alignSelf: "center",
                        width: "100%",
                        height: 14,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: clickable ? "pointer" : "default",
                      }}
                    >
                      <motion.span
                        animate={{
                          scaleY: isHighlighted ? 1.8 : 1,
                          boxShadow: isHighlighted ? `0 0 10px 2px rgb(var(--color-${owner === userId ? "cyan" : "magenta"}) / 0.8)` : "none",
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          height: 4,
                          borderRadius: 999,
                          background: owner ? `rgb(var(--color-${owner === userId ? "cyan" : "magenta"}))` : "rgb(var(--color-ink-primary) / 0.12)",
                        }}
                      />
                    </button>
                  );
                }

                if (!isDotRow && isDotCol) {
                  const row = (gr - 1) / 2, col = gc / 2;
                  const owner = vLines[row][col];
                  const clickable = myTurn && owner === null;
                  const isHighlighted = highlighted?.type === "v" && highlighted.row === row && highlighted.col === col;
                  return (
                    <button
                      key={key}
                      onClick={() => drawLine("v", row, col)}
                      disabled={!clickable}
                      style={{
                        ...cellStyle,
                        justifySelf: "center",
                        width: 14,
                        height: "100%",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: clickable ? "pointer" : "default",
                      }}
                    >
                      <motion.span
                        animate={{
                          scaleX: isHighlighted ? 1.8 : 1,
                          boxShadow: isHighlighted ? `0 0 10px 2px rgb(var(--color-${owner === userId ? "cyan" : "magenta"}) / 0.8)` : "none",
                        }}
                        style={{
                          display: "block",
                          width: 4,
                          height: "100%",
                          borderRadius: 999,
                          background: owner ? `rgb(var(--color-${owner === userId ? "cyan" : "magenta"}))` : "rgb(var(--color-ink-primary) / 0.12)",
                        }}
                      />
                    </button>
                  );
                }

                const br = (gr - 1) / 2, bc = (gc - 1) / 2;
                const owner = boxes[br][bc];
                return (
                  <motion.div
                    key={key}
                    initial={false}
                    animate={{ opacity: owner ? 1 : 0, scale: owner ? 1 : 0.7 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    style={{
                      ...cellStyle,
                      alignSelf: "stretch",
                      justifySelf: "stretch",
                      borderRadius: 4,
                      background: owner ? `rgb(var(--color-${owner === userId ? "cyan" : "magenta"}) / 0.22)` : "transparent",
                    }}
                  />
                );
              })
            )}
            </div>

            <AnimatePresence>
              {showNudge && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: nudgeOnCooldown ? 0.5 : 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={nudge}
                  disabled={nudgeOnCooldown}
                  aria-label="Nudge rival"
                  style={{
                    position: "absolute",
                    top: -10,
                    right: -10,
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgb(var(--color-ember) / 0.4)",
                    background: "rgb(var(--color-void) / 0.92)",
                    color: "rgb(var(--color-ember))",
                    boxShadow: "0 2px 12px rgb(0 0 0 / 0.3)",
                  }}
                >
                  <BellRing size={15} className={nudgeOnCooldown ? "" : "animate-pulse-glow"} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
