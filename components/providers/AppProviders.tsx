"use client";

import { TelegramProvider } from "./TelegramProvider";
import { SocketProvider } from "./SocketProvider";
import { InviteListener } from "./InviteListener";
import { RoomSync } from "./RoomSync";
import { ActiveRoomFloatingButton } from "@/components/ui/ActiveRoomFloatingButton";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TelegramProvider>
      <SocketProvider>
        {/* Global, always-mounted — keeps room state alive across page swaps. */}
        <RoomSync />
        {children}
        <InviteListener />
        <ActiveRoomFloatingButton />
      </SocketProvider>
    </TelegramProvider>
  );
}
