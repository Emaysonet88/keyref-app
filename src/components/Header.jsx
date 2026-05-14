// ── Header ───────────────────────────────────────────────────────────────────
// Logo block + online-status badge + theme toggle. Pure presentational.
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
          {isOnline ? '● Online' : '○ Offline'}
        </div>
        <button
          style={styles.themeToggle}
          onClick={onToggleTheme}
          title="Toggle theme"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
