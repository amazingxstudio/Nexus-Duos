"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/useAuthStore";
import { API_URL } from "@/lib/api";

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const status = useAuthStore((s) => s.status);
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;

    const instance = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = instance;
    setSocket(instance);

    return () => {
      instance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [status, token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
