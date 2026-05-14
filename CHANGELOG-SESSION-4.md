# KeyRef Pro · Session 4 changelog

## Bug fixes
1. **Data layer unified.** `src/data/` was a stale duplicate of `public/data/`
   that included 7 motorcycle JSONs missing from the public copy. Synced
   motorcycles into `public/data/inventory/`, regenerated `_index.json` from
   disk (91 makes total, up from 85), removed `src/data/` entirely. The app
   now has one source of truth for inventory.
2. **WMI table dedup.** `'5XX'` was assigned to both Hyundai and Kia in the
   VIN decoder; Kia overwrote Hyundai silently. Removed the erroneous
   Hyundai entry. `5XY...` Kia VINs now resolve correctly.
3. **Year bounds are dynamic.** `MAX_YEAR` now computes from
   `new Date().getFullYear() + 1` so the year input and validation no longer
   silently cap at 2025. Lives in `src/utils/db.js`.
4. **Search debounced.** Universal Search and Reverse Blank Lookup now wait
   150 ms after the last keystroke before scanning the 2,870-record index.
   New hook: `useDebouncedValue`.
5. **Saved-list filter matches notes.** Typing "cloning" into the saved-list
   filter now finds entries whose notes contain "cloning", not just whose
   year/make/model do.
6. **`/` shortcut works everywhere.** Pressing `/` from Blank mode now jumps
   to Search and focuses the input (used to only work from Vehicle / Search).
7. **Search results sorted by relevance.** Each match is scored on
   (category prior × 10) + match-type bonus (exact > prefix > substring) −
   length penalty + year-recency bonus, and the final list is sorted before
   the 50-result cap. "Megamos" no longer drowns out other categories.

## Code health
- Old monolith (`KeyRefProWIP.jsx`, 844 lines) split into 14 components,
  10 hooks, 4 util modules, and a shared style factory.
- Theme tokens moved from inline JS branches into CSS custom properties
  on `:root[data-theme="dark|light"]`. Future print stylesheet is now a
  ~10-line `@media print` override away.
- New tree:
  ```
  src/
    KeyRefPro.jsx           (138 — orchestrator only)
    App.jsx
    ErrorBoundary.jsx
    main.jsx
    index.css               (CSS variables + resets)
    search-utils.js         (VIN decoder + scored search)
    components/
      Header / ModeToggle / Footer
      VehicleLookup / UniversalSearch / BlankLookup
      ResultCard / ObpProcedure
      RecentList / SavedList
    hooks/
      useDarkMode / useOnlineStatus / useIsMobile
      useLocalStorageState / useDebouncedValue
      useInventoryData / useUnifiedSearchIndex / useObpData
      useSavedLookups / useRecentLookups / useSearchHistory
    utils/
      storage / time / ignition / db
    theme/
      styles.js             (single style factory, CSS-variable backed)
  ```
- Largest file is now `theme/styles.js` (501 lines of pure style data).
  Largest *logic* file is `VehicleLookup.jsx` at 233 lines.
- Accessibility: added `aria-label` to icon-only buttons, `role="status"`
  on the VIN flash and online badge, `role="alert"` on the error banner,
  `role="tab"` + `aria-selected` on the mode toggle.

## Notes for Session 5
- Footer still says "2025 REFERENCE" — wire that to the data source year
  when we have one.
- Print stylesheet is now ~10 lines away (covered in the menu).
- VIN camera scanner can drop into `<VehicleLookup>`'s VIN row without
  touching anything else.
