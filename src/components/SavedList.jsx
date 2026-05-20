import { useState, useMemo } from 'react';
import { timeAgo } from '../utils/time';
import SwipeableRow, { detectTouch } from './SwipeableRow';

// ── SavedList ────────────────────────────────────────────────────────────────
// Persistent saved lookups. Filter input shows once you have 5+ items. Each
// row has an inline note editor (pencil) and a delete button (×). The filter
// matches against note text too.
//
// PREMIUM PASS:
//   - Mobile: swipe LEFT to delete (matches Recent UX)
//   - Mobile: tap the row to load, tap the pencil that appears on long-tap
//     or via the persistent visible note text to edit
//   - Desktop: pencil + × icons revealed on hover in the right column
//     (same pattern as RecentList)
//   - Note text stays visible whenever present, regardless of hover state
//
// We intentionally do NOT enable swipe-right to "edit note" — note editing
// requires the keyboard to come up immediately, and a swipe gesture is the
// wrong affordance for that. The pencil icon (hover on desktop, dedicated
// button on mobile) is the right path.
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
  const isTouch = useMemo(() => detectTouch(), []);

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
              const itemKey = `${s.year}-${s.make}-${s.model}`;

              // Inline note editor (keyboard-open) — replaces the row
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
                <SavedRow
                  key={itemKey}
                  entry={s}
                  isTouch={isTouch}
                  onSelect={() => onSelect(s)}
                  onDelete={() => onDelete(s.year, s.make, s.model)}
                  onEditNote={() => onStartEditNote(s)}
                  styles={styles}
                />
              );
            })}
      </div>
    </div>
  );
}

// ── SavedRow ────────────────────────────────────────────────────────────────
// Renders one saved entry. Same visual on both platforms; what differs is the
// interaction surface (swipe vs hover).
function SavedRow({ entry, isTouch, onSelect, onDelete, onEditNote, styles }) {
  if (isTouch) {
    return (
      <SwipeableRow
        canSwipeLeft
        onSwipeLeft={onDelete}
        onTap={onSelect}
        rightZoneContent={<>DELETE 🗑</>}
      >
        <RowContent
          entry={entry}
          styles={styles}
          // On mobile we put the pencil edit button INSIDE the row (right
          // column) so the locksmith can still edit a note without swiping
          rightSlot={(
            <button
              type="button"
              style={iconBtnStyle}
              onClick={(e) => { e.stopPropagation(); onEditNote(); }}
              aria-label="Edit note"
            >
              ✎
            </button>
          )}
        />
      </SwipeableRow>
    );
  }

  return (
    <HoverContainer
      entry={entry}
      onSelect={onSelect}
      onDelete={onDelete}
      onEditNote={onEditNote}
      styles={styles}
    />
  );
}

function RowContent({ entry, rightSlot, styles }) {
  const bl = Array.isArray(entry.result.keyBlanks)
    ? entry.result.keyBlanks[0]
    : (entry.result.keyBlanks || '');

  return (
    <div style={{ ...styles.savedItem, cursor: 'pointer' }}>
      <div style={leftColStyle}>
        <div style={styles.savedVehicle}>
          {entry.year} {entry.make} {entry.model}
        </div>
        {entry.note && <div style={styles.savedNoteText}>{entry.note}</div>}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ ...styles.savedBlank, textAlign: 'right' }}>{bl}</div>
      </div>

      <div style={rightColStyle}>
        {rightSlot != null
          ? rightSlot
          : <span style={timeStyle}>{timeAgo(entry.ts)}</span>}
      </div>
    </div>
  );
}

function HoverContainer({ entry, onSelect, onDelete, onEditNote, styles }) {
  const [hover, setHover] = useState(false);

  const rightSlot = hover ? (
    <div style={inlineActionsStyle}>
      <button
        type="button"
        style={iconBtnStyle}
        onClick={(e) => { e.stopPropagation(); onEditNote(); }}
        title="Edit note"
        aria-label="Edit note"
      >
        ✎
      </button>
      <button
        type="button"
        style={{ ...iconBtnStyle, color: 'var(--bad, #d94f4f)' }}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete saved entry"
        aria-label="Delete saved entry"
      >
        ×
      </button>
    </div>
  ) : null;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
    >
      <RowContent entry={entry} rightSlot={rightSlot} styles={styles} />
    </div>
  );
}

const leftColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: 1,
  minWidth: 100,
};

const rightColStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  minWidth: 60,
  flexShrink: 0,
};

const timeStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  color: '#787878',
};

const inlineActionsStyle = {
  display: 'flex',
  gap: 2,
  alignItems: 'center',
};

const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  padding: '4px 6px',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  color: 'var(--mute)',
  WebkitTapHighlightColor: 'transparent',
  minWidth: 22,
  textAlign: 'center',
  borderRadius: 3,
};
