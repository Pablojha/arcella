import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { cache } from '../lib/cache';
import { cleanParams } from './useApi';

/**
 * Infinite list over a `{ items, hasMore }` endpoint (skipped when `url` is falsy). A list seen before
 * appears instantly from cache while page 1 refreshes; `reload()` keeps items on screen until fresh ones arrive.
 */
export function usePaged(url, params) {
  const paramsKey = JSON.stringify(params ?? {});
  const key = `${url}?${paramsKey}`;
  const [pager, setPager] = useState({ key, page: 1, version: 0 });
  const page = pager.key === key ? pager.page : 1;
  const [state, setState] = useState(() => ({ items: cache.get(key)?.items ?? [], hasMore: cache.get(key)?.hasMore ?? false, loading: Boolean(url), error: null }));
  const shownKey = useRef(key);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    const fresh = shownKey.current !== key;
    shownKey.current = key;
    const cached = cache.get(key);
    setState((current) => ({ ...current, loading: true, error: null, ...(page === 1 && fresh && { items: cached?.items ?? [], hasMore: cached?.hasMore ?? false }) }));
    api
      .get(url, { params: cleanParams({ ...JSON.parse(paramsKey), page }) })
      .then(({ items, hasMore }) => {
        if (page === 1) cache.set(key, { items, hasMore });
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
  }, [url, key, paramsKey, page, pager.version]);

  const loadMore = useCallback(() => setPager((current) => ({ ...current, key, page: (current.key === key ? current.page : 1) + 1 })), [key]);
  const reload = useCallback(() => setPager((current) => ({ key, page: 1, version: current.version + 1 })), [key]);
  const setItems = useCallback(
    (update) =>
      setState((current) => {
        const items = typeof update === 'function' ? update(current.items) : update;
        cache.set(key, { items, hasMore: current.hasMore });
        return { ...current, items };
      }),
    [key],
  );

  return { ...state, loadMore, reload, setItems };
}
