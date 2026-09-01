"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Medal, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface LeaderboardEntry {
  nickname: string;
  player_id: string;
  total_score: number;
  wins: number;
}

const CACHE_KEY = "nexus_leaderboard_cache";

export default function LeaderboardPage() {
  const token = useAuthStore((s) => s.token);
  const myPlayerId = useAuthStore((s) => s.user?.profile.player_id);
  const [players, setPlayers] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) setPlayers(JSON.parse(cached));
    apiFetch<{ players: LeaderboardEntry[] }>("/profile/leaderboard", { token })
      .then((res) => {
        setPlayers(res.players);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.players));
      })
      .catch(() => {
        if (!cached) setError(true);
      });
  }

  useEffect(() => { if (token) load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-dvh px-5 pb-28 pt-10">
      <h1 className="mb-1 font-display text-2xl font-bold text-ink-primary">Leaderboard</h1>
      <p className="mb-6 text-xs text-ink-muted">Top players ranked by total score</p>

      {error && (
        <div className="glass-panel flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-ink-muted">Couldn&apos;t load the leaderboard.</p>
          <button onClick={load} className="btn-ghost"><RefreshCw size={16} />Retry</button>
        </div>
      )}

      {!error && players === null && (
        <div className="flex flex-col gap-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="glass-panel h-16 animate-pulse-glow p-4" />)}</div>
      )}

      {players?.length === 0 && <div className="glass-panel p-8 text-center text-ink-muted">No ranked players yet.</div>}

      <div className="flex flex-col gap-2">
        {players?.map((p, i) => {
          const rank = i + 1;
          const isMe = !!myPlayerId && p.player_id === myPlayerId;
          const RankIcon = rank === 1 ? Trophy : rank <= 3 ? Medal : null;
          const rankColor = rank === 1 ? "text-cyan" : rank === 2 ? "text-ink-primary" : rank === 3 ? "text-ember" : "text-ink-muted";
          return (
            <motion.div
              key={p.player_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex items-center gap-3 p-3 ${isMe ? "glass-panel-cyan" : "glass-panel"}`}
            >
              <span className={`icon-badge h-9 w-9 shrink-0 bg-white/5 ${rankColor}`}>
                {RankIcon ? <RankIcon size={16} /> : <span className="stat-mono text-xs">{rank}</span>}
              </span>
              <Link href={`/profile/${p.player_id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-primary">{p.nickname}{isMe && <span className="ml-1.5 text-xs text-cyan">(you)</span>}</p>
                <p className="stat-mono text-xs text-ink-muted">{p.player_id}</p>
              </Link>
              <div className="text-right">
                <p className="stat-mono text-sm font-semibold text-ink-primary">{p.total_score}</p>
                <p className="text-xs text-ink-muted">{p.wins} win{p.wins === 1 ? "" : "s"}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
