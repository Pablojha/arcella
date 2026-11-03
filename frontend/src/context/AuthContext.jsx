import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { token } from '../lib/api';
import { cache } from '../lib/cache';
import { disablePush } from '../lib/push';

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

  // Whether the member signed out themselves (then members-only pages lead home, not to the login page).
  const [leftOnPurpose, setLeftOnPurpose] = useState(false);

  const login = useCallback(
    (session) => {
      cache.clear();
      token.set(session.token);
      setLeftOnPurpose(false);
      setUser(session.user);
    },
    [setUser],
  );

  /**
   * Signs out at once. In the background this device also stops getting the account's notifications, using the
   * session being ended (`signedOut`: it has already ended, so only the browser forgets the device). `expired` marks
   * a session that ran out rather than one the member ended.
   */
  const logout = useCallback(
    ({ signedOut = false, expired = false } = {}) => {
      disablePush({ signedOut, session: token.get() }).catch(() => {});
      cache.clear();
      token.clear();
      setLeftOnPurpose(!expired);
      setUser(null);
    },
    [setUser],
  );

  const refresh = useCallback(() => api.get('/auth/me').then((data) => setUser(data.user)), [setUser]);

  useEffect(() => {
    if (token.get()) refresh().catch(() => {}).finally(() => setReady(true));
    else api.get('/health').catch(() => {});
    const expired = () => logout({ signedOut: true, expired: true });
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, [refresh, logout]);

  return <AuthContext value={{ user, ready, login, logout, refresh, setUser, leftOnPurpose }}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
