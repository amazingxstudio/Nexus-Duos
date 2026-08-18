import { create } from "zustand";

export interface RoomPlayer {
  id: string;
  photo_url?: string | null;
  nickname?: string;
  player_id?: string;
}

export interface ActiveRoomData {
  id: string;
  code: string;
  status: string;
  player1: RoomPlayer;
  player2?: RoomPlayer | null;
  game?: { key: string; name: string } | null;
  match_id?: string | null;
}

interface ActiveRoomState {
  room: ActiveRoomData | null;
  ready: boolean;
  opponentReady: boolean;
  /** Room code the socket has already joined the channel for — avoids
   *  re-emitting "room:join_channel" on every remount of the room page. */
  joinedChannel: string | null;
  setRoom: (room: ActiveRoomData | null) => void;
  patchRoom: (patch: Partial<ActiveRoomData>) => void;
  setReady: (v: boolean) => void;
  setOpponentReady: (v: boolean) => void;
  setJoinedChannel: (code: string | null) => void;
  reset: () => void;
}

/**
 * Global, app-lifetime store for whichever room the player is currently
 * creating / joined / playing in. This is deliberately NOT owned by the
 * /room/[code] page component: it's written to by RoomSync (mounted once
 * at the app root), so a create/join/ready-check in progress survives the
 * player switching to Friends, Settings, etc. and coming back — nothing
 * resets just because the room page unmounted.
 */
export const useActiveRoomStore = create<ActiveRoomState>((set) => ({
  room: null,
  ready: false,
  opponentReady: false,
  joinedChannel: null,
  setRoom: (room) => set({ room }),
  patchRoom: (patch) => set((s) => (s.room ? { room: { ...s.room, ...patch } } : s)),
  setReady: (v) => set({ ready: v }),
  setOpponentReady: (v) => set({ opponentReady: v }),
  setJoinedChannel: (code) => set({ joinedChannel: code }),
  reset: () => set({ room: null, ready: false, opponentReady: false, joinedChannel: null }),
}));
