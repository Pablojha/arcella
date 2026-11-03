// Arcella stores nothing for advertising or analytics. Besides essential storage (the session, the cached profile,
// this choice and the offline cache), it can remember a few preferences across visits; those wait for consent and
// otherwise last only for the current visit.
const CHOICE_KEY = 'arcella_storage_choice';
const PREFERENCE_KEYS = ['arcella_theme', 'arcella_install_dismissed', 'arcella_push_prompt_dismissed'];
export const STORAGE_CHOICE_CHANGED = 'storage-choice:changed';
export const OPEN_STORAGE_SETTINGS = 'storage-settings:open';

const safely = (action) => {
  try {
    return action();
  } catch {
    return null; // Storage can be blocked (private browsing); everything still works for the visit.
  }
};

/** The visitor's answer to the storage notice: null until they choose, then `{ preferences: boolean }`. */
export const storageChoice = () => safely(() => JSON.parse(localStorage.getItem(CHOICE_KEY)));

export function setStorageChoice(preferences) {
  safely(() => {
    localStorage.setItem(CHOICE_KEY, JSON.stringify({ preferences, at: new Date().toISOString() }));
    const [from, to] = preferences ? [sessionStorage, localStorage] : [localStorage, sessionStorage];
    PREFERENCE_KEYS.forEach((key) => {
      const value = from.getItem(key);
      from.removeItem(key);
      if (value !== null) to.setItem(key, value);
    });
  });
  window.dispatchEvent(new Event(STORAGE_CHOICE_CHANGED));
}

/** Saves a preference across visits when allowed, otherwise for this visit only. */
export function savePreference(key, value) {
  safely(() => {
    const [keep, drop] = storageChoice()?.preferences ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    keep.setItem(key, value);
    drop.removeItem(key);
  });
}

export const readPreference = (key) => safely(() => localStorage.getItem(key) ?? sessionStorage.getItem(key));

export const openStorageSettings = () => window.dispatchEvent(new Event(OPEN_STORAGE_SETTINGS));
