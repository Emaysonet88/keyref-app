import { useState, useCallback } from 'react';

// ── useObpData ───────────────────────────────────────────────────────────────
// Lazy-loads the on-board-programming procedure dictionary. The JSON is small,
// but we still defer it because most lookups don't need it.
export function useObpData() {
  const [obpData, setObpData] = useState(null);

  const loadObp = useCallback(async () => {
    if (obpData) return obpData;
    try {
      const r = await fetch('/data/procedures/obp.json');
      if (!r.ok) return null;
      const data = await r.json();
      setObpData(data);
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [obpData]);

  return { obpData, loadObp };
}
