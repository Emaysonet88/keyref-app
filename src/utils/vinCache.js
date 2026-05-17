// VIN decode cache.
// Stores up to MAX_ENTRIES recent decodes in localStorage keyed by VIN.
// LRU eviction: oldest entry drops when the cap is reached.
// Survives reload. Per-device only (no cross-device sync).

const KEY = 'keyref:vinCache:v1';
const MAX_ENTRIES = 200;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    // quota exceeded or storage disabled — silently drop
  }
}

export function getCachedDecode(vin) {
  if (!vin) return null;
  const all = readAll();
  const entry = all[vin];
  if (!entry) return null;
  // Touch timestamp so it's not first to evict on next write
  entry.ts = Date.now();
  writeAll(all);
  return { year: entry.year, make: entry.make, model: entry.model };
}

export function setCachedDecode(vin, decoded) {
  if (!vin || !decoded) return;
  const all = readAll();
  all[vin] = {
    year:  decoded.year  || null,
    make:  decoded.make  || null,
    model: decoded.model || null,
    ts:    Date.now(),
  };

  // Evict oldest if over cap
  const keys = Object.keys(all);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0));
    const toDrop = sorted.slice(0, keys.length - MAX_ENTRIES);
    toDrop.forEach(k => delete all[k]);
    writeAll(all);
  } else {
    writeAll(all);
  }
}

export function clearVinCache() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
