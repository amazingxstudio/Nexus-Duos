"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Bot, ChevronLeft, ChevronRight, Loader2, LayoutGrid, LayoutList } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { GAMES, ACCENT_CLASSES, type GameMeta } from "@/lib/games";
import { apiFetch } from "@/lib/api";

type GamesLayout = "scroll" | "grid";
const GAMES_LAYOUT_KEY = "nexus_games_layout";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

export default function HomePage() {
  // Auth is already guaranteed by the AuthGate that wraps the app shell —
  // by the time this page can mount, sign-in has finished — so there's no
  // "notReady"/status branching here anymore (see AuthGate.tsx).
  const { user, token } = useAuthStore();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [startingGame, setStartingGame] = useState<string | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  // Which of the two game-list layouts is showing. Starts as "scroll" (the
  // original default, and what the server would've rendered) and is only
  // ever switched to a saved "grid" choice after mount, in an effect —
  // reading localStorage during render would mismatch what SSR produced.
  const [gamesLayout, setGamesLayout] = useState<GamesLayout>("scroll");

  useEffect(() => {
    const saved = window.localStorage.getItem(GAMES_LAYOUT_KEY);
    if (saved === "grid" || saved === "scroll") setGamesLayout(saved);
  }, []);

  function pickGamesLayout(next: GamesLayout) {
    setGamesLayout(next);
    window.localStorage.setItem(GAMES_LAYOUT_KEY, next);
  }

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

  async function startQuickDuel(gameKey: string, comingSoon?: boolean) {
    if (startingGame || comingSoon) return;
    setStartingGame(gameKey);
    setGameError(null);
    try {
      const res = await apiFetch<{ room: { code: string } }>("/rooms/quick", {
        method: "POST", token, body: JSON.stringify({ game_key: gameKey }),
      });
      router.push(`/room/${res.room.code}`);
    } catch (err) {
      // Surface the failure instead of silently resetting — a network/CORS
      // error here previously left the button looking like it just did
      // nothing, which made a backend-connectivity problem look like a
      // frontend bug.
      setGameError(err instanceof Error ? err.message : "Couldn't create the room");
      setStartingGame(null);
    }
  }

  const headline = `Ready, ${user?.first_name ?? "Player"}?`;

  // Same card content and comingSoon disabled-state logic either layout
  // renders it in — only the sizing class differs (fixed-width for the
  // horizontal scroller vs. fill-the-cell for the grid).
  function renderGameCard(game: GameMeta, sizeClassName: string) {
    const Icon = game.icon;
    const c = ACCENT_CLASSES[game.accent];
    const loading = startingGame === game.key;
    return (
      <button
        key={game.key}
        onClick={() => startQuickDuel(game.key, game.comingSoon)}
        disabled={startingGame !== null || game.comingSoon}
        className={`glass-card shadow-none relative flex flex-col items-start gap-2 border p-4 text-left disabled:opacity-60 ${sizeClassName} ${c.border}`}
      >
        {game.comingSoon && (
          <span className="absolute right-2 top-2 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">Soon</span>
        )}
        <span className={`icon-badge h-9 w-9 ${c.bg}`}>
          {loading ? <Loader2 size={16} className={`animate-spin ${c.text}`} /> : <Icon size={18} strokeWidth={2} className={c.text} />}
        </span>
        <p className="font-display text-xs font-semibold leading-tight text-ink-primary">{game.name}</p>
      </button>
    );
  }

  return (
    <motion.main variants={container} initial="hidden" animate="show" className="flex min-h-dvh flex-col px-5 pb-28 pt-8">
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm uppercase tracking-widest text-ink-muted">Games — tap to start a duel</h2>
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => pickGamesLayout("scroll")}
              aria-label="Scrolling row layout"
              aria-pressed={gamesLayout === "scroll"}
              className={`icon-badge h-7 w-7 ${gamesLayout === "scroll" ? "bg-cyan/15 text-cyan" : "text-ink-faint"}`}
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => pickGamesLayout("grid")}
              aria-label="Grid layout"
              aria-pressed={gamesLayout === "grid"}
              className={`icon-badge h-7 w-7 ${gamesLayout === "grid" ? "bg-cyan/15 text-cyan" : "text-ink-faint"}`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {gamesLayout === "scroll" ? (
          <div className="relative">
            <div ref={scrollerRef} onScroll={updateScrollHints} className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
              {GAMES.map((game) => renderGameCard(game, "w-32 shrink-0"))}
            </div>

            {canScrollLeft && (
              <button onClick={() => scrollBy(-140)} className="absolute left-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-void/80 text-ink-primary shadow-none backdrop-blur-glass">
                <ChevronLeft size={16} />
              </button>
            )}

            {canScrollRight && (
              <button onClick={() => scrollBy(140)} className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-void/80 text-ink-primary shadow-none backdrop-blur-glass">
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {GAMES.map((game) => renderGameCard(game, "w-full"))}
          </div>
        )}
        {gameError && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-xs text-magenta">
            {gameError} — check your connection and try again.
          </motion.p>
        )}
      </motion.section>
    </motion.main>
  );
}
