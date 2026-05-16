// ── SkeletonLoader ──────────────────────────────────────────────────────────
// Animated placeholders shown while a section's data is loading. Two flavors:
//
//   <SkeletonRow />            — a single horizontal bar
//   <SkeletonList count={6} /> — a stack of bars at varied widths
//
// The shimmer keyframe lives in src/index.css. Bars use a linear-gradient
// background that slides across — no images, no GPU layers we don't already
// have. Honors prefers-reduced-motion automatically via the global rule.

const BASE = {
  height: 14,
  width: '100%',
  background:
    'linear-gradient(90deg, var(--shimmer) 0%, var(--border) 50%, var(--shimmer) 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.6s linear infinite',
  borderRadius: 2,
};

export function SkeletonRow({ height = 14, width = '100%', style = {} }) {
  return <div style={{ ...BASE, height, width, ...style }} />;
}

// Stack of bars with slightly varied widths so it doesn't look like a
// repeating pattern. Each bar is offset in animation start so they shimmer
// out of phase — adds a sense of activity.
export function SkeletonList({ count = 5, gap = 10 }) {
  const widths = ['85%', '92%', '78%', '95%', '88%', '70%', '90%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            ...BASE,
            width: widths[i % widths.length],
            animationDelay: `${i * -120}ms`,
          }}
        />
      ))}
    </div>
  );
}
