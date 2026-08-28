"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Trophy, Percent, Target, Lock, Bot, UserPlus, Check, Copy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { getGameMeta } from "@/lib/games";

interface PublicProfile {
  nickname: string; player_id: string; photo_url?: string | null;
  total_matches: number; wins: number; losses: number; draws: number;
  win_rate: number; total_score: number; history_visible: boolean;
}

interface MatchEntry {
  id: string; game: string; game_key: string; mode: string; date: string;
  self: { nickname: string; score: number };
  opponent: { nickname: string; player_id?: string; score: number };
  result: "WIN" | "LOSS" | "DRAW" | null;
}

export default function OpponentProfilePage({ params }: { params: { playerId: string } }) {
  const { playerId } = params;
  const token = useAuthStore((s) => s.token);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [matches, setMatches] = useState<MatchEntry[] | null>(null);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<PublicProfile>(`/profile/${playerId}`, { token })
      .then(setProfile)
      .catch(() => setLoadError(true));
  }, [playerId, token]);

  useEffect(() => {
    if (!profile?.history_visible) return;
    apiFetch<{ matches: MatchEntry[]; hidden: boolean }>(`/history/${playerId}`, { token })
      .then((res) => setMatches(res.matches))
      .catch(() => setMatches([]));
  }, [profile?.history_visible, playerId, token]);

  async function addFriend() {
    if (!profile || added) return;
    await apiFetch("/players/friends", { method: "POST", token, body: JSON.stringify({ player_id: profile.player_id }) });
    setAdded(true);
  }

  function copyId() {
    if (!profile) return;
    navigator.clipboard.writeText(profile.player_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loadError) {
    return <main className="flex min-h-dvh items-center justify-center px-6 text-center"><p className="text-ink-muted">Couldn&apos;t load this profile.</p></main>;
  }
  if (!profile) {
    return <main className="flex min-h-dvh items-center justify-center"><p className="text-ink-muted">Loading profile…</p></main>;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pb-28 pt-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <span className="absolute -inset-1.5 rounded-full border border-magenta opacity-40 animate-pulse-glow" />
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-magenta shadow-glow-magenta bg-surface-raised bg-cover bg-center" style={profile.photo_url ? { backgroundImage: `url(${profile.photo_url})` } : undefined}>
          {!profile.photo_url && <User size={32} strokeWidth={1.5} className="text-ink-muted" />}
        </div>
      </motion.div>
      <h1 className="mt-4 font-display text-xl font-bold text-ink-primary">{profile.nickname}</h1>

      <div className="mt-1 flex items-center gap-2">
        <button onClick={copyId} className="stat-mono flex items-center gap-1.5 text-xs text-ink-muted">
          {profile.player_id}
          {copied ? <Check size={12} className="text-cyan" /> : <Copy size={12} />}
        </button>
        <button
          onClick={addFriend}
          disabled={added}
          className={`icon-badge h-7 gap-1.5 px-3 text-xs font-medium ${added ? "bg-cyan/10 text-cyan" : "bg-white/5 text-ink-muted"}`}
        >
          {added ? <Check size={12} /> : <UserPlus size={12} />}
          {added ? "Added" : "Add Friend"}
        </button>
      </div>

      <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-3">
        <Stat icon={Target} label="Matches" value={profile.total_matches} />
        <Stat icon={Percent} label="Win Rate" value={`${profile.win_rate}%`} />
        <Stat icon={Trophy} label="Score" value={profile.total_score} />
      </div>
      <div className="mt-4 grid w-full max-w-sm grid-cols-3 gap-3 text-center text-sm">
        <p className="text-cyan">{profile.wins} Wins</p>
        <p className="text-magenta">{profile.losses} Losses</p>
        <p className="text-ink-muted">{profile.draws} Draws</p>
      </div>

      <div className="mt-10 w-full max-w-sm">
        <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-ink-muted">Recent Matches</h2>

        {!profile.history_visible && (
          <div className="glass-panel flex items-center gap-2 p-6 text-center text-xs text-ink-muted">
            <Lock size={12} className="shrink-0" />This player has made their match history private.
          </div>
        )}

        {profile.history_visible && matches === null && (
          <div className="flex flex-col gap-2">{[0, 1].map((i) => <div key={i} className="glass-panel h-16 animate-pulse-glow p-4" />)}</div>
        )}

        {profile.history_visible && matches?.length === 0 && (
          <div className="glass-panel p-6 text-center text-xs text-ink-muted">No matches yet.</div>
        )}

        <div className="flex flex-col gap-2">
          {matches?.map((m, i) => {
            const meta = getGameMeta(m.game_key);
            const Icon = meta?.icon;
            const resultColor = m.result === "WIN" ? "text-cyan" : m.result === "LOSS" ? "text-magenta" : "text-ink-muted";
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-panel flex items-center gap-3 p-3">
                {Icon && <span className="icon-badge h-9 w-9 shrink-0 bg-white/5"><Icon size={16} className="text-ink-muted" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">{m.game}</p>
                  {m.opponent.player_id ? <Link href={`/profile/${m.opponent.player_id}`} className="text-xs text-violet">vs {m.opponent.nickname}</Link> : <p className="flex items-center gap-1 text-xs text-ink-muted"><Bot size={11} /> vs AI</p>}
                </div>
                <p className={`stat-mono text-xs font-semibold uppercase ${resultColor}`}>{m.result ?? "—"}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string | number }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-1.5 p-4 text-center">
      <Icon size={16} className="text-ink-muted" />
      <p className="stat-mono text-lg font-semibold text-ink-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}
