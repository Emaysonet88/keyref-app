// ── KeyRef Pro — Search utilities + VIN WMI decoder ───────────────────────────
// Universal search and enhanced VIN decoding logic.
// Designed to be data-driven so adding new search categories is easy.

// ── WMI (World Manufacturer Identifier) table ─────────────────────────────────
// First 3 characters of a VIN identify the manufacturer.
// Values must match make names in /public/data/inventory/_index.json
const WMI_MAKE_MAP = {
  // ─ Ford Family ─
  '1FA': 'Ford', '1FB': 'Ford', '1FC': 'Ford', '1FU': 'Ford',
  '1FD': 'Ford Trucks, Vans,suvs', '1FM': 'Ford Trucks, Vans,suvs',
  '1FT': 'Ford Trucks, Vans,suvs', '3FA': 'Ford', '3FE': 'Ford',
  '1L1': 'Lincoln', '1LN': 'Lincoln', '5LM': 'Lincoln', '5LT': 'Lincoln',
  '1ME': 'Mercury', '1MR': 'Mercury', '1ZV': 'Mercury', '4M2': 'Mercury',
  // ─ GM Family ─
  '1G1': 'Chevrolet', '1G2': 'Pontiac', '1G3': 'Oldsmobile',
  '1G4': 'Buick', '1G6': 'Cadillac', '1G8': 'Saturn',
  '1GC': 'Chevrolet Trucks, Vans, Suvs', '1GN': 'Chevrolet Trucks, Vans, Suvs',
  '1GT': 'Gmc', '1GD': 'Gmc', '1GG': 'Pontiac',
  '1GK': 'Gmc', '1GY': 'Cadillac',
  '2CN': 'Chevrolet Trucks, Vans, Suvs', '2G1': 'Chevrolet',
  '2G4': 'Buick', '2GC': 'Chevrolet Trucks, Vans, Suvs',
  '3GN': 'Chevrolet Trucks, Vans, Suvs', '3GT': 'Gmc',
  '3G5': 'Buick', '3GY': 'Cadillac',
  '5GA': 'Buick', '5GZ': 'Saturn',
  // ─ Chrysler Family ─
  '1B3': 'Dodge', '1B4': 'Dodge', '1B7': 'Dodge', '2B3': 'Dodge',
  '1C3': 'Chrysler', '1C4': 'Chrysler', '1C6': 'Chrysler',
  '2C3': 'Chrysler', '2C4': 'Chrysler',
  '1D4': 'Dodge', '1D7': 'Dodge Trucks, Vans,suvs',
  '1J4': 'Jeep', '1J8': 'Jeep',
  // ─ Honda / Acura ─
  '1HG': 'Honda', '2HG': 'Honda', '3HG': 'Honda',
  '5J6': 'Honda', '5J8': 'Honda',
  'JH4': 'Acura', '19U': 'Acura',
  'JHL': 'Honda', 'JHM': 'Honda',
  'SHH': 'Honda', 'SHS': 'Honda',
  // ─ Toyota / Lexus / Scion ─
  '4T1': 'Toyota', '4T3': 'Toyota', '5T': 'Toyota',
  '5TB': 'Toyota Trucks, Vans, Suvs', '5TD': 'Toyota Trucks, Vans, Suvs',
  '5TE': 'Toyota Trucks, Vans, Suvs', '5TF': 'Toyota Trucks, Vans, Suvs',
  'JT2': 'Toyota', 'JT3': 'Toyota Trucks, Vans, Suvs',
  'JT4': 'Toyota Trucks, Vans, Suvs', 'JT5': 'Toyota',
  'JT6': 'Toyota', 'JT8': 'Toyota', 'JTD': 'Toyota',
  'JTE': 'Toyota Trucks, Vans, Suvs', 'JTH': 'Lexus',
  'JTJ': 'Lexus', 'JTL': 'Lexus',
  'JF1': 'Subaru', 'JF2': 'Subaru', '4S3': 'Subaru', '4S4': 'Subaru',
  '1NX': 'Toyota', '4F2': 'Mazda', '4F4': 'Mazda',
  // ─ Nissan / Infiniti ─
  '1N4': 'Nissan', '1N6': 'Nissan Trucks, Vans, Suvs',
  '3N1': 'Nissan', '3N6': 'Nissan',
  '5N1': 'Nissan Trucks, Vans, Suvs', '5N3': 'Infiniti',
  'JN1': 'Nissan', 'JN3': 'Nissan', 'JN6': 'Nissan Trucks, Vans, Suvs',
  'JN8': 'Nissan Trucks, Vans, Suvs', 'JNK': 'Infiniti', 'JNR': 'Infiniti',
  // ─ Hyundai / Kia / Genesis ─
  'KMH': 'Hyundai', 'KM8': 'Hyundai', '5NM': 'Hyundai', '5NP': 'Hyundai',
  'KNA': 'Kia', 'KND': 'Kia', 'KNM': 'Kia',
  '5XY': 'Kia', '5XX': 'Kia', 'KMT': 'Genesis',
  // ─ Mazda ─
  'JM1': 'Mazda', 'JM3': 'Mazda',
  // ─ Mitsubishi ─
  'JA3': 'Mitsubishi', 'JA4': 'Mitsubishi',
  // ─ Volkswagen / Audi / Porsche ─
  '1VW': 'Volkswagen', '3VW': 'Volkswagen', '9BW': 'Volkswagen',
  'WVW': 'Volkswagen', 'WV1': 'Volkswagen', 'WV2': 'Volkswagen',
  'WAU': 'Audi', 'TRU': 'Audi', 'WA1': 'Audi',
  'WP0': 'Porsche', 'WP1': 'Porsche',
  // ─ Mercedes / BMW / Mini ─
  'WDB': 'Mercedes', 'WDC': 'Mercedes', 'WDD': 'Mercedes',
  'WDF': 'Mercedes', '4JG': 'Mercedes', '55S': 'Mercedes',
  'WBA': 'Bmw', 'WBS': 'Bmw', 'WBY': 'Bmw',
  '4US': 'Bmw', '5UX': 'Bmw', '5YM': 'Bmw',
  'WMW': 'Mini',
  // ─ Volvo / Saab / Jaguar / Land Rover ─
  'YV1': 'Volvo', 'YV4': 'Volvo',
  'YS3': 'Saab', 'YS4': 'Saab',
  'SAJ': 'Jaguar', 'SAL': 'Land Rover',
  // ─ Tesla ─
  '5YJ': 'Tesla', '7SA': 'Tesla',
  // ─ Fiat / Ferrari / Maserati / Lamborghini ─
  'ZFA': 'Fiat', 'ZFF': 'Ferrari', 'ZAM': 'Maserati', 'ZHW': 'Lamborghini',
};

