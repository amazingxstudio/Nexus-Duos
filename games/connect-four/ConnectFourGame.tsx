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

export function ConnectFourGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
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

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-xs">
          <p className={`mb-3 text-center text-xs font-semibold uppercase tracking-widest ${myTurn ? "text-cyan" : "text-ink-muted"}`}>
            {gameOver ? "Game over" : myTurn ? "Your move" : "Rival's move"}
          </p>
          <div className="grid grid-cols-7 gap-1 rounded-card border border-white/10 bg-surface p-1.5">
            {Array.from({ length: COLS }).map((_, col) => {
              const colFull = board[0][col] !== null;
              return (
                <button
                  key={col}
                  onClick={() => dropDisc(col)}
                  disabled={!myTurn || colFull}
                  className="flex flex-col gap-1 rounded-md py-0.5 transition-colors enabled:active:bg-white/[0.06]"
                >
                  {Array.from({ length: ROWS }).map((_, row) => {
                    const owner = board[row][col];
                    const isMine = owner === userId;
                    const won = isWinningCell(row, col);
                    return (
                      <div key={row} className="relative aspect-square rounded-full bg-white/[0.04]">
                        <AnimatePresence>
                          {owner && (
                            <motion.span
                              initial={{ y: -220, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 320, damping: 22 }}
                              className={`absolute inset-0.5 rounded-full ${isMine ? "bg-cyan shadow-glow-cyan" : "bg-magenta shadow-glow-magenta"} ${won ? "ring-2 ring-white" : ""}`}
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
          {isDraw && <p className="mt-3 text-center text-xs text-ink-muted">Board full — it's a draw</p>}
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
