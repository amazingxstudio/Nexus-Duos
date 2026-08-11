"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 60_000;
interface Unit { id: string; owner_id: string; x: number; y: number; alive: boolean; }

export function NeonChessGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  if (!payload) return <p className="text-ink-muted">Waiting for match to start…</p>;

  const boardSize = payload.board_size as number;
  const units = (payload.units as Unit[]) ?? [];
  const turnUserId = payload.turn_user_id as string | null;
  const myTurn = turnUserId === userId;

  function squareContent(x: number, y: number) { return units.find((u) => u.alive && u.x === x && u.y === y); }

  function handleSquareTap(x: number, y: number) {
    if (!myTurn || status !== "active") return;
    const occupant = squareContent(x, y);
    if (selectedUnit) {
      sendAction("move_unit", { unit_id: selectedUnit, x, y });
      setSelectedUnit(null);
      return;
    }
    if (occupant && occupant.owner_id === userId) setSelectedUnit(occupant.id);
  }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-xs">
          <p className={`mb-3 text-center text-xs font-semibold uppercase tracking-widest ${myTurn ? "text-cyan" : "text-ink-muted"}`}>{myTurn ? "Your move" : "Rival's move"}</p>
          <div className="grid gap-1 rounded-card border border-white/10 bg-surface p-1" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}>
            {Array.from({ length: boardSize }).map((_, y) =>
              Array.from({ length: boardSize }).map((_, x) => {
                const unit = squareContent(x, y);
                const isMine = unit?.owner_id === userId;
                const isSelected = unit?.id === selectedUnit;
                return (
                  <button key={`${x}-${y}`} onClick={() => handleSquareTap(x, y)} className={`aspect-square rounded-md transition ${isSelected ? "bg-cyan/30 ring-2 ring-cyan" : "bg-white/[0.03] active:bg-white/[0.08]"}`}>
                    {unit && <motion.span layoutId={unit.id} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`block h-full w-full rounded-md ${isMine ? "bg-cyan shadow-glow-cyan" : "bg-magenta shadow-glow-magenta"}`} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
