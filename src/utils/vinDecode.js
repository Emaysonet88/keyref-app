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

/**
 * Fuzzy match a target string against a list of options.
 * Used to bridge NHTSA's naming ("FORD", "F-150") to inventory naming
 * ("Ford", "F150"). Case- and punctuation-insensitive.
 *
 * Matching tiers (first hit wins):
 *   1. Exact normalized equality
 *   2. Either string starts with the other (after normalization)
 *   3. Either string contains the other (after normalization)
 *
 * @param {string} target
 * @param {string[]} options
 * @returns {string|null} The matched option from the original list, or null.
 */
export function fuzzyMatch(target, options) {
  if (!target || !Array.isArray(options) || options.length === 0) return null;
  const norm = s => String(s).toLowerCase().replace(/[\s\-_/.]/g, '');
  const t = norm(target);

  let hit = options.find(o => norm(o) === t);
  if (hit) return hit;

  hit = options.find(o => {
    const n = norm(o);
    return n.startsWith(t) || t.startsWith(n);
  });
  if (hit) return hit;

  hit = options.find(o => {
    const n = norm(o);
    return n.includes(t) || t.includes(n);
  });
  return hit || null;
}
