import { useState } from 'react';
import ObpProcedure from './ObpProcedure';
import { haptic } from '../utils/haptic';

// ── ResultCard ───────────────────────────────────────────────────────────────
// PREMIUM PASS: visual grouping (Key Info / Programming / Cross-Reference),
// hero treatment for the primary blank, per-field copy buttons on the values
// the locksmith uses most. Staggered reveal animation per row preserved.
//
// Field layout philosophy:
//   - Key Info: the answer to "what key do I need?" — keyBlanks (hero) +
//     transponder chip + code range + cloning method. These are what the
//     locksmith reads off the screen while quoting the customer.
//   - Programming: whether/how to program. Includes the OBP procedure when
//     applicable.
//   - Cross-Reference: extra metadata the locksmith may need to verify or
//     ordering — substitutes, lock apps, card no.
//   - Notes always at the bottom, no border.

// Field configuration. Each field declares which group it belongs to so we
// can iterate once and bucket on the fly. `copyable: true` exposes a small
// COPY button next to the value.
const FIELDS = [
  // — Key Info —
  { key: 'keyType',         label: 'Key Type',         group: 'key', fallback: '—' },
  { key: 'transponderChip', label: 'Transponder Chip', group: 'key', fallback: 'None / Not Required', mutedIfEmpty: true, copyable: true },
  { key: 'codeRange',       label: 'Code Range',       group: 'key', copyable: true },
  { key: 'cloningMethod',   label: 'Cloning Method',   group: 'key' },
  // — Cross-Reference —
  { key: 'substitutes',     label: 'Substitutes',      group: 'ref', copyable: true },
  { key: 'lockApps',        label: 'Lock Apps',        group: 'ref' },
  { key: 'cardNo',          label: 'Card No.',         group: 'ref', copyable: true },
];

const revealStyle = (index) => ({
  animation: `rowReveal 320ms ease ${index * 35}ms both`,
});

