"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Volume2, Vibrate, RefreshCw, Sun, Moon, SunMoon, Trophy, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore, ThemeMode } from "@/store/useThemeStore";

interface Settings {
  show_history_to_all: boolean; sound_enabled: boolean; haptics_enabled: boolean;
  show_online_status: boolean; show_exact_last_seen: boolean;
}

const CACHE_KEY = "nexus_settings_cache";

export default function SettingsPage() {
  const token = useAuthStore((s) => s.token);
  const { mode, setMode } = useThemeStore();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) setSettings(JSON.parse(cached));

    apiFetch<{ settings: Settings }>("/settings", { token })
      .then((res) => {
        setSettings(res.settings);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.settings));
      })
      .catch(() => {
        if (!cached) setError(true);
      });
  }

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function update(patch: Partial<Settings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
    await apiFetch<{ settings: Settings }>("/settings", { method: "PATCH", token, body: JSON.stringify(patch) });
  }

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-ink-primary">Couldn&apos;t load settings.</p>
        <button onClick={load} className="btn-ghost"><RefreshCw size={16} />Retry</button>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="min-h-dvh px-5 pb-28 pt-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-ink-primary">Settings</h1>
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-panel h-16 animate-pulse-glow p-4" />
          ))}
        </div>
      </main>
    );
  }

  const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
    { mode: "adaptive", label: "Adaptive", icon: SunMoon },
  ];

  return (
    <main className="min-h-dvh px-5 pb-28 pt-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-primary">Settings</h1>

      <p className="mb-3 text-xs uppercase tracking-wide text-ink-muted">Theme</p>
      <div className="glass-panel mb-6 grid grid-cols-3 gap-1 p-1">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = mode === opt.mode;
          return (
            <button
              key={opt.mode}
              onClick={() => setMode(opt.mode)}
              className={`flex flex-col items-center gap-1 rounded-card py-3 text-xs transition-colors ${active ? "bg-cyan/10 text-cyan" : "text-ink-muted"}`}
            >
              <Icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <ToggleRow icon={Eye} label="Show history to everyone" description="Off shows opponents only matches they were part of" checked={settings.show_history_to_all} onChange={(v) => update({ show_history_to_all: v })} />
        <ToggleRow icon={Volume2} label="Sound effects" checked={settings.sound_enabled} onChange={(v) => update({ sound_enabled: v })} />
        <ToggleRow icon={Vibrate} label="Haptic feedback" checked={settings.haptics_enabled} onChange={(v) => update({ haptics_enabled: v })} />
      </div>

      <p className="mb-3 mt-6 text-xs uppercase tracking-wide text-ink-muted">Presence &amp; privacy</p>
      <div className="flex flex-col gap-3">
        <ToggleRow icon={Eye} label="Show online status" description="Off hides your online state and last seen from everyone" checked={settings.show_online_status} onChange={(v) => update({ show_online_status: v })} />
        <ToggleRow
          icon={EyeOff}
          label="Show exact last seen"
          description="Off shows friends \u201cLast seen recently\u201d instead of an exact time"
          checked={settings.show_exact_last_seen}
          onChange={(v) => update({ show_exact_last_seen: v })}
          disabled={!settings.show_online_status}
        />
      </div>

      <p className="mb-3 mt-6 text-xs uppercase tracking-wide text-ink-muted">More</p>
      <Link href="/leaderboard" className="glass-card flex items-center gap-3 border border-white/[0.08] p-4">
        <span className="icon-badge h-9 w-9 shrink-0 bg-cyan/10"><Trophy size={16} className="text-cyan" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-primary">Leaderboard</p>
          <p className="mt-0.5 text-xs text-ink-muted">See how you rank against other players</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-ink-faint" />
      </Link>
    </main>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange, disabled }: { icon: typeof Eye; label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`glass-panel flex items-center gap-3 p-4 transition-opacity ${disabled ? "opacity-50" : ""}`}>
      <span className="icon-badge h-9 w-9 shrink-0 bg-white/5"><Icon size={16} className="text-ink-muted" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        aria-pressed={checked}
        style={{ background: checked ? "rgb(var(--color-cyan))" : "rgb(var(--color-ink-primary) / 0.16)" }}
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed"
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="absolute top-1 h-5 w-5 rounded-full bg-white"
          style={{ left: checked ? "26px" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)" }}
        />
      </button>
    </div>
  );
}
