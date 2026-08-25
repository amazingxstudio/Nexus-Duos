"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;

export function QuickMathGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const round = payload?.round as number | undefined;
  // A fresh problem (ours or the rival's) arrived — clear the box for the next one.
  useEffect(() => { setValue(""); inputRef.current?.focus(); }, [round]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const a = payload.a as number;
  const b = payload.b as number;
  const op = payload.op as string;
  const answer = payload.answer as number;

  function submit() {
    if (status !== "active" || value.trim() === "") return;
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed === answer) {
      sendAction("submit_answer", { value: parsed });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 350);
    }
    setValue("");
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", maxWidth: 320 }}>
          <motion.p
            key={`${a}${op}${b}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-mono"
            style={{ fontSize: 40, fontWeight: 700, color: "rgb(var(--color-ink-primary))" }}
          >
            {a} {op} {b}
          </motion.p>

          <motion.div
            animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            style={{ display: "flex", gap: 8, width: "100%" }}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9-]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              inputMode="numeric"
              placeholder="?"
              disabled={status !== "active"}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 22,
                fontWeight: 600,
                borderRadius: 14,
                padding: "12px 16px",
                background: "rgb(var(--color-surface))",
                border: `1px solid ${shake ? "rgb(var(--color-magenta))" : "rgb(var(--color-ink-primary) / 0.14)"}`,
                color: "rgb(var(--color-ink-primary))",
                outline: "none",
              }}
            />
            <button
              onClick={submit}
              disabled={status !== "active"}
              style={{
                padding: "0 22px",
                borderRadius: 14,
                border: "none",
                background: "rgb(var(--color-cyan))",
                color: "rgb(var(--color-void))",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Go
            </button>
          </motion.div>

          <p style={{ fontSize: 11, color: "rgb(var(--color-ink-faint))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Fastest correct answer scores
          </p>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
