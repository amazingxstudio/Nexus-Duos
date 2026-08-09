import { create } from "zustand";

export interface Profile {
  id: string;
  nickname: string;
  player_id: string;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  total_score: number;
}

export interface Settings {
  show_history_to_all: boolean;
  sound_enabled: boolean;
  haptics_enabled: boolean;
}

export interface AuthedUser {
  id: string;
  telegram_id: string;
  first_name: string;
  username?: string | null;
  photo_url?: string | null;
  profile: Profile;
  settings: Settings;
}

interface AuthState {
  token: string | null;
  user: AuthedUser | null;
  status: "idle" | "authenticating" | "authenticated" | "error";
  error: string | null;
  setSession: (token: string, user: AuthedUser) => void;
  setStatus: (status: AuthState["status"], error?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  status: "idle",
  error: null,
  setSession: (token, user) => set({ token, user, status: "authenticated", error: null }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  logout: () => set({ token: null, user: null, status: "idle", error: null }),
}));
