"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Bot, Trophy, Target, Percent, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { GAMES, ACCENT_CLASSES } from "@/lib/games";
import { apiFetch } from "@/lib/api";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

export default function HomePage() {
  const { user, status, token } = useAuthStore();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [startingGame, setStartingGame] = useState<string | null>(null);

  function updateScrollHints() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => {
    updateScrollHints();
    window.addEventListener("resize", updateScrollHints);
    return () => window.removeEventListener("resize", updateScrollHints);
  }, []);

  function scrollBy(dx: number) {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  async function startQuickDuel(gameKey: string) {
    if (status !== "authenticated" || startingGame) return;
    setStartingGame(gameKey);
    try {
      const res = await apiFetch<{ room: { code: string } }>("/rooms/quick", {
        method: "POST", token, body: JSON.stringify({ game_key: gameKey }),
      });
      router.push(`/room/${res.room.code}`);
    } catch {
      setStartingGame(null);
    }
  }

  const headline =
    status === "authenticated" ? `Ready, ${user?.first_name ?? "Player"}?`
    : status === "authenticating" ? "Signing you in…"
    : status === "error" ? "Sign-in needed"
    : "Loading…";

  return (
    <motion.main variants={container} initial="hidden" animate="show" className="flex min-h-screen flex-col px-5 pb-28 pt-8">
      <motion.header variants={item} className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-violet">Nexus Duos</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">{headline}</h1>
      </motion.header>

      <motion.section variants={item} className="glass-panel flex items-stretch p-1">
        <PlayerCard side="cyan" name={user?.profile?.nickname ?? "You"} playerId={user?.profile?.player_id} photoUrl={user?.photo_url} subtitle={`${user?.profile?.wins ?? 0}W · ${user?.profile?.losses ?? 0}L`} />
        <div className="duel-seam mx-1 my-4" />
        <PlayerCard side="magenta" name="Opponent" empty />
      </motion.section>

      <motion.div variants={item} className="mt-6 flex flex-col gap-3">
        <Link href="/find" className="btn-primary"><Swords size={18} strokeWidth={2.25} />Find a Duel</Link>
        <button className="btn-ghost" disabled><Bot size={18} strokeWidth={2.25} />Practice vs AI — coming soon</button>
      </motion.div>

      <motion.section variants={item} className="mt-10">
        <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-ink-muted">Games — tap to start a duel</h2>
        <div className="relative">
          <div ref={scrollerRef} onScroll={updateScrollHints} className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
            {GAMES.map((game) => {
              const Icon = game.icon;
              const c = ACCENT_CLASSES[game.accent];
              const loading = startingGame === game.key;
              return (
                <button
                  key={game.key}
                  onClick={() => startQuickDuel(game.key)}
                  disabled={startingGame !== null}
                  className={`glass-card flex w-32 shrink-0 flex-col items-start gap-2 border p-4 text-left disabled:opacity-60 ${c.border}`}
                >
                  <span className={`icon-badge h-9 w-9 ${c.bg}`}>
                    {loading ? <Loader2 size={16} className={`animate-spin ${c.text}`} /> : <Icon size={18} strokeWidth={2} className={c.text} />}
                  </span>
                  <p className="font-display text-xs font-semibold leading-tight text-ink-primary">{game.name}</p>
                </button>
              );
            })}
          </div>

          {canScrollLeft && (
            <button onClick={() => scrollBy(-140)} className="absolute left-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-void/80 text-ink-primary shadow-glass backdrop-blur-glass">
              <ChevronLeft size={16} />
            </button>
          )}
          {canScrollLeft && <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-void to-transparent" />}

          {canScrollRight && (
            <button onClick={() => scrollBy(140)} className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-void/80 text-ink-primary shadow-glass backdrop-blur-glass">
              <ChevronRight size={16} />
            </button>
          )}
          {canScrollRight && <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-void to-transparent" />}
        </div>
      </motion.section>

      <motion.section variants={item} className="mt-10">
        <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-ink-muted">Your Stats</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Target} label="Matches" value={user?.profile?.total_matches ?? 0} />
          <StatCard icon={Percent} label="Win Rate" value={`${winRate(user?.profile)}%`} />
          <StatCard icon={Trophy} label="Score" value={user?.profile?.total_score ?? 0} />
        </div>
      </motion.section>

      {status === "error" && <motion.p variants={item} className="mt-8 text-center text-xs text-ink-faint">Open this app from inside Telegram to sign in.</motion.p>}
    </motion.main>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string | number }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-1.5 p-4 text-center">
      <Icon size={16} strokeWidth={2} className="text-ink-muted" />
      <p className="stat-mono text-xl font-semibold text-ink-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}

function winRate(profile?: { wins: number; total_matches: number }) {
  if (!profile || profile.total_matches === 0) return 0;
  return Math.round((profile.wins / profile.total_matches) * 100);
}
