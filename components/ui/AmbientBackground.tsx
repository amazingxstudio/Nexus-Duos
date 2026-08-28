export function AmbientBackground() {
  // Backdrop-blur only reads as "glass" when there's something vivid and
  // moving behind it to actually blur — the previous set of orbs sat at
  // 10% opacity, which is close to nothing once blurred, so every glass
  // panel in the app looked like a flat translucent rectangle instead of
  // real glass. Brighter, bigger, and one more of them fixes that at the
  // source, without touching a single component that consumes .glass-panel.
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="glow-orb -left-32 -top-32 h-96 w-96 bg-cyan/25 animate-float" />
      <div className="glow-orb -right-28 top-1/4 h-[26rem] w-[26rem] bg-magenta/22 animate-float-delay" />
      <div className="glow-orb bottom-[-4rem] left-1/4 h-80 w-80 bg-violet/25" style={{ animation: "float 11s ease-in-out infinite" }} />
      <div className="glow-orb -right-16 bottom-[-2rem] h-72 w-72 bg-ember/18" style={{ animation: "float 13s ease-in-out infinite 2s" }} />
    </div>
  );
}
