import { useState, useEffect, useRef } from 'react';
import { store } from '../utils/storage';

// ── useLocalStorageState ─────────────────────────────────────────────────────
// useState that auto-persists to localStorage under `key`. The initial value
// is hydrated on first render (synchronously, so there's no flash).
export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => store.get(key, defaultValue));

  // Skip the very first write — `value` already came from storage.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    store.set(key, value);
  }, [key, value]);

  return [value, setValue];
}
