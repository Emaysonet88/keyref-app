import { useState, useEffect, useRef, useMemo } from 'react';
import { search as runSearch } from '../search-utils';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SkeletonList } from './SkeletonLoader';

// ── UniversalSearch ──────────────────────────────────────────────────────────
// Free-text search across models, chips, OBP letters, and code ranges. Query
// is debounced (150 ms) so we don't re-scan ~5k records on every keystroke.
// While the initial index is building, we render a skeleton list so the panel
// has visible structure instead of a blank spinner-of-text.
export default function UniversalSearch({
  allDataIndex, allDataLoading, searchHistory, onPushHistory, onResultClick, styles,
}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 150);
  const inputRef = useRef(null);

  // Run search whenever debounced query or index changes.
  const results = useMemo(() => {
    if (!debouncedQuery.trim() || !allDataIndex) return [];
    return runSearch(allDataIndex, debouncedQuery, { maxResults: 50 });
  }, [debouncedQuery, allDataIndex]);

  // Esc clears the field.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    function onKey(e) {
      if (e.key === 'Escape' && e.target === el) {
        setQuery('');
        el.blur();
      }
    }
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

  function handlePick(r) {
    onPushHistory(query);
    onResultClick(r);
    setQuery('');
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelLabel}>
        <span style={styles.labelBar} />Universal Search
        <span style={styles.panelLabelHint}>press / to focus</span>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={allDataLoading
          ? 'Building search index…'
          : 'Search models, chips (Megamos), OBP letters, code ranges…'}
        style={styles.searchInput}
        disabled={allDataLoading || !allDataIndex}
        autoFocus
        aria-label="Universal search query"
      />

      {allDataLoading && (
        <div style={{ marginBottom: 12 }}>
          <SkeletonList count={6} />
        </div>
      )}

      {searchHistory.length > 0 && !query && !allDataLoading && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: 'monospace', fontSize: 9, color: 'var(--mute)',
            letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase',
          }}>
            Recent searches
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {searchHistory.map(h => (
              <button key={h} style={styles.historyPill} onClick={() => setQuery(h)}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {debouncedQuery && !allDataLoading && (
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--mute)', marginBottom: 8 }}>
          {results.length === 0
            ? `No matches for "${debouncedQuery}"`
            : `${results.length} result${results.length === 1 ? '' : 's'}`}
        </div>
      )}

      <div style={styles.savedList}>
        {results.map((r, i) => (
          <div
            key={`${r.type}-${r.make}-${r.model}-${r.yearStart}-${i}`}
            style={{
              ...styles.savedItem,
              animation: `rowReveal 280ms ease ${Math.min(i, 8) * 25}ms both`,
            }}
            onClick={() => handlePick(r)}
          >
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={styles.typeBadge(r.type)}>{r.type}</span>
                <span style={styles.savedVehicle}>{r.label}</span>
              </div>
              <div style={styles.savedNoteText}>{r.sublabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
