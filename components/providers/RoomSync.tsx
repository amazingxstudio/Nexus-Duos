"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "./SocketProvider";
import { useActiveRoomStore, ActiveRoomData } from "@/store/useActiveRoomStore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Mounted once at the app root (see AppProviders) and never unmounts as the
 * player navigates between pages. It owns every socket listener related to
 * an in-progress room — join, vote resolution, ready checks, game start —
 * and writes results into the global active-room store instead of local
 * page state. That's what makes a create/join/ready-check flow keep going
 * in the background no matter which screen the player is currently on, and
 * — via pendingMatchStart — what stops the one-time "game_started" match
 * payload from being lost to a mount-order race with the game screen.
 */
export function RoomSync() {
  const socket = useSocket();
  const setRoom = useActiveRoomStore((s) => s.setRoom);
  const patchRoom = useActiveRoomStore((s) => s.patchRoom);
  const setReady = useActiveRoomStore((s) => s.setReady);
  const setOpponentReady = useActiveRoomStore((s) => s.setOpponentReady);
  const setPendingMatchStart = useActiveRoomStore((s) => s.setPendingMatchStart);
  const ready = useActiveRoomStore((s) => s.ready);
  const opponentReady = useActiveRoomStore((s) => s.opponentReady);
  const room = useActiveRoomStore((s) => s.room);
  const startedMatchIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    function onRoomJoined(data: { room: ActiveRoomData }) {
      setRoom(data.room);
    }
    function onVoteResolved(data: { match_id: string; game_key: string; game_name: string }) {
      patchRoom({ status: "READY_CHECK", game: { key: data.game_key, name: data.game_name }, match_id: data.match_id });
    }
    function onPlayerReady(data: { user_id: string }) {
      const myId = useAuthStore.getState().user?.id;
      if (data.user_id === myId) setReady(true);
      else setOpponentReady(true);
    }
    function onGameStarted(data: { match_id: string; payload: Record<string, unknown>; duration_ms: number }) {
      patchRoom({ status: "IN_PROGRESS" });
      // Capture the payload now, in case the game screen hasn't mounted
      // (and therefore hasn't registered its own listener) by the time
      // this arrives — see the store's pendingMatchStart doc comment.
      setPendingMatchStart({ match_id: data.match_id, payload: data.payload, duration_ms: data.duration_ms });
    }

    socket.on("room_joined", onRoomJoined);
    socket.on("vote:resolved", onVoteResolved);
    socket.on("player_ready", onPlayerReady);
    socket.on("game_started", onGameStarted);
    return () => {
      socket.off("room_joined", onRoomJoined);
      socket.off("vote:resolved", onVoteResolved);
      socket.off("player_ready", onPlayerReady);
      socket.off("game_started", onGameStarted);
    };
  }, [socket, setRoom, patchRoom, setReady, setOpponentReady, setPendingMatchStart]);

  // Once both sides are ready, tell the server to start — exactly once per
  // match, regardless of which page (if any) happens to be on screen when
  // the second "ready" comes in.
  useEffect(() => {
    if (!socket || !room?.match_id) return;
    if (ready && opponentReady && room.status === "READY_CHECK" && !startedMatchIds.current.has(room.match_id)) {
      startedMatchIds.current.add(room.match_id);
      socket.emit("game_started", { room_id: room.id });
    }
  }, [socket, ready, opponentReady, room]);

  return null;
}
