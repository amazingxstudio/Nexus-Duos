"use client";

import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 6 * 60_000;

export function DotsAndBoxesGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const dots = payload.dots as number;
  const hLines = payload.h_lines as (string | null)[][];
  const vLines = payload.v_lines as (string | null)[][];
  const boxes = payload.boxes as (string | null)[][];
  const turnUserId = payload.turn_user_id as string | null;
  const myTurn = turnUserId === userId;

  function drawLine(type: "h" | "v", row: number, col: number) {
    if (!myTurn || status !== "active") return;
    const lines = type === "h" ? hLines : vLines;
    if (lines[row][col] !== null) return;
    sendAction("draw_line", { type, row, col });
  }

  const gridDim = dots * 2 - 1;
  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-xs">
          <p className={`mb-3 text-center text-xs font-semibold uppercase tracking-widest ${myTurn ? "text-cyan" : "text-ink-muted"}`}>{myTurn ? "Your move" : "Rival's move"}</p>
          <div
            className="mx-auto grid rounded-card border border-white/10 bg-surface p-3"
            style={{
              gridTemplateColumns: Array.from({ length: gridDim }, (_, i) => (i % 2 === 0 ? "10px" : "1fr")).join(" "),
              gridTemplateRows: Array.from({ length: gridDim }, (_, i) => (i % 2 === 0 ? "10px" : "1fr")).join(" "),
              width: "100%",
              aspectRatio: "1",
            }}
          >
            {Array.from({ length: gridDim }).map((_, gr) =>
              Array.from({ length: gridDim }).map((_, gc) => {
                const isDotRow = gr % 2 === 0;
                const isDotCol = gc % 2 === 0;
                const key = `${gr}-${gc}`;

                if (isDotRow && isDotCol) {
                  return <div key={key} style={{ gridRow: gr + 1, gridColumn: gc + 1 }} className="h-2.5 w-2.5 justify-self-center self-center rounded-full bg-white/40" />;
                }

                if (isDotRow && !isDotCol) {
                  const row = gr / 2, col = (gc - 1) / 2;
                  const owner = hLines[row][col];
                  return (
                    <button
                      key={key}
                      onClick={() => drawLine("h", row, col)}
                      disabled={owner !== null || !myTurn}
                      style={{ gridRow: gr + 1, gridColumn: gc + 1 }}
                      className="flex h-3 items-center self-center px-0.5"
                    >
                      <span className={`h-1 w-full rounded-full transition-colors ${owner ? (owner === userId ? "bg-cyan" : "bg-magenta") : "bg-white/10 active:bg-white/25"}`} />
                    </button>
                  );
                }

                if (!isDotRow && isDotCol) {
                  const row = (gr - 1) / 2, col = gc / 2;
                  const owner = vLines[row][col];
                  return (
                    <button
                      key={key}
                      onClick={() => drawLine("v", row, col)}
                      disabled={owner !== null || !myTurn}
                      style={{ gridRow: gr + 1, gridColumn: gc + 1 }}
                      className="flex w-3 justify-center self-stretch py-0.5"
                    >
                      <span className={`h-full w-1 rounded-full transition-colors ${owner ? (owner === userId ? "bg-cyan" : "bg-magenta") : "bg-white/10 active:bg-white/25"}`} />
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
                    style={{ gridRow: gr + 1, gridColumn: gc + 1 }}
                    className={`self-stretch justify-self-stretch rounded-sm ${owner === userId ? "bg-cyan/25" : owner ? "bg-magenta/25" : ""}`}
                  />
                );
              })
            )}
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
