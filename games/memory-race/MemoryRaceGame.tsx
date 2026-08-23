"use client";

import { Hourglass } from "lucide-react";

/**
 * Placeholder for Memory Race — this game isn't offered for selection
 * yet (see lib/games.ts's comingSoon flag on this game), so a real match
 * should never actually reach this screen. Exists so GameDispatcher's
 * import is always valid.
 *
 * To implement this game for real: replace this file's contents (keep the
 * export name MemoryRaceGame and this file's path), then flip comingSoon to
 * false for this game in lib/games.ts. Nothing else needs to change.
 */
export function MemoryRaceGame({}: { matchId: string; roomCode: string; opponentId: string }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-3 p-10 text-center">
      <Hourglass size={22} className="text-ink-muted" />
      <p className="font-display text-lg font-semibold text-ink-primary">Coming Soon</p>
      <p className="text-sm text-ink-muted">This game isn&apos;t ready yet — check back soon.</p>
    </div>
  );
}