export default function ResultCard({ vehicle, result, isSaved, onSave, styles }) {
  const [copied, setCopied] = useState(null); // tracks the most recently copied value

  const blanks = Array.isArray(result.keyBlanks)
    ? result.keyBlanks.filter(Boolean)
    : (result.keyBlanks ? [result.keyBlanks] : []);

  async function copyToClipboard(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      haptic(8);
      setCopied(label);
      setTimeout(() => setCopied(curr => curr === label ? null : curr), 1500);
    } catch (e) { console.error(e); }
  }

  function handleSave() {
    if (isSaved) return;
    haptic(12);
    onSave();
  }

  // Build the rows, bucketed by group
  const groups = {
    key:         { label: 'Key Information', rows: [] },
    programming: { label: 'Programming',     rows: [] },
    ref:         { label: 'Cross-Reference', rows: [] },
    notes:       { label: 'Notes',           rows: [] },
  };

  // ── Hero blank row (Key group) ─────────────────────────────────────────
  if (blanks.length > 0) {
    groups.key.rows.push({
      key: 'blanks',
      label: 'Key Blank(s)',
      content: (
        <div>
          {blanks.map((b, i) => {
            const isOem = b.toUpperCase().includes('OEM');
            const isCopied = copied === `blank-${b}`;
            const cleanLabel = isOem ? b.replace(/^OEM#?\s*/i, '') : b;
            // First blank gets the hero treatment; others use the regular tag
            const isHero = i === 0 && !isOem;
            return (
              <span
                key={b}
                style={{
                  ...(isHero ? styles.heroBlank : styles.tag),
                  ...(isCopied ? { background: 'var(--accent-tint2)' } : {}),
                  fontSize: isOem ? 12 : (isHero ? styles.heroBlank.fontSize : styles.tag.fontSize),
                }}
                onClick={() => copyToClipboard(b, `blank-${b}`)}
                title="Tap to copy"
              >
                {isCopied ? '✓ Copied' : (isOem ? `[OEM] ${cleanLabel}` : cleanLabel)}
              </span>
            );
          })}
        </div>
      ),
    });
  }

  // ── Standard fields, bucketed by group ─────────────────────────────────
  for (const f of FIELDS) {
    const val = result[f.key];
    if (!val && !f.fallback) continue;
    const display = val || f.fallback;
    const valStyle = !val && f.mutedIfEmpty ? styles.dataValMuted : styles.dataVal;
    const copyKey = `${f.key}-${display}`;
    const isCopied = copied === copyKey;
    const showCopy = f.copyable && !!val;

    groups[f.group].rows.push({
      key: f.key,
      label: f.label,
      content: (
        <div style={valStyle}>
          <span style={{ verticalAlign: 'middle' }}>{display}</span>
          {showCopy && (
            <button
              type="button"
              style={{
                ...styles.copyBtn,
                ...(isCopied ? styles.copyBtnSuccess : {}),
              }}
              onClick={(e) => { e.stopPropagation(); copyToClipboard(display, copyKey); }}
              aria-label={`Copy ${f.label}`}
              title={`Copy ${f.label}`}
            >
              {isCopied ? '✓' : 'COPY'}
            </button>
          )}
        </div>
      ),
    });
  }

  // ── Programming group ─────────────────────────────────────────────────
  groups.programming.rows.push({
    key: 'programming',
    label: 'Programming',
    content: (
      <div style={result.programmingRequired ? styles.dataValYes : styles.dataValMuted}>
        {result.programmingRequired ? '⚡ Required' : '✓ Not Required'}
      </div>
    ),
  });

  if (result.programmingRequired && result.programmingMethod) {
    groups.programming.rows.push({
      key: 'programMethod',
      label: 'Method',
      content: (
        <div style={styles.dataVal}>
          <div>{result.programmingMethod}</div>
          <ObpProcedure letters={result.programmingProcedure} styles={styles} />
        </div>
      ),
    });
  }

  // ── Notes group ────────────────────────────────────────────────────────
  if (result.notes) {
    groups.notes.rows.push({
      key: 'notes',
      label: 'Notes',
      content: <div style={styles.notesBox}>{result.notes}</div>,
    });
  }

  // Flatten for sequential reveal-delay assignment across the entire card
  const renderedGroups = [];
  let rowIndex = 0;
  for (const groupKey of ['key', 'programming', 'ref', 'notes']) {
    const g = groups[groupKey];
    if (g.rows.length === 0) continue;
    const rowsWithIndex = g.rows.map((r, localIdx) => ({
      ...r,
      idx: rowIndex++,
      isLast: localIdx === g.rows.length - 1,
    }));
    renderedGroups.push({ key: groupKey, label: g.label, rows: rowsWithIndex });
  }

  return (
    <div style={{ ...styles.resultCard, animation: 'fadeIn 350ms ease' }}>
      <div style={styles.resultHeader}>
        <div>
          <div style={styles.resultVehicle}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </div>
          <div style={metaLineStyle}>
            Source: {result.dataSource || 'Database'}
          </div>
          <div style={{ ...metaLineStyle, marginTop: 2 }}>
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
        {renderedGroups.map((g, gi) => (
          <div
            key={g.key}
            style={{
              ...styles.dataGroup,
              ...(gi > 0 ? { marginTop: 8 } : {}),
            }}
          >
            {/* Group label, unless it's the only group (no need to label a single section) */}
            {renderedGroups.length > 1 && (
              <div style={{ ...styles.dataGroupLabel, ...revealStyle(g.rows[0].idx) }}>
                {g.label}
              </div>
            )}
            {g.rows.map(r => (
              <div key={r.key} style={{ ...styles.dataRow(r.isLast), ...revealStyle(r.idx) }}>
                <div style={styles.dataKey}>{r.label}</div>
                {r.content}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Small style — used twice for the two meta lines below the title
const metaLineStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: 'var(--mute-val)',
  letterSpacing: 1,
  marginTop: 4,
  textTransform: 'uppercase',
};
