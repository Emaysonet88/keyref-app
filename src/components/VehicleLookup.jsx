import { useState, useMemo, useEffect } from 'react';
import { getIgnitionPrompt } from '../utils/ignition';
import { searchDatabase, getAvailableYears, MIN_YEAR, MAX_YEAR } from '../utils/db';
import { smartDecodeVin, fuzzyMatch, findCandidates } from '../utils/vinDecode';
import ResultCard from './ResultCard';
import RecentList from './RecentList';
import SavedList from './SavedList';
import SupplementalInfo from './SupplementalInfo';
import VinScannerModal, { isScannerSupported } from './VinScannerModal';

// ── VehicleLookup ────────────────────────────────────────────────────────────
// The Year/Make/Model flow. Owns VIN decode state and the loading flag for
// the lookup itself; everything else (form fields, inventory data, saved &
// recent hooks) is passed in by the orchestrator so other modes can populate
// the form when the user clicks a search result.
//
// SESSION 6 FEATURES:
//   - Mobile camera scanner (BarcodeDetector API) — Scan VIN button
//   - Smart async decoder: cache → NHTSA → local fallback
//   - Safe model auto-match: only auto-fills when exactly ONE inventory
//     variant matches. Ambiguous matches leave the dropdown empty.
//   - PERSISTENT scanned-VIN banner: stays visible after a successful decode
//     until manually dismissed or replaced by the next scan. Locksmith sees
//     VIN + YMM + source at a glance while working the job.
//   - Transient vinFlash: errors and progress messages only, auto-dismiss
//   - Stale-error clearing: form errors dismiss when the user edits the form
//   - SupplementalInfo panel: extra data (BMW chassis/immobilizer)
export default function VehicleLookup({
  form, inventory, lookup, savedHook, recentHook, styles,
}) {
  const { year, make, model, setYear, setMake, setModel } = form;
  const { makes, models, currentMakeData, makesIndex, error: inventoryError } = inventory;
  const { result, vehicle, setResult, setVehicle } = lookup;

  const [vinInput,     setVinInput]     = useState('');
  const [vinFlash,     setVinFlash]     = useState('');     // transient (errors / progress)
  const [scannedInfo,  setScannedInfo]  = useState(null);   // persistent (last successful decode)
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [decoding,     setDecoding]     = useState(false);
  const [scannerOpen,  setScannerOpen]  = useState(false);

  const displayError    = error || inventoryError;
  const canLookup       = year && make && model && !loading && makesIndex;
  const isSaved         = savedHook.isSaved(vehicle);
  const ignitionPrompt  = useMemo(() => getIgnitionPrompt(models, model), [models, model]);
  const scannerAvailable = isScannerSupported();

  useEffect(() => {
    if (error) setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, make, model]);

  // ── VIN decode (async smart decoder) ────────────────────────────────────
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

      // Make matching: exact-or-unambiguous only
      let matchedMake = null;
      if (decoded.make) {
        matchedMake = fuzzyMatch(decoded.make, makes);
        if (matchedMake) setMake(matchedMake);
      }

      // Model matching: only auto-fill if EXACTLY one variant matches.
      let matchedModel = null;
      let modelCandidates = [];
      if (decoded.model && matchedMake && makesIndex?.[matchedMake]?.models) {
        modelCandidates = findCandidates(decoded.model, makesIndex[matchedMake].models);
        if (modelCandidates.length === 1) {
          matchedModel = modelCandidates[0];
          setModel(matchedModel);
        }
      }

      // Recents push: only on GENUINE database miss
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

      // ── Set PERSISTENT scanned info ────────────────────────────────────
      // This stays visible until the locksmith dismisses it or scans
      // another VIN. Clears the transient "Decoding..." flash.
      setScannedInfo({
        vin,
        year:   decoded.year || null,
        make:   matchedMake  || decoded.make  || null,
        model:  decoded.model || null, // raw NHTSA name — no variant suffix
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
  }

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
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>📷</span>
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

        {/* ── Transient flash (errors / progress) ─────────────────────── */}
        {vinFlash && <div style={styles.vinFlash} role="status">✓ {vinFlash}</div>}

        {/* ── Persistent scanned-VIN banner ───────────────────────────── */}
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
              onClick={() => setScannedInfo(null)}
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
            <div style={styles.fieldLabel}>Model</div>
            <div style={styles.selWrap}>
              <select
                style={styles.select}
                value={model}
                onChange={e => setModel(e.target.value)}
                disabled={!make}
                aria-label="Vehicle model"
              >
                <option value="">{!make ? 'Select make first' : '— Select —'}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={styles.selArrow}>▾</span>
            </div>
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

        <button
          style={styles.btnLookup(!canLookup)}
          disabled={!canLookup}
          onClick={runLookup}
        >
          {loading ? 'SEARCHING…' : 'RUN LOOKUP'}
        </button>
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
// Scan VIN button — placeholder accent fallback. Tracks the same accent color
// as the rest of the app via CSS variables.
const scanButtonStyle = {
  width: '100%',
  padding: '14px 16px',
  marginBottom: 10,
  background: 'var(--accent, #2563eb)',
  color: 'var(--accent-fg, #ffffff)',
  border: 'none',
  borderRadius: 'var(--radius, 8px)',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  WebkitTapHighlightColor: 'transparent',
};

// Persistent scanned-VIN banner — uses the success-tint palette to match
// the existing vinFlash style, but as a wider 2-line layout with dismiss.
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
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const scannedInfoYmm = {
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: 6,
};

const scannedInfoCheck = {
  fontFamily: 'monospace',
  fontSize: 9,
  color: 'var(--ok)',
  letterSpacing: 2,
  fontWeight: 600,
};

const scannedInfoYmmText = {
  fontFamily: 'monospace',
  fontSize: 12,
  color: 'var(--text)',
  fontWeight: 600,
};

const scannedInfoSource = {
  fontFamily: 'monospace',
  fontSize: 10,
  color: 'var(--mute)',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const scannedInfoVin = {
  fontFamily: 'monospace',
  fontSize: 11,
  color: 'var(--mute)',
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
};

const scannedInfoDismiss = {
  background: 'transparent',
  border: 'none',
  color: 'var(--mute)',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: 1,
  padding: '0 4px',
  minWidth: 28,
  minHeight: 28,
  flexShrink: 0,
  marginTop: -2,
};
