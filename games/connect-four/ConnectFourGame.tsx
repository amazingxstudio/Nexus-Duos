"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap } from "@/lib/haptics";

const DURATION_MS = 5 * 60_000;
const ROWS = 6;
const COLS = 7;
const NUDGE_AFTER_MS = 5000;
const NUDGE_COOLDOWN_MS = 3000;

// Critical layout/sizing is done with inline styles rather than Tailwind
// utility classes (grid-cols-7, aspect-square, etc). Those classes only
// exist in the compiled CSS if Tailwind's content scanner sees them in a
// scanned file — game boards live under /games/, and one missing folder in
// tailwind.config.ts's content list previously meant every such class here
// was silently dropped, collapsing the whole board to nothing visible.
// Inline styles always work regardless of that, so the board can never go
// invisible again even if the Tailwind config regresses.
const CELL = 40;
const GAP = 4;

export function ConnectFourGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, nudgeSignal, leaveMatch, nudgeOpponent } = useGameMatch({ matchId, roomCode });
  const [now, setNow] = useState(Date.now());
  const [turnStartedLocal, setTurnStartedLocal] = useState(Date.now());
  const [nudgeCooldownUntil, setNudgeCooldownUntil] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const turnUserId = (payload?.turn_user_id as string | null) ?? null;
  useEffect(() => { setTurnStartedLocal(Date.now()); }, [turnUserId]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const board = payload.board as (string | null)[][];
  const winningCells = (payload.winning_cells as [number, number][] | null) ?? null;
  const isDraw = payload.is_draw as boolean;
  const gameOver = Boolean(winningCells) || isDraw;
  const myTurn = turnUserId === userId && !gameOver;

  function isWinningCell(r: number, c: number) {
    return winningCells?.some(([wr, wc]) => wr === r && wc === c) ?? false;
  }

  function dropDisc(column: number) {
    if (!myTurn || status !== "active" || board[0][column] !== null) return;
    hapticTap("light");
    sendAction("drop_disc", { column });
  }

  const showNudge = !myTurn && !gameOver && status === "active" && now - turnStartedLocal > NUDGE_AFTER_MS;
  const nudgeOnCooldown = now < nudgeCooldownUntil;
  function nudge() {
    if (nudgeOnCooldown) return;
    nudgeOpponent();
    setNudgeCooldownUntil(Date.now() + NUDGE_COOLDOWN_MS);
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;
  const boardWidth = COLS * CELL + (COLS - 1) * GAP;

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
            {gameOver ? "Game over" : myTurn ? "Your move" : "Rival's move"}
          </p>

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                gap: GAP,
                padding: 10,
                borderRadius: 16,
                border: "1px solid rgb(var(--color-ink-primary) / 0.1)",
                background: "rgb(var(--color-surface))",
                width: boardWidth + 20,
              }}
            >
              {Array.from({ length: COLS }).map((_, col) => {
                const colFull = board[0][col] !== null;
                return (
                <button
                  key={col}
                  onClick={() => dropDisc(col)}
                  disabled={!myTurn || colFull}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: GAP,
                    width: CELL,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: myTurn && !colFull ? "pointer" : "default",
                  }}
                >
                  {Array.from({ length: ROWS }).map((_, row) => {
                    const owner = board[row][col];
                    const isMine = owner === userId;
                    const won = isWinningCell(row, col);
                    return (
                      <div
                        key={row}
                        style={{
                          position: "relative",
                          width: CELL,
                          height: CELL,
                          borderRadius: "50%",
                          background: "rgb(var(--color-ink-primary) / 0.06)",
                        }}
                      >
                        <AnimatePresence>
                          {owner && (
                            <motion.span
                              initial={{ y: -220, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 320, damping: 22 }}
                              style={{
                                position: "absolute",
                                inset: 2,
                                borderRadius: "50%",
                                background: isMine ? "rgb(var(--color-cyan))" : "rgb(var(--color-magenta))",
                                boxShadow: won
                                  ? "0 0 0 2px rgb(var(--color-ink-primary)), 0 0 16px rgb(var(--color-ink-primary) / 0.6)"
                                  : `0 0 14px rgb(var(--color-${isMine ? "cyan" : "magenta"}) / 0.55)`,
                              }}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </button>
              );
            })}
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

          {isDraw && <p style={{ fontSize: 12, color: "rgb(var(--color-ink-muted))" }}>Board full — it&apos;s a draw</p>}
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
