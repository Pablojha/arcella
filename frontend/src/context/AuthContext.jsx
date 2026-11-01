import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { token } from '../lib/api';

const AuthContext = createContext(null);
const USER_KEY = 'arcella_user';

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
      token.set(session.token);
      setUser(session.user);
    },
    [setUser],
  );

  const logout = useCallback(() => {
    token.clear();
    setUser(null);
  }, [setUser]);

  const refresh = useCallback(() => api.get('/auth/me').then((data) => setUser(data.user)), [setUser]);

  useEffect(() => {
    if (token.get()) refresh().catch(() => {}).finally(() => setReady(true));
    else api.get('/health').catch(() => {});
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [refresh, logout]);

  return <AuthContext value={{ user, ready, login, logout, refresh, setUser }}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
