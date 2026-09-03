"use client";

import { motion } from "framer-motion";
import { Swords, Hourglass } from "lucide-react";

interface TurnIndicatorProps {
  /** True when it's this player's move right now. */
  myTurn: boolean;
  /** Shown while it's genuinely someone's turn to move — e.g. "Game over"
   * once a Connect Four board has a winner, or "Board full" for a draw.
   * When set, neither the active nor waiting styling applies. */
  overrideLabel?: string;
  activeLabel?: string;
  waitingLabel?: string;
}

/**
 * Shared "whose move is it" badge for the turn-based games (Connect Four,
 * Dots and Boxes, Word Chain). Replaces what used to be a plain 12px
 * uppercase <p> tag in each of those three files — easy to miss mid-match,
 * especially the instant it flips from "Rival's move" to "Your move" and
 * the player needs to notice fast. This version is a bordered glass pill
 * (reusing the app's existing .glass-panel-cyan look) with an icon, a
 * spring "pop" every time the turn actually changes hands (keyed on
 * myTurn, so React replays the entrance animation on every flip), and a
 * soft breathing glow behind it while it's genuinely your turn — cheap
 * (opacity/scale only) but reads as considerably more urgent than static
 * text ever did.
 *
 * Lives under components/ui/ rather than games/engine/ deliberately:
 * tailwind.config.ts only scans ./app and ./components for class names, not
 * ./games — a lesson already learned the hard way elsewhere in this
 * codebase (see the comments in ConnectFourGame.tsx/DotsAndBoxesGame.tsx
 * about board layout silently disappearing for the same reason). Keeping
 * this file under components/ui/ means it can safely use real Tailwind
 * classes instead of having to hand-roll everything as inline styles.
 */
export function TurnIndicator({ myTurn, overrideLabel, activeLabel = "Your Turn", waitingLabel = "Rival's Turn" }: TurnIndicatorProps) {
  if (overrideLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
        {overrideLabel}
      </span>
    );
  }

  return (
    <motion.span
      key={myTurn ? "mine" : "theirs"}
      initial={{ opacity: 0, y: -5, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 18 }}
      className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${
        myTurn ? "glass-panel-cyan text-cyan" : "border-white/10 bg-white/5 text-ink-muted"
      }`}
    >
      {myTurn && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1.5 -z-10 rounded-full bg-cyan/25 blur-md"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {myTurn ? <Swords size={13} strokeWidth={2.5} /> : <Hourglass size={13} strokeWidth={2.25} />}
      {myTurn ? activeLabel : waitingLabel}
    </motion.span>
  );
}
