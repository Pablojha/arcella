import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { cleanParams } from './useApi';

/**
 * Infinite list over a `{ items, hasMore }` endpoint (skipped when `url` is falsy). Changing filters
 * resets to page 1 with a blank list; `reload()` keeps the current items on screen until fresh ones arrive.
 */
export function usePaged(url, params) {
  const paramsKey = JSON.stringify(params ?? {});
  const key = `${url}?${paramsKey}`;
  const [pager, setPager] = useState({ key, page: 1, version: 0 });
  const page = pager.key === key ? pager.page : 1;
  const [state, setState] = useState({ items: [], hasMore: false, loading: Boolean(url), error: null });
  const shownKey = useRef(key);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    const fresh = shownKey.current !== key;
    shownKey.current = key;
    setState((current) => ({ ...current, loading: true, error: null, ...(page === 1 && fresh && { items: [] }) }));
    api
      .get(url, { params: cleanParams({ ...JSON.parse(paramsKey), page }) })
      .then(({ items, hasMore }) => {
        if (!alive) return;
        setState((current) => ({
          items: page === 1 ? items : [...current.items, ...items.filter((item) => !current.items.some((old) => old._id === item._id))],
          hasMore,
          loading: false,
          error: null,
        }));
      })
      .catch((error) => alive && setState((current) => ({ ...current, loading: false, error })));
    return () => {
      alive = false;
    };
  }, [url, paramsKey, page, pager.version]);

  const loadMore = useCallback(() => setPager((current) => ({ ...current, key, page: (current.key === key ? current.page : 1) + 1 })), [key]);
  const reload = useCallback(() => setPager((current) => ({ key, page: 1, version: current.version + 1 })), [key]);
  const setItems = useCallback((update) => setState((current) => ({ ...current, items: typeof update === 'function' ? update(current.items) : update })), []);

  return { ...state, loadMore, reload, setItems };
}
