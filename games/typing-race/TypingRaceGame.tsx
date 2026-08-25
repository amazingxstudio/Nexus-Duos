"use client";

import { useEffect, useRef, useState } from "react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;

export function TypingRaceGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sentence = payload?.sentence as string | undefined;

  // A new sentence (ours or the rival's) arrived — clear the box.
  useEffect(() => { setTyped(""); inputRef.current?.focus(); }, [sentence]);

  // Auto-submit the instant the typed text is a full, exact match.
  useEffect(() => {
    if (!sentence || status !== "active") return;
    if (typed.trim().toLowerCase() === sentence.trim().toLowerCase()) {
      sendAction("submit_text", { text: typed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, sentence, status]);

  if (!payload || !sentence) return <LoadingProgress label="Waiting for match to start…" />;

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: 380 }}>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.01em",
            }}
          >
            {sentence.split("").map((ch, i) => {
              const typedCh = typed[i];
              let color = "rgb(var(--color-ink-faint))";
              if (typedCh !== undefined) {
                color = typedCh.toLowerCase() === ch.toLowerCase() ? "rgb(var(--color-cyan))" : "rgb(var(--color-magenta))";
              }
              return (
                <span key={i} style={{ color, textDecoration: i === typed.length ? "underline" : "none" }}>
                  {ch}
                </span>
              );
            })}
          </p>

          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={status !== "active"}
            placeholder="Start typing…"
            style={{
              width: "100%",
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

          <p style={{ fontSize: 11, color: "rgb(var(--color-ink-faint))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Same sentence, fastest exact match wins
          </p>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
