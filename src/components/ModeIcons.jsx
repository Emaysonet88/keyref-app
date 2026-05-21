// ── Mode toggle icons ──────────────────────────────────────────────────────
// Inline SVG icons replacing the 🚗 🔍 🔑 emoji. All use:
//   - stroke="currentColor" so they pick up the button text color
//     (white-on-active, accent-on-inactive — same theming as the labels)
//   - strokeWidth 1.75 for the "Lucide-style premium dev-tool" look
//   - vector-effect non-scaling-stroke so they stay crisp at any size
//
// Each icon is a single component returning <svg>. Pass `size` (defaults to
// 16) to scale uniformly.

const SVG_PROPS = (size) => ({
  width:  size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  style: { flexShrink: 0, display: 'block' },
});

// ── VehicleIcon ────────────────────────────────────────────────────────────
// A clean side-profile car silhouette. Not a hatchback or sedan specifically
// — generic enough to read instantly without ambiguity.
export function VehicleIcon({ size = 16 }) {
  return (
    <svg {...SVG_PROPS(size)}>
      {/* Roof + cabin */}
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      {/* Body */}
      <path d="M3 16v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
      <path d="M3 16h18" />
      {/* Wheels */}
      <circle cx="7"  cy="17" r="1.5" />
      <circle cx="17" cy="17" r="1.5" />
    </svg>
  );
}

// ── SearchIcon ─────────────────────────────────────────────────────────────
// Standard magnifying glass. The angle of the handle and proportion of
// circle-to-handle is the Lucide convention — most recognizable.
export function SearchIcon({ size = 16 }) {
  return (
    <svg {...SVG_PROPS(size)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="20" y1="20" x2="15.5" y2="15.5" />
    </svg>
  );
}

// ── KeyIcon ────────────────────────────────────────────────────────────────
// A modern flat-key silhouette: the bow (round head) on the left, the blade
// extending right with two small cuts (teeth) on the bottom edge. Locksmith-
// readable — they'll recognize the cut profile.
export function KeyIcon({ size = 16 }) {
  return (
    <svg {...SVG_PROPS(size)}>
      {/* Bow (round head with small inner hole) */}
      <circle cx="7" cy="12" r="4" />
      <circle cx="7" cy="12" r="1.4" />
      {/* Blade extending right */}
      <line x1="11" y1="12" x2="21" y2="12" />
      {/* Two teeth on the bottom of the blade */}
      <line x1="16" y1="12" x2="16" y2="14.5" />
      <line x1="19" y1="12" x2="19" y2="14" />
    </svg>
  );
}

// ── ScannerIcon ────────────────────────────────────────────────────────────
// Viewfinder / focus-reticle shape — four corner brackets with a central
// horizontal scan line. This is the standard "scan barcode" icon used by
// Stripe, Square, Apple Wallet, etc. Reads as "scan/capture" instantly
// without being a literal camera. Pairs with the dev-tool aesthetic better
// than 📷 ever did.
export function ScannerIcon({ size = 16 }) {
  return (
    <svg {...SVG_PROPS(size)}>
      {/* Four corner brackets — viewfinder frame */}
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      {/* Horizontal scan line across the middle */}
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}
