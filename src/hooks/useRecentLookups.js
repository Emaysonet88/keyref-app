import { useCallback } from 'react';
import { useLocalStorageState } from './useLocalStorageState';
import { KEYS } from '../utils/storage';

// ── useRecentLookups ─────────────────────────────────────────────────────────
// Recently-run lookups, deduped on year+make+model, capped at 10.
export function useRecentLookups() {
  const [recent, setRecent] = useLocalStorageState(KEYS.recent, []);

  const pushRecent = useCallback((vehicle, result) => {
    setRecent(prev => [
      { ...vehicle, result, ts: Date.now() },
      ...prev.filter(r =>
        !(r.year === vehicle.year && r.make === vehicle.make && r.model === vehicle.model)
      ),
    ].slice(0, 10));
  }, [setRecent]);

  return { recent, pushRecent };
}
