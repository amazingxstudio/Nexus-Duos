"use client";

import { TelegramProvider } from "./TelegramProvider";
import { SocketProvider } from "./SocketProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TelegramProvider>
      <SocketProvider>{children}</SocketProvider>
    </TelegramProvider>
  );
}
