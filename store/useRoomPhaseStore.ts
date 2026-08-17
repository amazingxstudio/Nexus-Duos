import { create } from "zustand";

interface RoomPhaseState {
  inGame: boolean;
  setInGame: (v: boolean) => void;
}

export const useRoomPhaseStore = create<RoomPhaseState>((set) => ({
  inGame: false,
  setInGame: (v) => set({ inGame: v }),
}));
