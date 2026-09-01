"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Swords, History, Settings, User } from "lucide-react";
import { useRoomPhaseStore } from "@/store/useRoomPhaseStore";

const ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/find", label: "Duel", Icon: Swords },
  { href: "/history", label: "History", Icon: History },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  // Hidden only while an actual match is being played (room.status === IN_PROGRESS).
  // Any other game-related screen (voting, ready-check, room lobby, friends, etc.)
  // keeps the nav visible.
  const inGame = useRoomPhaseStore((s) => s.inGame);

  if (inGame) return null;

  const SPRING = { type: "spring" as const, stiffness: 380, damping: 30 };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      {/* Fuses the ghost pill and its drip (below) into one continuous
          blob before it's painted — the classic "gooey" SVG-filter
          recipe: blur the shapes together, then sharpen the alpha
          falloff back into a hard edge, so overlapping soft shapes
          read as one fluid, seamless piece of glass. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="nav-liquid-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
        </filter>
      </svg>

      <div className="relative w-full max-w-sm">
        {/* Un-clipped liquid layer, positioned behind the bar (see the
            z-[1] bar below): mirrors the bar's own flex layout so each
            column lines up exactly, but — unlike the bar — isn't
            overflow-hidden, so the active tab's drip can bulge past
            the bar's bottom edge instead of getting clipped off. */}
        <div className="nav-liquid-back absolute inset-0 flex justify-between px-2 py-2" style={{ filter: "url(#nav-liquid-goo)" }} aria-hidden="true">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <div key={item.href} className="relative flex-1">
                {active && (
                  <motion.div layoutId="nav-liquid-blob" className="nav-liquid-blob" transition={SPRING}>
                    <span className="nav-liquid-drip" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <div className="glass-panel relative z-[1] flex w-full items-center justify-between px-2 py-2">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.Icon;
            return (
              <Link key={item.href} href={item.href} className="relative flex flex-1 flex-col items-center gap-1 rounded-full py-2 text-[10px]">
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="nav-pill-glass absolute inset-x-2 inset-y-0.5"
                    transition={SPRING}
                  />
                )}
                <Icon size={18} strokeWidth={2.25} className={`relative z-10 transition-colors ${active ? "text-cyan" : "text-ink-muted"}`} />
                <span className={`relative z-10 transition-colors ${active ? "text-cyan" : "text-ink-muted"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
