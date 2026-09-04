"use client";

import Link from "next/link";
import { Users } from "lucide-react";

export interface VisitorCard {
  nickname: string;
  player_id: string;
  photo_url?: string | null;
}

/**
 * Small overlapping-avatar "seen by" stack for the last few profile
 * visitors. Backend already caps this at the 3 most recent (see
 * _recent_visitors in routes/profile.py) and records a visit live on the
 * viewer's very request, so whoever is shown here reflects the latest
 * viewer as soon as they open the profile — no extra polling needed here.
 */
export function VisitorStack({ visitors, className = "" }: { visitors: VisitorCard[]; className?: string }) {
  if (!visitors.length) return null;
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex">
        {visitors.map((v, i) => (
          <Link
            key={v.player_id}
            href={`/profile/${v.player_id}`}
            title={v.nickname}
            style={{ zIndex: visitors.length - i, marginLeft: i === 0 ? 0 : -10 }}
            className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-void bg-surface-raised bg-cover bg-center ring-1 ring-white/10 transition-transform active:scale-95"
          >
            {v.photo_url ? (
              <span className="block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${v.photo_url})` }} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-ink-muted">
                {v.nickname.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
        ))}
      </div>
      <Users size={11} className="text-ink-faint" />
    </div>
  );
}
