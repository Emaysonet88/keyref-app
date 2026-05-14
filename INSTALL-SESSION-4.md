# Session 4 — Install Guide

Step-by-step for applying this update in VS Code, verifying it works, and
handing it off for real-world testing.

---

## What's in this update

- **7 bug fixes:** data drift between `src/data` and `public/data`,
  duplicate `5XX` WMI entry, hardcoded 2025 year cap, no search debounce,
  saved-list filter ignoring notes, `/` shortcut broken in Blank mode,
  search results not relevance-sorted.
- **Refactor:** the 844-line monolith is split into 14 components, 11
  hooks, 4 utils, a style factory, and a 138-line orchestrator.
- **Theme tokens moved to CSS variables** — sets up print mode for
  Session 5 essentially for free.
- **91 makes / 2,870 model-years** now indexed (motorcycles included).
- **A11y pass:** aria-labels on icon buttons, role="status" / "alert" /
  "tab" where appropriate.

See `CHANGELOG-SESSION-4.md` for the full breakdown.

---

## Before you start

**Prerequisites**
- Node.js 18 or higher (`node --version` to check)
- VS Code
- The Session 4 zip: `keyref-app-session-4.zip`

**Back up your current project first.** Either:
- Copy your existing `keyref-app/` folder and rename it
  `keyref-app-backup-session-3/`, **or**
- If you use git: `git checkout -b backup-session-3 && git commit -am "pre session 4"`.

This is your rollback. No skipping.

---

## Step-by-step in VS Code

### 1. Extract the new build

Unzip `keyref-app-session-4.zip` to wherever you keep projects. You'll get
a folder called `keyref-app-main/`. Rename it to match your previous
folder name if you want (e.g. `keyref-app/`) — nothing in the project
depends on the folder name.

### 2. Open the folder in VS Code

- **File → Open Folder…** → pick the extracted folder.
- Confirm the file tree looks like:
  ```
  src/
    KeyRefPro.jsx
    App.jsx
    ErrorBoundary.jsx
    index.css
    main.jsx
    search-utils.js
    components/     (10 .jsx files)
    hooks/          (11 .js files)
    utils/          (4 .js files)
    theme/styles.js
  public/data/inventory/   (91 JSON files + _index.json)
  public/data/procedures/obp.json
  package.json
  vite.config.js
  INSTALL-SESSION-4.md      ← this file
  CHANGELOG-SESSION-4.md
  ```

### 3. Open the integrated terminal

**Terminal → New Terminal** (`Ctrl+`` on Win/Linux, `Cmd+`` on Mac).
Working directory should already be the project root.

### 4. Install dependencies

```bash
npm install
```

Pulls React 19, Vite 8, the PWA plugin, and ESLint. First install takes
~30s. Peer-dependency warnings are normal; only worry about actual errors.

### 5. Run the dev server

```bash
npm run dev
```

Vite prints a URL like `http://localhost:5173/`. Open it. You should see
KeyRef Pro load in dark theme with the three-mode toggle and the vehicle
lookup panel. The makes dropdown should populate with 91 entries.

### 6. Smoke test — verify Session 4 actually applied

Quick checks that the bug fixes are live:

| Test | What to do | What should happen |
|------|------------|-------------------|
| Year cap | Type `2026` in the year field | Accepted (used to cap at 2025) |
| Search relevance | Type `Megamos` in Search mode | Mixed results, not all chips first |
| `/` shortcut | Switch to Blank mode, press `/` | Jumps to Search, input focused |
| Notes filter | Save a lookup, add note "test", filter saved by "test" | Entry appears |
| Motorcycles | Open makes dropdown | Aprilia / BMW / Honda Motorcycle present |
| VIN decode | Paste `5XYZU3LA0FG123456`, click Decode | Year 2015, Make **Kia** (used to misidentify as Hyundai) |
| Search debounce | Type quickly in Search mode | No stutter or lag while typing |

If any of these fail, see *If something goes wrong* below.

### 7. Build for production

```bash
npm run build
```

Generates the optimized PWA bundle into `dist/`. Takes ~5–10s.

### 8. Preview the production build — **this is where offline testing happens**

```bash
npm run preview
```

The service worker only runs in production, not dev. To verify offline
mode:

1. Open the preview URL in Chrome.
2. DevTools → **Application → Service Workers** — confirm `sw.js` is
   registered and active.
3. DevTools → **Network** → check the **Offline** checkbox.
4. Reload the page.
5. The app should still load, makes dropdown should still populate, and
   any previously-fetched make's data should still work.

This is the critical test for locksmiths working in basements and
parking garages.

---

## If something goes wrong

**"Module not found" / "Cannot resolve import"**
You probably opened the wrong folder. Make sure VS Code's working
directory is the one containing `package.json`, not `src/`.

**`npm install` permission errors (Mac/Linux)**
Don't `sudo` — it creates worse problems. Instead:
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
```
Then re-run `npm install`.

**Port 5173 already in use**
Another Vite instance is running. Either kill it or:
```bash
npm run dev -- --port 5174
```

**Weird state / cached behavior**
Hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`). Still weird? Clear
localStorage: DevTools → Application → Local Storage → right-click →
Clear.

**Service worker won't update after a rebuild**
Easiest fix: DevTools → Application → Service Workers → "Unregister",
then hard refresh.

**Rollback**
Delete the Session 4 folder, fall back to your Session 3 backup. No
system-wide state was changed — it's all contained in the project folder
+ browser storage.

---

## What to test before handing off to a locksmith

Walk through one realistic flow end-to-end on your own device first:

- [ ] Decode a real VIN (door jamb sticker of any car nearby)
- [ ] Run the lookup, save it with a customer note
- [ ] Switch to Blank mode, look up the resulting blank number
- [ ] Switch to Search mode, search "Megamos" or another common chip
- [ ] Toggle airplane mode on phone, confirm the app still works for
      cached makes
- [ ] Install as PWA (Chrome menu → "Add to Home Screen"), launch from
      home screen, confirm it runs standalone
- [ ] Toggle light/dark theme, confirm it persists across reloads

If all of that works on your phone, you're ready for real-world feedback.

---

## Going forward

Each session ships with two files at the project root:

- `CHANGELOG-SESSION-N.md` — what changed and why
- `INSTALL-SESSION-N.md` — this file, but for the next update

The install pattern stays the same:

1. **Back up** your current working folder
2. **Extract** the new zip
3. **`npm install`** (skip if dependencies didn't change — the changelog
   will say)
4. **`npm run dev`** and smoke test the session-specific changes
5. **`npm run build` + `npm run preview`** to verify offline mode
6. **Hand off** for testing

Keep the changelogs and install guides committed to git or saved
somewhere safe — they're your project history.
