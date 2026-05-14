import { useState, useEffect, useMemo } from 'react';

// Hooks
import { useDarkMode }           from './hooks/useDarkMode';
import { useOnlineStatus }       from './hooks/useOnlineStatus';
import { useIsMobile }           from './hooks/useIsMobile';
import { useInventoryData }      from './hooks/useInventoryData';
import { useUnifiedSearchIndex } from './hooks/useUnifiedSearchIndex';
import { useSavedLookups }       from './hooks/useSavedLookups';
import { useRecentLookups }      from './hooks/useRecentLookups';
import { useSearchHistory }      from './hooks/useSearchHistory';

// Components
import Header          from './components/Header';
import ModeToggle      from './components/ModeToggle';
import VehicleLookup   from './components/VehicleLookup';
import UniversalSearch from './components/UniversalSearch';
import BlankLookup     from './components/BlankLookup';
import Footer          from './components/Footer';

// Styles
import { makeStyles } from './theme/styles';

// ── KeyRefPro (orchestrator) ─────────────────────────────────────────────────
// Holds the bits of state that are *shared across modes*: the active mode, the
// year/make/model form, the current result, and the saved/recent/search-history
// hooks. Each mode-panel is a self-contained component below.
export default function KeyRefPro() {
  // ── Top-level UI state ────────────────────────────────────────────────────
  const [mode, setMode] = useState('vehicle'); // 'vehicle' | 'search' | 'blank'
  const isMobile  = useIsMobile();
  const isOnline  = useOnlineStatus();
  const [darkMode, toggleDarkMode] = useDarkMode();
  const styles    = useMemo(() => makeStyles(isMobile), [isMobile]);

  // ── Form state (shared so Search/Blank can pre-fill Vehicle mode) ────────
  const [year,  setYear]  = useState('');
  const [make,  setMake]  = useState('');
  const [model, setModel] = useState('');
  const [result,  setResult]  = useState(null);
  const [vehicle, setVehicle] = useState(null);

  // ── Data sources ──────────────────────────────────────────────────────────
  const inventory = useInventoryData(make);
  const { allDataIndex, allDataLoading, lastSync } = useUnifiedSearchIndex(
    inventory.makesIndex,
    mode === 'search' || mode === 'blank',
  );

  // ── Persisted lists ───────────────────────────────────────────────────────
  const savedHook   = useSavedLookups();
  const recentHook  = useRecentLookups();
  const historyHook = useSearchHistory();

  // ── Keyboard shortcut: "/" focuses universal search from any mode ────────
  useEffect(() => {
    function onKey(e) {
      // Ignore when typing into a form control.
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === '/') {
        e.preventDefault();
        setMode('search');
        // Focus happens automatically via UniversalSearch's autoFocus when
        // the component mounts, but if we're already in search mode the
        // input is already on screen — give the browser a tick.
        setTimeout(() => {
          document.querySelector('input[aria-label="Universal search query"]')?.focus();
        }, 50);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Search result click → load into Vehicle mode ─────────────────────────
  function pickFromSearch(r) {
    setMode('vehicle');
    setMake(r.make);
    setModel(r.model);
    setYear(String(r.yearStart));
  }

  function pickFromBlank(r) {
    setMode('vehicle');
    setMake(r.make);
    setModel(r.model);
    setYear(String(r.yearStart));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.app}>
      <div style={styles.inner}>
        <Header
          isOnline={isOnline}
          darkMode={darkMode}
          onToggleTheme={toggleDarkMode}
          styles={styles}
        />

        <ModeToggle mode={mode} onChange={setMode} styles={styles} />

        {mode === 'vehicle' && (
          <VehicleLookup
            form={{ year, make, model, setYear, setMake, setModel }}
            inventory={inventory}
            lookup={{ result, vehicle, setResult, setVehicle }}
            savedHook={savedHook}
            recentHook={recentHook}
            styles={styles}
          />
        )}

        {mode === 'search' && (
          <UniversalSearch
            allDataIndex={allDataIndex}
            allDataLoading={allDataLoading}
            searchHistory={historyHook.history}
            onPushHistory={historyHook.push}
            onResultClick={pickFromSearch}
            styles={styles}
          />
        )}

        {mode === 'blank' && (
          <BlankLookup
            allDataIndex={allDataIndex}
            allDataLoading={allDataLoading}
            onResultClick={pickFromBlank}
            styles={styles}
          />
        )}

        <Footer lastSync={lastSync} styles={styles} />
      </div>
    </div>
  );
}
