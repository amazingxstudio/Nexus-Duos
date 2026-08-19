"use client";

import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 40_000;
const SYMBOLS = ["🛰", "⚡", "🔷", "🛡", "🔺", "🌀", "💠", "✦"];
interface PlayerBoardState { revealed: number[]; matched: number[]; combo: number; }

export function MemoryWarfareGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const board = payload.board as number[];
  const myBoard: PlayerBoardState = userId ? ((payload.boards as Record<string, PlayerBoardState>)?.[userId] ?? { revealed: [], matched: [], combo: 0 }) : { revealed: [], matched: [], combo: 0 };

  function flip(index: number) { if (status === "active") sendAction("flip_card", { index }); }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-sm">
          <div className="mb-2 flex h-6 justify-center">
            {myBoard.combo > 1 && <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm font-semibold text-ember">🔥 {myBoard.combo}x combo</motion.p>}
          </div>
          <div className="grid grid-cols-4 gap-2" style={{ perspective: "600px" }}>
            {board.map((symbolIndex, i) => {
              const isMatched = myBoard.matched.includes(i);
              const isRevealed = myBoard.revealed.includes(i) || isMatched;
              return (
                <motion.button key={i} onClick={() => flip(i)} disabled={isMatched} animate={{ rotateY: isRevealed ? 180 : 0 }} transition={{ duration: 0.35 }} style={{ transformStyle: "preserve-3d" }} className={`aspect-square rounded-xl text-2xl transition-colors ${isMatched ? "border border-cyan/40 bg-cyan/10" : isRevealed ? "glass-panel-violet" : "glass-card"}`}>
                  <span style={{ transform: "rotateY(180deg)", display: "inline-block" }}>{isRevealed ? SYMBOLS[symbolIndex] : ""}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
