"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { GameVotingPanel } from "@/components/room/GameVotingPanel";
import { GameDispatcher } from "@/components/room/GameDispatcher";
import { getGameMeta } from "@/lib/games";

interface RoomPlayer { id: string; photo_url?: string | null; nickname?: string; player_id?: string; }
interface RoomData {
  id: string; code: string; status: string;
  player1: RoomPlayer; player2?: RoomPlayer | null;
  game?: { key: string; name: string } | null;
}

// Next.js 14 passes dynamic route params synchronously (not a Promise — that's a Next.js 15 pattern).
export default function RoomPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { token, user } = useAuthStore();
  const socket = useSocket();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);

  useEffect(() => {
    apiFetch<{ room: RoomData }>(`/rooms/${code}`, { token })
      .then((res) => setRoom(res.room))
      .catch(() => setLoadError(true));
  }, [code, token]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("room:join_channel", { room_code: code });

    function onRoomJoined(data: { room: RoomData }) { setRoom(data.room); }
    function onVoteResolved(data: { match_id: string; game_key: string; game_name: string }) {
      setRoom((r) => (r ? { ...r, status: "READY_CHECK", game: { key: data.game_key, name: data.game_name } } : r));
      setMatchId(data.match_id);
    }
    function onPlayerReady(data: { user_id: string }) {
      if (data.user_id === user?.id) setReady(true);
      else setOpponentReady(true);
    }
    function onGameStarted() { setRoom((r) => (r ? { ...r, status: "IN_PROGRESS" } : r)); }

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
  }, [socket, code, user?.id]);

  useEffect(() => {
    if (ready && opponentReady && room?.status === "READY_CHECK") {
      socket?.emit("game_started", { room_id: room.id });
    }
  }, [ready, opponentReady, room, socket]);

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-ink-primary">Couldn&apos;t load this room.</p>
        <p className="text-sm text-ink-muted">It may not exist, or the server is waking up — try again in a moment.</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-cyan" />
        <p className="text-sm text-ink-muted">Loading room…</p>
      </main>
    );
  }

  const opponent = room.player1.id === user?.id ? room.player2 : room.player1;
  const gameMeta = room.game ? getGameMeta(room.game.key) : undefined;

  return (
    <main className="flex min-h-screen flex-col px-5 pb-10 pt-8">
      <header className="mb-6 text-center"><p className="stat-mono text-xs text-violet">{room.code}</p></header>

      {room.status !== "IN_PROGRESS" && (
        <section className="glass-panel mb-6 flex items-stretch p-1">
          <PlayerCard side="cyan" name={user?.profile?.nickname ?? "You"} playerId={user?.profile?.player_id} photoUrl={user?.photo_url} />
          <div className="duel-seam mx-1 my-4" />
          <PlayerCard side="magenta" name={opponent?.nickname ?? "Opponent"} playerId={opponent?.player_id} photoUrl={opponent?.photo_url} empty={!opponent} />
        </section>
      )}

      <AnimatePresence mode="wait">
        {room.status === "WAITING_FOR_PLAYER" && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel flex flex-col items-center gap-2 p-6 text-center">
            <Loader2 className="animate-spin text-cyan" size={20} />
            <p className="text-ink-muted">Waiting for an opponent to join with this room code…</p>
          </motion.div>
        )}

        {room.status === "VOTING" && (
          <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GameVotingPanel roomId={room.id} />
          </motion.div>
        )}

        {room.status === "READY_CHECK" && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
            {gameMeta && (
              <div className="glass-panel flex items-center gap-2 px-4 py-2">
                <gameMeta.icon size={16} className="text-cyan" />
                <span className="text-ink-primary">{gameMeta.name}</span>
              </div>
            )}
            <button onClick={() => socket?.emit("player_ready", { room_id: room.id })} disabled={ready} className="btn-primary">
              {ready ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              {ready ? "Waiting for opponent…" : "I'm Ready"}
            </button>
          </motion.div>
        )}

        {room.status === "IN_PROGRESS" && matchId && room.game && opponent && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GameDispatcher gameKey={room.game.key} matchId={matchId} roomCode={room.code} opponentId={opponent.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
