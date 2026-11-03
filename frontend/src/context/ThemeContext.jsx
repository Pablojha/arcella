import { createContext, useContext, useEffect, useState } from 'react';
import { readPreference, savePreference } from '../lib/consent';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'arcella_theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readPreference(STORAGE_KEY) || 'system');
  const [systemDark, setSystemDark] = useState(media.matches);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);

  useEffect(() => {
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121311' : '#f7f5f0');
    savePreference(STORAGE_KEY, theme);
  }, [dark, theme]);

  return <ThemeContext value={{ theme, setTheme, dark }}>{children}</ThemeContext>;
}

export const useTheme = () => useContext(ThemeContext);
