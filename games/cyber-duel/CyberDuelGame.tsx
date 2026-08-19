"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameMatch } from "@/games/engine/useGameMatch";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameShell } from "@/games/engine/GameShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MatchResultOverlay } from "@/components/room/MatchResultOverlay";

interface Target { id: string; x: number; y: number; spawned_at: number; expires_at: number; }
const DURATION_MS = 30_000;

export function CyberDuelGame({ matchId, roomCode, opponentId }: { matchId: string; roomCode: string; opponentId: string }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { payload, scores, remainingMs, sendAction, opponentDisconnected, status, result } = useGameMatch({ matchId, roomCode });
  const [visibleTargets, setVisibleTargets] = useState<Target[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => { if (payload && !startedAt) setStartedAt(Date.now()); }, [payload, startedAt]);

  useEffect(() => {
    if (!payload || !startedAt) return;
    const targets = (payload.targets as Target[]) ?? [];
    const frame = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setVisibleTargets(targets.filter((t) => elapsed >= t.spawned_at && elapsed <= t.expires_at));
    }, 60);
    return () => clearInterval(frame);
  }, [payload, startedAt]);

  function hit(targetId: string) { sendAction("target_hit", { target_id: targetId }); }

  if (!payload) return <LoadingProgress label="Waiting for match to start…" />;
  const myScore = userId ? (scores[userId] ?? 0) : 0;
  const opponentScore = scores[opponentId] ?? 0;

  return (
    <>
      <GameShell remainingMs={remainingMs} totalMs={DURATION_MS} myScore={myScore} opponentScore={opponentScore} opponentDisconnected={opponentDisconnected}>
        <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-card border border-white/10 bg-surface">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.06),transparent_70%)]" />
          <AnimatePresence>
            {visibleTargets.map((t) => (
              <motion.button key={t.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => hit(t.id)} className="absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-glow-cyan active:scale-90" style={{ left: `${t.x}%`, top: `${t.y}%` }} aria-label="target">
                <span className="absolute inset-0 animate-ping rounded-full bg-cyan/40" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </GameShell>
      {status === "finished" && result && userId && (
        <MatchResultOverlay myScore={result.scores[userId] ?? 0} opponentScore={result.scores[opponentId] ?? 0} didWin={result.winner_id === null ? null : result.winner_id === userId} />
      )}
    </>
  );
}
