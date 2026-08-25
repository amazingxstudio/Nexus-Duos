import { Target, Grid3x3, Calculator, Keyboard, HelpCircle, Brain, ScanSearch, Link2, LucideIcon } from "lucide-react";

export interface GameMeta {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: "cyan" | "magenta" | "violet" | "ember";
  /** True while this game's real rules aren't built yet — selection UIs
   * (home page tap grid, voting panel) show it but disable picking it.
   * Flip this to false the same batch its engine.py/*Game.tsx get replaced
   * with the real implementation; nothing else in this file changes. */
  comingSoon?: boolean;
}

// The final lineup — all 8 slots from day one, matching GameKey in the
// backend one-for-one. A game not built yet stays listed (comingSoon: true)
// rather than disappearing, so the grid/voting layout never reshuffles as
// each one ships.
export const GAMES: GameMeta[] = [
  { key: "CONNECT_FOUR", name: "Connect Four", description: "Drop discs, connect four to win", icon: Target, accent: "ember" },
  { key: "DOTS_AND_BOXES", name: "Dots and Boxes", description: "Claim boxes, most boxes wins", icon: Grid3x3, accent: "cyan" },
  { key: "QUICK_MATH", name: "Quick Math", description: "Fastest correct answer wins", icon: Calculator, accent: "violet" },
  { key: "TYPING_RACE", name: "Typing Race", description: "Same sentence, fastest wins", icon: Keyboard, accent: "magenta" },
  { key: "GUESS_THE_WORD", name: "Guess the Word", description: "Guess the word from clues", icon: HelpCircle, accent: "ember" },
  { key: "MEMORY_RACE", name: "Memory Race", description: "Memorize, then reproduce it first", icon: Brain, accent: "cyan" },
  { key: "FIND_THE_DIFFERENT", name: "Find the Different One", description: "Spot the odd one out first", icon: ScanSearch, accent: "violet" },
  { key: "WORD_CHAIN", name: "Word Chain", description: "Chain words by the last letter", icon: Link2, accent: "magenta" },
];

export function getGameMeta(key: string): GameMeta | undefined {
  return GAMES.find((g) => g.key === key);
}

export const ACCENT_CLASSES: Record<GameMeta["accent"], { text: string; border: string; bg: string; glow: string }> = {
  cyan: { text: "text-cyan", border: "border-cyan/30", bg: "bg-cyan/10", glow: "shadow-glow-cyan" },
  magenta: { text: "text-magenta", border: "border-magenta/30", bg: "bg-magenta/10", glow: "shadow-glow-magenta" },
  violet: { text: "text-violet", border: "border-violet/30", bg: "bg-violet/10", glow: "shadow-glow-violet" },
  ember: { text: "text-ember", border: "border-ember/30", bg: "bg-ember/10", glow: "" },
};
