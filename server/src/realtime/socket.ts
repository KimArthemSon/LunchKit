import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "./events";

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type EventName = keyof ServerToClientEvents;
type Payload<E extends EventName> = Parameters<ServerToClientEvents[E]>[0];

let io: IO | null = null;

// Each user joins only their own room; the server alone decides room membership.
const userRoom = (userId: string) => `user:${userId}`;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    maxHttpBufferSize: 1e4, // Clients don't send payloads; keep inbound messages tiny
  });

  // Same JWT check as the REST `protect` middleware, done once per connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return next(new Error("Not authorized, no token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
      const user = await User.findById(decoded.id).select("_id role");
      if (!user) return next(new Error("Not authorized, user not found"));
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("Not authorized, token failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.data.userId));
  });

  return io;
};

// Controllers call these after their DB writes commit. A no-op if sockets aren't initialised
// (e.g. scripts), and never throws, so realtime can't break a request.
export const emitToUsers = <E extends EventName>(userIds: Iterable<unknown>, event: E, payload: Payload<E>) => {
  if (!io) return;
  const rooms = [...new Set([...userIds].map((id) => userRoom(String(id))))];
  if (rooms.length === 0) return;
  try {
    // Cast: socket.io's generic emit signature can't infer through the mapped event type
    (io.to(rooms).emit as (ev: E, p: Payload<E>) => boolean)(event, payload);
  } catch (error) {
    console.error(`Realtime emit "${event}" failed`, error);
  }
};

export const emitToUser = <E extends EventName>(userId: unknown, event: E, payload: Payload<E>) =>
  emitToUsers([userId], event, payload);
