"use client";

import { useEffect, useState } from "react";
import { useSocket } from "./SocketProvider";
import { useMessagesStore } from "@/store/useMessagesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { playDmNotificationSound } from "@/lib/sound";
import { hapticNotify } from "@/lib/haptics";
import { MessageNotificationToast, type DmNotification } from "@/components/ui/MessageNotificationToast";

interface DmPayload {
  id: string;
  sender_id: string;
  content: string;
  sender_nickname?: string | null;
  sender_photo_url?: string | null;
}

/** How long a swiped-away notification silences further DM banners/sound
 *  for (spec D.14a's "no more popups for a while"). Unread dots keep
 *  updating during this window — only the popup + chime are held back. */
const MUTE_DURATION_MS = 20 * 60 * 1000;

/**
 * Global, always-mounted (see AppProviders.tsx). Owns the incoming-DM
 * banner: every dm:received lands here first. If the sender's
 * conversation is already open in the global MessagePanel, this is a
 * no-op (MessagePanel's own listener appends the bubble live and the
 * store's openConversation already cleared that sender's unread count).
 * Otherwise it bumps the unread dot and — unless currently muted — shows
 * the swipeable banner and plays the chime.
 */
export function MessageNotificationListener() {
  const socket = useSocket();
  const myId = useAuthStore((s) => s.user?.id);
  const [banner, setBanner] = useState<DmNotification | null>(null);

  useEffect(() => {
    if (!socket) return;

    function onReceived(data: DmPayload) {
      if (data.sender_id === myId) return; // never happens (that's dm:sent), but keep this defensive
      const store = useMessagesStore.getState();
      if (store.openTarget?.user_id === data.sender_id) return;

      store.incrementUnread(data.sender_id);
      if (Date.now() < store.mutedUntil) return;

      hapticNotify("success");
      playDmNotificationSound();
      setBanner({
        key: data.id,
        sender_id: data.sender_id,
        nickname: data.sender_nickname ?? "New message",
        photo_url: data.sender_photo_url ?? null,
        content: data.content,
      });
    }

    socket.on("dm:received", onReceived);
    return () => { socket.off("dm:received", onReceived); };
  }, [socket, myId]);

  function openFromBanner() {
    if (!banner) return;
    useMessagesStore.getState().openConversation({ user_id: banner.sender_id, nickname: banner.nickname });
    setBanner(null);
  }

  function muteFromBanner() {
    useMessagesStore.getState().muteFor(MUTE_DURATION_MS);
    setBanner(null);
  }

  return (
    <MessageNotificationToast
      notification={banner}
      onOpen={openFromBanner}
      onDismiss={() => setBanner(null)}
      onMute={muteFromBanner}
    />
  );
}
