import { useRef, useState, useMemo } from 'react';
import { timeAgo } from '../utils/time';

// ── RecentList ───────────────────────────────────────────────────────────────
// Read-only list of the last N vehicle lookups. Tapping/clicking a row loads
// it back into the lookup form via `onSelect`.
//
// SESSION 6 v10:
//   - Mobile: swipe LEFT to delete, swipe RIGHT to save
//   - Desktop: hover to reveal trash + bookmark icons
//   - ROBUST touch detection: checks 'ontouchstart', maxTouchPoints, and
//     pointer: coarse — any one of these → treat as touch device. (Samsung
//     S Pen devices report hover:hover, which broke the prior matchMedia-only
//     check.)
//   - Touch events (not pointer events) for the swipe gesture, with refs
//     for all gesture state so we don't hit React stale-state issues mid-drag.

const SWIPE_COMMIT_PX  = 80;
const SWIPE_MAX_PX     = 200;
const DIRECTION_LOCK_PX = 10;

export default function RecentList({ recent, onSelect, onDelete, onSave, isSaved, styles }) {
  // Multi-signal touch detection. Any of these means we should use the
  // mobile/swipe interaction model.
  const isTouch = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if ('ontouchstart' in window) return true;
    if (navigator.maxTouchPoints > 0) return true;
    if ((navigator.msMaxTouchPoints || 0) > 0) return true;
    try {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
    } catch { /* matchMedia not supported */ }
    return false;
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

function RecentRow({ entry, onSelect, onDelete, onSave, isSaved, isTouch, styles }) {
  const hasResult = entry.result != null;
  const canSave   = hasResult && !isSaved && !!onSave;
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
      styles={styles}
    >
      <RowContent entry={entry} hasResult={hasResult} styles={styles} />
    </HoverContainer>
  );
}

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

// ── SwipeableContainer ─────────────────────────────────────────────────────
// Uses touch events (not pointer events) for the broadest mobile browser
// compatibility. All gesture state lives in refs, so we never hit React's
// stale-closure problem mid-drag.
function SwipeableContainer({ canSwipeLeft, canSwipeRight, onSwipeLeft, onSwipeRight, onTap, children }) {
  const [translate, setTranslate] = useState(0);
  const [animating, setAnimating] = useState(false);

  const startXRef     = useRef(0);
  const startYRef     = useRef(0);
  const currentDxRef  = useRef(0);
  const directionRef  = useRef(null); // null | 'h' | 'v'
  const justSwipedRef = useRef(false);

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    currentDxRef.current = 0;
    directionRef.current = null;
    setAnimating(false);
  }

  function handleTouchMove(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;

    // Lock direction once movement exceeds threshold
    if (directionRef.current === null) {
      if (Math.abs(dx) > DIRECTION_LOCK_PX || Math.abs(dy) > DIRECTION_LOCK_PX) {
        directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }

    if (directionRef.current === 'h') {
      let clamped = Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx));
      if (clamped < 0 && !canSwipeLeft)  clamped = 0;
      if (clamped > 0 && !canSwipeRight) clamped = 0;
      currentDxRef.current = clamped;
      setTranslate(clamped);
    }
  }

  function handleTouchEnd() {
    setAnimating(true);

    if (directionRef.current === 'h') {
      const dx = currentDxRef.current;
      if (Math.abs(dx) >= SWIPE_COMMIT_PX) {
        // Commit the swipe. Set flag to suppress the synthetic click
        // that mobile browsers fire after touchend.
        justSwipedRef.current = true;
        setTimeout(() => { justSwipedRef.current = false; }, 300);

        if (dx < 0 && canSwipeLeft  && onSwipeLeft)  onSwipeLeft();
        if (dx > 0 && canSwipeRight && onSwipeRight) onSwipeRight();
      }
      setTranslate(0);
    }
  }

  function handleClick(e) {
    if (justSwipedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onTap) onTap();
  }

  const showDeleteZone = canSwipeLeft  && translate < 0;
  const showSaveZone   = canSwipeRight && translate > 0;
  const deleteOpacity  = Math.min(1, Math.abs(translate) / SWIPE_COMMIT_PX);
  const saveOpacity    = Math.min(1, translate / SWIPE_COMMIT_PX);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {showSaveZone && (
        <div style={{ ...zoneStyle, ...saveZoneStyle, opacity: saveOpacity }}>
          ★ SAVE
        </div>
      )}
      {showDeleteZone && (
        <div style={{ ...zoneStyle, ...deleteZoneStyle, opacity: deleteOpacity }}>
          DELETE 🗑
        </div>
      )}
      <div
        style={{
          transform: `translateX(${translate}px)`,
          transition: animating ? 'transform 200ms ease-out' : 'none',
          touchAction: 'pan-y', // allow vertical scroll, but we'll handle horizontal
          position: 'relative',
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
}

function HoverContainer({ onSelect, onDelete, onSave, isSaved, children }) {
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

const hoverActionsStyle = {
  position: 'absolute',
  right: 6,
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  gap: 2,
  alignItems: 'center',
  // Solid background masks the timestamp underneath so icons don't
  // visually collide with "just now" / "10h ago" text. var(--panel) is
  // the same color as the surrounding panel surface so the actions look
  // like they replace the time text rather than float over it.
  background: 'var(--panel, #1a1a1a)',
  border: '1px solid var(--border, rgba(255,255,255,0.1))',
  borderRadius: 4,
  padding: '2px 4px',
  pointerEvents: 'auto',
  boxShadow: '0 0 0 4px var(--panel, #1a1a1a)',
};

const hoverIconBtn = {
  background: 'transparent',
  border: 'none',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  color: 'var(--mute)',
  WebkitTapHighlightColor: 'transparent',
  minWidth: 24,
  textAlign: 'center',
};
