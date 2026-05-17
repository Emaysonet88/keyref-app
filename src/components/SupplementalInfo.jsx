import { useEffect, useState } from 'react';

// ── SupplementalInfo ────────────────────────────────────────────────────────
// Make-specific extra info panel shown below the standard Ilco ResultCard.
// Currently surfaces BMW chassis codes + immobilizer types (PDF data lives at
// public/data/supplemental/bmw.json).
//
// Self-contained: loads its own data, renders nothing when there's no match,
// safe to mount unconditionally. Styled to match KeyRef Pro's design system:
// monospace, sharp corners, CSS-variable tokens via the shared style factory.
//
// Extending to more makes:
//   1. Drop a JSON file at public/data/supplemental/<make>.json with the
//      same shape as bmw.json
//   2. Add the make's uppercase string to SUPPORTED_MAKES below
//   3. (Optional) tweak normalizeModel() if the make uses different naming

const SUPPORTED_MAKES = ['BMW'];

// In-memory cache so we don't re-fetch on every render
const dataCache = new Map();

// Normalize a model name for matching. Strips common prefixes and ignores
// case / whitespace / punctuation.
function normalizeModel(modelName) {
  if (!modelName) return '';
  return String(modelName)
    .toUpperCase()
    .replace(/^BMW\s+/i, '')          // "BMW 3 SERIES" → "3 SERIES"
    .replace(/\s+W\/.*$/i, '')         // strip "W/ PROX" / "W/ REGULAR IGNITION"
    .replace(/[\s\-_/.]/g, '')         // remove whitespace / punctuation
    .trim();
}

export default function SupplementalInfo({ vehicle, styles }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const make  = vehicle?.make;
  const model = vehicle?.model;
  const year  = vehicle?.year;

  useEffect(() => {
    if (!make) { setData(null); return; }

    const upperMake = make.toUpperCase();
    if (!SUPPORTED_MAKES.includes(upperMake)) {
      setData(null);
      return;
    }

    if (dataCache.has(upperMake)) {
      setData(dataCache.get(upperMake));
      return;
    }

    let cancelled = false;
    setLoading(true);

    const file = upperMake.toLowerCase() + '.json';
    fetch(`${import.meta.env.BASE_URL || '/'}data/supplemental/${file}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled) return;
        dataCache.set(upperMake, json);
        setData(json);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [make]);

  if (!vehicle || !make || !data || loading) return null;

  const entries = findMatches(data, model, year);
  if (entries.length === 0) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.panelLabel}>
        <span style={styles.labelBar} />
        {make.toUpperCase()} CHASSIS &amp; IMMO
      </div>

      <div style={styles.savedList}>
        {entries.map((entry, i) => (
          <div
            key={`${entry.chassis}-${entry.bodyStyle || ''}-${i}`}
            style={{ ...styles.savedItem, cursor: 'default' }}
          >
            <div style={leftColStyle}>
              <span style={chassisCodeStyle}>{entry.chassis}</span>
              {entry.bodyStyle && (
                <span style={metaTextStyle}>· {entry.bodyStyle}</span>
              )}
              <span style={metaTextStyle}>· {formatYearRange(entry)}</span>
            </div>

            {entry.immobilizer ? (
              <span style={{ ...styles.tag, cursor: 'default' }}>
                {entry.immobilizer}
              </span>
            ) : (
              <span style={preCasNoteStyle}>PRE-IMMO</span>
            )}
          </div>
        ))}
      </div>

      <div style={hintStyle}>
        IMMO type determines keying cost &amp; equipment
      </div>
    </div>
  );
}

// ── Matching logic ─────────────────────────────────────────────────────────

function findMatches(data, model, year) {
  if (!data) return [];
  const yearNum = parseInt(year, 10);
  const target  = normalizeModel(model);
  if (!target) return [];

  const pools = [];
  if (data.models) pools.push(data.models);
  if (data.mini?.models) pools.push(data.mini.models);

  for (const pool of pools) {
    for (const [poolModel, entries] of Object.entries(pool)) {
      const poolNorm = normalizeModel(poolModel);
      if (poolNorm === target || poolNorm.includes(target) || target.includes(poolNorm)) {
        return entries.filter(e => matchesYear(e, yearNum));
      }
    }
  }
  return [];
}

function matchesYear(entry, year) {
  if (!year || isNaN(year)) return true;
  const start = entry.yearStart;
  const end   = entry.yearEnd || new Date().getFullYear() + 1;
  return year >= start && year <= end;
}

function formatYearRange(entry) {
  const start = entry.yearStart;
  const end   = entry.yearEnd;
  if (!end) return `${start}–PRESENT`;
  if (start === end) return `${start}`;
  return `${start}–${end}`;
}

// ── Inline styles ──────────────────────────────────────────────────────────
// Only the bits not covered by the shared style factory. Everything else
// (panel, panelLabel, labelBar, savedItem, savedList, tag) comes from styles
// so the panel matches the rest of the app.

const leftColStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  flex: 1,
  minWidth: 0,
  flexWrap: 'wrap',
};

const chassisCodeStyle = {
  fontFamily: 'monospace',
  fontSize: 13,
  color: 'var(--accent)',
  fontWeight: 600,
  letterSpacing: 0.5,
};

const metaTextStyle = {
  fontFamily: 'monospace',
  fontSize: 11,
  color: 'var(--mute)',
};

const preCasNoteStyle = {
  fontFamily: 'monospace',
  fontSize: 10,
  color: 'var(--mute-val)',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const hintStyle = {
  fontFamily: 'monospace',
  fontSize: 9,
  color: 'var(--mute-val)',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginTop: 14,
  paddingTop: 10,
  borderTop: '1px solid var(--border)',
  textAlign: 'center',
};
