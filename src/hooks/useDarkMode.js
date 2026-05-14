import { useEffect } from 'react';
import { useLocalStorageState } from './useLocalStorageState';
import { KEYS } from '../utils/storage';

// ── useDarkMode ──────────────────────────────────────────────────────────────
// Persisted boolean tied to <html data-theme="dark|light">. CSS variables in
// index.css branch on this attribute, so theme tokens flip globally with no
// prop-drilling required.
export function useDarkMode() {
  const [stored, setStored] = useLocalStorageState(KEYS.theme, 'dark');
  const darkMode = stored !== 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggle = () => setStored(darkMode ? 'light' : 'dark');
  return [darkMode, toggle];
}
