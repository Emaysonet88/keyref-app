import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();

function getSaved() { try { return JSON.parse(localStorage.getItem('keyref_saved') || '[]'); } catch { return []; } }
function setSaved(arr) { try { localStorage.setItem('keyref_saved', JSON.stringify(arr.slice(0, 30))); } catch {} }
function getRecent() { try { return JSON.parse(localStorage.getItem('keyref_recent') || '[]'); } catch { return []; } }
function setRecentList(arr) { try { localStorage.setItem('keyref_recent', JSON.stringify(arr.slice(0, 10))); } catch {} }

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getIgnitionPrompt(models, selectedModel) {
  if (!models || models.length === 0 || !selectedModel) return null;

  const normalizeBase = name => {
    const upper = name.toUpperCase();
    const suffixes = ['W/ PROX SYSTEM', 'W/ PROX', 'W/ REGULAR IGNITION'];
    for (const suffix of suffixes) {
      const idx = upper.indexOf(suffix);
      if (idx !== -1) {
        return name.slice(0, idx).trim();
      }
    }
    return name.trim();
  };

  const baseName = normalizeBase(selectedModel);
  if (!baseName) return null;

  const proxModel = models.find(m => m.toUpperCase().startsWith(baseName.toUpperCase()) && m.toUpperCase().includes('W/ PROX'));
  const regularModel = models.find(m => m.toUpperCase().startsWith(baseName.toUpperCase()) && m.toUpperCase().includes('W/ REGULAR IGNITION'));

  if (!proxModel || !regularModel) return null;
  if (selectedModel === proxModel || selectedModel === regularModel) return null;

  return { base: baseName, prox: proxModel, regular: regularModel };
}

