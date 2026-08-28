"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Delete, Check } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;
const DIAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", "del"];

export function QuickMathGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);

  const round = payload?.round as number | undefined;
  // A fresh problem (ours or the rival's) arrived — clear the pad for the next one.
  useEffect(() => { setValue(""); }, [round]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const a = payload.a as number;
  const b = payload.b as number;
  const op = payload.op as string;
  const answer = payload.answer as number;

  function tapKey(key: string) {
    if (status !== "active") return;
    if (key === "del") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (key === "-") {
      // Only meaningful as the very first character.
      setValue((v) => (v === "" ? "-" : v));
      return;
    }
    setValue((v) => (v.length < 6 ? v + key : v));
  }

  function submit() {
    if (status !== "active" || value === "" || value === "-") return;
    const parsed = Number(value);
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
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 300 }}>
          <motion.p
            key={`${a}${op}${b}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-mono"
            style={{ fontSize: 34, fontWeight: 700, color: "rgb(var(--color-ink-primary))" }}
          >
            {a} {op} {b}
          </motion.p>

          <motion.div
            animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: 26,
              fontWeight: 700,
              borderRadius: 14,
              padding: "10px 16px",
              minHeight: 50,
              background: "rgb(var(--color-surface))",
              border: `1px solid ${shake ? "rgb(var(--color-magenta))" : "rgb(var(--color-ink-primary) / 0.14)"}`,
              color: "rgb(var(--color-ink-primary))",
            }}
          >
            {value || <span style={{ color: "rgb(var(--color-ink-faint))", fontWeight: 400, fontSize: 16 }}>?</span>}
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%" }}>
            {DIAL_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => tapKey(key)}
                disabled={status !== "active"}
                style={{
                  aspectRatio: "1",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgb(var(--color-surface))",
                  color: "rgb(var(--color-ink-primary))",
                  fontSize: 20,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {key === "del" ? <Delete size={18} /> : key}
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={status !== "active" || value === "" || value === "-"}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 999,
              border: "none",
              background: "rgb(var(--color-cyan))",
              color: "rgb(var(--color-void))",
              fontWeight: 700,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: value === "" || value === "-" ? 0.5 : 1,
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            Submit
          </button>

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