// ── VIN year decoder ──────────────────────────────────────────────────────────
const VIN_YEAR_CHARS = 'ABCDEFGHJKLMNPRSTVWXY123456789';

export function decodeVin(vin) {
  if (!vin || typeof vin !== 'string') return null;
  const v = vin.toUpperCase().replace(/\s/g, '');
  if (v.length < 10) return null;

  // ── Year (position 10) ──────────────────────────────────────────────────────
  const yearChar = v[9];
  const idx = VIN_YEAR_CHARS.indexOf(yearChar);
  if (idx === -1) return null;

  let year;
  if (idx >= 21) {
    // Numeric chars 1-9 represent 2001-2009 (one-time use)
    year = 1980 + (idx - 21) + 21;  // → 2001-2009
  } else {
    // Alpha chars A-Y cycle every 30 years: 1980-2009 OR 2010-2039
    const currentYear = new Date().getFullYear();
    const cycle1 = 1980 + idx;
    const cycle2 = 2010 + idx;
    year = cycle2 <= currentYear + 1 ? cycle2 : cycle1;
  }

  // ── Make (positions 1-3) ────────────────────────────────────────────────────
  const wmi3 = v.slice(0, 3);
  const wmi2 = v.slice(0, 2);
  const make = WMI_MAKE_MAP[wmi3] || WMI_MAKE_MAP[wmi2] || null;

  return { year, make, vin: v };
}


// ── Levenshtein distance for fuzzy matching ───────────────────────────────────
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

// ── Build unified search index from all inventory data ────────────────────────
// Returns: { models, chips, obps, codeRanges } — each an array of search records
export function buildSearchIndex(allData) {
  const models = [];
  const chips = {};
  const obps = {};
  const codeRanges = {};

  for (const data of allData) {
    if (!data) continue;
    const makeKey = Object.keys(data)[0];
    if (!makeKey) continue;
    const modelDict = data[makeKey];

    for (const [modelName, entries] of Object.entries(modelDict)) {
      for (const e of entries) {
        const record = {
          make: makeKey,
          model: modelName,
          yearStart: e.yearStart,
          yearEnd: e.yearEnd,
          keyBlanks: e.keyBlanks || [],
          keyType: e.keyType,
          transponderChip: e.transponderChip,
          codeRange: e.codeRange,
          programmingProcedure: e.programmingProcedure,
        };
        models.push(record);

        if (e.transponderChip) {
          const key = e.transponderChip.toUpperCase();
          (chips[key] = chips[key] || []).push(record);
        }
        if (Array.isArray(e.programmingProcedure)) {
          for (const letter of e.programmingProcedure) {
            (obps[letter] = obps[letter] || []).push(record);
          }
        }
        if (e.codeRange) {
          const key = e.codeRange.toUpperCase();
          (codeRanges[key] = codeRanges[key] || []).push(record);
        }
      }
    }
  }

  return { models, chips, obps, codeRanges };
}

// ── Match scoring ─────────────────────────────────────────────────────────────
// Higher = better. Category priors keep model matches above fuzzy, and within
// a category exact > prefix > substring. Year recency is a tiebreaker so newer
// vehicles surface first.
const TYPE_PRIOR = { obp: 60, model: 50, chip: 40, codeRange: 35, fuzzy: 10 };

