"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 45_000;

export function PuzzleArenaGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [input, setInput] = useState("");

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const questions = payload.questions as string[];
  const puzzleCount = payload.puzzle_count as number;
  const progress = userId ? ((payload.progress as Record<string, { index: number; correct: number }>)?.[userId] ?? { index: 0, correct: 0 }) : { index: 0, correct: 0 };
  const done = progress.index >= puzzleCount;
  const currentQuestion = questions[progress.index];

  function submit() {
    if (input.trim() === "" || done) return;
    sendAction("submit_answer", { answer: Number(input) });
    setInput("");
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-xs text-center">
          <p className="mb-2 text-xs text-ink-muted">Puzzle {Math.min(progress.index + 1, puzzleCount)} / {puzzleCount} · {progress.correct} correct</p>
          {done ? (
            <div className="glass-panel p-8"><p className="text-ink-muted">All puzzles solved — waiting for time or your rival to finish.</p></div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div key={progress.index} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="glass-panel mb-4 p-8">
                  <p className="font-display text-4xl font-bold text-ink-primary">{currentQuestion}</p>
                </motion.div>
              </AnimatePresence>
              <input autoFocus inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value.replace(/[^-\d]/g, ""))} onKeyDown={(e) => e.key === "Enter" && submit()} className="selectable glass-panel stat-mono w-full text-center text-2xl text-ink-primary outline-none" placeholder="?" />
              <button onClick={submit} className="btn-primary mt-4 w-full">Submit</button>
            </>
          )}
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
