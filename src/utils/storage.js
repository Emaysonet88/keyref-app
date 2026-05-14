// ── Local storage helpers ────────────────────────────────────────────────────
// Safe JSON wrapper around localStorage. Returns the default if the key is
// missing, the value isn't valid JSON, or storage is unavailable (private mode).
export const store = {
  get(key, def = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(def));
    } catch {
      return def;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      /* quota exceeded or private-mode — silently ignore */
    }
  },
};

// Storage keys, centralized so we never typo them.
export const KEYS = {
  saved:         'keyref_saved',
  recent:        'keyref_recent',
  theme:         'keyref_theme',
  lastSync:      'keyref_last_sync',
  searchHistory: 'keyref_search_history',
};
