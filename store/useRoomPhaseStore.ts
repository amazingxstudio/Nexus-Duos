import { create } from "zustand";

interface RoomPhaseState {
  inGame: boolean;
  setInGame: (v: boolean) => void;
  // Bumped by TelegramBackButton when the hardware/gesture/Telegram back
  // action fires while inGame is true. GameShell (mounted per-match)
  // watches this and opens its own "Leave this match?" confirm dialog —
  // the same one the in-game Exit icon opens — instead of the back
  // button silently navigating away or forfeiting the match outright.
  exitRequestId: number;
  requestExit: () => void;
}

export const useRoomPhaseStore = create<RoomPhaseState>((set) => ({
  inGame: false,
  setInGame: (v) => set({ inGame: v }),
  exitRequestId: 0,
  requestExit: () => set((s) => ({ exitRequestId: s.exitRequestId + 1 })),
}));
