"use client";

import { TelegramProvider } from "./TelegramProvider";
import { SocketProvider } from "./SocketProvider";
import { AuthGate } from "./AuthGate";
import { InviteListener } from "./InviteListener";
import { MessageNotificationListener } from "./MessageNotificationListener";
import { RoomSync } from "./RoomSync";
import { TelegramBackButton } from "./TelegramBackButton";
import { ImageCacheRegistrar } from "./ImageCacheRegistrar";
import { AudioUnlockListener } from "./AudioUnlockListener";
import { ActiveRoomFloatingButton } from "@/components/ui/ActiveRoomFloatingButton";
import { MessagePanel } from "@/components/friends/MessagePanel";
import { useMessagesStore } from "@/store/useMessagesStore";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Global — the same conversation sheet opens whether it's triggered from
  // a Friends-list row or a swiped-open incoming-DM banner (see
  // MessageNotificationListener), so it lives once at the app root instead
  // of being owned by the Friends page.
  const openTarget = useMessagesStore((s) => s.openTarget);
  const closeConversation = useMessagesStore((s) => s.closeConversation);

  return (
    <TelegramProvider>
      <SocketProvider>
        <AuthGate>
          {/* Global, always-mounted — keeps room state alive across page swaps. */}
          <RoomSync />
          {/* Global, always-mounted — see TelegramBackButton.tsx. */}
          <TelegramBackButton />
          {/* Global, always-mounted, renders nothing — see ImageCacheRegistrar.tsx. */}
          <ImageCacheRegistrar />
          {/* Global, always-mounted, renders nothing — see AudioUnlockListener.tsx. */}
          <AudioUnlockListener />
          {children}
          <InviteListener />
          <MessageNotificationListener />
          <MessagePanel target={openTarget} onClose={closeConversation} />
          <ActiveRoomFloatingButton />
        </AuthGate>
      </SocketProvider>
    </TelegramProvider>
  );
}
