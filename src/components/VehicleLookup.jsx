import { useState, useMemo, useEffect } from 'react';
import { getIgnitionPrompt } from '../utils/ignition';
import { searchDatabase, getAvailableYears, MIN_YEAR, MAX_YEAR } from '../utils/db';
import { smartDecodeVin, fuzzyMatch, findCandidates } from '../utils/vinDecode';
import ResultCard from './ResultCard';
import RecentList from './RecentList';
import SavedList from './SavedList';
import SupplementalInfo from './SupplementalInfo';
import VinScannerModal, { isScannerSupported } from './VinScannerModal';
import { ScannerIcon } from './ModeIcons';

// ── VehicleLookup ────────────────────────────────────────────────────────────
//
// SESSION 6 FEATURES:
//   - Mobile camera scanner (BarcodeDetector API) + ZXing fallback for photos
//   - Smart async decoder: cache → NHTSA → local fallback
//   - Safe model auto-match: only auto-fills when exactly ONE variant matches
//   - PERSISTENT scanned-VIN banner stays until dismissed or replaced
//   - SMART MODEL DROPDOWN: when VIN tells us "ACCORD", dropdown shows only
//     Accord variants by default. "Show all" link to expand back to full list.
//   - Stale-error clearing when form fields change
//   - SupplementalInfo panel (BMW chassis/immobilizer)
export default function VehicleLookup({
  form, inventory, lookup, savedHook, recentHook, styles,
}) {
  const { year, make, model, setYear, setMake, setModel } = form;
  const { makes, models, currentMakeData, makesIndex, error: inventoryError } = inventory;
  const { result, vehicle, setResult, setVehicle } = lookup;

  const [vinInput,     setVinInput]     = useState('');
  const [vinFlash,     setVinFlash]     = useState('');     // transient
  const [scannedInfo,  setScannedInfo]  = useState(null);   // persistent
  const [modelHint,    setModelHint]    = useState(null);   // base name from VIN, e.g. "ACCORD"
  const [showAllModels,setShowAllModels]= useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [decoding,     setDecoding]     = useState(false);
  const [scannerOpen,  setScannerOpen]  = useState(false);

  const displayError    = error || inventoryError;
  const canLookup       = year && make && model && !loading && makesIndex;
  const isSaved         = savedHook.isSaved(vehicle);
  const ignitionPrompt  = useMemo(() => getIgnitionPrompt(models, model), [models, model]);
  const scannerAvailable = isScannerSupported();

  // ── Filtered model list ─────────────────────────────────────────────────
  // If we have a hint from the VIN decoder AND the locksmith hasn't tapped
  // "Show all", filter the dropdown to variants that contain the hint string.
  // We use the SAME normalization as findCandidates so the filter logic is
  // consistent with the auto-match logic.
  const filteredModels = useMemo(() => {
    if (!modelHint || showAllModels) return models;

    const norm = s => String(s).toUpperCase().replace(/[\s\-_/.]/g, '');
    const target = norm(modelHint);

    const matches = models.filter(m => {
      const n = norm(m);
      return n.includes(target) || target.includes(n);
    });

    // Safety: if filter would hide everything, show everything (the inventory
    // genuinely doesn't carry this base model — show the full list so the
    // locksmith can still find something close).
    return matches.length > 0 ? matches : models;
  }, [models, modelHint, showAllModels]);

  const isFiltered = modelHint && !showAllModels && filteredModels.length < models.length;
  const hiddenCount = models.length - filteredModels.length;

  useEffect(() => {
    if (error) setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, make, model]);

  // Clear the model hint if the locksmith manually changes the make — the
  // VIN-derived hint no longer applies to a different make's model list.
  useEffect(() => {
    if (modelHint && scannedInfo && make.toUpperCase() !== (scannedInfo.make || '').toUpperCase()) {
      setModelHint(null);
      setShowAllModels(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make]);

  // ── VIN decode ──────────────────────────────────────────────────────────
  async function applyVin(rawVin) {
    const vin = (rawVin || vinInput).trim().toUpperCase();
    if (vin.length < 10) {
      flash('Invalid VIN — must be at least 10 chars', 2500);
      return;
    }

    setDecoding(true);
    setVinFlash('Decoding…');

    try {
      const decoded = await smartDecodeVin(vin);
      if (!decoded || (!decoded.year && !decoded.make)) {
        flash('Could not decode this VIN', 2500);
        return;
      }

      if (decoded.year) setYear(String(decoded.year));

      let matchedMake = null;
      if (decoded.make) {
        matchedMake = fuzzyMatch(decoded.make, makes);
        if (matchedMake) setMake(matchedMake);
      }

      let matchedModel = null;
      let modelCandidates = [];
      if (decoded.model && matchedMake && makesIndex?.[matchedMake]?.models) {
        modelCandidates = findCandidates(decoded.model, makesIndex[matchedMake].models);
        if (modelCandidates.length === 1) {
          matchedModel = modelCandidates[0];
          setModel(matchedModel);
        }
      }

      // Set the hint regardless of whether we auto-matched. Even if we
      // auto-picked one, the hint lets us keep the dropdown filtered to
      // related variants — useful if the locksmith wants to switch to
      // "ACCORD HYBRID W/ PROX" without scrolling past every Civic.
      if (decoded.model) {
        setModelHint(decoded.model);
        setShowAllModels(false);
      }

      const vehicleMissing =
        !matchedMake ||
        (decoded.model && matchedMake && modelCandidates.length === 0);

      if (vehicleMissing && (decoded.year || decoded.make)) {
        recentHook.pushRecent(
          {
            year:  decoded.year ? String(decoded.year) : '',
            make:  matchedMake || decoded.make  || '',
            model: matchedModel || decoded.model || '',
            vin,
          },
          null,
        );
      }

      setScannedInfo({
        vin,
        year:   decoded.year || null,
        make:   matchedMake  || decoded.make  || null,
        model:  decoded.model || null,
        source: decoded.source,
      });
      setVinFlash('');
      setVinInput('');
    } catch (e) {
      console.error('VIN decode error:', e);
      flash('Decode error', 2500);
    } finally {
      setDecoding(false);
    }
  }

  function flash(msg, ms) {
    setVinFlash(msg);
    if (ms) setTimeout(() => setVinFlash(curr => curr === msg ? '' : curr), ms);
  }

  function handleScanResult(vin) {
    setScannerOpen(false);
    setVinInput(vin);
    applyVin(vin);
  }

  function clearScannedInfo() {
    setScannedInfo(null);
    setModelHint(null);
    setShowAllModels(false);
  }

  async function runLookup() {
    if (!year || !make || !model || loading || !makesIndex) return;
    setLoading(true); setError(''); setResult(null);

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < MIN_YEAR || yearNum > MAX_YEAR) {
      setError(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
      setLoading(false);
      return;
    }
    try {
      if (!currentMakeData) throw new Error(`No data available for ${make}.`);
      const dbResult = searchDatabase(yearNum, model, currentMakeData);
      if (dbResult) {
        setResult(dbResult);
        const v = { year, make, model };
        setVehicle(v);
        recentHook.pushRecent(v, dbResult);
      } else {
        const ranges = getAvailableYears(model, currentMakeData);
        setError(ranges.length
          ? `No data for ${year} ${make} ${model}. Available: ${ranges.join(', ')}`
          : `Data unavailable for ${year} ${make} ${model}`);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Data unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function saveResult() {
    if (!result || !vehicle) return;
    savedHook.saveEntry(vehicle, result);
  }

  function loadEntry(e) {
    setResult(e.result);
    setVehicle({ year: e.year, make: e.make, model: e.model });
    setYear(e.year); setMake(e.make); setModel(e.model);
    setModelHint(null);
    setShowAllModels(false);
  }

  // ── Clear all form state for a fresh lookup ──────────────────────────────
  // Resets year/make/model, the result panel, scanned-VIN banner, VIN-derived
  // model filter, any error, and the VIN paste input. Does NOT touch Recent
  // or Saved lists — those are persistent by design.
  function clearForm() {
    setYear(''); setMake(''); setModel('');
    setResult(null);
    setVehicle(null);
    setScannedInfo(null);
    setModelHint(null);
    setShowAllModels(false);
    setVinInput('');
    setVinFlash('');
    setError('');
  }

  // Show the clear button when there's anything to clear
  const hasFormState = year || make || model || result || scannedInfo || vinInput;

  return (
    <>
      <div style={styles.panel}>
        <div style={styles.panelLabel}>
          <span style={styles.labelBar} />Vehicle Lookup
        </div>

        {scannerAvailable && (
          <button
            type="button"
            style={scanButtonStyle}
            onClick={() => setScannerOpen(true)}
            disabled={decoding || loading}
            aria-label="Open camera to scan VIN barcode"
          >
            <ScannerIcon size={17} />
            <span>Scan VIN</span>
          </button>
        )}

        <div style={styles.vinRow}>
          <input
            type="text"
            value={vinInput}
            onChange={e => setVinInput(e.target.value.toUpperCase().slice(0, 17))}
            placeholder="Paste VIN to auto-fill"
            style={styles.vinInput}
            maxLength={17}
            aria-label="Vehicle identification number"
            disabled={decoding}
          />
          <button
            style={styles.vinBtn}
            onClick={() => applyVin()}
            disabled={vinInput.length < 10 || decoding}
          >
            {decoding ? '…' : 'Decode'}
          </button>
        </div>

        {vinFlash && <div style={styles.vinFlash} role="status">✓ {vinFlash}</div>}

        {scannedInfo && (
          <div style={scannedInfoStyle}>
            <div style={scannedInfoContent}>
              <div style={scannedInfoYmm}>
                <span style={scannedInfoCheck}>✓ SCANNED</span>
                <span style={scannedInfoYmmText}>
                  {[scannedInfo.year, scannedInfo.make, scannedInfo.model].filter(Boolean).join(' ')}
                </span>
                <span style={scannedInfoSource}>· {scannedInfo.source}</span>
              </div>
              <div style={scannedInfoVin}>VIN: {scannedInfo.vin}</div>
            </div>
            <button
              type="button"
              onClick={clearScannedInfo}
              style={scannedInfoDismiss}
              aria-label="Clear scanned VIN"
              title="Clear"
            >
              ×
            </button>
          </div>
        )}

        <div style={styles.formRow}>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Year</div>
            <input
              type="number"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={year}
              onChange={e => setYear(e.target.value)}
              style={styles.inputNum}
              placeholder="e.g. 2020"
              aria-label="Model year"
            />
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>Make</div>
            <div style={styles.selWrap}>
              <select
                style={styles.select}
                value={make}
                onChange={e => setMake(e.target.value)}
                aria-label="Vehicle make"
              >
                <option value="">— Select —</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={styles.selArrow}>▾</span>
            </div>
          </div>
          <div style={styles.field}>
            <div style={styles.fieldLabel}>
              Model
              {isFiltered && (
                <span style={modelFilterBadge}>
                  · filtered to {modelHint}
                </span>
              )}
            </div>
            <div style={styles.selWrap}>
              <select
                style={styles.select}
                value={model}
                onChange={e => setModel(e.target.value)}
                disabled={!make}
                aria-label="Vehicle model"
              >
                <option value="">{!make ? 'Select make first' : '— Select —'}</option>
                {filteredModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={styles.selArrow}>▾</span>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => setShowAllModels(true)}
                style={showAllLinkStyle}
              >
                Show all {hiddenCount} other {make} models
              </button>
            )}
            {modelHint && showAllModels && (
              <button
                type="button"
                onClick={() => setShowAllModels(false)}
                style={showAllLinkStyle}
              >
                ← Back to {modelHint} only
              </button>
            )}
          </div>
        </div>

        {ignitionPrompt && (
          <div style={styles.ignitionPanel}>
            <div>⚠ Multiple variants exist for this model.</div>
            <div>Does this vehicle have push-button start?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button style={styles.ignitionButton} onClick={() => setModel(ignitionPrompt.prox)}>
                Yes — W/ Prox
              </button>
              <button style={styles.ignitionButton} onClick={() => setModel(ignitionPrompt.regular)}>
                No — Regular Ignition
              </button>
            </div>
          </div>
        )}

        <div style={lookupRowStyle}>
          <button
            style={styles.btnLookup(!canLookup)}
            disabled={!canLookup}
            onClick={runLookup}
          >
            {loading ? 'SEARCHING…' : 'RUN LOOKUP'}
          </button>
          {hasFormState && (
            <button
              type="button"
              style={clearBtnStyle}
              onClick={clearForm}
              aria-label="Clear all fields and start a new lookup"
              title="Clear all fields"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {displayError && (
        <div
          key={displayError}
          style={{ ...styles.errMsg, animation: 'shake 400ms ease' }}
          role="alert"
        >
          {displayError}
        </div>
      )}

      {result && vehicle && (
        <ResultCard
          key={`${vehicle.year}-${vehicle.make}-${vehicle.model}`}
          vehicle={vehicle}
          result={result}
          isSaved={isSaved}
          onSave={saveResult}
          styles={styles}
        />
      )}

      {result && vehicle && (
        <SupplementalInfo vehicle={vehicle} styles={styles} />
      )}

      <RecentList
        recent={recentHook.recent}
        onSelect={loadEntry}
        onDelete={recentHook.deleteRecent}
        onSave={(entry) => entry.result && savedHook.saveEntry(entry, entry.result)}
        isSaved={(entry) => savedHook.isSaved(entry)}
        styles={styles}
      />

      <SavedList
        saved={savedHook.saved}
        filtered={savedHook.filtered}
        filter={savedHook.filter}
        onFilterChange={savedHook.setFilter}
        onSelect={loadEntry}
        onDelete={savedHook.deleteEntry}
        editingNoteId={savedHook.editingNoteId}
        editingNoteText={savedHook.editingNoteText}
        onNoteTextChange={savedHook.setEditingNoteText}
        onStartEditNote={savedHook.startEditNote}
        onCommitNote={savedHook.commitNote}
        styles={styles}
      />

      {scannerOpen && (
        <VinScannerModal
          onScan={handleScanResult}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}

// ── Local styles ───────────────────────────────────────────────────────────

// Scan VIN button — designed as a sibling of styles.btnLookup so the two
// primary amber buttons read as a pair: same font, weight, color, and
// letter-spacing. The icon next to the label is what visually distinguishes
// them. Black-on-amber for WCAG AA contrast (white-on-amber fails).
const scanButtonStyle = {
  width: '100%',
  padding: 14,
  marginBottom: 10,
  background: 'var(--accent)',
  color: '#000',
  border: 'none',
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 22,
  letterSpacing: 3,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  minHeight: 46,
  WebkitTapHighlightColor: 'transparent',
};

const scannedInfoStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 12,
  padding: '9px 12px',
  background: 'var(--ok-tint)',
  borderLeft: '2px solid var(--ok)',
};

const scannedInfoContent = {
  flex: 1, minWidth: 0,
  display: 'flex', flexDirection: 'column', gap: 4,
};

const scannedInfoYmm = {
  display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6,
};

const scannedInfoCheck = {
  fontFamily: 'monospace', fontSize: 9,
  color: 'var(--ok)', letterSpacing: 2, fontWeight: 600,
};

const scannedInfoYmmText = {
  fontFamily: 'monospace', fontSize: 12,
  color: 'var(--text)', fontWeight: 600,
};

const scannedInfoSource = {
  fontFamily: 'monospace', fontSize: 10,
  color: 'var(--mute)', letterSpacing: 1, textTransform: 'uppercase',
};

const scannedInfoVin = {
  fontFamily: 'monospace', fontSize: 11,
  color: 'var(--mute)',
  wordBreak: 'break-all', overflowWrap: 'anywhere',
};

const scannedInfoDismiss = {
  background: 'transparent', border: 'none',
  color: 'var(--mute)', cursor: 'pointer',
  fontSize: 20, lineHeight: 1, padding: '0 4px',
  minWidth: 28, minHeight: 28, flexShrink: 0, marginTop: -2,
};

const modelFilterBadge = {
  marginLeft: 6,
  fontFamily: 'monospace',
  fontSize: 9,
  color: 'var(--ok)',
  letterSpacing: 1,
  fontWeight: 600,
};

const showAllLinkStyle = {
  display: 'block',
  marginTop: 6,
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontFamily: 'monospace',
  fontSize: 10,
  color: 'var(--accent, #2563eb)',
  textDecoration: 'underline',
  cursor: 'pointer',
  letterSpacing: 0.5,
};

// ── RUN LOOKUP + CLEAR row ─────────────────────────────────────────────────
// btnLookup is intentionally NOT given flex: 1 via styles.js (it's already
// width: 100%) — so we wrap it here to share horizontal space with CLEAR.
const lookupRowStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'stretch',
};

const clearBtnStyle = {
  background: 'transparent',
  color: 'var(--mute)',
  border: '1px solid var(--border)',
  padding: '0 16px',
  fontFamily: 'monospace',
  fontSize: 11,
  letterSpacing: 2,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  WebkitTapHighlightColor: 'transparent',
  flexShrink: 0,
};
