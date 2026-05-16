// ── Icon set ─────────────────────────────────────────────────────────────────
// Inline SVG (Lucide-style) for the theme toggle. Rendered at 16x16, color
// follows the button's `color` via currentColor so dark/light themes are
// automatic. Inline SVG is the most reliable way to get perfect centering
// across platforms — Unicode sun/moon glyphs render at different vertical
// baselines depending on the system font.
const SunIcon = () => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// ── Header ───────────────────────────────────────────────────────────────────
// Logo block on the left, status badge + theme toggle absolutely anchored to
// the top-right corner of the header (positioning is set in styles.js so the
// controls never wrap below the logo on narrow screens).
export default function Header({ isOnline, darkMode, onToggleTheme, styles }) {
  return (
    <header style={styles.header}>
      <div>
        <div style={styles.logo}>
          KEY<span style={{ color: 'var(--accent)' }}>REF</span> PRO
        </div>
        <div style={styles.logoSub}>AUTOMOTIVE KEY DATABASE · 2025 REFERENCE</div>
      </div>
      <div style={styles.headerRight}>
        <div style={styles.statusBadge(isOnline)} aria-live="polite">
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <button
          style={styles.themeToggle}
          onClick={onToggleTheme}
          title="Toggle theme"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
