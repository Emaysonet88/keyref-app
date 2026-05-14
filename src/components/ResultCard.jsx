import { useState } from 'react';
import ObpProcedure from './ObpProcedure';

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

// ── ResultCard ───────────────────────────────────────────────────────────────
// The single-result detail card. Self-contained: owns its copy-state, handles
// blank tap-to-copy, defers OBP rendering to <ObpProcedure>.
export default function ResultCard({ vehicle, result, isSaved, onSave, styles }) {
  const [copiedBlank, setCopiedBlank] = useState(null);

  const blanks = Array.isArray(result.keyBlanks)
    ? result.keyBlanks.filter(Boolean)
    : (result.keyBlanks ? [result.keyBlanks] : []);

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlank(text);
      setTimeout(() => setCopiedBlank(null), 1500);
    } catch (e) { console.error(e); }
  }

  return (
    <div style={styles.resultCard}>
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
          onClick={onSave}
          aria-label={isSaved ? 'Already saved' : 'Save this result'}
        >
          {isSaved ? '✓ SAVED' : '+ SAVE'}
        </button>
      </div>

      <div style={styles.resultBody}>
        {/* Key blanks — tap to copy */}
        {blanks.length > 0 && (
          <div style={styles.dataRow(false)}>
            <div style={styles.dataKey}>Key Blank(s)</div>
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
          </div>
        )}

        {/* Data-driven fields */}
        {RESULT_FIELDS.map(f => {
          const val = result[f.key];
          if (!val && !f.fallback) return null;
          const display = val || f.fallback;
          const valStyle = !val && f.mutedIfEmpty ? styles.dataValMuted : styles.dataVal;
          return (
            <div key={f.key} style={styles.dataRow(false)}>
              <div style={styles.dataKey}>{f.label}</div>
              <div style={valStyle}>{display}</div>
            </div>
          );
        })}

        {/* Programming */}
        <div style={styles.dataRow(false)}>
          <div style={styles.dataKey}>Programming</div>
          <div style={result.programmingRequired ? styles.dataValYes : styles.dataValMuted}>
            {result.programmingRequired ? '⚡ Required' : '✓ Not Required'}
          </div>
        </div>

        {result.programmingRequired && result.programmingMethod && (
          <div style={styles.dataRow(false)}>
            <div style={styles.dataKey}>Program Method</div>
            <div style={styles.dataVal}>
              <div>{result.programmingMethod}</div>
              <ObpProcedure
                letters={result.programmingProcedure}
                styles={styles}
              />
            </div>
          </div>
        )}

        {result.notes && (
          <div style={styles.dataRow(true)}>
            <div style={styles.dataKey}>Notes</div>
            <div style={styles.notesBox}>{result.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
