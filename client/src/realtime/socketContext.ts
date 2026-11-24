import { createContext } from "react";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./events";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// null while logged out. Kept apart from the provider so fast refresh keeps working.
export const SocketContext = createContext<AppSocket | null>(null);
