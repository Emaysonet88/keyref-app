// ── Ignition variant detector ────────────────────────────────────────────────
// Some models ship in both "W/ PROX" and "W/ REGULAR IGNITION" flavors. When
// the user picks a base name (or a variant from a generic search), we surface
// a quick toggle so they can confirm which variant their vehicle has.
//
// BUG FIX (Nov 2025): Previously used `.startsWith(baseUpper)` to find prox
// and regular variants. That caused "ACCORD" to match "ACCORD HYBRID" — so
// when an Accord owner clicked "Yes — W/ Prox", the prompt routed them to
// "ACCORD HYBRID W/ PROX" instead of the regular "ACCORD W/ PROX".
//
// Fix: extract the base name from EVERY candidate model and require exact
// base equality. "ACCORD" and "ACCORD HYBRID" are now treated as different
// base models with their own (independent) prox/regular variants.

const SUFFIXES = ['W/ PROX SYSTEM', 'W/ PROX', 'W/ REGULAR IGNITION'];

/** Strip a known ignition-variant suffix from a model name, returning the base. */
function getBase(modelName) {
  if (!modelName) return '';
  const upper = modelName.toUpperCase();
  for (const sfx of SUFFIXES) {
    const idx = upper.indexOf(sfx);
    if (idx !== -1) return modelName.slice(0, idx).trim();
  }
  return modelName.trim();
}

export function getIgnitionPrompt(models, selectedModel) {
  if (!models?.length || !selectedModel) return null;

  const baseName  = getBase(selectedModel);
  if (!baseName) return null;
  const baseUpper = baseName.toUpperCase();

  // Match only candidates whose OWN base name equals ours exactly.
  // This prevents "ACCORD" from matching "ACCORD HYBRID" variants and vice versa.
  const matchesBase = (m) => getBase(m).toUpperCase() === baseUpper;

  const prox = models.find(m =>
    matchesBase(m) &&
    (m.toUpperCase().includes('W/ PROX SYSTEM') || m.toUpperCase().includes('W/ PROX'))
  );
  const regular = models.find(m =>
    matchesBase(m) && m.toUpperCase().includes('W/ REGULAR IGNITION')
  );

  // Only prompt when BOTH variants exist for this exact base
  if (!prox || !regular) return null;

  // Don't prompt if the user has already explicitly picked one of the variants
  if (selectedModel === prox || selectedModel === regular) return null;

  return { base: baseName, prox, regular };
}
