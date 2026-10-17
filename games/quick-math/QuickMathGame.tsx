"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Delete, CornerDownLeft } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap } from "@/lib/haptics";

const DURATION_MS = 90 * 1000;
// A stuck problem never blocks the match (spec D.21a) — matches
// word_chain's engine.py ROUND_TIMEOUT_MS/MAX_WRONG_ATTEMPTS exactly.
const ROUND_TIMEOUT_SECONDS = 8;
// Confirm lives inside the keypad itself as its own key — no separate
// button to reach outside the pad. No "-" key either: every problem the
// backend generates (addition, subtraction with the larger number first,
// multiplication) always has a non-negative answer, so it was dead weight.
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "confirm"];

// Key and equation sizes scale with the screen's own height instead of
// being fixed pixels, so the whole board (equation + answer + 4 keypad
// rows) fits on short phones without scrolling and doesn't leave a big gap
// on tall ones. --tg-stable-vh is Telegram's keyboard-proof viewport height
// (see TelegramProvider.tsx); 100dvh is the fallback outside Telegram.
const KEY_HEIGHT = "clamp(46px, calc(var(--tg-stable-vh, 100dvh) * 0.08), 68px)";
const EQUATION_SIZE = "clamp(34px, calc(var(--tg-stable-vh, 100dvh) * 0.055), 48px)";

export function QuickMathGame({ matchId, roomCode, opponentId, opponentNickname, gameKey }: { matchId: string; roomCode: string; opponentId: string; opponentNickname: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [skipMessage, setSkipMessage] = useState<string | null>(null);
  const firedTimeoutRef = useRef<number | null>(null); // round_started_at we've already reported a timeout for

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const round = payload?.round as number | undefined;
  const roundStartedAt = payload?.round_started_at as number | undefined;
  // A fresh problem (ours, the rival's, or an auto-skip) arrived — clear the pad for the next one.
  useEffect(() => { setValue(""); }, [round]);

  // Brief "why did the problem just change" toast when this round was an
  // auto-skip rather than someone answering — otherwise a skip looks
  // identical to a normal round change with no explanation.
  useEffect(() => {
    const reason = payload?.last_skip_reason as string | undefined;
    if (!reason || round === undefined) return;
    setSkipMessage(reason === "TIMEOUT" ? "Time's up — new problem" : "Both stuck — new problem");
    const t = setTimeout(() => setSkipMessage(null), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Client-side timeout report — the server re-validates the elapsed time
  // itself before trusting it (see quick_math/engine.py), so this is just
  // "hey, check the clock". Mirrors word_chain's identical pattern.
  useEffect(() => {
    if (!roundStartedAt || status !== "active") return;
    const elapsedSec = (now - roundStartedAt) / 1000;
    if (elapsedSec >= ROUND_TIMEOUT_SECONDS && firedTimeoutRef.current !== roundStartedAt) {
      firedTimeoutRef.current = roundStartedAt;
      sendAction("round_timeout", {});
    }
  }, [now, roundStartedAt, status, sendAction]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const a = payload.a as number;
  const b = payload.b as number;
  const op = payload.op as string;
  const answer = payload.answer as number;

  function submit() {
    if (status !== "active" || value === "") return;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed === answer) {
      hapticTap("medium");
      sendAction("submit_answer", { value: parsed });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 350);
      // Reported so the server can track both players' wrong-attempt
      // counts toward the mutual-fail auto-skip (spec D.21a) — the
      // answer itself is never sent since it isn't secret (see
      // engine.py's docstring), just the fact that this guess missed.
      sendAction("wrong_attempt", {});
    }
    setValue("");
  }

  function tapKey(key: string) {
    if (status !== "active") return;
    if (key === "del") {
      hapticTap("light");
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (key === "confirm") {
      submit();
      return;
    }
    hapticTap("light");
    setValue((v) => (v.length < 6 ? v + key : v));
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch} stretchBoard>
        {/* Board root: a column that grows to fill the area GameShell hands
            it (flex: 1 0 auto — grows, never shrinks below its content, so
            a very short screen scrolls instead of overlapping). Two zones:
            the prompt zone (equation + answer) takes all spare height and
            centers its content, and the keypad sits directly under it,
            pinned to the bottom. No percentage heights anywhere — those
            were what let the old board collapse to content height and
            float high on some Telegram WebViews. */}
        <div style={{ display: "flex", flexDirection: "column", flex: "1 0 auto", width: "100%", maxWidth: 380, margin: "0 auto", gap: 12 }}>
          <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "8px 0" }}>
            <motion.p
              key={`${a}${op}${b}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="stat-mono"
              style={{ fontSize: EQUATION_SIZE, fontWeight: 700, lineHeight: 1.1, color: "rgb(var(--color-ink-primary))" }}
            >
              {a} {op} {b}
            </motion.p>

            {/* Fixed-height slot: the skip notice used to be inserted into
                the column, which shoved the answer box down every time it
                appeared and back up when it left. */}
            <div style={{ height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {skipMessage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--color-ember))" }}
                >
                  {skipMessage}
                </motion.p>
              )}
            </div>

            <motion.div
              animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className="stat-mono"
              style={{
                width: "100%",
                minHeight: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 700,
                borderRadius: 16,
                padding: "10px 18px",
                background: "rgb(var(--color-surface))",
                border: `1px solid ${shake ? "rgb(var(--color-magenta))" : "rgb(var(--color-ink-primary) / 0.14)"}`,
                color: "rgb(var(--color-ink-primary))",
              }}
            >
              {value || <span style={{ color: "rgb(var(--color-ink-faint))", fontWeight: 400, fontSize: 16 }}>?</span>}
            </motion.div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%" }}>
            {KEYS.map((key) => {
              const isConfirm = key === "confirm";
              const isDel = key === "del";
              const disabled = status !== "active" || (isConfirm && value === "");
              return (
                <motion.button
                  key={key}
                  type="button"
                  onClick={() => tapKey(key)}
                  disabled={disabled}
                  whileTap={disabled ? undefined : { scale: 0.94 }}
                  aria-label={isDel ? "Delete" : isConfirm ? "Submit answer" : undefined}
                  style={{
                    height: KEY_HEIGHT,
                    borderRadius: 18,
                    border: isConfirm ? "none" : "1px solid rgb(var(--color-ink-primary) / 0.08)",
                    background: isConfirm ? "rgb(var(--color-cyan))" : "rgb(var(--color-surface))",
                    color: isConfirm ? "rgb(var(--color-void))" : "rgb(var(--color-ink-primary))",
                    fontSize: 24,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isConfirm && value === "" ? 0.5 : 1,
                    touchAction: "manipulation",
                    userSelect: "none",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {isDel ? <Delete size={22} /> : isConfirm ? <CornerDownLeft size={24} strokeWidth={2.5} /> : key}
                </motion.button>
              );
            })}
          </div>

          <p style={{ fontSize: 12, textAlign: "center", color: "rgb(var(--color-ink-faint))" }}>
            Fastest correct answer scores
          </p>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} opponentNickname={opponentNickname} />
      )}
    </>
  );
}
