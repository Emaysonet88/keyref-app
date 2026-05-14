import { timeAgo } from '../utils/time';

// ── Footer ───────────────────────────────────────────────────────────────────
// Static disclosure line + the data-cached-ago line (if we've ever built the
// unified search index, that timestamp lives in localStorage).
export default function Footer({ lastSync, styles }) {
  return (
    <div style={styles.footer}>
      KeyRef Pro · Professional Use Only · 2025 Reference Guide
      {lastSync && (
        <div style={{ marginTop: 6, fontSize: 8, opacity: 0.6 }}>
          Data cached: {timeAgo(lastSync)}
        </div>
      )}
    </div>
  );
}
