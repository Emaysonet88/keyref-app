import { useState, useEffect } from 'react';

// ── useDebouncedValue ────────────────────────────────────────────────────────
// Returns `value` only after it stops changing for `delay` ms. Used to throttle
// universal search and reverse-blank lookup so we don't run an O(n) scan over
// thousands of records on every keystroke.
export function useDebouncedValue(value, delay = 150) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
