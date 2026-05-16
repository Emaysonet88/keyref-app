import { useState, useEffect, useRef } from 'react';

const MODES = [
  { id: 'vehicle', label: '🚗 Vehicle' },
  { id: 'search',  label: '🔍 Search' },
  { id: 'blank',   label: '🔑 Blank' },
];

// ── ModeToggle ───────────────────────────────────────────────────────────────
// Segmented control with an amber pill that slides between the three options.
// The pill's position is measured from each button's offsetLeft/offsetWidth
// (not assumed from index/width math), so it stays accurate across font
// rendering differences and viewport sizes. Recalculates on resize.
export default function ModeToggle({ mode, onChange, styles }) {
  const btnRefs = useRef([]);
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    function recalc() {
      const idx = MODES.findIndex(m => m.id === mode);
      const btn = btnRefs.current[idx];
      if (!btn) return;
      setPill({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
        opacity: 1,
      });
    }
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [mode]);

  return (
    <div style={styles.modeToggle} role="tablist">
      <div style={{ ...styles.modeToggleIndicator, ...pill }} />
      {MODES.map((m, i) => (
        <button
          key={m.id}
          ref={el => { btnRefs.current[i] = el; }}
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
