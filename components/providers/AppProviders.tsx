"use client";

import { TelegramProvider } from "./TelegramProvider";
import { SocketProvider } from "./SocketProvider";
import { InviteListener } from "./InviteListener";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TelegramProvider>
      <SocketProvider>
        {children}
        <InviteListener />
      </SocketProvider>
    </TelegramProvider>
  );
}
