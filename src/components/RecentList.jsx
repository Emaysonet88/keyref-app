import { useState, useMemo } from 'react';
import { timeAgo } from '../utils/time';
import SwipeableRow, { detectTouch } from './SwipeableRow';

// ── RecentList ───────────────────────────────────────────────────────────────
// Read-only list of the last N vehicle lookups. Tapping/clicking a row loads
// it back into the lookup form via `onSelect`.
//
// Mobile: swipe LEFT to delete, swipe RIGHT to save (when result data exists).
// Desktop: hover to reveal trash + bookmark icons in the right column.
// Touch detection via detectTouch() in SwipeableRow.
//
// Entry shapes handled:
//   1. Full lookup:   { year, make, model, result: {...}, ts }
//   2. VIN-only:      { year, make, model, vin, result: null, ts }
export default function RecentList({ recent, onSelect, onDelete, onSave, isSaved, styles }) {
  const isTouch = useMemo(() => detectTouch(), []);

  return (
    <div style={styles.panel}>
      <div style={styles.panelLabel}>
        <span style={styles.labelBar} />Recent Lookups
      </div>

      <div style={styles.savedList}>
        {recent.length === 0
          ? <div style={styles.empty}>No recent lookups yet.</div>
          : recent.map(r => (
              <RecentRow
                key={`${r.year}-${r.make}-${r.model}-${r.vin || ''}-${r.ts}`}
                entry={r}
                onSelect={() => onSelect(r)}
                onDelete={onDelete ? () => onDelete(r) : null}
                onSave={onSave ? () => onSave(r) : null}
                isSaved={isSaved ? isSaved(r) : false}
                isTouch={isTouch}
                styles={styles}
              />
            ))}
      </div>
    </div>
  );
}

function RecentRow({ entry, onSelect, onDelete, onSave, isSaved, isTouch, styles }) {
  const hasResult = entry.result != null;
  const canSave   = hasResult && !isSaved && !!onSave;
  const canDelete = !!onDelete;

  if (isTouch) {
    return (
      <SwipeableRow
        canSwipeLeft={canDelete}
        canSwipeRight={canSave}
        onSwipeLeft={onDelete}
        onSwipeRight={onSave}
        onTap={onSelect}
        leftZoneContent={<>★ SAVE</>}
        rightZoneContent={<>DELETE 🗑</>}
      >
        <RowContent entry={entry} hasResult={hasResult} styles={styles} />
      </SwipeableRow>
    );
  }

  return (
    <HoverContainer
      entry={entry}
      hasResult={hasResult}
      onSelect={onSelect}
      onDelete={canDelete ? onDelete : null}
      onSave={canSave ? onSave : null}
      isSaved={isSaved}
      styles={styles}
    />
  );
}

function RowContent({ entry, hasResult, rightSlot, styles }) {
  const bl = hasResult
    ? (Array.isArray(entry.result.keyBlanks)
        ? entry.result.keyBlanks[0]
        : (entry.result.keyBlanks || ''))
    : null;

  return (
    <div style={{ ...styles.savedItem, cursor: 'pointer' }}>
      <div style={leftColStyle}>
        <div style={styles.savedVehicle}>
          {entry.year} {entry.make} {entry.model}
        </div>
        {entry.vin && (
          <div style={vinSubtitleStyle} title={entry.vin}>
            VIN: {entry.vin}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {hasResult ? (
          <div style={{ ...styles.savedBlank, textAlign: 'right' }}>{bl}</div>
        ) : (
          <span style={noDataPillStyle}>Not in DB</span>
        )}
      </div>

      <div style={rightColStyle}>
        {rightSlot != null
          ? rightSlot
          : <span style={timeStyle}>{timeAgo(entry.ts)}</span>}
      </div>
    </div>
  );
}

function HoverContainer({ entry, hasResult, onSelect, onDelete, onSave, isSaved, styles }) {
  const [hover, setHover] = useState(false);

  let rightSlot = null;
  if (hover && (onSave || onDelete)) {
    rightSlot = (
      <div style={inlineActionsStyle}>
        {onSave && (
          <button
            type="button"
            style={iconBtnStyle}
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            title="Save lookup"
            aria-label="Save lookup"
          >
            ☆
          </button>
        )}
        {isSaved && (
          <span
            style={{ ...iconBtnStyle, color: 'var(--accent)', cursor: 'default' }}
            title="Already saved"
            aria-label="Already saved"
          >
            ★
          </span>
        )}
        {onDelete && (
          <button
            type="button"
            style={{ ...iconBtnStyle, color: 'var(--bad, #d94f4f)' }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete from recent"
            aria-label="Delete from recent"
          >
            ×
          </button>
        )}
      </div>
    );
  } else if (isSaved) {
    rightSlot = (
      <span
        style={{ ...iconBtnStyle, color: 'var(--accent)', cursor: 'default', padding: '2px 4px' }}
        title="Saved"
        aria-label="Saved"
      >
        ★
      </span>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
    >
      <RowContent entry={entry} hasResult={hasResult} rightSlot={rightSlot} styles={styles} />
    </div>
  );
}

const leftColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
};

const vinSubtitleStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  color: 'var(--text-muted, #888)',
  letterSpacing: 0.5,
  marginTop: 1,
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
};

const noDataPillStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 10,
  background: 'var(--warn-bg, rgba(245, 158, 11, 0.15))',
  color: 'var(--warn-fg, #d97706)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  border: '1px solid var(--warn-border, rgba(245, 158, 11, 0.35))',
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
