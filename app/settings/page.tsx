"use client";

import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="glass-panel w-full max-w-sm p-8">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-cyan">Coming in Batch 5</p>
        <h1 className="mt-2 font-display text-xl font-bold text-ink-primary">Settings</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Privacy and preference toggles arrive next.
          {user && <span className="stat-mono mt-3 block text-xs text-ink-faint">Signed in as {user.profile.nickname}</span>}
        </p>
      </div>
    </main>
  );
}
