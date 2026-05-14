import { useState, useEffect } from 'react';

// ── useOnlineStatus ──────────────────────────────────────────────────────────
// Tracks navigator.onLine. Locksmiths work in basements and parking garages —
// the status badge tells them whether they're hitting the network or the
// service worker cache.
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return isOnline;
}
