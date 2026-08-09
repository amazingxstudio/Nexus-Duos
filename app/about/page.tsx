export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="glass-panel-violet w-full max-w-sm p-8">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-violet">About</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-primary">Nexus Duos</h1>
        <p className="stat-mono mt-1 text-sm text-ink-muted">Version 1.0</p>

        <div className="my-6 h-px w-full bg-white/10" />

        <dl className="space-y-4 text-left">
          <Row label="Developer" value="Aung Myat Minn" />
          <Row label="Team" value="AmazinGXStudio" />
          <Row label="Telegram" value="@aung_myat_minn" mono />
          <Row label="Email" value="aungmyatminnx@gmail.com" mono />
        </dl>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={`selectable mt-0.5 text-ink-primary ${mono ? "stat-mono text-sm" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
