"use client";

import { CyberDuelGame } from "@/games/cyber-duel/CyberDuelGame";
import { SpeedTypingGame } from "@/games/speed-typing/SpeedTypingGame";
import { CodeBreakerGame } from "@/games/code-breaker/CodeBreakerGame";
import { MemoryWarfareGame } from "@/games/memory-warfare/MemoryWarfareGame";
import { PuzzleArenaGame } from "@/games/puzzle-arena/PuzzleArenaGame";
import { TowerControlGame } from "@/games/tower-control/TowerControlGame";
import { NeonChessGame } from "@/games/neon-chess/NeonChessGame";
import { ArenaCardsGame } from "@/games/arena-cards/ArenaCardsGame";

interface GameDispatcherProps { gameKey: string; matchId: string; roomCode: string; opponentId: string; }

export function GameDispatcher({ gameKey, matchId, roomCode, opponentId }: GameDispatcherProps) {
  const props = { matchId, roomCode, opponentId };
  switch (gameKey) {
    case "CYBER_DUEL": return <CyberDuelGame {...props} />;
    case "SPEED_TYPING": return <SpeedTypingGame {...props} />;
    case "CODE_BREAKER": return <CodeBreakerGame {...props} />;
    case "MEMORY_WARFARE": return <MemoryWarfareGame {...props} />;
    case "PUZZLE_ARENA": return <PuzzleArenaGame {...props} />;
    case "TOWER_CONTROL": return <TowerControlGame {...props} />;
    case "NEON_CHESS": return <NeonChessGame {...props} />;
    case "ARENA_CARDS": return <ArenaCardsGame {...props} />;
    default:
      return <div className="glass-panel p-6 text-center text-ink-muted">This game isn&apos;t available yet.</div>;
  }
}
