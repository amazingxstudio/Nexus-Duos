"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sword, Shield } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 50_000;
const STARTING_HP = 100;
interface Card { id: string; name: string; cost: number; attack: number; defense: number; }
interface PlayerBattleState { hp: number; energy: number; defense: number; }

export function ArenaCardsGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });

  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => sendAction("collect_energy", {}), 3000);
    return () => clearInterval(interval);
  }, [status, sendAction]);

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const cardPool = payload.card_pool as Card[];
  const battle = payload.battle as Record<string, PlayerBattleState>;
  const me = userId ? battle[userId] : undefined;
  const opponent = battle[opponentId];

  function playCard(cardId: string) { if (status === "active") sendAction("play_card", { card_id: cardId }); }

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={me?.hp ?? STARTING_HP} opponentScore={opponent?.hp ?? STARTING_HP} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-sm">
          <div className="mb-4 flex justify-center">
            <div className="glass-panel flex items-center gap-2 rounded-full px-4 py-1.5">
              <span className="text-xs text-ink-muted">Energy</span>
              <span className="stat-mono text-sm text-ember">{me?.energy ?? 0} / 10</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {cardPool.map((card) => {
              const affordable = (me?.energy ?? 0) >= card.cost;
              return (
                <motion.button key={card.id} whileTap={{ scale: 0.95 }} onClick={() => playCard(card.id)} disabled={!affordable || status !== "active"} className="glass-card flex flex-col items-start gap-1 p-3 text-left disabled:opacity-40">
                  <p className="font-display text-sm font-semibold text-ink-primary">{card.name}</p>
                  <p className="text-[11px] text-ink-muted">Cost {card.cost}</p>
                  <div className="flex gap-2 text-[11px]">
                    {card.attack > 0 && <span className="flex items-center gap-0.5 text-magenta"><Sword size={11} /> {card.attack}</span>}
                    {card.defense > 0 && <span className="flex items-center gap-0.5 text-cyan"><Shield size={11} /> {card.defense}</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
