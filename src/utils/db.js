// ── Database query helpers ───────────────────────────────────────────────────
// The Ilco inventory JSON is shaped as:
//   { "Make": { "MODEL NAME": [{ yearStart, yearEnd, ... }, ...] } }
// Each model has one or more year-range buckets — we pick the bucket that
// contains the searched year.

export function searchDatabase(year, model, currentMakeData) {
  if (!model || !currentMakeData) return null;
  const outerKey = Object.keys(currentMakeData)[0];
  const entries  = currentMakeData[outerKey]?.[model];
  if (!entries) return null;

  const match = entries.find(e => year >= e.yearStart && year <= e.yearEnd);
  if (!match) return null;

  return { ...match, dataSource: '2025 Ilco Reference Guide' };
}

export function getAvailableYears(model, currentMakeData) {
  if (!model || !currentMakeData) return [];
  const outerKey = Object.keys(currentMakeData)[0];
  const entries  = currentMakeData[outerKey]?.[model] || [];
  return entries.map(e => `${e.yearStart}–${e.yearEnd}`);
}

// ── Year bounds ─────────────────────────────────────────────────────────────
// Used by both validation and the input's max attribute. Computed dynamically
// so the app doesn't go stale when the calendar flips over to a new year.
export const MIN_YEAR = 1980;
export const MAX_YEAR = new Date().getFullYear() + 1;
