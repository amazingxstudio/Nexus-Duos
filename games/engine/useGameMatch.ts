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
  // Set when the match was voided (a player exited while the other side
  // was already disconnected) rather than actually finished — distinct
  // from `status === "finished"` so MatchResultOverlay (win/lose sound,
  // rematch prompt) never renders for something nobody really won.
  const [cancelled, setCancelled] = useState(false);
  // Increments every time the rival nudges us — GameShell watches this to
  // trigger a visible screen-shake, which works everywhere (unlike
  // vibration, which does nothing on Telegram Desktop/Web and can be easy
  // to miss even on mobile).
  const [nudgeSignal, setNudgeSignal] = useState(0);
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
    function onCancelled(data: { match_id: string }) {
      if (data.match_id !== matchId) return;
      setCancelled(true);
    }
    function onOpponentDisconnected(data: { match_id: string }) {
      if (data.match_id === matchId) setOpponentDisconnected(true);
    }
    function onTurnNudge(data: { match_id: string }) {
      if (data.match_id !== matchId) return;
      setNudgeSignal((n) => n + 1);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    socket.on("game_started", onStarted);
    socket.on("game_state_updated", onStateUpdated);
    socket.on("game_timer_tick", onTick);
    socket.on("score_updated", onScoreUpdated);
    socket.on("game_finished", onFinished);
    socket.on("game_cancelled", onCancelled);
    socket.on("opponent_disconnected", onOpponentDisconnected);
    socket.on("turn_nudge", onTurnNudge);

    return () => {
      socket.off("game_started", onStarted);
      socket.off("game_state_updated", onStateUpdated);
      socket.off("game_timer_tick", onTick);
      socket.off("score_updated", onScoreUpdated);
      socket.off("game_finished", onFinished);
      socket.off("game_cancelled", onCancelled);
      socket.off("opponent_disconnected", onOpponentDisconnected);
      socket.off("turn_nudge", onTurnNudge);
    };
  }, [socket, matchId, roomCode]);

  const sendAction = useCallback(
    (type: string, data: Record<string, unknown>) => {
      socket?.emit("game_action", { match_id: matchId, type, data });
    },
    [socket, matchId]
  );

  // Exit button, after the person has confirmed — the server decides
  // forfeit vs. void depending on whether the rival is still connected
  // (see leave_match in the backend's match_runner.py).
  const leaveMatch = useCallback(() => {
    socket?.emit("match:leave", { match_id: matchId });
  }, [socket, matchId]);

  // Turn-based games only (Connect Four, Dots and Boxes) — buzzes the
  // rival once to remind them it's their move.
  const nudgeOpponent = useCallback(() => {
    socket?.emit("turn_nudge", { match_id: matchId });
  }, [socket, matchId]);

  return { payload, scores, remainingMs, status, result, cancelled, opponentDisconnected, nudgeSignal, sendAction, leaveMatch, nudgeOpponent };
}
