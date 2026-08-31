"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";

interface OutgoingInviteTarget {
  user_id: string;
  nickname: string;
}

interface OutgoingInviteToastProps {
  target: OutgoingInviteTarget | null;
  onDismiss: () => void;
}

/**
 * Bottom-anchored toast shown to the SENDER of a duel invite while it's
 * pending — gives ongoing feedback beyond the brief 3s checkmark on the
 * invite button itself. Visual style mirrors
 * components/providers/InviteListener.tsx's incoming-invite toast.
 *
 * No handling needed here for accept: InviteListener.tsx already listens
 * globally for "invite:accepted" and navigates the sender into the room,
 * which unmounts whichever page rendered this toast for free.
 */
export function OutgoingInviteToast({ target, onDismiss }: OutgoingInviteToastProps) {
  const socket = useSocket();
  const [declined, setDeclined] = useState(false);

  // A fresh invite target means a fresh "waiting" state, even if the last
  // one ended in a decline.
  useEffect(() => {
    setDeclined(false);
  }, [target?.user_id]);

  useEffect(() => {
    if (!socket || !target) return;

    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    function onDeclined(data: { by_user_id: string }) {
      if (!target || data?.by_user_id !== target.user_id) return;
      setDeclined(true);
      dismissTimer = setTimeout(() => onDismiss(), 2500);
    }

    socket.on("invite:declined", onDeclined);
    return () => {
      socket.off("invite:declined", onDeclined);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [socket, target, onDismiss]);

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm"
        >
          <div className="glass-panel-cyan flex items-center gap-3 p-4">
            <span className="icon-badge h-10 w-10 shrink-0 bg-cyan/10">
              {declined ? <X size={18} className="text-magenta" /> : <Loader2 size={18} className="animate-spin text-cyan" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-primary">
                {declined ? `${target.nickname} declined.` : `Waiting for ${target.nickname} to respond\u2026`}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
