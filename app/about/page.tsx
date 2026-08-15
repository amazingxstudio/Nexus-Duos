import { Users } from "lucide-react";

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

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="glass-panel-violet w-full max-w-sm p-8">
        <div className="icon-badge mx-auto mb-4 h-14 w-14 border border-violet/30 bg-violet/10">
          <Users size={24} className="text-violet" />
        </div>
        <p className="font-display text-xs uppercase tracking-[0.4em] text-violet">About</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-primary">Nexus Duos</h1>
        <p className="stat-mono mt-1 text-sm text-ink-muted">Version 1.0</p>
        <div className="my-6 h-px w-full bg-white/10" />
        <dl className="space-y-4 text-left">
          <Row label="Developer" value="Aung Myat Minn" />
          <Row label="Team" value="AmazinGXStudio" />
        </dl>
        <div className="mt-6 flex flex-col gap-2">
          <a href="https://t.me/aung_myat_minn" target="_blank" rel="noopener noreferrer" className="glass-card flex items-center gap-3 border border-white/[0.08] p-3 text-left">
            <span className="icon-badge h-9 w-9 bg-cyan/10 text-cyan"><TelegramIcon /></span>
            <div><p className="text-xs text-ink-muted">Telegram</p><p className="stat-mono text-sm text-ink-primary">@aung_myat_minn</p></div>
          </a>
          <a href="mailto:aungmyatminnx@gmail.com" className="glass-card flex items-center gap-3 border border-white/[0.08] p-3 text-left">
            <span className="icon-badge h-9 w-9 bg-magenta/10 text-magenta"><MailIcon /></span>
            <div><p className="text-xs text-ink-muted">Email</p><p className="stat-mono text-sm text-ink-primary">aungmyatminnx@gmail.com</p></div>
          </a>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="selectable mt-0.5 font-medium text-ink-primary">{value}</dd>
    </div>
  );
}
