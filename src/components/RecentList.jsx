import { timeAgo } from '../utils/time';

// ── RecentList ───────────────────────────────────────────────────────────────
// Read-only list of the last 10 vehicle lookups. Tapping a row loads it back
// into the lookup form via `onSelect`.
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
              const bl = Array.isArray(r.result.keyBlanks) ? r.result.keyBlanks[0] : (r.result.keyBlanks || '');
              return (
                <div
                  key={`${r.year}-${r.make}-${r.model}`}
                  style={styles.savedItem}
                  onClick={() => onSelect(r)}
                >
                  <div style={styles.savedVehicle}>{r.year} {r.make} {r.model}</div>
                  <div style={{ ...styles.savedBlank, flex: 1, textAlign: 'center' }}>{bl}</div>
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
