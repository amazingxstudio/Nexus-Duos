"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

interface GameShellProps {
  remainingMs: number | null;
  totalMs: number;
  myScore: number;
  opponentScore: number;
  opponentDisconnected?: boolean;
  children: React.ReactNode;
}

export function GameShell({ remainingMs, totalMs, myScore, opponentScore, opponentDisconnected, children }: GameShellProps) {
  const pct = remainingMs !== null ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 100;
  const urgent = pct < 20;

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-8 pt-6">
      <div className="glass-panel mb-4 h-2 w-full overflow-hidden rounded-full">
        <motion.div
          className={`h-full rounded-full ${urgent ? "bg-magenta" : "bg-gradient-to-r from-cyan to-violet"}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <ScorePill label="You" score={myScore} accent="cyan" />
        <span className="font-display text-xs uppercase tracking-widest text-ink-faint">VS</span>
        <ScorePill label="Rival" score={opponentScore} accent="magenta" />
      </div>

      <AnimatePresence>
        {opponentDisconnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-ember/30 bg-ember/10 px-4 py-2 text-center text-sm text-ember"
          >
            <WifiOff size={14} />
            Opponent disconnected — waiting to reconnect…
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 items-center justify-center">{children}</div>
    </div>
  );
}

function ScorePill({ label, score, accent }: { label: string; score: number; accent: "cyan" | "magenta" }) {
  return (
    <motion.div
      key={score}
      initial={{ scale: 1.08 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`glass-panel flex items-center gap-2 rounded-full px-4 py-2 ${accent === "cyan" ? "border-cyan/30" : "border-magenta/30"}`}
    >
      <span className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</span>
      <span className={`stat-mono text-lg font-semibold ${accent === "cyan" ? "text-cyan" : "text-magenta"}`}>{score}</span>
    </motion.div>
  );
}
