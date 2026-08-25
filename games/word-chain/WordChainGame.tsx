"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;

export function WordChainGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [word, setWord] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = payload?.current_word as string | undefined;
  useEffect(() => { setWord(""); inputRef.current?.focus(); }, [currentWord]);

  if (!payload || !currentWord) return <LoadingProgress label="Waiting for match to start…" />;

  const lastLetter = currentWord[currentWord.length - 1].toUpperCase();
  const trimmed = word.trim();
  const firstLetterOk = trimmed.length === 0 || trimmed[0].toLowerCase() === currentWord[currentWord.length - 1].toLowerCase();

  function submit() {
    if (status !== "active" || trimmed === "") return;
    sendAction("submit_word", { word: trimmed });
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 340 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgb(var(--color-ink-muted))" }}>Current word</p>

          <motion.p
            key={currentWord}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="stat-mono"
            style={{ fontSize: 30, fontWeight: 700 }}
          >
            {currentWord.slice(0, -1)}
            <span style={{ color: "rgb(var(--color-cyan))" }}>{currentWord.slice(-1)}</span>
          </motion.p>
          <p style={{ fontSize: 12, color: "rgb(var(--color-ink-faint))" }}>Next word must start with “{lastLetter}”</p>

          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              ref={inputRef}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={`A word starting with "${lastLetter}"…`}
              disabled={status !== "active"}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 15,
                borderRadius: 14,
                padding: "12px 16px",
                background: "rgb(var(--color-surface))",
                border: `1px solid ${firstLetterOk ? "rgb(var(--color-ink-primary) / 0.14)" : "rgb(var(--color-magenta) / 0.5)"}`,
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
              Link
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
