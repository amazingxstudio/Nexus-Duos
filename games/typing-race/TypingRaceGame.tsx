"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";
import { hapticTap } from "@/lib/haptics";

const DURATION_MS = 90 * 1000;
// How long the "Rival typed it first" banner holds the finished sentence
// on screen before the next one actually replaces it — mirrors the same
// pause in GuessTheWordGame, so the two race-style games feel consistent.
const OPPONENT_FIRST_BANNER_MS = 1100;

export function TypingRaceGame({ matchId, roomCode, opponentId, gameKey }: { matchId: string; roomCode: string; opponentId: string; gameKey: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, cancelled, opponentDisconnected, result, leaveMatch } = useGameMatch({ matchId, roomCode });
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks the last value WE accepted, so every change can be checked
  // against it — this is what makes the anti-cheat check below possible.
  const prevValueRef = useRef("");

  // ---- Round transition buffering (item 6) ----
  // Same reasoning as GuessTheWordGame: the server swaps the sentence for
  // BOTH players the instant either one finishes it, so whoever didn't just
  // finish would otherwise see their sentence disappear with zero warning.
  // displaySentence/displayRound are what's actually rendered; they only
  // update immediately for the very first sentence of the match or for MY
  // OWN completed sentence — a sentence that changed because the rival
  // finished first is held behind a brief banner instead.
  const [displaySentence, setDisplaySentence] = useState<string | undefined>(undefined);
  const [displayRound, setDisplayRound] = useState<number | undefined>(undefined);
  const [opponentAnsweredFirst, setOpponentAnsweredFirst] = useState(false);
  const prevRoundRef = useRef<number | null>(null);
  const prevScoresRef = useRef<{ mine: number; opponent: number }>({ mine: 0, opponent: 0 });
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sentence = payload?.sentence as string | undefined;
  const round = payload?.round as number | undefined;
  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  useEffect(() => {
    if (!sentence || round === undefined) return;

    if (prevRoundRef.current === null) {
      setDisplaySentence(sentence);
      setDisplayRound(round);
      prevRoundRef.current = round;
      prevScoresRef.current = { mine: myScore, opponent: opponentScore };
      return;
    }

    if (round !== prevRoundRef.current) {
      const opponentJustScored = opponentScore > prevScoresRef.current.opponent;
      prevRoundRef.current = round;
      prevScoresRef.current = { mine: myScore, opponent: opponentScore };

      setTyped("");
      prevValueRef.current = "";

      if (opponentJustScored) {
        setOpponentAnsweredFirst(true);
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
          setDisplaySentence(sentence);
          setDisplayRound(round);
          setOpponentAnsweredFirst(false);
          inputRef.current?.focus();
        }, OPPONENT_FIRST_BANNER_MS);
      } else {
        // My own completed sentence — I already know I won this round.
        setDisplaySentence(sentence);
        setDisplayRound(round);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, round, myScore, opponentScore]);

  useEffect(() => () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); }, []);

  useEffect(() => { inputRef.current?.focus(); }, [displayRound]);

  // Auto-submit the instant the typed text is a full, exact match against
  // whatever sentence is currently on screen.
  useEffect(() => {
    if (!displaySentence || status !== "active" || opponentAnsweredFirst) return;
    if (typed.trim().toLowerCase() === displaySentence.trim().toLowerCase()) {
      hapticTap("medium");
      sendAction("submit_text", { text: typed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, displaySentence, status, opponentAnsweredFirst]);

  if (!payload || !displaySentence) return <LoadingProgress label="Waiting for match to start…" />;

  // Only a genuine single-keystroke append at the end, or a deletion from
  // the end (backspace / select-and-delete), is accepted. Anything else —
  // the phone keyboard's word-prediction bar completing a whole word,
  // autocorrect silently swapping a word mid-sentence, or a paste — changes
  // more than "one character at the cursor" in a single event and gets
  // rejected outright, so the on-screen keyboard's own suggestions can
  // never hand the player a free shortcut through the sentence.
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    const prevValue = prevValueRef.current;
    const isSingleCharAppend = newValue.length === prevValue.length + 1 && newValue.startsWith(prevValue);
    const isDeletion = newValue.length <= prevValue.length && prevValue.startsWith(newValue);
    if (!isSingleCharAppend && !isDeletion) return; // silently reject — input stays at its previous value
    prevValueRef.current = newValue;
    setTyped(newValue);
  }

  const inputDisabled = status !== "active" || opponentAnsweredFirst;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected} cancelled={cancelled} onLeave={leaveMatch}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%", maxWidth: 380 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.01em",
                opacity: opponentAnsweredFirst ? 0.3 : 1,
                transition: "opacity 0.25s",
              }}
            >
              {displaySentence.split("").map((ch, i) => {
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

            <AnimatePresence>
              {opponentAnsweredFirst && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "rgb(var(--color-ember))",
                  }}
                >
                  <Zap size={14} strokeWidth={2.5} />
                  Rival typed it first!
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={inputRef}
            value={typed}
            onChange={handleChange}
            onPaste={(e) => e.preventDefault()}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={inputDisabled}
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
