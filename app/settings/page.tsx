"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Volume2, Vibrate, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface Settings { show_history_to_all: boolean; sound_enabled: boolean; haptics_enabled: boolean; }
const CACHE_KEY = "nexus_settings_cache";

export default function SettingsPage() {
  const token = useAuthStore((s) => s.token);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) setSettings(JSON.parse(cached));
    apiFetch<{ settings: Settings }>("/settings", { token })
      .then((res) => { setSettings(res.settings); sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.settings)); })
      .catch(() => { if (!cached) setError(true); });
  }

  useEffect(() => { if (token) load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function update(patch: Partial<Settings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
    await apiFetch<{ settings: Settings }>("/settings", { method: "PATCH", token, body: JSON.stringify(patch) });
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-ink-primary">Couldn&apos;t load settings.</p>
        <button onClick={load} className="btn-ghost"><RefreshCw size={16} />Retry</button>
      </main>
    );
  }
  if (!settings) {
    return (
      <main className="min-h-screen px-5 pb-28 pt-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-ink-primary">Settings</h1>
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="glass-panel h-16 animate-pulse-glow p-4" />)}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 pb-28 pt-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-primary">Settings</h1>
      <div className="flex flex-col gap-3">
        <ToggleRow icon={Eye} label="Show history to everyone" description="Off shows opponents only matches they were part of" checked={settings.show_history_to_all} onChange={(v) => update({ show_history_to_all: v })} />
        <ToggleRow icon={Volume2} label="Sound effects" checked={settings.sound_enabled} onChange={(v) => update({ sound_enabled: v })} />
        <ToggleRow icon={Vibrate} label="Haptic feedback" checked={settings.haptics_enabled} onChange={(v) => update({ haptics_enabled: v })} />
      </div>
    </main>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }: { icon: typeof Eye; label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="glass-panel flex items-center gap-3 p-4">
      <span className="icon-badge h-9 w-9 shrink-0 bg-white/5"><Icon size={16} className="text-ink-muted" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-cyan" : "bg-white/10"}`} aria-pressed={checked}>
        <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }} className="absolute top-1 h-5 w-5 rounded-full bg-void" style={{ left: checked ? "26px" : "4px" }} />
      </button>
    </div>
  );
}
