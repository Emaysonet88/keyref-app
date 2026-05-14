import { useState, useCallback, useEffect } from 'react';
import { buildSearchIndex } from '../search-utils';
import { store, KEYS } from '../utils/storage';

// ── useUnifiedSearchIndex ────────────────────────────────────────────────────
// Lazy-loads every per-make JSON in parallel and builds the unified search
// index. Triggered when the user opens the Search or Blank mode. Subsequent
// switches reuse the same in-memory index, so the cost is paid once per
// session. Last-sync timestamp is persisted for the footer.
export function useUnifiedSearchIndex(makesIndex, enabled) {
  const [allDataIndex,   setAllDataIndex]   = useState(null);
  const [allDataLoading, setAllDataLoading] = useState(false);
  const [lastSync,       setLastSync]       = useState(() => store.get(KEYS.lastSync, null));

  const ensureAllData = useCallback(async () => {
    if (allDataIndex || allDataLoading || !makesIndex) return allDataIndex;
    setAllDataLoading(true);
    try {
      const files = Object.values(makesIndex).map(v => v.file);
      const responses = await Promise.all(
        files.map(f => fetch(`/data/inventory/${f}`).then(r => r.json()).catch(() => null))
      );
      const idx = buildSearchIndex(responses);
      setAllDataIndex(idx);
      const now = Date.now();
      store.set(KEYS.lastSync, now);
      setLastSync(now);
      return idx;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setAllDataLoading(false);
    }
  }, [allDataIndex, allDataLoading, makesIndex]);

  useEffect(() => {
    if (enabled && !allDataIndex && !allDataLoading) ensureAllData();
  }, [enabled, allDataIndex, allDataLoading, ensureAllData]);

  return { allDataIndex, allDataLoading, lastSync };
}
