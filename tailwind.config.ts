import type { Config } from "tailwindcss";

/**
 * NEXUS DUOS — Design Token System
 * ---------------------------------
 * Signature: "Duel Split" — every core screen is built around a seam of
 * light dividing two competing presences (you / rival). Color and motion
 * exist to make that seam feel alive, not decorative.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#06060B",
        surface: "#0F1018",
        "surface-raised": "#161826",
        cyan: { DEFAULT: "#00E5FF", dim: "#0A8CA3" },
        magenta: { DEFAULT: "#FF2E9A", dim: "#9C1A63" },
        violet: { DEFAULT: "#7C5CFF", dim: "#4B3799" },
        ember: { DEFAULT: "#FFB454", dim: "#9C7331" },
        ink: {
          primary: "#F5F7FF",
          muted: "#8B93B0",
          faint: "#4A4F66",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backdropBlur: { glass: "20px" },
      boxShadow: {
        "glow-cyan": "0 0 24px -4px rgba(0, 229, 255, 0.45)",
        "glow-magenta": "0 0 24px -4px rgba(255, 46, 154, 0.45)",
        "glow-violet": "0 0 24px -4px rgba(124, 92, 255, 0.4)",
        glass: "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 8px 32px -8px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "seam-gradient": "linear-gradient(180deg, transparent, rgba(124,92,255,0.6), transparent)",
        "duel-radial":
          "radial-gradient(120% 100% at 0% 50%, rgba(0,229,255,0.10), transparent 60%), radial-gradient(120% 100% at 100% 50%, rgba(255,46,154,0.10), transparent 60%)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "seam-flicker": "seam-flicker 3.2s ease-in-out infinite",
        "rise-in": "rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        "pulse-glow": { "0%, 100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
        "seam-flicker": {
          "0%, 100%": { opacity: "0.5" },
          "45%": { opacity: "1" },
          "50%": { opacity: "0.3" },
          "55%": { opacity: "1" },
        },
        "rise-in": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      borderRadius: { card: "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
