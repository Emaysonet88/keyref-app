import { useEffect, useRef, useState, useMemo } from 'react';
import { timeAgo } from '../utils/time';

// ── RecentList ───────────────────────────────────────────────────────────────
// Read-only list of the last N vehicle lookups. Tapping/clicking a row loads
// it back into the lookup form via `onSelect`.
//
// SESSION 6 v9:
//   - Mobile: swipe LEFT on a row to delete, swipe RIGHT to save
//   - Desktop: hover a row to reveal trash + bookmark icons
//   - Touch detection via matchMedia at runtime (no hooks needed)
//   - Rows with result: null (decoded-but-not-in-DB) cannot be saved,
//     since there's no key data to save — only the delete action shows.
//   - Already-saved entries don't show the save action either way.
//
// Entry shapes handled:
//   1. Full lookup:   { year, make, model, result: {...}, ts }
//   2. VIN-only:      { year, make, model, vin, result: null, ts }

const SWIPE_COMMIT_PX  = 80;
const SWIPE_MAX_PX     = 200;
const SWIPE_DIRECTION_LOCK_PX = 10;

export default function RecentList({ recent, onSelect, onDelete, onSave, isSaved, styles }) {
  // Touch detection at runtime. matchMedia is the modern way: "no hover
  // capability AND coarse pointer" = touch primary device.
  const isTouch = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }, []);

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

// ── RecentRow ──────────────────────────────────────────────────────────────
// Renders one recent entry. Same visual on both platforms; what differs is
// the interaction surface (swipe vs hover).
function RecentRow({ entry, onSelect, onDelete, onSave, isSaved, isTouch, styles }) {
  const hasResult = entry.result != null;
  const canSave   = hasResult && !isSaved && onSave;
  const canDelete = !!onDelete;

  if (isTouch) {
    return (
      <SwipeableContainer
        canSwipeLeft={canDelete}
        canSwipeRight={canSave}
        onSwipeLeft={onDelete}
        onSwipeRight={onSave}
        onTap={onSelect}
      >
        <RowContent entry={entry} hasResult={hasResult} styles={styles} />
      </SwipeableContainer>
    );
  }

  return (
    <HoverContainer
      onSelect={onSelect}
      onDelete={canDelete ? onDelete : null}
      onSave={canSave ? onSave : null}
      isSaved={isSaved}
      hasResult={hasResult}
      styles={styles}
    >
      <RowContent entry={entry} hasResult={hasResult} styles={styles} />
    </HoverContainer>
  );
}

// ── RowContent ─────────────────────────────────────────────────────────────
// The visual content of a row, identical across mobile and desktop.
function RowContent({ entry, hasResult, styles }) {
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

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {hasResult ? (
          <div style={{ ...styles.savedBlank, textAlign: 'center' }}>{bl}</div>
        ) : (
          <span style={noDataPillStyle}>Not in DB</span>
        )}
      </div>

      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#787878' }}>
        {timeAgo(entry.ts)}
      </div>
    </div>
  );
}

