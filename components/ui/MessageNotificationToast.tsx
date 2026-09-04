"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { MessageCircle, ArrowLeft, ArrowRight, BellOff } from "lucide-react";
import { hapticTap, hapticNotify } from "@/lib/haptics";

export interface DmNotification {
  /** Unique per banner instance (message id) so a second DM from the same
   *  sender while one banner is already showing swaps it in as a fresh
   *  toast — new key, AnimatePresence replays the enter animation and the
   *  auto-dismiss timer restarts. */
  key: string;
  sender_id: string;
  nickname: string;
  photo_url?: string | null;
  content: string;
}

interface MessageNotificationToastProps {
  notification: DmNotification | null;
  onOpen: () => void;
  onDismiss: () => void;
  onMute: () => void;
}

const AUTO_DISMISS_MS = 5000;
const SWIPE_THRESHOLD = 64;

/**
 * Top-anchored, swipeable "someone messaged you" banner (spec D.14a).
 * Swipe right (or tap) opens the conversation straight into the global
 * MessagePanel; swipe left dismisses it AND mutes further DM banners for a
 * while (see MessageNotificationListener's MUTE_DURATION_MS) — matching a
 * Telegram-style "swipe to open / swipe away to silence" gesture pair.
 */
export function MessageNotificationToast({ notification, onOpen, onDismiss, onMute }: MessageNotificationToastProps) {
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => onDismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.key]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      hapticNotify("success");
      onOpen();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      hapticTap("soft");
      onMute();
    }
  }

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.key}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.65}
          onDragEnd={handleDragEnd}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={onOpen}
          className="fixed inset-x-4 z-[80] mx-auto max-w-sm cursor-grab touch-pan-y active:cursor-grabbing"
          style={{ top: "calc(0.75rem + var(--app-safe-top, 0px))" }}
        >
          <div className="glass-panel-cyan flex items-center gap-3 p-3">
            <div
              className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-raised bg-cover bg-center"
              style={notification.photo_url ? { backgroundImage: `url(${notification.photo_url})` } : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-primary">{notification.nickname}</p>
              <p className="truncate text-xs text-ink-muted">{notification.content}</p>
            </div>
            <MessageCircle size={16} className="shrink-0 text-cyan" />
          </div>
          <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-ink-faint">
            <span className="flex items-center gap-1"><ArrowLeft size={10} /><BellOff size={10} />Swipe to mute</span>
            <span className="flex items-center gap-1">Swipe to open<ArrowRight size={10} /></span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
