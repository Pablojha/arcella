import { useEffect, useRef } from 'react';

/** Calls `fn` every `ms` while enabled and the tab is visible. */
export function usePoll(fn, ms, enabled = true) {
  const saved = useRef(fn);

  useEffect(() => {
    saved.current = fn;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => document.visibilityState === 'visible' && saved.current(), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}
