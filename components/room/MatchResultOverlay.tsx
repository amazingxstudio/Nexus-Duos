"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Frown, Minus, Swords, Home } from "lucide-react";

interface MatchResultOverlayProps {
  myScore: number;
  opponentScore: number;
  didWin: boolean | null;
}

export function MatchResultOverlay({ myScore, opponentScore, didWin }: MatchResultOverlayProps) {
  const title = didWin === null ? "Draw" : didWin ? "Victory" : "Defeat";
  const accent = didWin === null ? "text-ink-primary" : didWin ? "text-cyan" : "text-magenta";
  const glow = didWin === null ? "" : didWin ? "shadow-glow-cyan" : "shadow-glow-magenta";
  const Icon = didWin === null ? Minus : didWin ? Trophy : Frown;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/90 backdrop-blur-glass">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`glass-panel flex flex-col items-center gap-4 border p-8 text-center ${didWin === null ? "border-white/10" : didWin ? "border-cyan/30" : "border-magenta/30"} ${glow}`}
      >
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
          className={`icon-badge h-16 w-16 border ${didWin === null ? "border-white/10" : didWin ? "border-cyan/40" : "border-magenta/40"}`}
        >
          <Icon size={28} strokeWidth={2} className={accent} />
        </motion.span>
        <p className={`font-display text-3xl font-bold ${accent}`}>{title}</p>
        <p className="stat-mono text-2xl text-ink-primary">
          {myScore} <span className="text-ink-faint">–</span> {opponentScore}
        </p>
        <div className="mt-2 flex gap-3">
          <Link href="/find" className="btn-primary"><Swords size={16} strokeWidth={2.25} />Duel Again</Link>
          <Link href="/" className="btn-ghost"><Home size={16} strokeWidth={2.25} />Home</Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