// ── SwipeableContainer (mobile) ────────────────────────────────────────────
// Captures horizontal pointer drags, reveals colored action zones, commits
// on release if past threshold. Tap still works for un-swiped pointer-ups.
function SwipeableContainer({ canSwipeLeft, canSwipeRight, onSwipeLeft, onSwipeRight, onTap, children }) {
  const [translate, setTranslate] = useState(0);
  const [dragging, setDragging]   = useState(false);

  const startXRef     = useRef(0);
  const startYRef     = useRef(0);
  const directionRef  = useRef(null); // null | 'h' | 'v'
  const movedRef      = useRef(false);

  function handlePointerDown(e) {
    if (!canSwipeLeft && !canSwipeRight) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    directionRef.current = null;
    movedRef.current = false;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) movedRef.current = true;

    if (directionRef.current === null) {
      if (Math.abs(dx) > SWIPE_DIRECTION_LOCK_PX || Math.abs(dy) > SWIPE_DIRECTION_LOCK_PX) {
        directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }

    if (directionRef.current === 'h') {
      let clamped = Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx));
      if (clamped < 0 && !canSwipeLeft)  clamped = 0;
      if (clamped > 0 && !canSwipeRight) clamped = 0;
      setTranslate(clamped);
    }
  }

  function handlePointerUp() {
    if (!dragging) {
      // No drag happened — treat as a tap
      if (!movedRef.current && onTap) onTap();
      return;
    }
    setDragging(false);

    const committed = Math.abs(translate) >= SWIPE_COMMIT_PX;
    if (committed) {
      if (translate < 0 && canSwipeLeft  && onSwipeLeft)  onSwipeLeft();
      if (translate > 0 && canSwipeRight && onSwipeRight) onSwipeRight();
    } else if (!movedRef.current && onTap) {
      // Pointer down and up without meaningful movement = tap
      onTap();
    }
    setTranslate(0);
  }

  // Visual state for action zones
  const showDeleteZone = canSwipeLeft  && translate < 0;
  const showSaveZone   = canSwipeRight && translate > 0;
  const deleteOpacity  = Math.min(1, Math.abs(translate) / SWIPE_COMMIT_PX);
  const saveOpacity    = Math.min(1, translate / SWIPE_COMMIT_PX);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Save zone (right side, revealed by swiping right) */}
      {showSaveZone && (
        <div style={{ ...zoneStyle, ...saveZoneStyle, opacity: saveOpacity }}>
          ★ SAVE
        </div>
      )}
      {/* Delete zone (left side, revealed by swiping left) */}
      {showDeleteZone && (
        <div style={{ ...zoneStyle, ...deleteZoneStyle, opacity: deleteOpacity }}>
          DELETE 🗑
        </div>
      )}
      <div
        style={{
          transform: `translateX(${translate}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
          touchAction: 'pan-y',
          position: 'relative',
          zIndex: 1,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  );
}

// ── HoverContainer (desktop) ───────────────────────────────────────────────
// Renders the row content with two action buttons that fade in on hover.
function HoverContainer({ onSelect, onDelete, onSave, isSaved, hasResult, children, styles }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div onClick={onSelect}>{children}</div>

      {(hover || isSaved) && (
        <div style={hoverActionsStyle}>
          {onSave && (
            <button
              type="button"
              style={hoverIconBtn}
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              title="Save lookup"
              aria-label="Save lookup"
            >
              ☆
            </button>
          )}
          {isSaved && (
            <span
              style={{ ...hoverIconBtn, color: 'var(--accent)', cursor: 'default' }}
              title="Already saved"
              aria-label="Already saved"
            >
              ★
            </span>
          )}
          {onDelete && (
            <button
              type="button"
              style={{ ...hoverIconBtn, color: 'var(--bad, #d94f4f)' }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete from recent"
              aria-label="Delete from recent"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const leftColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
};

const vinSubtitleStyle = {
  fontFamily: 'monospace',
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

// Swipe action zones
const zoneStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 2,
  color: '#fff',
  zIndex: 0,
};

const deleteZoneStyle = {
  right: 0,
  width: '50%',
  background: 'var(--bad, #d94f4f)',
  justifyContent: 'flex-end',
  paddingRight: 20,
};

const saveZoneStyle = {
  left: 0,
  width: '50%',
  background: 'var(--ok, #4caf50)',
  justifyContent: 'flex-start',
  paddingLeft: 20,
};

// Hover-revealed desktop actions
const hoverActionsStyle = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  background: 'var(--input-bg, rgba(0,0,0,0.1))',
  borderRadius: 4,
  padding: '2px 4px',
  pointerEvents: 'auto',
};

const hoverIconBtn = {
  background: 'transparent',
  border: 'none',
  padding: '2px 6px',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: 'var(--mute)',
  WebkitTapHighlightColor: 'transparent',
};
