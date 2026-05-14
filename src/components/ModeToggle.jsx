// ── ModeToggle ───────────────────────────────────────────────────────────────
// Three-button mode switcher. Mode names live here so they're easy to extend
// (e.g. add a "Key Code" mode later by adding one entry).
const MODES = [
  { id: 'vehicle', label: '🚗 Vehicle' },
  { id: 'search',  label: '🔍 Search' },
  { id: 'blank',   label: '🔑 Blank' },
];

export default function ModeToggle({ mode, onChange, styles }) {
  return (
    <div style={styles.modeToggle} role="tablist">
      {MODES.map(m => (
        <button
          key={m.id}
          style={styles.modeBtn(mode === m.id)}
          onClick={() => onChange(m.id)}
          role="tab"
          aria-selected={mode === m.id}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
