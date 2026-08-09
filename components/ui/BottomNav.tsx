"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/find", label: "Duel", icon: "⚔" },
  { href: "/history", label: "History", icon: "◷" },
  { href: "/settings", label: "Settings", icon: "⚙" },
  { href: "/about", label: "About", icon: "ℹ" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="glass-panel mb-3 flex w-full max-w-sm items-center justify-between px-2 py-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] transition ${
                active ? "text-cyan" : "text-ink-muted"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
