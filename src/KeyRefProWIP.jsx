import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();

function getSaved() { try { return JSON.parse(localStorage.getItem('keyref_saved') || '[]'); } catch { return []; } }
function setSaved(arr) { try { localStorage.setItem('keyref_saved', JSON.stringify(arr.slice(0, 30))); } catch {} }

async function searchDatabase(year, make, model, currentMakeData) {
  if (!make || !model || !currentMakeData) return null;
  
  // Extract outer key (make name) from fetched JSON structure: { "Make": { "Model": [...] } }
  const outerKey = Object.keys(currentMakeData)[0];
  const makeData = currentMakeData[outerKey];
  if (!makeData || !makeData[model]) return null;
  
  const entries = makeData[model];
  const matching = entries.find(e => year >= e.yearStart && year <= e.yearEnd);
  
  if (matching) {
    return {
      keyBlanks: matching.keyBlanks,
      keyType: matching.keyType,
      codeRange: matching.codeRange ?? null,
      transponderChip: matching.transponderChip ?? null,
      programmingRequired: matching.programmingRequired ?? false,
      programmingMethod: matching.programmingMethod ?? null,
      cloningMethod: matching.cloningMethod ?? null,
      substitutes: matching.substitutes ?? null,
      notes: matching.notes ?? null,
      cardNo: matching.cardNo ?? null,
      lockApps: matching.lockApps ?? null,
      dataSource: '2025 Ilco Reference Guide',
    };
  }
  return null;
}

