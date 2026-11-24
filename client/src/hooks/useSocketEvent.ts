import { useContext, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { SocketContext } from "../realtime/socketContext";
import type { RealtimeEvent, ServerToClientEvents } from "../realtime/events";

// Keeps the latest callback in a ref so callers needn't memoise it and we don't resubscribe.
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

// Subscribe to one realtime event while the component is mounted.
export function useSocketEvent<E extends RealtimeEvent>(event: E, handler: ServerToClientEvents[E]) {
  const socket = useContext(SocketContext);
  const latest = useLatest(handler);

  useEffect(() => {
    if (!socket) return;
    const s = socket as unknown as Socket; // Untyped view: the typed overloads don't accept a generic E
    const listener = (...args: unknown[]) => (latest.current as (...a: unknown[]) => void)(...args);
    const name: string = event;
    s.on(name, listener);
    return () => { s.off(name, listener); };
  }, [socket, event, latest]);
}

// Run `refresh` whenever any of `events` arrives, and after a reconnect (events sent while the
// connection was down are lost, so refetching is how we catch up).
export function useRealtimeRefresh(events: readonly RealtimeEvent[], refresh: () => void) {
  const socket = useContext(SocketContext);
  const latest = useLatest(refresh);
  const key = events.join(",");

  useEffect(() => {
    if (!socket) return;
    const s = socket as unknown as Socket;
    const names = key.split(",");
    const listener = () => latest.current();
    names.forEach((name) => s.on(name, listener));
    s.io.on("reconnect", listener);
    return () => {
      names.forEach((name) => s.off(name, listener));
      s.io.off("reconnect", listener);
    };
  }, [socket, key, latest]);
}
