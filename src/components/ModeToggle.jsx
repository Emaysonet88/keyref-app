import { useState, useEffect, useRef } from 'react';
import { VehicleIcon, SearchIcon, KeyIcon } from './ModeIcons';

const MODES = [
  { id: 'vehicle', label: 'Vehicle', Icon: VehicleIcon },
  { id: 'search',  label: 'Search',  Icon: SearchIcon },
  { id: 'blank',   label: 'Blank',   Icon: KeyIcon },
];

// ── ModeToggle ───────────────────────────────────────────────────────────────
// Segmented control with an amber pill that slides between the three options.
// The pill's position is measured from each button's offsetLeft/offsetWidth
// (not assumed from index/width math), so it stays accurate across font
// rendering differences and viewport sizes. Recalculates on resize.
//
// PREMIUM PASS: emoji replaced with inline SVG icons that inherit currentColor
// so they theme correctly — accent for inactive buttons, near-black for the
// active one over the accent-colored pill.
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
      {MODES.map((m, i) => {
        const active = mode === m.id;
        const { Icon } = m;
        return (
          <button
            key={m.id}
            ref={el => { btnRefs.current[i] = el; }}
            style={{ ...styles.modeBtn(active), ...modeBtnLayout }}
            onClick={() => onChange(m.id)}
            role="tab"
            aria-selected={active}
          >
            <Icon size={15} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Layout overrides so the icon sits inline with the label
const modeBtnLayout = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
};
