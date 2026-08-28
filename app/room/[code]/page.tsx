"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { useRoomPhaseStore } from "@/store/useRoomPhaseStore";
import { useActiveRoomStore, ActiveRoomData } from "@/store/useActiveRoomStore";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { LoadingProgress } from "@/components/ui/LoadingProgress";
import { GameVotingPanel } from "@/components/room/GameVotingPanel";
import { GameDispatcher } from "@/components/room/GameDispatcher";
import { getGameMeta } from "@/lib/games";

// Next.js 14 passes dynamic route params synchronously (not a Promise).
export default function RoomPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { token, user } = useAuthStore();
  const socket = useSocket();
  const setInGame = useRoomPhaseStore((s) => s.setInGame);

  // Room/ready state now lives in the global store (written to by RoomSync,
  // which is mounted at the app root) instead of local component state —
  // so switching pages and coming back doesn't lose anything in-flight.
  const room = useActiveRoomStore((s) => s.room);
  const ready = useActiveRoomStore((s) => s.ready);
  const opponentReady = useActiveRoomStore((s) => s.opponentReady);
  const setRoom = useActiveRoomStore((s) => s.setRoom);
  const resetRoom = useActiveRoomStore((s) => s.reset);
  const joinedChannel = useActiveRoomStore((s) => s.joinedChannel);
  const setJoinedChannel = useActiveRoomStore((s) => s.setJoinedChannel);

  const [loadError, setLoadError] = useState(false);

  function refetch() {
    apiFetch<{ room: ActiveRoomData }>(`/rooms/${code}`, { token })
      .then((res) => setRoom(res.room))
      .catch(() => setLoadError(true));
  }

  // Navigated to a *different* room than the one currently tracked
  // globally — start fresh instead of flashing stale data from the last one.
  useEffect(() => {
    if (room && room.code !== code) resetRoom();
  }, [code, room, resetRoom]);

  useEffect(() => { setLoadError(false); refetch(); }, [code, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket) return;
    if (joinedChannel === code) return; // already subscribed — don't rejoin on every remount
    socket.emit("room:join_channel", { room_code: code });
    setJoinedChannel(code);
  }, [socket, code, joinedChannel, setJoinedChannel]);

  useEffect(() => {
    setInGame(room?.code === code && room?.status === "IN_PROGRESS");
    return () => setInGame(false);
  }, [room?.status, room?.code, code, setInGame]);

  if (loadError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-ink-primary">Couldn&apos;t load this room.</p>
        <p className="text-sm text-ink-muted">It may not exist, or the server is waking up — try again in a moment.</p>
      </main>
    );
  }

  if (!room || room.code !== code) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center">
        <LoadingProgress label="Loading room…" />
      </main>
    );
  }

  const opponent = room.player1.id === user?.id ? room.player2 : room.player1;
  const gameMeta = room.game ? getGameMeta(room.game.key) : undefined;

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-28 pt-8">
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
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel flex flex-col items-center p-6 text-center">
            <LoadingProgress label="Waiting for an opponent to join with this room code…" />
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
            {ready ? (
              <LoadingProgress label="Waiting for opponent…" />
            ) : (
              <button onClick={() => socket?.emit("player_ready", { room_id: room.id })} className="btn-primary">
                <Check size={16} strokeWidth={2.5} />
                I&apos;m Ready
              </button>
            )}
          </motion.div>
        )}

        {room.status === "IN_PROGRESS" && room.match_id && room.game && opponent && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-[calc(100dvh-13rem)] min-h-0"
          >
            <GameDispatcher gameKey={room.game.key} matchId={room.match_id} roomCode={room.code} opponentId={opponent.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
