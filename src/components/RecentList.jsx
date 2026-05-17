import { timeAgo } from '../utils/time';

// ── RecentList ───────────────────────────────────────────────────────────────
// Read-only list of the last N vehicle lookups. Tapping a row loads it back
// into the lookup form via `onSelect`.
//
// SESSION 6: handles two entry shapes —
//   1. Full lookup: { year, make, model, result: {...}, ts }
//   2. VIN decode with no DB match: { year, make, model, vin, result: null, ts }
//
// The second shape renders with a "Not in DB" pill (replacing the key blank
// column) and the full VIN as a subtitle so the locksmith can reference
// exactly what they scanned.
export default function RecentList({ recent, onSelect, styles }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelLabel}>
        <span style={styles.labelBar} />Recent Lookups
      </div>
      <div style={styles.savedList}>
        {recent.length === 0
          ? <div style={styles.empty}>No recent lookups yet.</div>
          : recent.map(r => {
              const hasResult = r.result != null;
              const bl = hasResult
                ? (Array.isArray(r.result.keyBlanks)
                    ? r.result.keyBlanks[0]
                    : (r.result.keyBlanks || ''))
                : null;

              return (
                <div
                  key={`${r.year}-${r.make}-${r.model}-${r.vin || ''}`}
                  style={styles.savedItem}
                  onClick={() => onSelect(r)}
                >
                  {/* Left column: vehicle (with optional VIN subtitle) */}
                  <div style={leftColStyle}>
                    <div style={styles.savedVehicle}>
                      {r.year} {r.make} {r.model}
                    </div>
                    {r.vin && (
                      <div style={vinSubtitleStyle} title={r.vin}>
                        VIN: {r.vin}
                      </div>
                    )}
                  </div>

                  {/* Middle column: key blank, or "Not in DB" pill */}
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    {hasResult ? (
                      <div style={{ ...styles.savedBlank, textAlign: 'center' }}>{bl}</div>
                    ) : (
                      <span style={noDataPillStyle}>Not in DB</span>
                    )}
                  </div>

                  {/* Right column: relative time */}
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#787878' }}>
                    {timeAgo(r.ts)}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ── Local styles ───────────────────────────────────────────────────────────
// CSS variables with safe fallbacks so it adapts to both themes.

const leftColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0, // allow text to wrap/truncate within flexbox
};

const vinSubtitleStyle = {
  fontFamily: 'monospace',
  fontSize: 10,
  color: 'var(--text-muted, #888)',
  letterSpacing: 0.5,
  marginTop: 1,
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
};

const noDataPillStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 10,
  background: 'var(--warn-bg, rgba(245, 158, 11, 0.15))',
  color: 'var(--warn-fg, #d97706)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  border: '1px solid var(--warn-border, rgba(245, 158, 11, 0.35))',
};
