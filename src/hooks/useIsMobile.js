import { useState, useEffect } from 'react';

const BREAKPOINT = 600;

// ── useIsMobile ──────────────────────────────────────────────────────────────
// Reactive boolean for the < 600 px breakpoint. Used for grid switches and
// font-size tweaks in components that don't lend themselves to pure CSS.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < BREAKPOINT
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}
