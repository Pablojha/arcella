import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { cache } from '../lib/cache';

/** Drops empty filters so they are not sent as query params. */
export const cleanParams = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null && value !== false));

/** GETs `url` (skipped when falsy), showing the cached copy at once and refreshing it in the background. */
export function useApi(url, params) {
  const paramsKey = JSON.stringify(params ?? {});
  const key = `${url}?${paramsKey}`;
  const [state, setState] = useState(() => ({ data: cache.get(key) ?? null, loading: Boolean(url) && !cache.get(key), error: null }));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    const cached = cache.get(key);
    setState({ data: cached ?? null, loading: !cached, error: null });
    api
      .get(url, { params: cleanParams(JSON.parse(paramsKey)) })
      .then((data) => {
        cache.set(key, data);
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((error) => alive && setState((current) => ({ ...current, loading: false, error })));
    return () => {
      alive = false;
    };
  }, [url, key, paramsKey, version]);

  const setData = useCallback(
    (update) =>
      setState((current) => {
        const data = typeof update === 'function' ? update(current.data) : update;
        cache.set(key, data);
        return { ...current, data };
      }),
    [key],
  );
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { ...state, setData, reload };
}
