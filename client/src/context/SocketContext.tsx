import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../api/http";
import { useAuth } from "./AuthContext";
import { SocketContext, type AppSocket } from "../realtime/socketContext";

// One authenticated connection per logged-in session. The server puts it in the user's own
// room, so it only ever receives that user's events.
export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  // Creating the client doesn't open a connection (autoConnect: false); the effect does.
  const socket = useMemo<AppSocket | null>(
    () => (token ? io(API_URL, { auth: { token }, autoConnect: false, forceNew: true }) : null),
    [token],
  );

  useEffect(() => {
    if (!socket) return;
    socket.connect();
    return () => { socket.disconnect(); }; // Logout or token change
  }, [socket]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
