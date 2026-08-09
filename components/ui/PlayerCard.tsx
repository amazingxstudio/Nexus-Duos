"use client";

import { motion } from "framer-motion";

interface PlayerCardProps {
  side: "cyan" | "magenta";
  name: string;
  playerId?: string;
  photoUrl?: string | null;
  subtitle?: string;
  empty?: boolean;
}

export function PlayerCard({ side, name, playerId, photoUrl, subtitle, empty }: PlayerCardProps) {
  const glow = side === "cyan" ? "glass-panel-cyan" : "glass-panel-magenta";
  const accent = side === "cyan" ? "text-cyan" : "text-magenta";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`${glow} flex flex-1 flex-col items-center gap-3 p-6 text-center`}
    >
      <div
        className={`h-20 w-20 rounded-full border-2 ${
          side === "cyan" ? "border-cyan" : "border-magenta"
        } bg-surface-raised bg-cover bg-center ${empty ? "animate-pulse-glow opacity-40" : ""}`}
        style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
      />
      <div>
        <p className={`font-display text-lg font-semibold ${empty ? "text-ink-faint" : "text-ink-primary"}`}>
          {empty ? "Waiting…" : name}
        </p>
        {playerId && <p className="stat-mono text-xs text-ink-muted">{playerId}</p>}
        {subtitle && <p className={`mt-1 text-xs ${accent}`}>{subtitle}</p>}
      </div>
    </motion.div>
  );
}
