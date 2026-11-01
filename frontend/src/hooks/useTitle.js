import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "Jobs · Arcella". */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Arcella` : 'Arcella · the architecture network';
  }, [title]);
}
