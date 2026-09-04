import type { Config } from "tailwindcss";

/**
 * NEXUS DUOS — Design Token System
 * ---------------------------------
 * Signature: "Duel Split" — every core screen is built around a seam of
 * light dividing two competing presences (you / rival). Color and motion
 * exist to make that seam feel alive, not decorative.
 */
const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: withOpacity("--color-void"),
        surface: withOpacity("--color-surface"),
        "surface-raised": withOpacity("--color-surface-raised"),
        cyan: { DEFAULT: withOpacity("--color-cyan"), dim: withOpacity("--color-cyan-dim") },
        magenta: { DEFAULT: withOpacity("--color-magenta"), dim: withOpacity("--color-magenta-dim") },
        violet: { DEFAULT: withOpacity("--color-violet"), dim: withOpacity("--color-violet-dim") },
        ember: { DEFAULT: withOpacity("--color-ember"), dim: withOpacity("--color-ember-dim") },
        "button-text": withOpacity("--color-button-text"),
        ink: {
          primary: withOpacity("--color-ink-primary"),
          muted: withOpacity("--color-ink-muted"),
          faint: withOpacity("--color-ink-faint"),
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
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 8s ease-in-out infinite",
        "float-delay": "float 9s ease-in-out infinite 1.5s",
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
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(12px, -18px)" },
        },
      },
      borderRadius: { card: "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
