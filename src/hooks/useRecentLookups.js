import { useCallback } from 'react';
import { useLocalStorageState } from './useLocalStorageState';
import { KEYS } from '../utils/storage';

// ── useRecentLookups ─────────────────────────────────────────────────────────
// Recently-run lookups, deduped on year+make+model+vin, capped at 10.
export function useRecentLookups() {
  const [recent, setRecent] = useLocalStorageState(KEYS.recent, []);

  const pushRecent = useCallback((vehicle, result) => {
    setRecent(prev => [
      { ...vehicle, result, ts: Date.now() },
      ...prev.filter(r =>
        !(r.year === vehicle.year &&
          r.make === vehicle.make &&
          r.model === vehicle.model &&
          (r.vin || '') === (vehicle.vin || ''))
      ),
    ].slice(0, 10));
  }, [setRecent]);

  // Remove a single recent entry. Matches on YMM + VIN + ts so two lookups
  // of the same vehicle at different times don't both get nuked.
  const deleteRecent = useCallback((entry) => {
    setRecent(prev => prev.filter(r =>
      !(r.year === entry.year &&
        r.make === entry.make &&
        r.model === entry.model &&
        (r.vin || '') === (entry.vin || '') &&
        r.ts === entry.ts)
    ));
  }, [setRecent]);

  return { recent, pushRecent, deleteRecent };
}
