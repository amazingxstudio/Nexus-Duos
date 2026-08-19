"use client";

import { Zap } from "lucide-react";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

const DURATION_MS = 40_000;
interface Zone { id: number; owner_id: string | null; progress: number; capturing_by: string | null; }

export function TowerControlGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, status, opponentDisconnected, result } = useGameMatch({ matchId, roomCode });

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;

  const zones = payload.zones as Zone[];
  const resources = userId ? ((payload.resources as Record<string, number>)?.[userId] ?? 0) : 0;

  function capture(zoneId: number) { if (status === "active" && resources >= 1) sendAction("capture_zone", { zone_id: zoneId }); }
  function collect() { if (status === "active") sendAction("collect_resource", {}); }

  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="w-full max-w-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-ink-muted">Zones held: {zones.filter((z) => z.owner_id === userId).length} / {zones.length}</p>
            <button onClick={collect} className="glass-card flex items-center gap-1 rounded-full px-4 py-1.5 text-sm text-ember"><Zap size={14} /> Collect · {resources}</button>
          </div>
          <div className="flex flex-col gap-3">
            {zones.map((zone) => {
              const mine = zone.owner_id === userId;
              const enemy = zone.owner_id && !mine;
              const contested = zone.capturing_by && zone.capturing_by !== zone.owner_id;
              return (
                <button key={zone.id} onClick={() => capture(zone.id)} className={`glass-card relative overflow-hidden p-4 text-left ${mine ? "border-cyan/50 shadow-glow-cyan" : enemy ? "border-magenta/50 shadow-glow-magenta" : "border-white/[0.08]"}`}>
                  <div className={`absolute inset-y-0 left-0 opacity-20 transition-all ${mine ? "bg-cyan" : enemy ? "bg-magenta" : "bg-violet"}`} style={{ width: `${zone.progress}%` }} />
                  <div className="relative flex items-center justify-between">
                    <span className="font-display text-sm font-semibold text-ink-primary">Zone {zone.id + 1}</span>
                    <span className="text-xs text-ink-muted">{mine ? "Held by you" : enemy ? "Held by rival" : "Neutral"}{contested ? " · contested" : ""}</span>
                  </div>
                </button>
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
