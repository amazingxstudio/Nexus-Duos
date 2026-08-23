"use client";

import { ConnectFourGame } from "@/games/connect-four/ConnectFourGame";
import { DotsAndBoxesGame } from "@/games/dots-and-boxes/DotsAndBoxesGame";
import { QuickMathGame } from "@/games/quick-math/QuickMathGame";
import { TypingRaceGame } from "@/games/typing-race/TypingRaceGame";
import { GuessTheWordGame } from "@/games/guess-the-word/GuessTheWordGame";
import { MemoryRaceGame } from "@/games/memory-race/MemoryRaceGame";
import { FindTheDifferentGame } from "@/games/find-the-different/FindTheDifferentGame";
import { WordChainGame } from "@/games/word-chain/WordChainGame";

interface GameDispatcherProps { gameKey: string; matchId: string; roomCode: string; opponentId: string; }

// The final lineup, matching GameKey in the backend one-for-one. Building a
// game that's currently a placeholder only ever means replacing that one
// game's *Game.tsx file (same export name, same path) — this switch never
// needs to change again.
export function GameDispatcher({ gameKey, matchId, roomCode, opponentId }: GameDispatcherProps) {
  const props = { matchId, roomCode, opponentId };
  switch (gameKey) {
    case "CONNECT_FOUR": return <ConnectFourGame {...props} />;
    case "DOTS_AND_BOXES": return <DotsAndBoxesGame {...props} />;
    case "QUICK_MATH": return <QuickMathGame {...props} />;
    case "TYPING_RACE": return <TypingRaceGame {...props} />;
    case "GUESS_THE_WORD": return <GuessTheWordGame {...props} />;
    case "MEMORY_RACE": return <MemoryRaceGame {...props} />;
    case "FIND_THE_DIFFERENT": return <FindTheDifferentGame {...props} />;
    case "WORD_CHAIN": return <WordChainGame {...props} />;
    default:
      return <div className="glass-panel p-6 text-center text-ink-muted">This game isn&apos;t available yet.</div>;
  }
}
