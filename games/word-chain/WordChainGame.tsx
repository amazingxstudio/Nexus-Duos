"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Check } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap } from "@/lib/haptics";

const DURATION_MS = 90 * 1000;
const TURN_SECONDS = 6;
const MAX_OVERTIME_SECONDS = 4;

// Letter rows only — confirm and backspace live inside the last row as
// real keys (confirm on the left, backspace on the right, same as a
// Wordle-style keyboard's Enter/⌫ pair), never as a separate labeled
// "Confirm" bar, so the whole thing reads as one keyboard.
const LETTER_ROWS = [
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

  // The keyboard is pinned with position: fixed to the literal bottom of
  // the screen (like a bottom nav bar), completely outside GameShell's own
  // padded/scrollable content column. That means it overlaps whatever's
  // behind it, so we measure its real rendered height and reserve that
  // much space at the bottom of the content column above it — otherwise
  // the turn card could end up centered partly behind the keyboard.
  const keyboardRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const el = keyboardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setKeyboardHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
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
  const keysDisabled = !myTurn || status !== "active";

  function tapLetter(letter: string) {
    if (keysDisabled) return;
    hapticTap("light");
    setTyped((t) => (t.length < 20 ? t + letter.toLowerCase() : t));
  }
  function backspace() {
    if (keysDisabled) return;
    hapticTap("light");
    setTyped((t) => t.slice(0, -1));
  }
  function confirm() {
    if (keysDisabled || !typed) return;
    hapticTap("medium");
    sendAction("submit_word", { word: typed });
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  const keyStyle: React.CSSProperties = {
    height: 40,
    borderRadius: 8,
    border: "none",
    background: "rgb(var(--color-surface))",
    color: "rgb(var(--color-ink-primary))",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: keysDisabled ? 0.4 : 1,
    cursor: keysDisabled ? "default" : "pointer",
  };

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        {/* The keyboard itself is rendered fixed to the screen below, so
            this column only holds the turn card. paddingBottom reserves
            exactly the keyboard's measured height so the card centers in
            the space above it instead of ending up partly hidden behind it. */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", maxWidth: 380, paddingBottom: keyboardHeight }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <motion.div
              animate={{
                borderColor: myTurn ? "rgb(var(--color-cyan) / 0.4)" : "rgb(var(--color-ink-primary) / 0.08)",
                boxShadow: myTurn ? "0 0 22px rgb(var(--color-cyan) / 0.18)" : "0 0 0 rgba(0,0,0,0)",
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "16px 14px",
                borderRadius: 20,
                border: "1.5px solid",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: myTurn ? "rgb(var(--color-cyan))" : "rgb(var(--color-ink-muted))",
                }}
              >
                {myTurn ? "● Your turn" : "Rival's turn"}
              </p>

              {/* The countdown only ever means something to the player who
                  can actually act on it — showing it during the rival's
                  turn was just confusing, so it's hidden then. */}
              {myTurn && (
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", height: 28 }}>
                  <span
                    className="stat-mono"
                    style={{ fontSize: 20, fontWeight: 700, color: overtime ? "rgb(var(--color-magenta))" : "rgb(var(--color-ink-primary))" }}
                  >
                    {Math.ceil(countdown)}s
                  </span>
                </div>
              )}

              <div style={{ position: "relative" }}>
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
                <AnimatePresence>
                  {flash && (
                    <motion.span
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: -18 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: "absolute",
                        top: -4,
                        left: "50%",
                        translateX: "-50%",
                        fontSize: 12,
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
              <p style={{ fontSize: 11, color: "rgb(var(--color-ink-faint))" }}>Next word must start with “{lastLetter}” · nouns only</p>

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
            </motion.div>
          </div>
        </div>
      </GameShell>

      {/* Pinned to the literal bottom edge of the phone screen — like a
          bottom navigation bar, not a panel that lives inside GameShell's
          own padded/scrollable column. inset-x-0 + bottom-0 with no outer
          margin means it sits flush against the screen edge; the real
          BottomNav is already hidden while a match is in progress, so
          there's nothing underneath it to collide with. */}
      <div
        ref={keyboardRef}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface/95 backdrop-blur-glass"
        style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 8, paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 380, margin: "0 auto" }}>
          {LETTER_ROWS.map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "center", gap: 4 }}>
              {/* Confirm lives here as a plain key — same size and style as
                  backspace, just a checkmark — instead of a separately
                  labeled "Confirm" bar underneath the keyboard. */}
              {i === LETTER_ROWS.length - 1 && (
                <button
                  onClick={confirm}
                  disabled={keysDisabled || !typed}
                  aria-label="Confirm word"
                  style={{ ...keyStyle, flex: 1.6, maxWidth: 54, color: "rgb(var(--color-cyan))", opacity: keysDisabled || !typed ? 0.4 : 1 }}
                >
                  <Check size={17} strokeWidth={2.5} />
                </button>
              )}
              {row.map((letter) => (
                <button key={letter} onClick={() => tapLetter(letter)} disabled={keysDisabled} style={{ ...keyStyle, flex: 1, maxWidth: 34 }}>
                  {letter}
                </button>
              ))}
              {i === LETTER_ROWS.length - 1 && (
                <button onClick={backspace} disabled={keysDisabled} style={{ ...keyStyle, flex: 1.6, maxWidth: 54 }}>
                  <Delete size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
