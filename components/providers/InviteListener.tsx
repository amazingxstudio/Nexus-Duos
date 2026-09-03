"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, X, Check, RefreshCw } from "lucide-react";
import { useSocket } from "./SocketProvider";
import { playNotificationSound } from "@/lib/sound";

interface Invite {
  from_user_id: string;
  from_nickname: string;
  from_player_id: string;
  game_key?: string | null;
  game_name?: string | null;
  is_rematch?: boolean;
}

export function InviteListener() {
  const socket = useSocket();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Any socket push that lands on this player without them having asked
    // for it right this second — a duel/rematch invite today, a friend
    // request if that ever grows a real accept/decline flow later — should
    // make a sound, since the person may not be looking at the screen when
    // it arrives. Kept as one local helper (rather than inlined per-event)
    // so a future second notification-style event just calls this too.
    function notify() {
      playNotificationSound();
    }

    function onReceived(data: Invite) {
      notify();
      setInvite(data);
    }
    function onAccepted(data: { room_code: string }) {
      setInvite(null);
      router.push(`/room/${data.room_code}`);
    }
    function onDeclined() { setInvite(null); }
    // Friends-list direct messages (spec D.14) are their own thing with
    // their own panel (components/friends/MessagePanel.tsx) — no popup
    // card here, just the same "something arrived" sound so it's audible
    // even while the Friends list/message panel isn't open.
    function onDmReceived() { notify(); }

    socket.on("invite:received", onReceived);
    socket.on("invite:accepted", onAccepted);
    socket.on("invite:declined", onDeclined);
    socket.on("dm:received", onDmReceived);
    return () => {
      socket.off("invite:received", onReceived);
      socket.off("invite:accepted", onAccepted);
      socket.off("invite:declined", onDeclined);
      socket.off("dm:received", onDmReceived);
    };
  }, [socket, router]);

  function respond(accept: boolean) {
    if (!invite) return;
    socket?.emit(accept ? "invite:accept" : "invite:decline", {
      from_user_id: invite.from_user_id,
      game_key: invite.game_key ?? null,
    });
    if (!accept) setInvite(null);
  }

  const headline = invite
    ? invite.is_rematch
      ? `${invite.from_nickname} wants a rematch!`
      : invite.game_name
        ? `${invite.from_nickname} wants to duel — ${invite.game_name}!`
        : `${invite.from_nickname} wants to duel!`
    : "";

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
            <span className="icon-badge h-10 w-10 shrink-0 bg-cyan/10">
              {invite.is_rematch ? <RefreshCw size={18} className="text-cyan" /> : <Swords size={18} className="text-cyan" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-primary">{headline}</p>
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
