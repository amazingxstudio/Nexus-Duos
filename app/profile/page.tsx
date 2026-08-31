"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, Copy, Settings, ChevronUp, Trophy, Target, Percent, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";

function TelegramIcon() {
  return (
    <svg viewBox="0 0 240 240" className="h-5 w-5" fill="currentColor">
      <path d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0zm55.6 82.1-19.9 93.9c-1.5 6.7-5.5 8.3-11.1 5.2l-30.6-22.6-14.8 14.2c-1.6 1.6-3 3-6.2 3l2.2-31.4 57.2-51.7c2.5-2.2-.5-3.4-3.8-1.2l-70.7 44.5-30.5-9.5c-6.6-2.1-6.8-6.6 1.4-9.8l119.3-46c5.5-2 10.4 1.3 8.5 9.4z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m3 6.5 8.4 6.2a1 1 0 0 0 1.2 0L21 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MyProfilePage() {
  const { user, token, setSession } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.profile?.nickname ?? "");
  const [copied, setCopied] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  async function saveNickname() {
    if (!nickname.trim() || !user) return;
    const res = await apiFetch<{ profile: typeof user.profile }>("/profile/me/nickname", {
      method: "PATCH", token, body: JSON.stringify({ nickname: nickname.trim() }),
    });
    setSession(token!, { ...user, profile: res.profile });
    setEditing(false);
  }

  function copyId() {
    if (!user?.profile?.player_id) return;
    navigator.clipboard.writeText(user.profile.player_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const winRate = user?.profile && user.profile.total_matches > 0 ? Math.round((user.profile.wins / user.profile.total_matches) * 100) : 0;

  return (
    <main className="min-h-dvh px-5 pb-32 pt-8">
      <div className="mb-4 flex justify-center">
        {/* Logo slot — see /public/logo.png. Modest size, near the top of
            this page's own header (not the shared app header). */}
        <div className="relative aspect-video w-20">
          <Image src="/logo.png" alt="Nexus Duos" fill priority quality={100} className="object-contain" sizes="80px" />
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Profile</h1>
        <Link
          href="/settings"
          className="icon-badge h-10 w-10 glass-panel"
          style={{ marginTop: "max(env(safe-area-inset-top), 12px)" }}
        >
          <Settings size={18} className="text-ink-muted" />
        </Link>
      </div>

      <div className="glass-panel flex flex-col items-center p-8 text-center">
        <div className="relative">
          <span className="absolute -inset-1.5 rounded-full border border-cyan opacity-40 animate-pulse-glow" />
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-cyan shadow-glow-cyan bg-surface-raised bg-cover bg-center" style={user?.photo_url ? { backgroundImage: `url(${user.photo_url})` } : undefined}>
            {!user?.photo_url && <User size={32} strokeWidth={1.5} className="text-ink-muted" />}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {editing ? (
            <>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
                maxLength={20}
                className="selectable stat-mono w-40 border-b border-cyan/50 bg-transparent text-center text-xl font-bold text-ink-primary outline-none"
              />
              <button onClick={saveNickname} className="icon-badge h-8 w-8 bg-cyan text-void"><Check size={14} strokeWidth={2.5} /></button>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-ink-primary">{user?.profile?.nickname ?? "Player"}</h2>
              <button onClick={() => setEditing(true)} className="text-ink-faint"><Pencil size={14} /></button>
            </>
          )}
        </div>

        <button onClick={copyId} className="stat-mono mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
          {user?.profile?.player_id}
          {copied ? <Check size={12} className="text-cyan" /> : <Copy size={12} />}
        </button>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-ink-muted">Your Stats</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={Target} label="Matches" value={user?.profile?.total_matches ?? 0} />
          <Stat icon={Percent} label="Win Rate" value={`${winRate}%`} />
          <Stat icon={Trophy} label="Score" value={user?.profile?.total_score ?? 0} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
          <p className="text-cyan">{user?.profile?.wins ?? 0} Wins</p>
          <p className="text-magenta">{user?.profile?.losses ?? 0} Losses</p>
          <p className="text-ink-muted">{user?.profile?.draws ?? 0} Draws</p>
        </div>
      </section>

      <button onClick={() => setAboutOpen(true)} className="mx-auto mt-10 flex flex-col items-center gap-1 text-ink-faint">
        <ChevronUp size={16} />
        <span className="text-xs uppercase tracking-widest">About Nexus Duos</span>
      </button>

      <AnimatePresence>
        {aboutOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAboutOpen(false)} className="fixed inset-0 z-[70] bg-void/70 backdrop-blur-sm" />
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => { if (info.offset.y > 80) setAboutOpen(false); }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="glass-panel-violet fixed inset-x-0 bottom-0 z-[71] rounded-b-none p-6 pb-10"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <p className="text-center font-display text-xs uppercase tracking-[0.4em] text-violet">About</p>
              <h2 className="mt-1 text-center font-display text-2xl font-bold text-ink-primary">Nexus Duos</h2>
              <p className="stat-mono text-center text-sm text-ink-muted">Version 1.0</p>
              <div className="my-5 h-px w-full bg-white/10" />
              <div className="space-y-3 text-left">
                <div><p className="text-[11px] uppercase text-ink-muted">Developer</p><p className="text-ink-primary">Aung Myat Minn</p></div>
                <div><p className="text-[11px] uppercase text-ink-muted">Team</p><p className="text-ink-primary">AmazinGXStudio</p></div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <a href="https://t.me/aung_myat_minn" target="_blank" rel="noopener noreferrer" className="glass-card flex items-center gap-3 border border-white/[0.08] p-3">
                  <span className="icon-badge h-9 w-9 bg-cyan/10 text-cyan"><TelegramIcon /></span>
                  <p className="stat-mono text-sm text-ink-primary">@aung_myat_minn</p>
                </a>
                <a href="mailto:aungmyatminnx@gmail.com" className="glass-card flex items-center gap-3 border border-white/[0.08] p-3">
                  <span className="icon-badge h-9 w-9 bg-cyan/10 text-cyan"><MailIcon /></span>
                  <p className="stat-mono text-sm text-ink-primary">aungmyatminnx@gmail.com</p>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string | number }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-1.5 p-4 text-center">
      <Icon size={16} className="text-ink-muted" />
      <p className="stat-mono text-xl font-semibold text-ink-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}
