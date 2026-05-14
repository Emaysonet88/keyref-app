import { timeAgo } from '../utils/time';

// ── SavedList ────────────────────────────────────────────────────────────────
// Persistent saved lookups. Filter input shows once you have 5+ items. Each
// row has an inline note editor (✎) and a delete button (×). The filter
// now also matches against note text.
export default function SavedList({
  saved,
  filtered,
  filter,
  onFilterChange,
  onSelect,
  onDelete,
  editingNoteId,
  editingNoteText,
  onNoteTextChange,
  onStartEditNote,
  onCommitNote,
  styles,
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelLabel}>
        <span style={styles.labelBar} />Saved Lookups
      </div>

      {saved.length >= 5 && (
        <input
          type="text"
          value={filter}
          onChange={e => onFilterChange(e.target.value)}
          placeholder="Search saved lookups (matches notes too)..."
          style={styles.savedSearchInput}
          aria-label="Filter saved lookups"
        />
      )}

      <div style={styles.savedList}>
        {saved.length === 0
          ? <div style={styles.empty}>No saved lookups yet.</div>
          : filtered.map(s => {
              const bl = Array.isArray(s.result.keyBlanks) ? s.result.keyBlanks[0] : (s.result.keyBlanks || '');
              const itemKey = `${s.year}-${s.make}-${s.model}`;

              // Inline note editor
              if (editingNoteId === itemKey) {
                return (
                  <div key={itemKey} style={styles.savedItem}>
                    <input
                      autoFocus
                      type="text"
                      value={editingNoteText}
                      onChange={e => onNoteTextChange(e.target.value)}
                      onBlur={() => onCommitNote(itemKey)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); onCommitNote(itemKey); }
                      }}
                      placeholder="Add a note..."
                      style={styles.savedNoteInput}
                      aria-label="Note for saved entry"
                    />
                  </div>
                );
              }

              return (
                <div key={itemKey} style={styles.savedItem} onClick={() => onSelect(s)}>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={styles.savedVehicle}>{s.year} {s.make} {s.model}</div>
                    {s.note && <div style={styles.savedNoteText}>{s.note}</div>}
                  </div>
                  <div style={{ ...styles.savedBlank, textAlign: 'center' }}>{bl}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#787878' }}>
                    {timeAgo(s.ts)}
                  </div>
                  <button
                    style={styles.btnDel}
                    onClick={e => { e.stopPropagation(); onStartEditNote(s); }}
                    aria-label="Edit note"
                  >
                    ✎
                  </button>
                  <button
                    style={styles.btnDel}
                    onClick={e => { e.stopPropagation(); onDelete(s.year, s.make, s.model); }}
                    aria-label="Delete saved entry"
                  >
                    ×
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
}
