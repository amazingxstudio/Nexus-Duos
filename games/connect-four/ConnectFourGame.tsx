"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 5 * 60_000;
const ROWS = 6;
const COLS = 7;

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
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const board = payload.board as (string | null)[][];
  const turnUserId = payload.turn_user_id as string | null;
  const winningCells = (payload.winning_cells as [number, number][] | null) ?? null;
  const isDraw = payload.is_draw as boolean;
  const gameOver = Boolean(winningCells) || isDraw;
  const myTurn = turnUserId === userId && !gameOver;

  function isWinningCell(r: number, c: number) {
    return winningCells?.some(([wr, wc]) => wr === r && wc === c) ?? false;
  }

  function dropDisc(column: number) {
    if (!myTurn || status !== "active" || board[0][column] !== null) return;
    sendAction("drop_disc", { column });
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;
  const boardWidth = COLS * CELL + (COLS - 1) * GAP;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
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

          {isDraw && <p style={{ fontSize: 12, color: "rgb(var(--color-ink-muted))" }}>Board full — it&apos;s a draw</p>}
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
