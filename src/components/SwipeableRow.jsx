import { useRef, useState } from 'react';

// ── SwipeableRow ────────────────────────────────────────────────────────────
// Shared swipe gesture container used by RecentList and SavedList.
//
// Touch-event-based (broader mobile compatibility than pointer events).
// All gesture state in refs to avoid React stale-closure issues mid-drag.
// Direction-locks after 10px of movement so vertical scrolling stays smooth.
// Suppresses the synthetic click that fires after a successful swipe.

const SWIPE_COMMIT_PX = 80;
const SWIPE_MAX_PX = 200;
const DIRECTION_LOCK_PX = 10;

export default function SwipeableRow({
  canSwipeLeft,
  canSwipeRight,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  leftZoneContent,   // ReactNode rendered when swiping right (revealed on left side)
  rightZoneContent,  // ReactNode rendered when swiping left (revealed on right side)
  leftZoneColor   = 'var(--ok, #4caf50)',
  rightZoneColor  = 'var(--bad, #d94f4f)',
  children,
}) {
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

  const showLeftZone  = canSwipeRight && translate > 0;
  const showRightZone = canSwipeLeft  && translate < 0;
  const leftOpacity   = Math.min(1, translate / SWIPE_COMMIT_PX);
  const rightOpacity  = Math.min(1, Math.abs(translate) / SWIPE_COMMIT_PX);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {showLeftZone && (
        <div style={{
          ...zoneStyle,
          left: 0,
          width: '50%',
          background: leftZoneColor,
          justifyContent: 'flex-start',
          paddingLeft: 20,
          opacity: leftOpacity,
        }}>
          {leftZoneContent}
        </div>
      )}
      {showRightZone && (
        <div style={{
          ...zoneStyle,
          right: 0,
          width: '50%',
          background: rightZoneColor,
          justifyContent: 'flex-end',
          paddingRight: 20,
          opacity: rightOpacity,
        }}>
          {rightZoneContent}
        </div>
      )}
      <div
        style={{
          transform: `translateX(${translate}px)`,
          transition: animating ? 'transform 200ms ease-out' : 'none',
          touchAction: 'pan-y',
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

// Multi-signal touch detection — exported so both list components share
// identical logic. Catches devices that misreport hover capability
// (Samsung S Pen, Surface, etc.) by checking multiple signals.
export function detectTouch() {
  if (typeof window === 'undefined') return false;
  if ('ontouchstart' in window) return true;
  if (navigator.maxTouchPoints > 0) return true;
  if ((navigator.msMaxTouchPoints || 0) > 0) return true;
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true;
  } catch { /* matchMedia not supported */ }
  return false;
}

const zoneStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 2,
  color: '#fff',
  zIndex: 0,
};
