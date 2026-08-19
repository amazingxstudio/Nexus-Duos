"use client";

import { useEffect, useState } from "react";

const SIZE = 88;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const LOOP_MS = 2400;

/**
 * A percentage-style loading indicator for waits with no real progress
 * signal (waiting for an opponent, waiting for a match to start, etc).
 * The ring/number loop 0→100% continuously — it's not tied to a real
 * completion fraction (there isn't one for these waits), just a more
 * deliberate "still actively working" cue than a bare spinner.
 */
export function LoadingProgress({ label }: { label: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = (now - start) % LOOP_MS;
      setPct(Math.round((elapsed / LOOP_MS) * 100));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-white/[0.08]" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="url(#loading-progress-gradient)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="loading-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "rgb(var(--color-cyan))" }} />
              <stop offset="100%" style={{ stopColor: "rgb(var(--color-violet))" }} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="stat-mono text-lg font-semibold text-ink-primary">{pct}%</span>
        </div>
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
