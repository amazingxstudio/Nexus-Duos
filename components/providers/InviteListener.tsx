"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, X, Check } from "lucide-react";
import { useSocket } from "./SocketProvider";

interface Invite { from_user_id: string; from_nickname: string; from_player_id: string; }

export function InviteListener() {
  const socket = useSocket();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);

  useEffect(() => {
    if (!socket) return;

    function onReceived(data: Invite) { setInvite(data); }
    function onAccepted(data: { room_code: string }) {
      setInvite(null);
      router.push(`/room/${data.room_code}`);
    }
    function onDeclined() { setInvite(null); }

    socket.on("invite:received", onReceived);
    socket.on("invite:accepted", onAccepted);
    socket.on("invite:declined", onDeclined);
    return () => {
      socket.off("invite:received", onReceived);
      socket.off("invite:accepted", onAccepted);
      socket.off("invite:declined", onDeclined);
    };
  }, [socket, router]);

  function respond(accept: boolean) {
    if (!invite) return;
    socket?.emit(accept ? "invite:accept" : "invite:decline", { from_user_id: invite.from_user_id });
    if (!accept) setInvite(null);
  }

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm"
        >
          <div className="glass-panel-cyan flex items-center gap-3 p-4">
            <span className="icon-badge h-10 w-10 shrink-0 bg-cyan/10"><Swords size={18} className="text-cyan" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-primary">{invite.from_nickname} wants to duel!</p>
              <p className="stat-mono text-xs text-ink-muted">{invite.from_player_id}</p>
            </div>
            <button onClick={() => respond(false)} className="icon-badge h-9 w-9 bg-white/5 text-ink-muted"><X size={16} /></button>
            <button onClick={() => respond(true)} className="icon-badge h-9 w-9 bg-cyan text-void"><Check size={16} strokeWidth={2.5} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