async function searchDatabase(year, make, model, currentMakeData) {
  if (!make || !model || !currentMakeData) return null;
  
  // Extract outer key (make name) from fetched JSON structure: { "Make": { "Model": [...] } }
  const outerKey = Object.keys(currentMakeData)[0];
  const modelEntries = currentMakeData[outerKey]?.[model];
  if (!modelEntries) return null;
  
  const entries = modelEntries;
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
      yearStart: matching.yearStart,
      yearEnd: matching.yearEnd,
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
  const [recent, setRecentState]   = useState(getRecent);
  const [savedFilter, setSavedFilter] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editingNoteText, setEditingNoteText] = useState('');
  const [currentMakeData, setCurrentMakeData] = useState(null);
  const [makesIndex, setMakesIndex] = useState(null);
  const [makes, setMakes] = useState([]);
  const [copiedBlank, setCopiedBlank] = useState(null);
  const [ignitionPrompt, setIgnitionPrompt] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('keyref_theme');
    return stored === 'light' ? false : true;
  });

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
        const response = await fetch(`/data/inventory/${make.toLowerCase()}.json`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`No data available for ${make} yet.`);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const makeData = await response.json();
        const outerKey = Object.keys(makeData)[0];
        const modelList = Object.keys(makeData[outerKey]).sort();
        setModels(modelList);
        setCurrentMakeData(makeData);
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

  useEffect(() => {
    setIgnitionPrompt(getIgnitionPrompt(models, model));
  }, [models, model]);

  useEffect(() => {
    try {
      localStorage.setItem('keyref_theme', darkMode ? 'dark' : 'light');
    } catch {}
  }, [darkMode]);

  function updateRecent(entry) {
    const next = [entry, ...getRecent().filter(r => !(r.year===entry.year && r.make===entry.make && r.model===entry.model))].slice(0, 10);
    setRecentList(next);
    setRecentState(next);
  }

  function startEditNote(item) {
    setEditingNoteId(`${item.year}-${item.make}-${item.model}`);
    setEditingNoteText(item.note || '');
  }

  function commitSavedNote(id) {
    const next = saved.map(s => {
      if (`${s.year}-${s.make}-${s.model}` === id) {
        return { ...s, note: editingNoteText.trim() };
      }
      return s;
    });
    setSaved(next);
    setSavedState(next);
    setEditingNoteId('');
    setEditingNoteText('');
  }

  function toggleDarkMode() {
    setDarkMode(prev => !prev);
  }

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
        updateRecent({ year, make, model, result: dbResult, ts: Date.now() });
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
    setEditingNoteId('');
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

  const panelBg = darkMode ? '#161616' : '#ffffff';
  const borderColor = darkMode ? '#2a2a2a' : '#ddd';
  const bgColor = darkMode ? '#0d0d0d' : '#f5f0e8';
  const selectBg = darkMode ? '#0d0d0d' : '#ffffff';
  const selectColor = darkMode ? '#e8e8e8' : '#1a1a1a';
  const logoColor = darkMode ? '#e8e8e8' : '#1a1a1a';
  const dataKeyColor = darkMode ? '#787878' : '#555';
  const dataValColor = darkMode ? '#e8e8e8' : '#1a1a1a';
  const itemBg = darkMode ? '#0d0d0d' : '#ffffff';
  const itemBorder = darkMode ? '#2a2a2a' : '#ddd';
  const notesBg = darkMode ? '#0d0d0d' : '#f5f0e8';
  const notesColor = darkMode ? '#787878' : '#555';

  const S = {
    app: { background: bgColor, minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif", color: dataValColor, padding: '0 16px 60px' },
    inner: { maxWidth: 640, margin: '0 auto' },
    header: { padding: '24px 0 18px', borderBottom: `1px solid ${borderColor}`, marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
    logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 46, letterSpacing: 2, lineHeight: 1, color: logoColor },
    logoSpan: { color: '#f5a623' },
    logoSub: { fontFamily: 'monospace', fontSize: 9, color: '#787878', letterSpacing: 3, marginTop: 3 },
    badge: { background: 'rgba(245,166,35,0.12)', border: '1px solid #c47d0e', color: '#f5a623', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, padding: '4px 8px', textTransform: 'uppercase' },
    panel: { background: panelBg, border: `1px solid ${borderColor}`, padding: 20, marginBottom: 16 },
    panelLabel: { fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#f5a623', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
    labelBar: { width: 12, height: 2, background: '#f5a623', display: 'block' },
    formRow: { display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 10, marginBottom: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    fieldLabel: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: dataKeyColor, textTransform: 'uppercase' },
    selWrap: { position: 'relative' },
    select: { background: selectBg, border: `1px solid ${borderColor}`, color: selectColor, fontFamily: 'monospace', fontSize: 13, padding: '9px 28px 9px 10px', width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none' },
    selArrow: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#f5a623', fontSize: 11, pointerEvents: 'none' },
    btnLookup: (disabled) => ({ width: '100%', background: disabled ? '#555' : '#f5a623', border: 'none', color: disabled ? '#999' : '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, padding: 13, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: disabled ? 0.5 : 1, minHeight: '44px' }),
    errMsg: { background: 'rgba(224,82,82,0.08)', borderLeft: '3px solid #e05252', color: '#e05252', fontFamily: 'monospace', fontSize: 12, padding: '11px 15px', marginBottom: 14 },
    resultCard: { background: panelBg, border: `1px solid ${borderColor}`, marginBottom: 16, overflow: 'hidden' },
    resultHeader: { background: darkMode ? '#1e1e1e' : '#f5f0e8', borderBottom: `1px solid ${borderColor}`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    resultVehicle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, color: '#f5a623', lineHeight: 1 },
    btnSave: (saved) => ({ background: 'transparent', border: `1px solid ${saved ? '#52e0a0' : '#3a3a3a'}`, color: saved ? '#52e0a0' : '#787878', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, padding: '5px 11px', cursor: saved ? 'default' : 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', minHeight: '44px', display: 'flex', alignItems: 'center', minWidth: '44px' }),
    resultBody: { padding: 18, display: 'grid', gap: 10, '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } },
    dataRow: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'start', borderBottom: `1px solid ${borderColor}`, paddingBottom: 10, '@media (max-width: 640px)': { gridTemplateColumns: '100px 1fr' } },
    dataRowLast: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'start', '@media (max-width: 640px)': { gridTemplateColumns: '100px 1fr' } },
    dataKey: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: dataKeyColor, textTransform: 'uppercase', paddingTop: 2 },
    dataVal: { fontFamily: 'monospace', fontSize: 13, color: dataValColor, lineHeight: 1.5 },
    dataValHi: { fontFamily: 'monospace', fontSize: 15, color: '#f5a623', fontWeight: 600, lineHeight: 1.5 },
    dataValYes: { fontFamily: 'monospace', fontSize: 13, color: '#52e0a0', lineHeight: 1.5 },
    dataValMuted: { fontFamily: 'monospace', fontSize: 13, color: darkMode ? '#4a4a4a' : '#888', lineHeight: 1.5 },
    tag: { display: 'inline-block', background: 'rgba(245,166,35,0.12)', border: '1px solid #c47d0e', color: '#f5a623', fontFamily: 'monospace', fontSize: 12, padding: '2px 8px', margin: '2px 4px 2px 0', cursor: 'pointer', position: 'relative' },
    notesBox: { background: notesBg, borderLeft: '2px solid #c47d0e', padding: '9px 13px', fontFamily: 'monospace', fontSize: 12, color: notesColor, lineHeight: 1.6 },
    savedList: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 },
    savedItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', background: itemBg, border: `1px solid ${itemBorder}`, cursor: 'pointer', gap: 10 },
    savedVehicle: { fontFamily: 'monospace', fontSize: 13, color: dataValColor, flex: 1 },
    savedBlank: { fontFamily: 'monospace', fontSize: 11, color: '#f5a623' },
    btnDel: { background: 'transparent', border: 'none', color: '#3a3a3a', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 },
    empty: { fontFamily: 'monospace', fontSize: 11, color: '#3a3a3a', letterSpacing: 1, padding: '6px 0' },
    themeToggle: { background: 'transparent', border: `1px solid ${borderColor}`, color: dataValColor, fontSize: 16, padding: '7px 10px', cursor: 'pointer', fontFamily: 'monospace', marginLeft: 10 },
    savedSearchInput: { background: selectBg, border: `1px solid ${borderColor}`, color: selectColor, fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', width: '100%', outline: 'none' },
    ignitionPanel: { background: darkMode ? 'rgba(245,166,35,0.08)' : 'rgba(245,166,35,0.12)', borderLeft: '3px solid #f5a623', color: dataValColor, fontFamily: 'monospace', fontSize: 12, padding: '12px 14px', marginBottom: 14, display: 'grid', gap: 8 },
    ignitionButton: { background: 'transparent', border: `1px solid #f5a623`, color: '#f5a623', fontFamily: 'monospace', fontSize: 11, padding: '7px 10px', cursor: 'pointer', textTransform: 'uppercase' },
    savedNoteInput: { background: selectBg, border: `1px solid ${borderColor}`, color: selectColor, fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', width: '100%', outline: 'none' },
    savedNoteText: { fontFamily: 'monospace', fontSize: 11, color: '#787878', marginTop: 4 },
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
          <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10}}>
            <button style={S.themeToggle} onClick={toggleDarkMode} title="Toggle theme">
              {darkMode ? '☀' : '☾'}
            </button>
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
          {ignitionPrompt && (
            <div style={S.ignitionPanel}>
              <div>⚠ Multiple variants exist for this model.</div>
              <div>Does this vehicle have push-button start?</div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
                <button style={S.ignitionButton} onClick={() => { setModel(ignitionPrompt.prox); setIgnitionPrompt(null); }}>
                  Yes — W/ Prox
                </button>
                <button style={S.ignitionButton} onClick={() => { setModel(ignitionPrompt.regular); setIgnitionPrompt(null); }}>
                  No — Regular Ignition
                </button>
              </div>
            </div>
          )}
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
                <div style={{fontFamily: 'monospace', fontSize: 9, color: '#787878', marginTop: 2}}>
                  Matched range: {result.yearStart}–{result.yearEnd}
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
                      style={{ ...S.tag, background: copiedBlank === b ? 'rgba(245,166,35,0.3)' : S.tag.background }}
                      onClick={() => copyToClipboard(b)}
                      title="Tap to copy"
                    >
                      {copiedBlank === b ? '✓ Copied' : b}
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

        {/* RECENT */}
        <div style={S.panel}>
          <div style={S.panelLabel}><span style={S.labelBar}/>Recent Lookups</div>
          <div style={S.savedList}>
            {recent.length === 0
              ? <div style={S.empty}>No recent lookups yet.</div>
              : recent.map(r => {
                  const bl = Array.isArray(r.result.keyBlanks) ? r.result.keyBlanks[0] : (r.result.keyBlanks || '');
                  const keyType = r.result.keyType || '';
                  const displayText = keyType ? `${bl} (${keyType})` : bl;
                  return (
                    <div key={`${r.year}-${r.make}-${r.model}`} style={S.savedItem} onClick={() => loadSaved(r)}>
                      <div style={S.savedVehicle}>{r.year} {r.make} {r.model}</div>
                      <div style={{...S.savedBlank, flex: 1, textAlign: 'center'}}>{displayText}</div>
                      <div style={{fontFamily: 'monospace', fontSize: '10px', color: '#787878', marginRight: '8px'}}>{timeAgo(r.ts)}</div>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* SAVED */}
        <div style={S.panel}>
          <div style={S.panelLabel}><span style={S.labelBar}/>Saved Lookups</div>
          {saved.length >= 5 && (
            <input
              type="text"
              value={savedFilter}
              onChange={e => setSavedFilter(e.target.value)}
              placeholder="Search saved lookups..."
              style={S.savedSearchInput}
            />
          )}
          <div style={S.savedList}>
            {saved.length === 0
              ? <div style={S.empty}>No saved lookups yet.</div>
              : saved.filter(s => `${s.year} ${s.make} ${s.model}`.toLowerCase().includes(savedFilter.toLowerCase())).map(s => {
                  const bl = Array.isArray(s.result.keyBlanks) ? s.result.keyBlanks[0] : (s.result.keyBlanks || '');
                  const keyType = s.result.keyType || '';
                  const displayText = keyType ? `${bl} (${keyType})` : bl;
                  const itemKey = `${s.year}-${s.make}-${s.model}`;
                  if (editingNoteId === itemKey) {
                    return (
                      <div key={itemKey} style={S.savedItem}>
                        <input
                          autoFocus
                          type="text"
                          value={editingNoteText}
                          onChange={e => setEditingNoteText(e.target.value)}
                          onBlur={() => commitSavedNote(itemKey)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitSavedNote(itemKey);
                            }
                          }}
                          placeholder="Add a note..."
                          style={S.savedNoteInput}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={itemKey} style={S.savedItem} onClick={() => loadSaved(s)}>
                      <div style={{flex: 1}}>
                        <div style={S.savedVehicle}>{s.year} {s.make} {s.model}</div>
                        {s.note && <div style={S.savedNoteText}>{s.note}</div>}
                      </div>
                      <div style={{...S.savedBlank, flex: 1, textAlign: 'center'}}>{displayText}</div>
                      <div style={{fontFamily: 'monospace', fontSize: '10px', color: '#787878', marginRight: '8px'}}>{formatRelativeTime(s.ts)}</div>
                      <button style={S.btnDel} onClick={e => { e.stopPropagation(); startEditNote(s); }}>✎</button>
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