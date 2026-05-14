// ── Ignition variant detector ────────────────────────────────────────────────
// Some models (e.g. Acura ZDX) ship in both "W/ PROX" and "W/ REGULAR IGNITION"
// flavors. When the user picks the base name, we surface a quick toggle so they
// can confirm which variant their vehicle has before running the lookup.
export function getIgnitionPrompt(models, selectedModel) {
  if (!models?.length || !selectedModel) return null;

  const suffixes = ['W/ PROX SYSTEM', 'W/ PROX', 'W/ REGULAR IGNITION'];
  const upper = selectedModel.toUpperCase();
  let baseName = selectedModel.trim();

  for (const sfx of suffixes) {
    const idx = upper.indexOf(sfx);
    if (idx !== -1) { baseName = selectedModel.slice(0, idx).trim(); break; }
  }
  if (!baseName) return null;

  const baseUpper = baseName.toUpperCase();
  const prox    = models.find(m => m.toUpperCase().startsWith(baseUpper) && m.toUpperCase().includes('W/ PROX'));
  const regular = models.find(m => m.toUpperCase().startsWith(baseUpper) && m.toUpperCase().includes('W/ REGULAR IGNITION'));

  if (!prox || !regular) return null;
  if (selectedModel === prox || selectedModel === regular) return null;

  return { base: baseName, prox, regular };
}
