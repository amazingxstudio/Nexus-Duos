"use client";

/**
 * Indeterminate loading spinner for waits with no real completion signal
 * (waiting for an opponent, waiting for a match to start, etc). There's no
 * genuine progress fraction for these, so this is a plain spinning ring —
 * not a fake percentage.
 */
export function LoadingProgress({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative h-14 w-14">
        <span className="absolute inset-0 rounded-full border-4 border-white/[0.08]" />
        <span
          className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-cyan border-r-violet"
          style={{ animationDuration: "0.85s" }}
        />
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
