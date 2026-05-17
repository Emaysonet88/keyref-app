// NHTSA vPIC API wrapper
// Free public API, no key required.
// https://vpic.nhtsa.dot.gov/api/
//
// Returns null on any failure (offline, timeout, CORS, bad VIN) so callers
// can fall back to a local decoder without branching on error types.

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const TIMEOUT_MS = 4000;

/**
 * Decode a VIN via NHTSA's vPIC API.
 * @param {string} vin - 11-17 character VIN.
 * @returns {Promise<{year: number|null, make: string|null, model: string|null} | null>}
 */
export async function decodeVinNhtsa(vin) {
  if (!vin || typeof vin !== 'string' || vin.length < 11) return null;

  const cleanVin = vin.toUpperCase().trim();
  const url = `${NHTSA_BASE}/${encodeURIComponent(cleanVin)}?format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const r = data?.Results?.[0];
    if (!r) return null;

    const make    = (r.Make    || '').trim();
    const model   = (r.Model   || '').trim();
    const yearStr = (r.ModelYear || '').trim();
    const year    = parseInt(yearStr, 10);

    // Bail only if we got literally nothing useful. Partial decodes
    // (e.g. year + make but no model) are still valuable.
    if (!make && isNaN(year)) return null;

    return {
      year:  isNaN(year) ? null : year,
      make:  make  || null,
      model: model || null,
    };
  } catch {
    // network error, timeout, abort, CORS, malformed JSON — all return null
    return null;
  } finally {
    clearTimeout(timer);
  }
}
