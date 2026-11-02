import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { token } from '../lib/api';
import { cache } from '../lib/cache';
import { disablePush } from '../lib/push';

const AuthContext = createContext(null);
const USER_KEY = 'arcella_user';
const SIGN_OUT_WAIT_MS = 3000;

function cachedUser() {
  try {
    return token.get() ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
}

/** Keeps the signed-in user (cached for an instant start) and refreshes it from the API on boot. */
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(cachedUser);
  const [ready, setReady] = useState(() => !token.get() || Boolean(cachedUser()));

  const setUser = useCallback((next) => {
    setUserState(next);
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(
    (session) => {
      cache.clear();
      token.set(session.token);
      setUser(session.user);
    },
    [setUser],
  );

  /** Signs out, and this device stops getting the account's notifications (`signedOut`: the session has already ended). */
  const logout = useCallback(
    async ({ signedOut = false } = {}) => {
      await Promise.race([disablePush({ signedOut }).catch(() => {}), new Promise((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS))]);
      cache.clear();
      token.clear();
      setUser(null);
    },
    [setUser],
  );

  const refresh = useCallback(() => api.get('/auth/me').then((data) => setUser(data.user)), [setUser]);

  useEffect(() => {
    if (token.get()) refresh().catch(() => {}).finally(() => setReady(true));
    else api.get('/health').catch(() => {});
    const expired = () => logout({ signedOut: true });
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, [refresh, logout]);

  return <AuthContext value={{ user, ready, login, logout, refresh, setUser }}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
