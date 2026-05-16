import { useState } from 'react';
import ObpProcedure from './ObpProcedure';
import { haptic } from '../utils/haptic';

// ── Field configuration ──────────────────────────────────────────────────────
// Driven by data so adding a new row is one line. `mutedIfEmpty` styles the
// value muted when there's nothing to show but a fallback exists.
const RESULT_FIELDS = [
  { key: 'keyType',         label: 'Key Type',         fallback: '—' },
  { key: 'transponderChip', label: 'Transponder Chip', fallback: 'None / Not Required', mutedIfEmpty: true },
  { key: 'codeRange',       label: 'Code Range' },
  { key: 'cloningMethod',   label: 'Cloning Method' },
  { key: 'substitutes',     label: 'Substitutes' },
  { key: 'lockApps',        label: 'Lock Apps' },
  { key: 'cardNo',          label: 'Card No.' },
];

// Per-row reveal animation. Rows mount with opacity 0 and slide up; a small
// per-row delay creates a "scrolling-down" effect when a result appears.
// `both` fill mode keeps the start state before the delay elapses.
const revealStyle = (index) => ({
  animation: `rowReveal 320ms ease ${index * 35}ms both`,
});

// ── ResultCard ───────────────────────────────────────────────────────────────
// Self-contained result detail card. Manages its own copy-feedback state,
// triggers haptic taps on save and blank-copy, defers OBP rendering to
// <ObpProcedure>. Parent passes a `key` based on the vehicle so a new lookup
// remounts the card and re-runs the staggered reveal.
export default function ResultCard({ vehicle, result, isSaved, onSave, styles }) {
  const [copiedBlank, setCopiedBlank] = useState(null);

  const blanks = Array.isArray(result.keyBlanks)
    ? result.keyBlanks.filter(Boolean)
    : (result.keyBlanks ? [result.keyBlanks] : []);

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      haptic(8); // brief tap acknowledges the copy
      setCopiedBlank(text);
      setTimeout(() => setCopiedBlank(null), 1500);
    } catch (e) { console.error(e); }
  }

  function handleSave() {
    if (isSaved) return;
    haptic(12); // slightly longer for a meaningful action
    onSave();
  }

  // Build the row list as data so we can assign sequential reveal delays.
  const rows = [];
  if (blanks.length > 0) {
    rows.push({
      key: 'blanks',
      label: 'Key Blank(s)',
      content: (
        <div style={styles.dataValHi}>
          {blanks.map(b => {
            const isOem = b.toUpperCase().includes('OEM');
            const isCopied = copiedBlank === b;
            return (
              <span
                key={b}
                style={{
                  ...styles.tag,
                  background: isCopied ? 'var(--accent-tint2)' : styles.tag.background,
                  fontSize: isOem ? 11 : 12,
                }}
                onClick={() => copyToClipboard(b)}
                title="Tap to copy"
              >
                {isCopied ? '✓ Copied' : (isOem ? `[OEM] ${b.replace(/^OEM#?\s*/i, '')}` : b)}
              </span>
            );
          })}
        </div>
      ),
    });
  }

  for (const f of RESULT_FIELDS) {
    const val = result[f.key];
    if (!val && !f.fallback) continue;
    const display = val || f.fallback;
    const valStyle = !val && f.mutedIfEmpty ? styles.dataValMuted : styles.dataVal;
    rows.push({
      key: f.key,
      label: f.label,
      content: <div style={valStyle}>{display}</div>,
    });
  }

  rows.push({
    key: 'programming',
    label: 'Programming',
    content: (
      <div style={result.programmingRequired ? styles.dataValYes : styles.dataValMuted}>
        {result.programmingRequired ? '⚡ Required' : '✓ Not Required'}
      </div>
    ),
  });

  if (result.programmingRequired && result.programmingMethod) {
    rows.push({
      key: 'programMethod',
      label: 'Program Method',
      content: (
        <div style={styles.dataVal}>
          <div>{result.programmingMethod}</div>
          <ObpProcedure letters={result.programmingProcedure} styles={styles} />
        </div>
      ),
    });
  }

  if (result.notes) {
    rows.push({
      key: 'notes',
      label: 'Notes',
      content: <div style={styles.notesBox}>{result.notes}</div>,
      isLast: true,
    });
  } else {
    // Mark the last actually-rendered row so its bottom border is omitted.
    if (rows.length) rows[rows.length - 1].isLast = true;
  }

  return (
    <div style={{ ...styles.resultCard, animation: 'fadeIn 350ms ease' }}>
      <div style={styles.resultHeader}>
        <div>
          <div style={styles.resultVehicle}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#787878', marginTop: 4 }}>
            Source: {result.dataSource || 'Database'}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#787878', marginTop: 2 }}>
            Matched range: {result.yearStart}–{result.yearEnd}
          </div>
        </div>
        <button
          style={styles.btnSave(isSaved)}
          onClick={handleSave}
          aria-label={isSaved ? 'Already saved' : 'Save this result'}
        >
          {isSaved ? '✓ SAVED' : '+ SAVE'}
        </button>
      </div>

      <div style={styles.resultBody}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ ...styles.dataRow(!!r.isLast), ...revealStyle(i) }}>
            <div style={styles.dataKey}>{r.label}</div>
            {r.content}
          </div>
        ))}
      </div>
    </div>
  );
}
