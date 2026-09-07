"use client";

import { motion } from "framer-motion";

/**
 * Indeterminate loading indicator for waits with no real completion signal
 * (waiting for an opponent, waiting for a match to start, etc). There's no
 * genuine progress fraction for these, so this stays purely indeterminate —
 * just built from the app's own "Duel Split" signature instead of a plain
 * spinner: two competing dots (cyan / magenta, same pairing as the
 * duel-radial background) bouncing on either side of the same flickering
 * seam that divides live matchups (see .duel-seam in globals.css).
 */
export function LoadingProgress({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="flex h-8 items-center gap-3">
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-cyan shadow-glow-cyan"
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="duel-seam h-full" />
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-magenta shadow-glow-magenta"
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
        />
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
