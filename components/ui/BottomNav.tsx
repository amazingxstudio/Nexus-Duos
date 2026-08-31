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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="glass-panel flex w-full max-w-sm items-center justify-between px-2 py-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.Icon;
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-1 flex-col items-center gap-1 rounded-full py-2 text-[10px]">
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="nav-pill-glass absolute inset-x-2 inset-y-0.5"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={18} strokeWidth={2.25} className={`relative z-10 transition-colors ${active ? "text-cyan" : "text-ink-muted"}`} />
              <span className={`relative z-10 transition-colors ${active ? "text-cyan" : "text-ink-muted"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
