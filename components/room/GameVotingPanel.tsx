"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { GAMES, getGameMeta, ACCENT_CLASSES } from "@/lib/games";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export function GameVotingPanel({ roomId }: { roomId: string }) {
  const socket = useSocket();
  const [picks, setPicks] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [tieBreakCandidates, setTieBreakCandidates] = useState<string[] | null>(null);
  const [tieBreakVoted, setTieBreakVoted] = useState(false);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);

  useEffect(() => {
    if (!socket) return;
    function onTieBreak(data: { candidates: string[] }) { setTieBreakCandidates(data.candidates); }
    function onPlayerSubmitted() { setOpponentSubmitted(true); }
    socket.on("vote:tiebreak_required", onTieBreak);
    socket.on("vote:player_submitted", onPlayerSubmitted);
    return () => {
      socket.off("vote:tiebreak_required", onTieBreak);
      socket.off("vote:player_submitted", onPlayerSubmitted);
    };
  }, [socket]);

  function togglePick(key: string) {
    if (submitted) return;
    setPicks((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  async function submitPicks() {
    if (picks.length !== 3) return;
    setSubmitted(true);
    const token = useAuthStore.getState().token;
    await apiFetch(`/rooms/${roomId}/vote/picks`, { method: "POST", token, body: JSON.stringify({ picks }) });
  }

  async function submitTieBreak(gameKey: string) {
    setTieBreakVoted(true);
    const token = useAuthStore.getState().token;
    await apiFetch(`/rooms/${roomId}/vote/tiebreak`, { method: "POST", token, body: JSON.stringify({ game_key: gameKey }) });
  }

  if (tieBreakCandidates) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm text-ink-muted">No common pick — final vote between all 6 games</p>
        <div className="grid grid-cols-2 gap-3">
          {tieBreakCandidates.map((key) => {
            const meta = getGameMeta(key);
            if (!meta) return null;
            const Icon = meta.icon;
            const c = ACCENT_CLASSES[meta.accent];
            return (
              <button key={key} disabled={tieBreakVoted} onClick={() => submitTieBreak(key)} className={`glass-card flex flex-col items-start gap-2 border p-4 disabled:opacity-50 ${c.border}`}>
                <span className={`icon-badge h-9 w-9 ${c.bg}`}><Icon size={18} strokeWidth={2} className={c.text} /></span>
                <p className="font-display text-sm font-semibold text-ink-primary">{meta.name}</p>
              </button>
            );
          })}
        </div>
        {tieBreakVoted && <p className="text-center text-sm text-cyan">Vote submitted — waiting on opponent…</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm text-ink-muted">Pick exactly 3 games you&apos;d like to play</p>
        {opponentSubmitted && !submitted && <p className="mt-1 text-xs text-ember">Your rival has already picked — your turn</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game) => {
          const selected = picks.includes(game.key);
          const Icon = game.icon;
          const c = ACCENT_CLASSES[game.accent];
          return (
            <motion.button
              key={game.key}
              whileTap={{ scale: 0.96 }}
              onClick={() => togglePick(game.key)}
              disabled={submitted}
              className={`glass-card relative flex flex-col items-start gap-2 border p-4 text-left disabled:opacity-50 ${selected ? `${c.border} ${c.glow}` : "border-white/[0.08]"}`}
            >
              {selected && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={`icon-badge absolute right-3 top-3 h-5 w-5 ${c.bg}`}>
                  <Check size={12} strokeWidth={3} className={c.text} />
                </motion.span>
              )}
              <span className={`icon-badge h-9 w-9 ${c.bg}`}><Icon size={18} strokeWidth={2} className={c.text} /></span>
              <div>
                <p className="font-display text-sm font-semibold text-ink-primary">{game.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{game.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
      <button onClick={submitPicks} disabled={picks.length !== 3 || submitted} className="btn-primary">
        {submitted ? "Waiting for opponent…" : `Confirm Picks (${picks.length}/3)`}
      </button>
    </div>
  );
}
