import { useEffect, useRef } from 'react';
import { socket } from '../lib/realtime';

/** Calls `handler` for a real-time event while mounted, always with the latest handler. */
export function useSocketEvent(event, handler) {
  const saved = useRef(handler);

  useEffect(() => {
    saved.current = handler;
  });

  useEffect(() => {
    const listener = (payload) => saved.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event]);
}
