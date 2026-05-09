"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { logger } from "@/lib/logger";
import { useTelemetryStore } from "@/store/useTelemetryStore";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const setSocket = useTelemetryStore((state) => state.setSocket);
  const setIsConnected = useTelemetryStore((state) => state.setIsConnected);
  const fetchChargers = useTelemetryStore((state) => state.fetchChargers);
  const fetchSessions = useTelemetryStore((state) => state.fetchSessions);

  useEffect(() => {
    // If NEXT_PUBLIC_API_URL is configured (e.g. for external backend),
    // we should connect to that domain instead of relative path
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const isAbsoluteUrl = apiUrl.startsWith("http");

    // We use undefined if relative so it falls back to window.location.origin
    const socketUrl = isAbsoluteUrl ? new URL(apiUrl).origin : undefined;

    // In development with Next.js proxied routing or standard deployments,
    // we want to connect to the same host but at path /api/realtime
    const newSocket = io(socketUrl as string | undefined, {
      path: "/api/realtime",
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    newSocket.on("connect", () => {
      logger.info("Realtime WebSocket connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      logger.info("Realtime WebSocket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      logger.error("Realtime WebSocket connection error:", error);
      setIsConnected(false);
    });

    newSocket.on("CHARGER_STATUS_UPDATE", () => {
        fetchChargers();
        fetchSessions();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [setSocket, setIsConnected, fetchChargers, fetchSessions]);

  return <>{children}</>;
}
