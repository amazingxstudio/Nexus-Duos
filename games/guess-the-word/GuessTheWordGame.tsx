"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;

export function GuessTheWordGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [guess, setGuess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const round = payload?.round as number | undefined;
  useEffect(() => { setGuess(""); inputRef.current?.focus(); }, [round]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const clue = payload.clue as string;
  const wordLength = payload.word_length as number;

  function submit() {
    if (status !== "active" || guess.trim() === "") return;
    sendAction("submit_guess", { guess: guess.trim() });
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: 340 }}>
          <motion.p
            key={clue}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 16, textAlign: "center", color: "rgb(var(--color-ink-primary))" }}
          >
            “{clue}”
          </motion.p>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {Array.from({ length: wordLength }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 22,
                  height: 3,
                  borderRadius: 999,
                  background: "rgb(var(--color-ink-primary) / 0.25)",
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: "rgb(var(--color-ink-faint))" }}>{wordLength}-letter word</p>

          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              ref={inputRef}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Type your guess…"
              disabled={status !== "active"}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 15,
                borderRadius: 14,
                padding: "12px 16px",
                background: "rgb(var(--color-surface))",
                border: "1px solid rgb(var(--color-ink-primary) / 0.14)",
                color: "rgb(var(--color-ink-primary))",
                outline: "none",
              }}
            />
            <button
              onClick={submit}
              disabled={status !== "active"}
              style={{
                padding: "0 20px",
                borderRadius: 14,
                border: "none",
                background: "rgb(var(--color-cyan))",
                color: "rgb(var(--color-void))",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Guess
            </button>
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
