"use client";

import { TelegramProvider } from "./TelegramProvider";
import { SocketProvider } from "./SocketProvider";
import { AuthGate } from "./AuthGate";
import { InviteListener } from "./InviteListener";
import { RoomSync } from "./RoomSync";
import { TelegramBackButton } from "./TelegramBackButton";
import { ActiveRoomFloatingButton } from "@/components/ui/ActiveRoomFloatingButton";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TelegramProvider>
      <SocketProvider>
        <AuthGate>
          {/* Global, always-mounted — keeps room state alive across page swaps. */}
          <RoomSync />
          {/* Global, always-mounted — see TelegramBackButton.tsx. */}
          <TelegramBackButton />
          {children}
          <InviteListener />
          <ActiveRoomFloatingButton />
        </AuthGate>
      </SocketProvider>
    </TelegramProvider>
  );
}
