"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap, hapticNotify } from "@/lib/haptics";

const DURATION_MS = 90 * 1000;
// How long the "Rival answered first" banner holds the finished round on
// screen before the next clue actually replaces it — long enough to read,
// short enough not to feel like dead time between rounds.
const OPPONENT_FIRST_BANNER_MS = 1100;

type RoundPayload = { round: number; clue: string; word_length: number; first_letter: string; last_letter: string };

export function GuessTheWordGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const socket = useSocket();
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [guess, setGuess] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- Round transition buffering (item 6) ----
  // The server advances the round for BOTH players the instant either one
  // answers correctly — normally that means whoever *didn't* just answer
  // sees their clue yanked out from under them with zero warning the
  // instant the rival's guess lands. displayRound is what's actually
  // rendered; it only ever gets updated from the real `payload` (a) on the
  // very first round of the match, (b) immediately when a round changes
  // because of MY OWN correct guess, or (c) after a short delay — with an
  // "opponent answered first" banner showing in the meantime — when the
  // round changed because the rival answered first.
  const [displayRound, setDisplayRound] = useState<RoundPayload | null>(null);
  const [opponentAnsweredFirst, setOpponentAnsweredFirst] = useState(false);
  const prevRoundRef = useRef<number | null>(null);
  const prevScoresRef = useRef<{ mine: number; opponent: number }>({ mine: 0, opponent: 0 });
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  useEffect(() => {
    if (!payload) return;
    const incoming = payload as unknown as RoundPayload;

    if (prevRoundRef.current === null) {
      // First payload of the match — nothing to transition from, show it immediately.
      setDisplayRound(incoming);
      prevRoundRef.current = incoming.round;
      prevScoresRef.current = { mine: myScore, opponent: opponentScore };
      return;
    }

    if (incoming.round !== prevRoundRef.current) {
      const opponentJustScored = opponentScore > prevScoresRef.current.opponent;
      prevRoundRef.current = incoming.round;
      prevScoresRef.current = { mine: myScore, opponent: opponentScore };

      // Whichever player didn't just score sees this branch — the guess
      // box is cleared right away (that round is over, nothing left to
      // submit into) but the actual clue swap is held behind the banner.
      setGuess("");

      if (opponentJustScored) {
        setOpponentAnsweredFirst(true);
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
          setDisplayRound(incoming);
          setOpponentAnsweredFirst(false);
          inputRef.current?.focus();
        }, OPPONENT_FIRST_BANNER_MS);
      } else {
        // My own correct guess — I already know I won this round, so there's
        // nothing to soften; show the next clue immediately.
        setDisplayRound(incoming);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, myScore, opponentScore]);

  useEffect(() => () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); }, []);

  // Refocus (and keep the on-screen keyboard up) the instant a fresh round
  // is actually showing — covers both "my own guess just advanced things"
  // and the tail end of the opponent-answered-first delay above.
  useEffect(() => { inputRef.current?.focus(); }, [displayRound?.round]);

  // A wrong guess — action_rejected fires the reason back to just this
  // player (see match_runner.py's handle_game_action). Shake the input and
  // give a light error haptic instead of leaving a bad guess sitting there
  // with no feedback at all; refocus in case the shake/animation frame
  // ever ends up stealing focus on some device.
  useEffect(() => {
    if (!socket) return;
    function onRejected(data: { match_id: string; reason: string }) {
      if (data.match_id !== matchId) return;
      hapticNotify("error");
      setShake(true);
      setTimeout(() => setShake(false), 350);
      inputRef.current?.focus();
    }
    socket.on("action_rejected", onRejected);
    return () => { socket.off("action_rejected", onRejected); };
  }, [socket, matchId]);

  if (!payload || !displayRound) return <LoadingProgress label="Waiting for match to start…" />;

  const { clue, word_length: wordLength, first_letter: firstLetter, last_letter: lastLetter } = displayRound;
  const inputDisabled = status !== "active" || opponentAnsweredFirst;

  function submit() {
    if (inputDisabled || guess.trim() === "") return;
    hapticTap("medium");
    sendAction("submit_guess", { guess: guess.trim() });
    // Deliberately not clearing `guess` here — if this guess is correct the
    // round-transition effect above clears it once the new round actually
    // arrives; if it's wrong, the action_rejected handler shakes the box so
    // the player can see and correct what they typed rather than having it
    // vanish out from under them.
  }

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: 340 }}>
          <div style={{ position: "relative", minHeight: 24, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <AnimatePresence mode="wait">
              {opponentAnsweredFirst ? (
                <motion.p
                  key="opponent-first"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgb(var(--color-ember))" }}
                >
                  <Zap size={13} strokeWidth={2.5} />
                  Rival answered first!
                </motion.p>
              ) : (
                <motion.p
                  key={clue}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 16, textAlign: "center", color: "rgb(var(--color-ink-primary))" }}
                >
                  “{clue}”
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", flexWrap: "wrap", opacity: opponentAnsweredFirst ? 0.35 : 1, transition: "opacity 0.25s" }}>
            {Array.from({ length: wordLength }).map((_, i) => {
              const isFirst = i === 0;
              const isLast = i === wordLength - 1;
              const hint = isFirst ? firstLetter : isLast ? lastLetter : null;
              return (
                <div
                  key={i}
                  className="stat-mono"
                  style={{
                    width: 22,
                    height: 28,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: hint ? "rgb(var(--color-cyan))" : "rgb(var(--color-ink-primary) / 0.25)",
                    borderBottom: "2px solid rgb(var(--color-ink-primary) / 0.25)",
                    paddingBottom: 2,
                  }}
                >
                  {hint ?? ""}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: "rgb(var(--color-ink-faint))" }}>{wordLength}-letter word — first &amp; last letter shown</p>

          {/* The "Guess" button is gone — the on-screen keyboard's own
              Enter/Return/Go key confirms a guess now (enterKeyHint nudges
              mobile keyboards to actually label that key "Go" instead of a
              plain return arrow). inputRef stays focused across rounds (see
              the effects above) so the keyboard never has to be summoned
              again mid-match — only the very first tap on this box needs
              to open it, same as any ordinary text input. */}
          <motion.input
            ref={inputRef}
            animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type your guess, then hit Go…"
            disabled={inputDisabled}
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: 15,
              borderRadius: 14,
              padding: "12px 16px",
              background: "rgb(var(--color-surface))",
              border: `1px solid rgb(var(--color-${shake ? "magenta" : "ink-primary"}) / ${shake ? 0.5 : 0.14})`,
              color: "rgb(var(--color-ink-primary))",
              outline: "none",
            }}
          />
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} gameKey={gameKey} opponentId={opponentId} />
      )}
    </>
  );
}
