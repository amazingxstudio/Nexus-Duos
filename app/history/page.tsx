"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Frown, Minus, Bot, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { getGameMeta } from "@/lib/games";

interface MatchEntry {
  id: string; game: string; game_key: string; mode: string; date: string;
  self: { nickname: string; score: number };
  opponent: { nickname: string; player_id?: string; score: number };
  result: "WIN" | "LOSS" | "DRAW" | null;
}
const CACHE_KEY = "nexus_history_cache";

export default function HistoryPage() {
  const token = useAuthStore((s) => s.token);
  const [matches, setMatches] = useState<MatchEntry[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) setMatches(JSON.parse(cached));
    apiFetch<{ matches: MatchEntry[] }>("/history/me", { token })
      .then((res) => { setMatches(res.matches); sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.matches)); })
      .catch(() => { if (!cached) setError(true); });
  }

  useEffect(() => { if (token) load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen px-5 pb-28 pt-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-primary">Match History</h1>
      {error && (
        <div className="glass-panel flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-ink-muted">Couldn&apos;t load history.</p>
          <button onClick={load} className="btn-ghost"><RefreshCw size={16} />Retry</button>
        </div>
      )}
      {!error && matches === null && <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="glass-panel h-20 animate-pulse-glow p-4" />)}</div>}
      {matches?.length === 0 && <div className="glass-panel p-8 text-center text-ink-muted">No matches yet — go find a duel.</div>}
      <div className="flex flex-col gap-3">
        {matches?.map((m, i) => {
          const meta = getGameMeta(m.game_key);
          const Icon = meta?.icon;
          const ResultIcon = m.result === "WIN" ? Trophy : m.result === "LOSS" ? Frown : Minus;
          const resultColor = m.result === "WIN" ? "text-cyan" : m.result === "LOSS" ? "text-magenta" : "text-ink-muted";
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-panel flex items-center gap-3 p-4">
              {Icon && <span className="icon-badge h-10 w-10 shrink-0 bg-white/5"><Icon size={18} className="text-ink-muted" /></span>}
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-ink-primary">{m.game}</p>
                <p className="text-xs text-ink-muted">{m.mode === "PRACTICE_AI" ? "Practice · AI" : "Ranked"} · {new Date(m.date).toLocaleDateString()}</p>
                {m.opponent.player_id ? <Link href={`/profile/${m.opponent.player_id}`} className="text-xs text-violet">vs {m.opponent.nickname}</Link> : <p className="flex items-center gap-1 text-xs text-ink-muted"><Bot size={12} /> vs AI</p>}
              </div>
              <div className="text-right">
                <p className="stat-mono text-sm text-ink-primary">{m.self.score} – {m.opponent.score}</p>
                <p className={`mt-0.5 flex items-center justify-end gap-1 text-xs font-semibold uppercase ${resultColor}`}><ResultIcon size={12} />{m.result ?? "—"}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
