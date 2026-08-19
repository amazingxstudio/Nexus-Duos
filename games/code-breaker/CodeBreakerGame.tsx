"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 60_000;
interface Attempt { guess: number[]; correct_position: number; correct_digit: number; }

export function CodeBreakerGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [current, setCurrent] = useState<number[]>([]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const codeLength = payload.code_length as number;
  const digitRange = payload.digit_range as number;
  const maxAttempts = payload.max_attempts as number;
  const attempts = (payload.attempts as Record<string, Attempt[]>)?.[userId ?? ""] ?? [];
  const solved = userId ? (payload.solved_by as Record<string, number>)?.[userId] !== undefined : false;

  function addDigit(d: number) { if (current.length < codeLength) setCurrent((c) => [...c, d]); }
  function submit() {
    if (current.length !== codeLength) return;
    sendAction("submit_guess", { guess: current });
    setCurrent([]);
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-sm">
          <p className="mb-3 text-center text-xs text-ink-muted">Crack the {codeLength}-digit code · {maxAttempts - attempts.length} attempts left</p>
          <div className="glass-panel mb-4 flex max-h-52 flex-col-reverse gap-2 overflow-y-auto p-3">
            {attempts.length === 0 && <p className="text-center text-xs text-ink-faint">No guesses yet</p>}
            {[...attempts].reverse().map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between text-sm">
                <span className="stat-mono text-ink-primary">{a.guess.join(" ")}</span>
                <span className="stat-mono text-xs"><span className="text-cyan">{a.correct_position} exact</span> · <span className="text-ember">{a.correct_digit} partial</span></span>
              </motion.div>
            ))}
          </div>
          <div className="mb-4 flex justify-center gap-2">
            {Array.from({ length: codeLength }).map((_, i) => (
              <div key={i} className="glass-panel stat-mono flex h-12 w-12 items-center justify-center text-lg text-ink-primary">{current[i] ?? "·"}</div>
            ))}
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {Array.from({ length: digitRange }).map((_, d) => (
              <button key={d} onClick={() => addDigit(d)} className="glass-card stat-mono py-3 text-lg text-ink-primary">{d}</button>
            ))}
            <button onClick={() => setCurrent((c) => c.slice(0, -1))} className="glass-card flex items-center justify-center py-3 text-ink-muted"><Delete size={18} /></button>
          </div>
          <button onClick={submit} disabled={current.length !== codeLength || solved || status !== "active"} className="btn-primary w-full">{solved ? "Solved!" : "Submit Guess"}</button>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
