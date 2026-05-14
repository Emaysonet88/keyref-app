import { useState, useMemo } from 'react';
import { decodeVin } from '../search-utils';
import { getIgnitionPrompt } from '../utils/ignition';
import { searchDatabase, getAvailableYears, MIN_YEAR, MAX_YEAR } from '../utils/db';
import ResultCard from './ResultCard';
import RecentList from './RecentList';
import SavedList from './SavedList';

// ── VehicleLookup ────────────────────────────────────────────────────────────
// The Year/Make/Model flow. Owns VIN decode state and the loading flag for
// the lookup itself; everything else (form fields, inventory data, saved &
// recent hooks) is passed in by the orchestrator so other modes can populate
// the form when the user clicks a search result.
export default function VehicleLookup({
  form, inventory, lookup, savedHook, recentHook, styles,
}) {
  const { year, make, model, setYear, setMake, setModel } = form;
  const { makes, models, currentMakeData, makesIndex, error: inventoryError } = inventory;
  const { result, vehicle, setResult, setVehicle } = lookup;

  const [vinInput,    setVinInput]    = useState('');
  const [vinFlash,    setVinFlash]    = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const displayError = error || inventoryError;
  const canLookup    = year && make && model && !loading && makesIndex;
  const isSaved      = savedHook.isSaved(vehicle);
  const ignitionPrompt = useMemo(() => getIgnitionPrompt(models, model), [models, model]);

  // ── VIN decode ──────────────────────────────────────────────────────────
  function applyVin() {
    const decoded = decodeVin(vinInput);
    if (!decoded) {
      setVinFlash('Invalid VIN — must be at least 10 chars');
      setTimeout(() => setVinFlash(''), 2500);
      return;
    }
    setYear(String(decoded.year));
    let msg = `Year: ${decoded.year}`;
    if (decoded.make) {
      const matched = makes.find(m => m.toLowerCase() === decoded.make.toLowerCase());
      if (matched) {
        setMake(matched);
        msg = `Year ${decoded.year}, Make ${matched}`;
      } else {
        msg = `Year ${decoded.year} (make ${decoded.make} not in DB)`;
      }
    } else {
      msg = `Year ${decoded.year} (make not detected)`;
    }
    setVinFlash(msg);
    setTimeout(() => setVinFlash(''), 2500);
    setVinInput('');
  }

  // ── Lookup ──────────────────────────────────────────────────────────────
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

  // Loading saved/recent → repopulate form + result.
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

        {/* ── VIN decode row ──────────────────────────────────────────── */}
        <div style={styles.vinRow}>
          <input
            type="text"
            value={vinInput}
            onChange={e => setVinInput(e.target.value.toUpperCase().slice(0, 17))}
            placeholder="Paste VIN to auto-fill year + make"
            style={styles.vinInput}
            maxLength={17}
            aria-label="Vehicle identification number"
          />
          <button style={styles.vinBtn} onClick={applyVin} disabled={vinInput.length < 10}>
            Decode
          </button>
        </div>
        {vinFlash && <div style={styles.vinFlash} role="status">✓ {vinFlash}</div>}

        {/* ── Year / Make / Model ─────────────────────────────────────── */}
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

        {/* ── Prox vs regular ignition disambiguator ───────────────── */}
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

      {displayError && <div style={styles.errMsg} role="alert">{displayError}</div>}

      {result && vehicle && (
        <ResultCard
          vehicle={vehicle}
          result={result}
          isSaved={isSaved}
          onSave={saveResult}
          styles={styles}
        />
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
    </>
  );
}