export default function KeyRefPro() {
  const [year, setYear]            = useState('');
  const [make, setMake]            = useState('');
  const [model, setModel]          = useState('');
  const [models, setModels]        = useState([]);
  const [loading, setLoading]      = useState(false);
  const [result, setResult]        = useState(null);
  const [vehicle, setVehicle]      = useState(null);
  const [error, setError]          = useState('');
  const [saved, setSavedState]     = useState(getSaved);
  const [currentMakeData, setCurrentMakeData] = useState(null);
  const [makesIndex, setMakesIndex] = useState(null);
  const [makes, setMakes] = useState([]);
  const [copiedBlank, setCopiedBlank] = useState(null);

  useEffect(() => {
    // Load makes index on mount
    (async () => {
      try {
        const response = await fetch('/data/inventory/_index.json');
        if (!response.ok) throw new Error('Failed to load makes index');
        const index = await response.json();
        setMakesIndex(index);
        setMakes(Object.keys(index).sort());
      } catch (e) {
        console.error('Failed to load makes index:', e);
        setError('Failed to load makes data. Please refresh the page.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!make || !makesIndex) { 
      setModels([]); 
      setModel(''); 
      setCurrentMakeData(null);
      setError('');
      return; 
    }
    
    // Lazy load make data from JSON file
    (async () => {
      try {
        const makeInfo = makesIndex[make];
        if (!makeInfo) {
          setModels([]);
          setModel('');
          setCurrentMakeData(null);
          setError(`No data available for ${make} yet.`);
          return;
        }
        
        const url = `/data/inventory/${makeInfo.filename}`;
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`No data available for ${make} yet.`);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const makeData = await response.json();
        setCurrentMakeData(makeData);
        
        // Extract models from fetched JSON structure: { "Make": { "Model": [...] } }
        const outerKey = Object.keys(makeData)[0];
        const models = Object.keys(makeData[outerKey] || {}).sort();
        setModels(models);
        setModel('');
        setError('');
      } catch (e) {
        console.error('Failed to load make data:', e);
        setModels([]);
        setModel('');
        setCurrentMakeData(null);
        setError(e.message || `No data available for ${make} yet.`);
      }
    })();
  }, [make, makesIndex]);

  const canLookup = year && make && model && !loading && makesIndex;

  async function runLookup() {
    if (!canLookup) return;
    setLoading(true);
    setError('');
    setResult(null);
    
    // Validate year is a 4-digit number in range
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > 2025) {
      setError('Year must be between 1980 and 2025.');
      setLoading(false);
      return;
    }
    
    try {
      // Use currentMakeData (already fetched and loaded by useEffect)
      if (!currentMakeData) {
        throw new Error(`No data available for ${make}.`);
      }
      
      // Search current make data where yearStart ≤ year ≤ yearEnd
      const dbResult = await searchDatabase(yearNum, make, model, currentMakeData);
      if (dbResult) {
        setResult(dbResult);
        setVehicle({ year, make, model });
      } else {
        setError(`Data unavailable for ${year} ${make} ${model}`);
      }
    } catch (e) {
      console.error('Lookup error:', e);
      setError(e.message || 'Data unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function saveResult() {
    if (!result || !vehicle) return;
    const next = [{ ...vehicle, result, ts: Date.now() },
      ...getSaved().filter(s => !(s.year===vehicle.year && s.make===vehicle.make && s.model===vehicle.model))];
    setSaved(next); setSavedState(next);
  }

  function deleteSaved(y, mk, mo) {
    const next = getSaved().filter(s => !(s.year===y && s.make===mk && s.model===mo));
    setSaved(next); setSavedState(next);
  }

  function loadSaved(e) {
    setResult(e.result); setVehicle({ year: e.year, make: e.make, model: e.model });
    setYear(e.year); setMake(e.make); setModel(e.model);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlank(text);
      setTimeout(() => setCopiedBlank(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function formatRelativeTime(ts) {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  const isSaved = vehicle && saved.some(s => s.year===vehicle.year && s.make===vehicle.make && s.model===vehicle.model);
  const blanks = result ? (Array.isArray(result.keyBlanks) ? result.keyBlanks : [result.keyBlanks]).filter(Boolean) : [];
  const fobs   = result?.remoteFobPartNumbers ? (Array.isArray(result.remoteFobPartNumbers) ? result.remoteFobPartNumbers : [result.remoteFobPartNumbers]).filter(Boolean) : [];

  const S = {
    app: { background: '#0d0d0d', minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif", color: '#e8e8e8', padding: '0 16px 60px' },
    inner: { maxWidth: 640, margin: '0 auto' },
    header: { padding: '24px 0 18px', borderBottom: '1px solid #2a2a2a', marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
    logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 46, letterSpacing: 2, lineHeight: 1, color: '#e8e8e8' },
    logoSpan: { color: '#f5a623' },
    logoSub: { fontFamily: 'monospace', fontSize: 9, color: '#787878', letterSpacing: 3, marginTop: 3 },
    badge: { background: 'rgba(245,166,35,0.12)', border: '1px solid #c47d0e', color: '#f5a623', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, padding: '4px 8px', textTransform: 'uppercase' },
    panel: { background: '#161616', border: '1px solid #2a2a2a', padding: 20, marginBottom: 16 },
    panelLabel: { fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#f5a623', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
    labelBar: { width: 12, height: 2, background: '#f5a623', display: 'block' },
    formRow: { display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 10, marginBottom: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    fieldLabel: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#787878', textTransform: 'uppercase' },
    selWrap: { position: 'relative' },
    select: { background: '#0d0d0d', border: '1px solid #3a3a3a', color: '#e8e8e8', fontFamily: 'monospace', fontSize: 13, padding: '9px 28px 9px 10px', width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none' },
    selArrow: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#f5a623', fontSize: 11, pointerEvents: 'none' },
    btnLookup: (disabled) => ({ width: '100%', background: disabled ? '#555' : '#f5a623', border: 'none', color: disabled ? '#999' : '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, padding: 13, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: disabled ? 0.5 : 1, minHeight: '44px' }),
    errMsg: { background: 'rgba(224,82,82,0.08)', borderLeft: '3px solid #e05252', color: '#e05252', fontFamily: 'monospace', fontSize: 12, padding: '11px 15px', marginBottom: 14 },
    resultCard: { background: '#161616', border: '1px solid #2a2a2a', marginBottom: 16, overflow: 'hidden' },
    resultHeader: { background: '#1e1e1e', borderBottom: '1px solid #2a2a2a', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    resultVehicle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, color: '#f5a623', lineHeight: 1 },
    btnSave: (saved) => ({ background: 'transparent', border: `1px solid ${saved ? '#52e0a0' : '#3a3a3a'}`, color: saved ? '#52e0a0' : '#787878', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, padding: '5px 11px', cursor: saved ? 'default' : 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', minHeight: '44px', display: 'flex', alignItems: 'center', minWidth: '44px' }),
    resultBody: { padding: 18, display: 'grid', gap: 10, '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } },
    dataRow: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'start', borderBottom: '1px solid #2a2a2a', paddingBottom: 10, '@media (max-width: 640px)': { gridTemplateColumns: '100px 1fr' } },
    dataRowLast: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'start', '@media (max-width: 640px)': { gridTemplateColumns: '100px 1fr' } },
    dataKey: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#787878', textTransform: 'uppercase', paddingTop: 2 },
    dataVal: { fontFamily: 'monospace', fontSize: 13, color: '#e8e8e8', lineHeight: 1.5 },
    dataValHi: { fontFamily: 'monospace', fontSize: 15, color: '#f5a623', fontWeight: 600, lineHeight: 1.5 },
    dataValYes: { fontFamily: 'monospace', fontSize: 13, color: '#52e0a0', lineHeight: 1.5 },
    dataValMuted: { fontFamily: 'monospace', fontSize: 13, color: '#4a4a4a', lineHeight: 1.5 },
    tag: { display: 'inline-block', background: 'rgba(245,166,35,0.12)', border: '1px solid #c47d0e', color: '#f5a623', fontFamily: 'monospace', fontSize: 12, padding: '2px 8px', margin: '2px 4px 2px 0', cursor: 'pointer', position: 'relative' },
    notesBox: { background: '#0d0d0d', borderLeft: '2px solid #c47d0e', padding: '9px 13px', fontFamily: 'monospace', fontSize: 12, color: '#787878', lineHeight: 1.6 },
    savedList: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 },
    savedItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', background: '#0d0d0d', border: '1px solid #2a2a2a', cursor: 'pointer', gap: 10 },
    savedVehicle: { fontFamily: 'monospace', fontSize: 13, color: '#e8e8e8', flex: 1 },
    savedBlank: { fontFamily: 'monospace', fontSize: 11, color: '#f5a623' },
    btnDel: { background: 'transparent', border: 'none', color: '#3a3a3a', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 },
    empty: { fontFamily: 'monospace', fontSize: 11, color: '#3a3a3a', letterSpacing: 1, padding: '6px 0' },
    footer: { marginTop: 32, paddingTop: 14, borderTop: '1px solid #2a2a2a', fontFamily: 'monospace', fontSize: 9, color: '#3a3a3a', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  };

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono&family=IBM+Plex+Sans&display=swap" rel="stylesheet"/>
      <div style={{...S.inner, maxWidth: 1000}}>

        {/* HEADER */}
        <header style={S.header}>
          <div>
            <div style={S.logo}>KEY<span style={S.logoSpan}>REF</span> PRO</div>
            <div style={S.logoSub}>AUTOMOTIVE KEY DATABASE · 2025 REFERENCE</div>
          </div>
          <div style={{marginLeft: 'auto'}}>
            <Link to="/settings" style={{color: '#f5a623', textDecoration: 'none', fontSize: '14px', fontFamily: 'monospace'}}>⚙ Settings</Link>
          </div>
        </header>

        {/* FORM */}
        <div style={S.panel}>
          <div style={S.panelLabel}><span style={S.labelBar}/>Vehicle Lookup</div>
          <div style={S.formRow}>
            <div style={S.field}>
              <div style={S.fieldLabel}>Year</div>
              <input 
                type="number" 
                min="1980" 
                max="2025" 
                value={year} 
                onChange={e => setYear(e.target.value)} 
                style={{...S.select, padding: '9px 10px', appearance: 'none', WebkitAppearance: 'none'}}
                placeholder="e.g. 2020"
              />
            </div>
            <div style={S.field}>
              <div style={S.fieldLabel}>Make</div>
              <div style={S.selWrap}>
                <select style={S.select} value={make} onChange={e => setMake(e.target.value)}>
                  <option value="">— Select —</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span style={S.selArrow}>▾</span>
              </div>
            </div>
            <div style={S.field}>
              <div style={S.fieldLabel}>Model</div>
              <div style={S.selWrap}>
                <select style={S.select} value={model} onChange={e => setModel(e.target.value)} disabled={!make}>
                  <option value="">{!make ? 'Select make first' : '— Select —'}</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span style={S.selArrow}>▾</span>
              </div>
            </div>
          </div>
          <button style={S.btnLookup(!canLookup)} disabled={!canLookup} onClick={runLookup}>
            {loading
              ? <><div style={{width:16,height:16,border:'2px solid rgba(0,0,0,0.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/><span>SEARCHING...</span></>
              : 'RUN LOOKUP'}
          </button>
        </div>

        {/* ERROR */}
        {error && <div style={S.errMsg}>{error}</div>}

        {/* RESULT */}
        {result && vehicle && (
          <div style={S.resultCard}>
            <div style={S.resultHeader}>
              <div>
                <div style={S.resultVehicle}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
                <div style={{fontFamily: 'monospace', fontSize: 9, color: '#787878', marginTop: 4}}>
                  Source: {result.dataSource || 'Database'}
                </div>
              </div>
              <button style={S.btnSave(isSaved)} onClick={saveResult}>{isSaved ? '✓ SAVED' : '+ SAVE'}</button>
            </div>
            <div style={S.resultBody}>
              {blanks.length > 0 && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Key Blank(s)</div>
                  <div style={S.dataValHi}>{blanks.map(b => (
                    <span 
                      key={b} 
                      style={S.tag} 
                      onClick={() => copyToClipboard(b)}
                      title="Click to copy"
                    >
                      {copiedBlank === b ? 'Copied!' : b}
                    </span>
                  ))}</div>
                </div>
              )}
              <div style={S.dataRow}>
                <div style={S.dataKey}>Key Type</div>
                <div style={S.dataVal}>{result.keyType || '—'}</div>
              </div>
              {result.keywayOrProfile && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Keyway / Profile</div>
                  <div style={S.dataVal}>{result.keywayOrProfile}</div>
                </div>
              )}
              <div style={S.dataRow}>
                <div style={S.dataKey}>Transponder Chip</div>
                <div style={result.transponderChip ? S.dataVal : S.dataValMuted}>{result.transponderChip || 'None / Not Required'}</div>
              </div>
              <div style={S.dataRow}>
                <div style={S.dataKey}>Programming</div>
                <div style={result.programmingRequired ? S.dataValYes : S.dataValMuted}>
                  {result.programmingRequired ? '⚡ Required' : '✓ Not Required'}
                </div>
              </div>
              {result.programmingRequired && result.programmingMethod && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Program Method</div>
                  <div style={S.dataVal}>{result.programmingMethod}</div>
                </div>
              )}
              {fobs.length > 0 && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Remote / FOB P/N</div>
                  <div style={S.dataVal}>{fobs.map(f => <span key={f} style={S.tag}>{f}</span>)}</div>
                </div>
              )}
              {result.codeRange && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Code Range</div>
                  <div style={S.dataVal}>{result.codeRange}</div>
                </div>
              )}
              {result.cloningMethod && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Cloning Method</div>
                  <div style={S.dataVal}>{result.cloningMethod}</div>
                </div>
              )}
              {result.substitutes && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Substitutes</div>
                  <div style={S.dataVal}>{result.substitutes}</div>
                </div>
              )}
              {result.lockApps && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Lock Apps</div>
                  <div style={S.dataVal}>{result.lockApps}</div>
                </div>
              )}
              {result.cardNo && (
                <div style={S.dataRow}>
                  <div style={S.dataKey}>Card No.</div>
                  <div style={S.dataVal}>{result.cardNo}</div>
                </div>
              )}
              {result.notes && (
                <div style={S.dataRowLast}>
                  <div style={S.dataKey}>Notes</div>
                  <div style={S.notesBox}>{result.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SAVED */}
        <div style={S.panel}>
          <div style={S.panelLabel}><span style={S.labelBar}/>Saved Lookups</div>
          <div style={S.savedList}>
            {saved.length === 0
              ? <div style={S.empty}>No saved lookups yet.</div>
              : saved.map(s => {
                  const bl = Array.isArray(s.result.keyBlanks) ? s.result.keyBlanks[0] : (s.result.keyBlanks || '');
                  const keyType = s.result.keyType || '';
                  const displayText = keyType ? `${bl} (${keyType})` : bl;
                  return (
                    <div key={`${s.year}-${s.make}-${s.model}`} style={S.savedItem} onClick={() => loadSaved(s)}>
                      <div style={S.savedVehicle}>{s.year} {s.make} {s.model}</div>
                      <div style={{...S.savedBlank, flex: 1, textAlign: 'center'}}>{displayText}</div>
                      <div style={{fontFamily: 'monospace', fontSize: '10px', color: '#787878', marginRight: '8px'}}>{formatRelativeTime(s.ts)}</div>
                      <button style={S.btnDel} onClick={e => { e.stopPropagation(); deleteSaved(s.year, s.make, s.model); }}>×</button>
                    </div>
                  );
                })
            }
          </div>
        </div>

        <div style={S.footer}>KeyRef Pro · Professional Use Only · 2025 Reference Guide</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}