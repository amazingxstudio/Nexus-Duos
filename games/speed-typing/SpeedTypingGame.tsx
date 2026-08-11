"use client";

import { useState } from "react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 45_000;

export function SpeedTypingGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [typed, setTyped] = useState("");

  if (!payload) return <p className="text-ink-muted">Waiting for match to start…</p>;
  const sentence = (payload.sentence as string) ?? "";

  function handleChange(value: string) {
    if (status !== "active") return;
    setTyped(value);
    sendAction("progress_update", { typed_text: value });
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-md">
          <p className="selectable glass-panel mb-4 p-4 text-lg leading-relaxed">
            {sentence.split("").map((char, i) => {
              const typedChar = typed[i];
              const color = typedChar === undefined ? "text-ink-muted" : typedChar === char ? "text-cyan" : "text-magenta bg-magenta/10";
              return <span key={i} className={color}>{char}</span>;
            })}
          </p>
          <textarea value={typed} onChange={(e) => handleChange(e.target.value)} disabled={status !== "active"} rows={3} autoFocus className="selectable w-full rounded-card border border-white/10 bg-surface-raised p-4 font-mono text-ink-primary outline-none transition-colors focus:border-cyan/50" placeholder="Start typing the moment the match begins…" />
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
