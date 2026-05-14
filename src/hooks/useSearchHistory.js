import { useCallback } from 'react';
import { useLocalStorageState } from './useLocalStorageState';
import { KEYS } from '../utils/storage';

// ── useSearchHistory ─────────────────────────────────────────────────────────
// The 10 most-recent universal-search queries, deduped, persisted.
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorageState(KEYS.searchHistory, []);

  const push = useCallback((query) => {
    const q = query.trim();
    if (!q) return;
    setHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 10));
  }, [setHistory]);

  return { history, push };
}
