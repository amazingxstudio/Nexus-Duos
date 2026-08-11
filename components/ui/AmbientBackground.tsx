export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="glow-orb -left-24 -top-24 h-72 w-72 bg-cyan/10 animate-float" />
      <div className="glow-orb -right-24 top-1/3 h-80 w-80 bg-magenta/10 animate-float-delay" />
      <div className="glow-orb bottom-0 left-1/3 h-64 w-64 bg-violet/10 animate-float" />
    </div>
  );
}
