import { useState, useEffect } from 'react';

// ── useInventoryData ─────────────────────────────────────────────────────────
// Loads the makes index up-front, then per-make JSON on demand whenever the
// selected make changes. Returns:
//   { makesIndex, makes, models, currentMakeData, error }
// where `error` is the first user-facing message either step produced.
export function useInventoryData(make) {
  const [makesIndex,      setMakesIndex]      = useState(null);
  const [makes,           setMakes]           = useState([]);
  const [models,          setModels]          = useState([]);
  const [currentMakeData, setCurrentMakeData] = useState(null);
  const [error,           setError]           = useState('');

  // 1. Load the index once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/data/inventory/_index.json');
        if (!r.ok) throw new Error('Failed to load makes index');
        const index = await r.json();
        if (cancelled) return;
        setMakesIndex(index);
        setMakes(Object.keys(index).sort());
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError('Failed to load makes data. Please refresh.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2. Load models for the active make.
  useEffect(() => {
    if (!make || !makesIndex) {
      setModels([]); setCurrentMakeData(null); setError('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const filename = makesIndex[make]?.file || `${make.toLowerCase()}.json`;
        const r = await fetch(`/data/inventory/${filename}`);
        if (!r.ok) throw new Error(r.status === 404 ? `No data available for ${make} yet.` : `HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        const outerKey = Object.keys(data)[0];
        setModels(Object.keys(data[outerKey]).sort());
        setCurrentMakeData(data);
        setError('');
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setModels([]); setCurrentMakeData(null);
        setError(e.message || `No data available for ${make}.`);
      }
    })();
    return () => { cancelled = true; };
  }, [make, makesIndex]);

  return { makesIndex, makes, models, currentMakeData, error };
}
