import { useState } from 'react';
import { useObpData } from '../hooks/useObpData';

const STEP_LABELS = {
  steps_originate: 'Originate New Key',
  steps_add:       'Add Additional Key',
  steps_rke:       'Program Remote (RKE)',
  steps:           'Procedure',
};

// ── ObpProcedure ─────────────────────────────────────────────────────────────
// Renders the bank of "View OBP X Steps" buttons for a result, plus the
// expanded step list for whichever letter is currently active. The OBP JSON
// is fetched on first toggle, not at render time. The expanded panel uses a
// brief slideDown animation on mount so opening feels deliberate instead of
// snapping.
export default function ObpProcedure({ letters, styles }) {
  const [expanded, setExpanded] = useState(null);
  const { obpData, loadObp } = useObpData();

  async function toggle(letter) {
    if (expanded === letter) { setExpanded(null); return; }
    setExpanded(letter);
    await loadObp();
  }

  if (!letters?.length) return null;

  const active = expanded && obpData?.[expanded];

  return (
    <>
      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {letters.map(letter => (
          <button key={letter} style={styles.obpToggle} onClick={() => toggle(letter)}>
            {expanded === letter ? '▼' : '▶'} View OBP {letter} Steps
          </button>
        ))}
      </div>

      {active && (
        <div
          key={expanded /* remount when switching letters → animation re-runs */}
          style={{ ...styles.obpPanel, animation: 'slideDown 260ms ease' }}
        >
          <div style={styles.obpTitle}>{active.title || `Procedure ${expanded}`}</div>

          {active.vehicles && (
            <div style={{ color: 'var(--mute)', marginBottom: 6 }}>
              Applies to: {active.vehicles}
            </div>
          )}
          {active.requirement && (
            <div style={{ color: 'var(--accent)', marginBottom: 6 }}>
              ⚠ {active.requirement}
            </div>
          )}
          {active.notes && (
            <div style={{ marginBottom: 8, fontStyle: 'italic' }}>{active.notes}</div>
          )}

          {['steps', 'steps_originate', 'steps_add', 'steps_rke'].map(stepKey => {
            const steps = active[stepKey];
            if (!steps?.length) return null;
            return (
              <div key={stepKey} style={{ marginTop: 10 }}>
                <div style={{
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  fontSize: 10,
                  letterSpacing: 1,
                  marginBottom: 6,
                }}>
                  {STEP_LABELS[stepKey]}
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
