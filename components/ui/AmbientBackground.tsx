export function AmbientBackground() {
  // Backdrop-blur only reads as "glass" when there's something behind it
  // to blur — but too much of it, overlapping in the middle of the screen
  // where panels actually sit, blends multiple hues toward a muddy
  // grey-brown instead of reading as fresh and colorful. Three smaller,
  // well-separated orbs (rather than four big overlapping ones) plus a
  // theme-aware intensity (--orb-opacity, set in globals.css — restrained
  // for dark, boosted for light since light backgrounds wash color out
  // much faster) keeps this readable as glass without turning busy.
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="glow-orb -left-24 -top-24 h-72 w-72" style={{ background: "rgb(var(--color-cyan) / var(--orb-opacity))", animation: "float 9s ease-in-out infinite" }} />
      <div className="glow-orb -right-20 top-1/3 h-80 w-80" style={{ background: "rgb(var(--color-magenta) / var(--orb-opacity))", animation: "float 11s ease-in-out infinite 1.5s" }} />
      <div className="glow-orb bottom-[-3rem] left-1/4 h-72 w-72" style={{ background: "rgb(var(--color-violet) / var(--orb-opacity))", animation: "float 10s ease-in-out infinite 3s" }} />
    </div>
  );
}
