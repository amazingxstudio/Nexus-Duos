"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Shuffle, X } from "lucide-react";
import { GAMES } from "@/lib/games";

interface Target {
  user_id: string;
  nickname: string;
}

interface GameInvitePickerSheetProps {
  target: Target | null;
  onClose: () => void;
  onPick: (gameKey: string | null) => void;
}

/**
 * Bottom sheet shown when inviting someone to duel — lets the sender pick
 * "Voting" (both sides pick 3 favorites, same as before) or lock the
 * invite straight to one of the 8 games. Shared between the Friends page
 * and the Find page so both invite flows look and behave identically.
 */
export function GameInvitePickerSheet({ target, onClose, onPick }: GameInvitePickerSheetProps) {
  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-end justify-center bg-void/70 backdrop-blur-glass"
          onClick={onClose}
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
              <p className="text-sm font-medium text-ink-primary">Duel {target.nickname} in…</p>
              <button onClick={onClose} className="icon-badge h-8 w-8 bg-white/5 text-ink-muted"><X size={14} /></button>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => onPick(null)} className="selectable glass-panel flex items-center gap-3 p-3 text-left">
                <span className="icon-badge h-10 w-10 bg-violet/10"><Shuffle size={18} className="text-violet" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">Voting</p>
                  <p className="text-xs text-ink-muted">Both of you pick 3 favorites</p>
                </div>
              </button>

              {GAMES.map((g) => (
                <button key={g.key} onClick={() => onPick(g.key)} className="selectable glass-panel flex items-center gap-3 p-3 text-left">
                  <span className="icon-badge h-10 w-10 bg-cyan/10"><g.icon size={18} className="text-cyan" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-primary">{g.name}</p>
                    <p className="text-xs text-ink-muted">{g.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
