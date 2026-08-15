"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Trophy, Percent, Target, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface PublicProfile {
  nickname: string; player_id: string; photo_url?: string | null;
  total_matches: number; wins: number; losses: number; draws: number;
  win_rate: number; total_score: number; history_visible: boolean;
}

export default function OpponentProfilePage({ params }: { params: { playerId: string } }) {
  const { playerId } = params;
  const token = useAuthStore((s) => s.token);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    apiFetch<PublicProfile>(`/profile/${playerId}`, { token })
      .then(setProfile)
      .catch(() => setLoadError(true));
  }, [playerId, token]);

  if (loadError) {
    return <main className="flex min-h-screen items-center justify-center px-6 text-center"><p className="text-ink-muted">Couldn&apos;t load this profile.</p></main>;
  }
  if (!profile) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-ink-muted">Loading profile…</p></main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pt-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <span className="absolute -inset-1.5 rounded-full border border-magenta opacity-40 animate-pulse-glow" />
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-magenta shadow-glow-magenta bg-surface-raised bg-cover bg-center" style={profile.photo_url ? { backgroundImage: `url(${profile.photo_url})` } : undefined}>
          {!profile.photo_url && <User size={32} strokeWidth={1.5} className="text-ink-muted" />}
        </div>
      </motion.div>
      <h1 className="mt-4 font-display text-xl font-bold text-ink-primary">{profile.nickname}</h1>
      <p className="stat-mono text-xs text-ink-muted">{profile.player_id}</p>
      <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-3">
        <Stat icon={Target} label="Matches" value={profile.total_matches} />
        <Stat icon={Percent} label="Win Rate" value={`${profile.win_rate}%`} />
        <Stat icon={Trophy} label="Score" value={profile.total_score} />
      </div>
      <div className="mt-4 grid w-full max-w-sm grid-cols-3 gap-3 text-center text-sm">
        <p className="text-cyan">{profile.wins} W</p>
        <p className="text-magenta">{profile.losses} L</p>
        <p className="text-ink-muted">{profile.draws} D</p>
      </div>
      {!profile.history_visible && (
        <div className="mt-8 flex items-center gap-2 text-center text-xs text-ink-muted">
          <Lock size={12} />This player only shares match history with people they&apos;ve played.
        </div>
      )}
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
