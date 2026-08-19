"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useActiveRoomStore } from "@/store/useActiveRoomStore";

export interface MatchFinishResult {
  match_id: string;
  scores: Record<string, number>;
  winner_id: string | null;
}

interface UseGameMatchOptions {
  matchId: string;
  roomCode: string;
}

export function useGameMatch({ matchId, roomCode }: UseGameMatchOptions) {
  const socket = useSocket();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [status, setStatus] = useState<"waiting" | "active" | "finished">("waiting");
  const [result, setResult] = useState<MatchFinishResult | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const joinedRef = useRef(false);

  // The "game_started" broadcast fires exactly once, right as the match
  // begins — often before this component (and this effect) has even
  // mounted, since RoomSync (mounted at the app root) is what triggers the
  // room-status flip that causes this screen to render in the first place.
  // If RoomSync already caught that broadcast, consume it here instead of
  // waiting for an event that already happened and won't come again.
  useEffect(() => {
    const pending = useActiveRoomStore.getState().pendingMatchStart;
    if (pending && pending.match_id === matchId) {
      setPayload(pending.payload);
      setRemainingMs(pending.duration_ms);
      setStatus("active");
      useActiveRoomStore.getState().setPendingMatchStart(null);
    }
  }, [matchId]);

  useEffect(() => {
    if (!socket) return;

    if (!joinedRef.current) {
      socket.emit("room:join_channel", { room_code: roomCode });
      joinedRef.current = true;
    }

    function onStarted(data: { match_id: string; payload: Record<string, unknown>; duration_ms: number }) {
      if (data.match_id !== matchId) return;
      setPayload(data.payload);
      setRemainingMs(data.duration_ms);
      setStatus("active");
    }
    function onStateUpdated(data: { payload: Record<string, unknown> }) {
      setPayload(data.payload);
    }
    function onTick(data: { remaining_ms: number }) {
      setRemainingMs(data.remaining_ms);
    }
    function onScoreUpdated(data: { scores: Record<string, number> }) {
      setScores(data.scores);
    }
    function onFinished(data: { match_id: string; result: MatchFinishResult }) {
      if (data.match_id !== matchId) return;
      setStatus("finished");
      setResult(data.result);
    }
    function onOpponentDisconnected(data: { match_id: string }) {
      if (data.match_id === matchId) setOpponentDisconnected(true);
    }

    socket.on("game_started", onStarted);
    socket.on("game_state_updated", onStateUpdated);
    socket.on("game_timer_tick", onTick);
    socket.on("score_updated", onScoreUpdated);
    socket.on("game_finished", onFinished);
    socket.on("opponent_disconnected", onOpponentDisconnected);

    return () => {
      socket.off("game_started", onStarted);
      socket.off("game_state_updated", onStateUpdated);
      socket.off("game_timer_tick", onTick);
      socket.off("score_updated", onScoreUpdated);
      socket.off("game_finished", onFinished);
      socket.off("opponent_disconnected", onOpponentDisconnected);
    };
  }, [socket, matchId, roomCode]);

  const sendAction = useCallback(
    (type: string, data: Record<string, unknown>) => {
      socket?.emit("game_action", { match_id: matchId, type, data });
    },
    [socket, matchId]
  );

  return { payload, scores, remainingMs, status, result, opponentDisconnected, sendAction };
}