function scoreMatch(type, haystack, query, yearStart) {
  const base = TYPE_PRIOR[type] || 0;
  let matchScore;
  if (haystack === query)                matchScore = 100;       // exact
  else if (haystack.startsWith(query))   matchScore = 70;        // prefix
  else                                   matchScore = 40;        // substring
  // Length penalty: more-specific haystacks (closer to query length) score higher
  const lenPenalty = Math.min(20, Math.max(0, haystack.length - query.length));
  // Year recency bonus: 0..10 for years 1980..2030+
  const yearBonus = Math.max(0, Math.min(10, ((yearStart || 1980) - 1980) / 5));
  return base * 10 + matchScore - lenPenalty + yearBonus;
}

// ── Universal search across the index ─────────────────────────────────────────
// Collects matches across all categories, scores them, dedupes, sorts by
// relevance, and slices to maxResults. Each result shape:
//   { type, label, sublabel, score, make, model, yearStart, yearEnd }
export function search(index, rawQuery, opts = {}) {
  if (!index || !rawQuery || !rawQuery.trim()) return [];
  const q = rawQuery.trim().toUpperCase();
  const maxResults = opts.maxResults || 50;

  const seen = new Map(); // key → existing result (so we can keep the best score per row)
  const add = (r) => {
    const key = `${r.make}:${r.model}:${r.yearStart}`;
    const prev = seen.get(key);
    if (!prev || r.score > prev.score) seen.set(key, r);
  };

  // ── 1. OBP procedure match (exact letter or "OBP X") ────────────────────────
  const obpMatch = q.match(/^OBP\s*([A-Z])$/) || q.match(/^([A-Z])$/);
  if (obpMatch && index.obps[obpMatch[1]]) {
    for (const r of index.obps[obpMatch[1]]) {
      add({
        type: 'obp',
        score: scoreMatch('obp', obpMatch[1], obpMatch[1], r.yearStart),
        label: `${r.yearStart}–${r.yearEnd} ${r.make} ${r.model}`,
        sublabel: `OBP Procedure ${obpMatch[1]} · ${r.keyBlanks[0] || '—'}`,
        make: r.make, model: r.model, yearStart: r.yearStart, yearEnd: r.yearEnd,
      });
    }
  }

  // ── 2. Chip name match ──────────────────────────────────────────────────────
  for (const [chipName, vehicles] of Object.entries(index.chips)) {
    if (!chipName.includes(q)) continue;
    for (const r of vehicles) {
      add({
        type: 'chip',
        score: scoreMatch('chip', chipName, q, r.yearStart),
        label: `${r.yearStart}–${r.yearEnd} ${r.make} ${r.model}`,
        sublabel: `Chip: ${r.transponderChip}`,
        make: r.make, model: r.model, yearStart: r.yearStart, yearEnd: r.yearEnd,
      });
    }
  }

  // ── 3. Code range match ─────────────────────────────────────────────────────
  for (const [range, vehicles] of Object.entries(index.codeRanges)) {
    if (!range.includes(q)) continue;
    for (const r of vehicles) {
      add({
        type: 'codeRange',
        score: scoreMatch('codeRange', range, q, r.yearStart),
        label: `${r.yearStart}–${r.yearEnd} ${r.make} ${r.model}`,
        sublabel: `Code Range: ${r.codeRange}`,
        make: r.make, model: r.model, yearStart: r.yearStart, yearEnd: r.yearEnd,
      });
    }
  }

  // ── 4. Model / make name match ──────────────────────────────────────────────
  for (const r of index.models) {
    const haystack = `${r.make} ${r.model}`.toUpperCase();
    if (!haystack.includes(q)) continue;
    add({
      type: 'model',
      score: scoreMatch('model', haystack, q, r.yearStart),
      label: `${r.yearStart}–${r.yearEnd} ${r.make} ${r.model}`,
      sublabel: `${r.keyType || 'Key'} · ${r.keyBlanks[0] || '—'}`,
      make: r.make, model: r.model, yearStart: r.yearStart, yearEnd: r.yearEnd,
    });
  }

  // ── 5. Fuzzy fallback — only if nothing else hit and query is non-trivial ──
  if (seen.size === 0 && q.length >= 4) {
    const fuzzy = [];
    for (const r of index.models) {
      const tokens = `${r.make} ${r.model}`.toUpperCase().split(/[^A-Z0-9]+/);
      let bestDist = Infinity;
      for (const t of tokens) {
        if (Math.abs(t.length - q.length) > 2) continue;
        const d = levenshtein(t, q);
        if (d < bestDist) bestDist = d;
      }
      if (bestDist <= 2) fuzzy.push({ dist: bestDist, record: r });
    }
    fuzzy.sort((a, b) => a.dist - b.dist);
    for (const { dist, record: r } of fuzzy.slice(0, 20)) {
      add({
        type: 'fuzzy',
        score: TYPE_PRIOR.fuzzy * 10 + (40 - dist * 15),
        label: `${r.yearStart}–${r.yearEnd} ${r.make} ${r.model}`,
        sublabel: `${r.keyType || 'Key'} · ${r.keyBlanks[0] || '—'} (fuzzy match)`,
        make: r.make, model: r.model, yearStart: r.yearStart, yearEnd: r.yearEnd,
      });
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
