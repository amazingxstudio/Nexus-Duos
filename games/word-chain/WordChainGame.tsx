"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 90 * 1000;
const TURN_SECONDS = 4;
const MAX_OVERTIME_SECONDS = 4;

// A custom on-screen QWERTY layout — deliberately not a text <input>, so
// the phone's own keyboard (with its word-prediction/autocomplete) never
// gets a chance to hand the player a hint mid-round.
const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const REJECT_MESSAGES: Record<string, string> = {
  INVALID_WORD: "Letters only",
  WRONG_LETTER: "Wrong starting letter",
  UNKNOWN_WORD: "Not in the dictionary",
  ALREADY_USED: "Already used this match",
  NOT_YOUR_TURN: "Not your turn",
  TOO_EARLY: "Not yet",
};

interface TurnDelta { user_id: string; points: number; reason: string }

export function WordChainGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const socket = useSocket();
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [typed, setTyped] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const firedTimeoutRef = useRef<number | null>(null); // turn_started_at we've already reported a timeout for

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const turnUserId = payload?.turn_user_id as string | undefined;
  const turnStartedAt = payload?.turn_started_at as number | undefined;
  const currentWord = payload?.current_word as string | undefined;
  const myTurn = turnUserId === userId;

  // A fresh turn started (successful answer or timeout skip) — clear whatever was half-typed.
  useEffect(() => { setTyped(""); }, [turnStartedAt]);

  // Client-side timeout report — the server re-validates the elapsed time
  // itself before trusting it, so this is just "hey, check the clock".
  useEffect(() => {
    if (!turnStartedAt || status !== "active") return;
    const elapsedSec = (now - turnStartedAt) / 1000;
    if (elapsedSec >= TURN_SECONDS + MAX_OVERTIME_SECONDS && firedTimeoutRef.current !== turnStartedAt) {
      firedTimeoutRef.current = turnStartedAt;
      sendAction("turn_timeout", {});
    }
  }, [now, turnStartedAt, status, sendAction]);

  // Rejected submissions (wrong letter, not in the dictionary, already
  // used…) — clear the buffer instead of making the player backspace it
  // themselves, and show why it didn't count.
  useEffect(() => {
    if (!socket) return;
    function onRejected(data: { match_id: string; reason: string }) {
      if (data.match_id !== matchId) return;
      setTyped("");
      setFlash(REJECT_MESSAGES[data.reason] ?? "Try again");
      setTimeout(() => setFlash(null), 1300);
    }
    socket.on("action_rejected", onRejected);
    return () => { socket.off("action_rejected", onRejected); };
  }, [socket, matchId]);

  // Flash the score swing ("+4" / "-2") whenever a turn resolves.
  const delta = (payload?.last_turn_delta ?? null) as TurnDelta | null;
  const deltaKey = delta ? `${delta.user_id}:${delta.points}:${payload?.round}` : "";
  useEffect(() => {
    if (!delta) return;
    setFlash(`${delta.points > 0 ? "+" : ""}${delta.points}`);
    const t = setTimeout(() => setFlash(null), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deltaKey]);

  if (!payload || !currentWord) return <LoadingProgress label="Waiting for match to start…" />;

  const lastLetter = currentWord[currentWord.length - 1].toUpperCase();
  const elapsedSec = turnStartedAt ? (now - turnStartedAt) / 1000 : 0;
  const countdown = TURN_SECONDS - elapsedSec; // can go negative — that's intentional
  const overtime = countdown < 0;

  function tapLetter(letter: string) {
    if (!myTurn || status !== "active") return;
    setTyped((t) => (t.length < 20 ? t + letter.toLowerCase() : t));
  }
  function backspace() {
    if (!myTurn || status !== "active") return;
    setTyped((t) => t.slice(0, -1));
  }
  function confirm() {
    if (!myTurn || status !== "active" || !typed) return;
    sendAction("submit_word", { word: typed });
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;
  const keysDisabled = !myTurn || status !== "active";

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%", maxWidth: 380 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: myTurn ? "rgb(var(--color-cyan))" : "rgb(var(--color-ink-muted))",
            }}
          >
            {myTurn ? "Your turn" : "Rival's turn"}
          </p>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", height: 30 }}>
            <span
              className="stat-mono"
              style={{ fontSize: 20, fontWeight: 700, color: overtime ? "rgb(var(--color-magenta))" : "rgb(var(--color-ink-primary))" }}
            >
              {countdown.toFixed(1)}s
            </span>
            <AnimatePresence>
              {flash && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: -16 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    top: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: flash.startsWith("+") ? "rgb(var(--color-cyan))" : flash.startsWith("-") ? "rgb(var(--color-magenta))" : "rgb(var(--color-ember))",
                  }}
                >
                  {flash}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <p style={{ fontSize: 11, color: "rgb(var(--color-ink-faint))" }}>Next word must start with “{lastLetter}”</p>

          <motion.p
            key={currentWord}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="stat-mono"
            style={{ fontSize: 26, fontWeight: 700 }}
          >
            {currentWord.slice(0, -1)}
            <span style={{ color: "rgb(var(--color-cyan))" }}>{currentWord.slice(-1)}</span>
          </motion.p>

          <div
            style={{
              minHeight: 40,
              width: "100%",
              borderRadius: 12,
              border: "1px solid rgb(var(--color-ink-primary) / 0.14)",
              background: "rgb(var(--color-surface))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "rgb(var(--color-ink-primary))",
            }}
          >
            {typed || <span style={{ color: "rgb(var(--color-ink-faint))" }}>{myTurn ? "Type a word…" : "Waiting…"}</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {KEY_ROWS.map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                {row.map((letter) => (
                  <button
                    key={letter}
                    onClick={() => tapLetter(letter)}
                    disabled={keysDisabled}
                    style={{
                      flex: 1,
                      maxWidth: 34,
                      height: 40,
                      borderRadius: 8,
                      border: "none",
                      background: "rgb(var(--color-surface))",
                      color: "rgb(var(--color-ink-primary))",
                      fontSize: 13,
                      fontWeight: 600,
                      opacity: keysDisabled ? 0.4 : 1,
                      cursor: keysDisabled ? "default" : "pointer",
                    }}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 2 }}>
              <button
                onClick={backspace}
                disabled={keysDisabled}
                style={{
                  flex: 1.4,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: "rgb(var(--color-ink-primary) / 0.1)",
                  color: "rgb(var(--color-ink-primary))",
                  fontSize: 15,
                  fontWeight: 600,
                  opacity: keysDisabled ? 0.4 : 1,
                  cursor: keysDisabled ? "default" : "pointer",
                }}
              >
                ⌫
              </button>
              <button
                onClick={confirm}
                disabled={keysDisabled || !typed}
                style={{
                  flex: 2,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: "rgb(var(--color-cyan))",
                  color: "rgb(var(--color-void))",
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: keysDisabled || !typed ? 0.4 : 1,
                  cursor: keysDisabled || !typed ? "default" : "pointer",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
