"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { PlayerCard } from "@/components/ui/PlayerCard";

export default function HomePage() {
  const { user, status } = useAuthStore();

  return (
    <main className="flex min-h-screen flex-col px-5 pb-28 pt-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-violet">Nexus Duos</p>
          <h1 className="font-display text-2xl font-bold text-ink-primary">
            {status === "authenticated" ? `Ready, ${user?.first_name ?? "Player"}?` : "Connecting…"}
          </h1>
        </div>
        <div className="glass-panel flex h-11 w-11 items-center justify-center rounded-full">
          <span className="stat-mono text-xs text-cyan">{user?.profile?.player_id?.slice(-4) ?? "····"}</span>
        </div>
      </header>

      <section className="glass-panel flex items-stretch p-1">
        <PlayerCard
          side="cyan"
          name={user?.profile?.nickname ?? "You"}
          playerId={user?.profile?.player_id}
          photoUrl={user?.photo_url}
          subtitle={`${user?.profile?.wins ?? 0}W · ${user?.profile?.losses ?? 0}L`}
        />
        <div className="duel-seam mx-1 my-4" />
        <PlayerCard side="magenta" name="Opponent" empty />
      </section>

      <div className="mt-8 flex flex-col gap-3">
        <Link href="/find" className="btn-primary">⚔ Find a Duel</Link>
        <button className="btn-ghost" disabled>🤖 Practice vs AI (coming soon)</button>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-ink-muted">Your Stats</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Matches", value: user?.profile?.total_matches ?? 0 },
            { label: "Win Rate", value: `${winRate(user?.profile)}%` },
            { label: "Score", value: user?.profile?.total_score ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel p-4 text-center">
              <p className="stat-mono text-xl font-semibold text-ink-primary">{stat.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {status === "error" && (
        <p className="mt-8 text-center text-xs text-ink-faint">
          Open this app from inside Telegram to sign in.
        </p>
      )}
    </main>
  );
}

function winRate(profile?: { wins: number; total_matches: number }) {
  if (!profile || profile.total_matches === 0) return 0;
  return Math.round((profile.wins / profile.total_matches) * 100);
}
