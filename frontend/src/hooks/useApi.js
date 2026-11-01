import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';

/** Drops empty filters so they are not sent as query params. */
export const cleanParams = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null && value !== false));

/** GETs `url` (skipped when falsy) and refetches when params change. */
export function useApi(url, params) {
  const paramsKey = JSON.stringify(params ?? {});
  const [state, setState] = useState({ data: null, loading: Boolean(url), error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    api
      .get(url, { params: cleanParams(JSON.parse(paramsKey)) })
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => {
      alive = false;
    };
  }, [url, paramsKey, version]);

  const setData = useCallback((update) => setState((current) => ({ ...current, data: typeof update === 'function' ? update(current.data) : update })), []);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { ...state, setData, reload };
}
