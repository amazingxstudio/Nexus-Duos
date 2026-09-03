"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Feather, Gauge, Flame, Loader2, X } from "lucide-react";
import { GAMES, ACCENT_CLASSES } from "@/lib/games";

export type AIDifficulty = "EASY" | "NORMAL" | "PRO";

// Practice vs AI only covers the two games with a real AI policy behind
// them right now (see the backend's app/games/ai/registry.py) — every
// other game in GAMES stays hidden from this sheet rather than showing
// and then failing the request. Add a key here the same day its *_ai.py
// ships on the backend, nothing else in this file changes.
const PRACTICE_GAME_KEYS = ["CONNECT_FOUR", "DOTS_AND_BOXES"];
const PRACTICE_GAMES = GAMES.filter((g) => PRACTICE_GAME_KEYS.includes(g.key));

interface DifficultyMeta {
  key: AIDifficulty;
  name: string;
  description: string;
  icon: typeof Feather;
  accent: "cyan" | "violet" | "ember";
}

const DIFFICULTIES: DifficultyMeta[] = [
  { key: "EASY", name: "Easy", description: "Relaxed pace, forgiving mistakes — good for warming up.", icon: Feather, accent: "cyan" },
  { key: "NORMAL", name: "Normal", description: "Balanced reactions and accuracy — a fair fight.", icon: Gauge, accent: "violet" },
  { key: "PRO", name: "Pro", description: "Fast and sharp — brings its best every round.", icon: Flame, accent: "ember" },
];

interface PracticeSetupSheetProps {
  open: boolean;
  onClose: () => void;
  onStart: (gameKey: string, difficulty: AIDifficulty) => void;
  starting: boolean;
}

/**
 * Two-step bottom sheet for Practice vs AI: pick one of the AI-enabled
 * games, then pick a difficulty. Mirrors GameInvitePickerSheet's
 * layout/motion so the app's two "pick a game" flows feel like the same
 * component family.
 */
export function PracticeSetupSheet({ open, onClose, onStart, starting }: PracticeSetupSheetProps) {
  const [selectedGame, setSelectedGame] = useState<(typeof PRACTICE_GAMES)[number] | null>(null);

  function handleClose() {
    if (starting) return;
    setSelectedGame(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-end justify-center bg-void/70 backdrop-blur-glass"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="glass-panel max-h-[75vh] w-full max-w-sm overflow-y-auto rounded-t-3xl rounded-b-none p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedGame && (
                  <button onClick={() => setSelectedGame(null)} className="icon-badge h-8 w-8 bg-white/5 text-ink-muted">
                    <ChevronLeft size={14} />
                  </button>
                )}
                <p className="text-sm font-medium text-ink-primary">
                  {selectedGame ? `${selectedGame.name} · Choose a difficulty` : "Practice vs AI · Choose a game"}
                </p>
              </div>
              <button onClick={handleClose} className="icon-badge h-8 w-8 bg-white/5 text-ink-muted"><X size={14} /></button>
            </div>

            {!selectedGame ? (
              <div className="flex flex-col gap-2">
                {PRACTICE_GAMES.map((g) => (
                  <button key={g.key} onClick={() => setSelectedGame(g)} className="selectable glass-panel flex items-center gap-3 p-3 text-left">
                    <span className={`icon-badge h-10 w-10 ${ACCENT_CLASSES[g.accent].bg}`}>
                      <g.icon size={18} className={ACCENT_CLASSES[g.accent].text} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-primary">{g.name}</p>
                      <p className="text-xs text-ink-muted">{g.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.key}
                    disabled={starting}
                    onClick={() => onStart(selectedGame.key, d.key)}
                    className="selectable glass-panel flex items-center gap-3 p-3 text-left disabled:opacity-60"
                  >
                    <span className={`icon-badge h-10 w-10 ${ACCENT_CLASSES[d.accent].bg}`}>
                      {starting ? <Loader2 size={16} className={`animate-spin ${ACCENT_CLASSES[d.accent].text}`} /> : <d.icon size={18} className={ACCENT_CLASSES[d.accent].text} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-primary">{d.name}</p>
                      <p className="text-xs text-ink-muted">{d.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
