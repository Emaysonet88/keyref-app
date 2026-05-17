// Smart VIN decoder.
// Tries cache first, then NHTSA when online, then local fallback.
// Returns { year, make, model, source } where source is one of:
//   'cache' | 'nhtsa' | 'local'
// Never throws. Returns null only if all three paths fail to produce
// anything usable.

import { decodeVin as decodeVinLocal } from '../search-utils';
import { decodeVinNhtsa } from './nhtsaApi';
import { getCachedDecode, setCachedDecode } from './vinCache';

/**
 * @param {string} vin
 * @returns {Promise<{year:number|null, make:string|null, model:string|null, source:string} | null>}
 */
export async function smartDecodeVin(vin) {
  if (!vin || typeof vin !== 'string') return null;
  const clean = vin.toUpperCase().trim();
  if (clean.length < 10) return null;

  // 1. Cache
  const cached = getCachedDecode(clean);
  if (cached && (cached.year || cached.make)) {
    return { ...cached, source: 'cache' };
  }

  // 2. NHTSA, if online
  const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  if (online) {
    const nhtsa = await decodeVinNhtsa(clean);
    if (nhtsa && (nhtsa.year || nhtsa.make)) {
      setCachedDecode(clean, nhtsa);
      return { ...nhtsa, source: 'nhtsa' };
    }
  }

  // 3. Local fallback (typically year + make only)
  const local = decodeVinLocal(clean);
  if (local && (local.year || local.make)) {
    return {
      year:  local.year  || null,
      make:  local.make  || null,
      model: null,
      source: 'local',
    };
  }

  return null;
}

// ── Matching helpers ────────────────────────────────────────────────────────
//
// Two functions for matching loosely-named values (NHTSA returns "FORD" while
// our inventory has "Ford"; NHTSA returns "Accord" while we have several
// Accord variants).
//
// findCandidates() returns ALL matches at the strongest tier:
//   - tier 1: exact normalized equality
//   - tier 2: starts-with (either direction)
//   - tier 3: contains (either direction)
// Each tier is checked in order; the first tier with any hits is returned in
// full. Empty array = no match anywhere.
//
// fuzzyMatch() is the safe single-match wrapper: returns the candidate if and
// only if there's exactly one. Multiple candidates is treated as ambiguous
// and returns null, so the caller can prompt the user to pick instead of
// guessing wrong.

const normalize = s => String(s).toLowerCase().replace(/[\s\-_/.]/g, '');

/**
 * Return ALL candidate options that match the target, at the strongest tier.
 * @param {string} target
 * @param {string[]} options
 * @returns {string[]} Array of matched options from the original list.
 */
export function findCandidates(target, options) {
  if (!target || !Array.isArray(options) || options.length === 0) return [];
  const t = normalize(target);

  // Tier 1: exact normalized equality
  let hits = options.filter(o => normalize(o) === t);
  if (hits.length > 0) return hits;

  // Tier 2: starts-with (either direction)
  hits = options.filter(o => {
    const n = normalize(o);
    return n.startsWith(t) || t.startsWith(n);
  });
  if (hits.length > 0) return hits;

  // Tier 3: contains (either direction)
  hits = options.filter(o => {
    const n = normalize(o);
    return n.includes(t) || t.includes(n);
  });
  return hits;
}

/**
 * Safe single-match: returns the candidate only if exactly one matches.
 * Returns null when there are zero matches OR multiple matches (ambiguous).
 * @param {string} target
 * @param {string[]} options
 * @returns {string|null}
 */
export function fuzzyMatch(target, options) {
  const candidates = findCandidates(target, options);
  return candidates.length === 1 ? candidates[0] : null;
}
