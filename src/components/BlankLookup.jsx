import { useState, useMemo } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const MAX_RESULTS = 100;

// ── BlankLookup ──────────────────────────────────────────────────────────────
// Reverse search: type a key blank number, get the vehicles that use it.
// Debounced so a fast-typed blank doesn't re-scan thousands of records per
// keystroke.
export default function BlankLookup({ allDataIndex, allDataLoading, onResultClick, styles }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 150);

  const results = useMemo(() => {
    if (!debouncedQuery.trim() || !allDataIndex) return [];
    const q = debouncedQuery.toUpperCase().trim();
    const matches = [];
    for (const r of allDataIndex.models) {
      for (const blank of (r.keyBlanks || [])) {
        if (blank?.toUpperCase().includes(q)) {
          matches.push({ ...r, blank });
          break;
        }
      }
      if (matches.length >= MAX_RESULTS) break;
    }
    return matches;
  }, [debouncedQuery, allDataIndex]);

  return (
    <div style={styles.panel}>
      <div style={styles.panelLabel}>
        <span style={styles.labelBar} />Reverse Blank Lookup
      </div>

      <div style={{ ...styles.field, marginBottom: 12 }}>
        <div style={styles.fieldLabel}>Key Blank Number</div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={allDataLoading ? 'Loading database…' : 'e.g. HO03-PT, HU92RP, B111-PT'}
          style={styles.inputNum}
          disabled={allDataLoading || !allDataIndex}
          aria-label="Key blank number"
        />
        {allDataLoading && (
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--mute)', marginTop: 6 }}>
            Loading database…
          </div>
        )}
        {allDataIndex && !allDataLoading && (
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--mute)', marginTop: 6 }}>
            Database ready · {allDataIndex.models.length} model-years indexed
          </div>
        )}
      </div>

      <div style={styles.savedList}>
        {!debouncedQuery.trim()
          ? <div style={styles.empty}>Type a blank number to see compatible vehicles.</div>
          : results.length === 0
            ? <div style={styles.empty}>No matches for "{debouncedQuery}"</div>
            : results.map((v, i) => (
                <div
                  key={`${v.blank}-${v.make}-${v.model}-${i}`}
                  style={styles.savedItem}
                  onClick={() => onResultClick(v)}
                >
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={styles.savedVehicle}>{v.yearStart}–{v.yearEnd} {v.make}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--mute)' }}>
                      {v.model}
                    </div>
                  </div>
                  <div style={styles.savedBlank}>{v.blank}</div>
                </div>
              ))}
        {results.length === MAX_RESULTS && (
          <div style={styles.empty}>Showing first {MAX_RESULTS} — refine your search for more.</div>
        )}
      </div>
    </div>
  );
}
