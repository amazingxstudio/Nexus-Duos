"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";

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
  const ring = side === "cyan" ? "border-cyan" : "border-magenta";
  const ringGlow = side === "cyan" ? "shadow-glow-cyan" : "shadow-glow-magenta";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`${glow} flex flex-1 flex-col items-center gap-3 p-6 text-center`}
    >
      <div className="relative">
        {!empty && <span className={`absolute -inset-1.5 rounded-full border ${ring} opacity-40 animate-pulse-glow`} />}
        <div
          className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 ${ring} ${ringGlow} bg-surface-raised bg-cover bg-center ${empty ? "opacity-30" : ""}`}
          style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
        >
          {!photoUrl && <User size={28} strokeWidth={1.5} className="text-ink-muted" />}
        </div>
      </div>
      <div>
        <p className={`font-display text-lg font-semibold ${empty ? "text-ink-faint" : "text-ink-primary"}`}>{empty ? "Waiting…" : name}</p>
        {playerId && !empty && <p className="stat-mono text-xs text-ink-muted">{playerId}</p>}
        {subtitle && !empty && <p className={`mt-1 text-xs font-medium ${accent}`}>{subtitle}</p>}
      </div>
    </motion.div>
  );
}
