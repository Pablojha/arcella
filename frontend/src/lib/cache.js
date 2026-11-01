const MAX_ENTRIES = 60;
const store = new Map();

/**
 * Last response per request, so screens you come back to appear instantly while they refresh
 * in the background (stale-while-revalidate). Cleared on login and logout.
 */
export const cache = {
  get: (key) => store.get(key),
  set(key, value) {
    store.delete(key);
    store.set(key, value);
    if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
  },
  clear: () => store.clear(),
};
