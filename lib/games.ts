import { Target, Swords, Lock, Layers, Brain, Keyboard, Flag, Puzzle, LucideIcon } from "lucide-react";

export interface GameMeta {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: "cyan" | "magenta" | "violet" | "ember";
}

export const GAMES: GameMeta[] = [
  { key: "CYBER_DUEL", name: "Cyber Duel", description: "Reaction + accuracy battle", icon: Target, accent: "cyan" },
  { key: "NEON_CHESS", name: "Neon Chess", description: "Tactical 5×5 board duel", icon: Swords, accent: "violet" },
  { key: "CODE_BREAKER", name: "Code Breaker", description: "Crack the hidden code", icon: Lock, accent: "magenta" },
  { key: "ARENA_CARDS", name: "Arena Cards", description: "Energy-based card battle", icon: Layers, accent: "ember" },
  { key: "MEMORY_WARFARE", name: "Memory Warfare", description: "Race to match every pair", icon: Brain, accent: "cyan" },
  { key: "SPEED_TYPING", name: "Speed Typing", description: "Same sentence, fastest wins", icon: Keyboard, accent: "violet" },
  { key: "TOWER_CONTROL", name: "Tower Control", description: "Capture zones in real time", icon: Flag, accent: "magenta" },
  { key: "PUZZLE_ARENA", name: "Puzzle Arena", description: "Solve puzzles, beat the clock", icon: Puzzle, accent: "ember" },
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
