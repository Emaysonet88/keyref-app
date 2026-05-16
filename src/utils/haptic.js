// ── haptic.js ───────────────────────────────────────────────────────────────
// Thin wrapper around the Vibration API. No-op on browsers/devices without
// support (iOS Safari has never shipped it). Pattern can be a single number
// of milliseconds or an array like [10, 30, 10] for buzz-pause-buzz.
//
// Calls are short by default — locksmiths use the app one-handed in tight
// spaces, sometimes wearing gloves; a 10 ms tap is felt without being noisy.

export function haptic(pattern = 10) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
}
