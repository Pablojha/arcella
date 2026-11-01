import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePoll } from '../hooks/usePoll';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const EMPTY = { messages: 0, notifications: 0, requests: 0 };
const BadgeContext = createContext({ ...EMPTY, refresh: () => {} });

/** Unread counts for messages, notifications and connection requests, polled while signed in. */
export function BadgeProvider({ children }) {
  const { user } = useAuth();
  const [badges, setBadges] = useState(EMPTY);
  const signedIn = Boolean(user);

  const refresh = useCallback(() => api.get('/notifications/badges').then(setBadges).catch(() => {}), []);

  useEffect(() => {
    if (signedIn) refresh();
    else setBadges(EMPTY);
  }, [signedIn, refresh]);

  usePoll(refresh, 15_000, signedIn);

  return <BadgeContext value={{ ...badges, refresh }}>{children}</BadgeContext>;
}

export const useBadges = () => useContext(BadgeContext);
