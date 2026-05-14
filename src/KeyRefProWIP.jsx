import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ── Local storage helpers (consolidated) ──────────────────────────────────────
const store = {
  get: (key, def = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

// ── VIN year decoder (PDF page 3) ─────────────────────────────────────────────
// VIN position 10 = model year. Mapping repeats every 30 years.
const VIN_YEAR_CHARS = 'ABCDEFGHJKLMNPRSTVWXY123456789';
function vinToYear(vin) {
  if (!vin || vin.length < 10) return null;
  const c = vin[9].toUpperCase();
  const idx = VIN_YEAR_CHARS.indexOf(c);
  if (idx === -1) return null;
  // Cycle 1: 1980-2009 (A-Y), Cycle 2: 2010-2039 (A-Y)
  // Char 1-9 represents 2001-2009 (only used once)
  if (idx >= 21) return 1980 + (idx - 21) + 21; // 1-9
  const currentYear = new Date().getFullYear();
  const cycle1 = 1980 + idx;
  const cycle2 = 2010 + idx;
  // Prefer cycle that's <= currentYear and within last 30 years
  if (cycle2 <= currentYear + 1) return cycle2;
  return cycle1;
}

// ── Time formatting (single source of truth) ──────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Ignition variant detector ─────────────────────────────────────────────────
function getIgnitionPrompt(models, selectedModel) {
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
  const prox = models.find(m => m.toUpperCase().startsWith(baseUpper) && m.toUpperCase().includes('W/ PROX'));
  const regular = models.find(m => m.toUpperCase().startsWith(baseUpper) && m.toUpperCase().includes('W/ REGULAR IGNITION'));
  if (!prox || !regular) return null;
  if (selectedModel === prox || selectedModel === regular) return null;
  return { base: baseName, prox, regular };
}

// ── Result card field configuration (data-driven render) ──────────────────────
const RESULT_FIELDS = [
  { key: 'keyType',         label: 'Key Type',         fallback: '—' },
  { key: 'transponderChip', label: 'Transponder Chip', fallback: 'None / Not Required', mutedIfEmpty: true },
  { key: 'codeRange',       label: 'Code Range' },
  { key: 'cloningMethod',   label: 'Cloning Method' },
  { key: 'substitutes',     label: 'Substitutes' },
  { key: 'lockApps',        label: 'Lock Apps' },
  { key: 'cardNo',          label: 'Card No.' },
];

// ── Database search ───────────────────────────────────────────────────────────
function searchDatabase(year, model, currentMakeData) {
  if (!model || !currentMakeData) return null;
  const outerKey = Object.keys(currentMakeData)[0];
  const entries = currentMakeData[outerKey]?.[model];
  if (!entries) return null;
  const match = entries.find(e => year >= e.yearStart && year <= e.yearEnd);
  if (!match) return null;
  return { ...match, dataSource: '2025 Ilco Reference Guide' };
}

function getAvailableYears(model, currentMakeData) {
  if (!model || !currentMakeData) return [];
  const outerKey = Object.keys(currentMakeData)[0];
  const entries = currentMakeData[outerKey]?.[model] || [];
  return entries.map(e => `${e.yearStart}–${e.yearEnd}`);
}

export default function KeyRefPro() {
  // ── Core lookup state ───────────────────────────────────────────────────────
  const [year, setYear]            = useState('');
  const [make, setMake]            = useState('');
  const [model, setModel]          = useState('');
  const [models, setModels]        = useState([]);
  const [loading, setLoading]      = useState(false);
  const [result, setResult]        = useState(null);
  const [vehicle, setVehicle]      = useState(null);
  const [error, setError]          = useState('');
  const [currentMakeData, setCurrentMakeData] = useState(null);
  const [makesIndex, setMakesIndex] = useState(null);
  const [makes, setMakes] = useState([]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState('vehicle'); // 'vehicle' | 'blank'
  const [vinInput, setVinInput] = useState('');
  const [copiedBlank, setCopiedBlank] = useState(null);
  const [expandedObp, setExpandedObp] = useState(null);
  const [obpData, setObpData] = useState(null);
  const [darkMode, setDarkMode] = useState(() => store.get('keyref_theme', 'dark') === 'dark');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 600);

  // ── Saved & recent ──────────────────────────────────────────────────────────
  const [saved, setSavedState]     = useState(() => store.get('keyref_saved'));
  const [recent, setRecentState]   = useState(() => store.get('keyref_recent'));
  const [savedFilter, setSavedFilter] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editingNoteText, setEditingNoteText] = useState('');

  // ── Reverse lookup state ────────────────────────────────────────────────────
  const [blankQuery, setBlankQuery] = useState('');
  const [blankResults, setBlankResults] = useState([]);
  const [reverseIndex, setReverseIndex] = useState(null); // built lazily
  const [reverseLoading, setReverseLoading] = useState(false);

  const ignitionPrompt = useMemo(() => getIgnitionPrompt(models, model), [models, model]);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/data/inventory/_index.json');
        if (!r.ok) throw new Error('Failed to load makes index');
        const index = await r.json();
        setMakesIndex(index);
        setMakes(Object.keys(index).sort());
      } catch (e) {
        console.error(e);
        setError('Failed to load makes data. Please refresh the page.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!make || !makesIndex) {
      setModels([]); setModel(''); setCurrentMakeData(null); setError('');
      return;
    }
    (async () => {
      try {
        const filename = makesIndex[make]?.file || `${make.toLowerCase()}.json`;
        const r = await fetch(`/data/inventory/${filename}`);
        if (!r.ok) throw new Error(r.status === 404 ? `No data available for ${make} yet.` : `HTTP ${r.status}`);
        const data = await r.json();
        const outerKey = Object.keys(data)[0];
        setModels(Object.keys(data[outerKey]).sort());
        setCurrentMakeData(data);
        setModel('');
        setError('');
      } catch (e) {
        console.error(e);
        setModels([]); setModel(''); setCurrentMakeData(null);
        setError(e.message || `No data available for ${make}.`);
      }
    })();
  }, [make, makesIndex]);

  useEffect(() => { store.set('keyref_theme', darkMode ? 'dark' : 'light'); }, [darkMode]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const updateRecent = useCallback((entry) => {
    const next = [entry, ...store.get('keyref_recent').filter(r => !(r.year === entry.year && r.make === entry.make && r.model === entry.model))].slice(0, 10);
    store.set('keyref_recent', next);
    setRecentState(next);
  }, []);

  async function runLookup() {
    if (!year || !make || !model || loading || !makesIndex) return;
    setLoading(true); setError(''); setResult(null);

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > 2025) {
      setError('Year must be between 1980 and 2025.');
      setLoading(false);
      return;
    }
    try {
      if (!currentMakeData) throw new Error(`No data available for ${make}.`);
      const dbResult = searchDatabase(yearNum, model, currentMakeData);
      if (dbResult) {
        setResult(dbResult);
        setVehicle({ year, make, model });
        updateRecent({ year, make, model, result: dbResult, ts: Date.now() });
      } else {
        const ranges = getAvailableYears(model, currentMakeData);
        if (ranges.length) {
          setError(`No data for ${year} ${make} ${model}. Available: ${ranges.join(', ')}`);
        } else {
          setError(`Data unavailable for ${year} ${make} ${model}`);
        }
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
    const next = [{ ...vehicle, result, ts: Date.now() },
      ...store.get('keyref_saved').filter(s => !(s.year === vehicle.year && s.make === vehicle.make && s.model === vehicle.model))].slice(0, 30);
    store.set('keyref_saved', next);
    setSavedState(next);
  }

  function deleteSaved(y, mk, mo) {
    const next = store.get('keyref_saved').filter(s => !(s.year === y && s.make === mk && s.model === mo));
    store.set('keyref_saved', next);
    setSavedState(next);
  }

  function loadSaved(e) {
    setMode('vehicle');
    setResult(e.result);
    setVehicle({ year: e.year, make: e.make, model: e.model });
    setYear(e.year); setMake(e.make); setModel(e.model);
    setEditingNoteId('');
  }

  function startEditNote(item) {
    setEditingNoteId(`${item.year}-${item.make}-${item.model}`);
    setEditingNoteText(item.note || '');
  }

  function commitSavedNote(id) {
    const next = saved.map(s => `${s.year}-${s.make}-${s.model}` === id ? { ...s, note: editingNoteText.trim() } : s);
    store.set('keyref_saved', next);
    setSavedState(next);
    setEditingNoteId(''); setEditingNoteText('');
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlank(text);
      setTimeout(() => setCopiedBlank(null), 1500);
    } catch (e) { console.error(e); }
  }

  function applyVin() {
    const y = vinToYear(vinInput);
    if (y) {
      setYear(String(y));
      setVinInput('');
    } else {
      setError('Invalid VIN. Must be at least 10 characters with valid year code.');
    }
  }

  async function loadObpProcedure(letter) {
    if (expandedObp === letter) {
      setExpandedObp(null);
      return;
    }
    setExpandedObp(letter);
    if (!obpData) {
      try {
        const r = await fetch('/data/procedures/obp.json');
        if (r.ok) setObpData(await r.json());
      } catch (e) { console.error(e); }
    }
  }

  // ── Reverse blank lookup ────────────────────────────────────────────────────
  async function buildReverseIndex() {
    if (reverseIndex || reverseLoading || !makesIndex) return;
    setReverseLoading(true);
    try {
      const files = Object.values(makesIndex).map(v => v.file);
      const responses = await Promise.all(files.map(f => fetch(`/data/inventory/${f}`).then(r => r.json()).catch(() => null)));
      const index = {};
      responses.forEach(data => {
        if (!data) return;
        const make = Object.keys(data)[0];
        const models = data[make];
        for (const [modelName, entries] of Object.entries(models)) {
          for (const e of entries) {
            for (const blank of (e.keyBlanks || [])) {
              if (!blank) continue;
              const key = blank.toUpperCase();
              if (!index[key]) index[key] = [];
              index[key].push({
                blank,
                make,
                model: modelName,
                yearStart: e.yearStart,
                yearEnd: e.yearEnd,
                keyType: e.keyType,
              });
            }
          }
        }
      });
      setReverseIndex(index);
    } catch (e) {
      console.error(e);
    } finally {
      setReverseLoading(false);
    }
  }

  function runBlankSearch(query) {
    setBlankQuery(query);
    if (!query.trim() || !reverseIndex) { setBlankResults([]); return; }
    const q = query.toUpperCase().trim();
    const matches = [];
    for (const [blank, vehicles] of Object.entries(reverseIndex)) {
      if (blank.includes(q)) {
        matches.push(...vehicles);
        if (matches.length > 100) break;
      }
    }
    setBlankResults(matches.slice(0, 100));
  }

  useEffect(() => {
    if (mode === 'blank' && !reverseIndex && !reverseLoading) {
      buildReverseIndex();
    }
  }, [mode]); // eslint-disable-line

  // ── Derived values ──────────────────────────────────────────────────────────
  const isSaved = vehicle && saved.some(s => s.year === vehicle.year && s.make === vehicle.make && s.model === vehicle.model);
  const blanks = result ? (Array.isArray(result.keyBlanks) ? result.keyBlanks : [result.keyBlanks]).filter(Boolean) : [];
  const canLookup = year && make && model && !loading && makesIndex;
  const filteredSaved = saved.filter(s => `${s.year} ${s.make} ${s.model}`.toLowerCase().includes(savedFilter.toLowerCase()));

  // ── Styles (theme-aware) ────────────────────────────────────────────────────
  const t = useMemo(() => darkMode ? {
    bg: '#0d0d0d', panel: '#161616', border: '#2a2a2a', text: '#e8e8e8',
    mute: '#787878', input: '#0d0d0d', muteVal: '#4a4a4a', notesBg: '#0d0d0d',
    headerBg: '#1e1e1e', logo: '#e8e8e8',
  } : {
    bg: '#f5f0e8', panel: '#ffffff', border: '#ddd', text: '#1a1a1a',
    mute: '#555', input: '#ffffff', muteVal: '#888', notesBg: '#f5f0e8',
    headerBg: '#f5f0e8', logo: '#1a1a1a',
  }, [darkMode]);

  const S = {
    app: { background: t.bg, minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif", color: t.text, padding: '0 16px 60px' },
    inner: { maxWidth: 1000, margin: '0 auto' },
    header: { padding: '24px 0 18px', borderBottom: `1px solid ${t.border}`, marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
    logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? 36 : 46, letterSpacing: 2, lineHeight: 1, color: t.logo },
    logoSub: { fontFamily: 'monospace', fontSize: 9, color: '#787878', letterSpacing: 3, marginTop: 3 },
    panel: { background: t.panel, border: `1px solid ${t.border}`, padding: 20, marginBottom: 16 },
    panelLabel: { fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#f5a623', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
    labelBar: { width: 12, height: 2, background: '#f5a623', display: 'block' },
    modeToggle: { display: 'flex', gap: 6, marginBottom: 16 },
    modeBtn: (active) => ({ flex: 1, background: active ? '#f5a623' : 'transparent', border: `1px solid ${active ? '#f5a623' : t.border}`, color: active ? '#000' : t.text, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, padding: '10px 12px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: active ? 600 : 400 }),
    formRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '90px 1fr 1fr', gap: 10, marginBottom: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    fieldLabel: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: t.mute, textTransform: 'uppercase' },
    selWrap: { position: 'relative' },
    select: { background: t.input, border: `1px solid ${t.border === '#2a2a2a' ? '#3a3a3a' : t.border}`, color: t.text, fontFamily: 'monospace', fontSize: 13, padding: '9px 28px 9px 10px', width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none' },
    selArrow: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#f5a623', fontSize: 11, pointerEvents: 'none' },
    inputNum: { background: t.input, border: `1px solid ${t.border === '#2a2a2a' ? '#3a3a3a' : t.border}`, color: t.text, fontFamily: 'monospace', fontSize: 13, padding: '9px 10px', width: '100%', outline: 'none' },
    vinRow: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'stretch' },
    vinInput: { flex: 1, background: t.input, border: `1px solid ${t.border === '#2a2a2a' ? '#3a3a3a' : t.border}`, color: t.text, fontFamily: 'monospace', fontSize: 11, padding: '8px 10px', outline: 'none', textTransform: 'uppercase' },
    vinBtn: { background: 'transparent', border: '1px solid #f5a623', color: '#f5a623', fontFamily: 'monospace', fontSize: 10, padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' },
    btnLookup: (disabled) => ({ width: '100%', background: disabled ? '#555' : '#f5a623', border: 'none', color: disabled ? '#999' : '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, padding: 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, minHeight: 44 }),
    errMsg: { background: 'rgba(224,82,82,0.08)', borderLeft: '3px solid #e05252', color: '#e05252', fontFamily: 'monospace', fontSize: 12, padding: '11px 15px', marginBottom: 14 },
    resultCard: { background: t.panel, border: `1px solid ${t.border}`, marginBottom: 16, overflow: 'hidden' },
    resultHeader: { background: t.headerBg, borderBottom: `1px solid ${t.border}`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    resultVehicle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? 20 : 24, letterSpacing: 1, color: '#f5a623', lineHeight: 1 },
    btnSave: (saved) => ({ background: 'transparent', border: `1px solid ${saved ? '#52e0a0' : '#3a3a3a'}`, color: saved ? '#52e0a0' : '#787878', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, padding: '5px 11px', cursor: saved ? 'default' : 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', minHeight: 44 }),
    resultBody: { padding: 18, display: 'grid', gap: 10 },
    dataRow: (isLast) => ({ display: 'grid', gridTemplateColumns: isMobile ? '100px 1fr' : '150px 1fr', gap: 10, alignItems: 'start', borderBottom: isLast ? 'none' : `1px solid ${t.border}`, paddingBottom: isLast ? 0 : 10 }),
    dataKey: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: t.mute, textTransform: 'uppercase', paddingTop: 2 },
    dataVal: { fontFamily: 'monospace', fontSize: 13, color: t.text, lineHeight: 1.5, wordBreak: 'break-word' },
    dataValHi: { fontFamily: 'monospace', fontSize: 15, color: '#f5a623', fontWeight: 600, lineHeight: 1.5 },
    dataValYes: { fontFamily: 'monospace', fontSize: 13, color: '#52e0a0', lineHeight: 1.5 },
    dataValMuted: { fontFamily: 'monospace', fontSize: 13, color: t.muteVal, lineHeight: 1.5 },
    tag: { display: 'inline-block', background: 'rgba(245,166,35,0.12)', border: '1px solid #c47d0e', color: '#f5a623', fontFamily: 'monospace', fontSize: 12, padding: '4px 10px', margin: '2px 4px 2px 0', cursor: 'pointer', userSelect: 'none', minHeight: 28 },
    notesBox: { background: t.notesBg, borderLeft: '2px solid #c47d0e', padding: '9px 13px', fontFamily: 'monospace', fontSize: 12, color: t.mute, lineHeight: 1.6 },
    obpToggle: { background: 'transparent', border: '1px solid #f5a623', color: '#f5a623', fontFamily: 'monospace', fontSize: 11, padding: '6px 12px', cursor: 'pointer', textTransform: 'uppercase', marginTop: 6, letterSpacing: 1 },
    obpPanel: { background: t.notesBg, border: `1px solid ${t.border}`, borderLeft: '3px solid #f5a623', padding: 14, marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: t.text, lineHeight: 1.6 },
    obpTitle: { color: '#f5a623', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    savedList: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 },
    savedItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', background: t.input, border: `1px solid ${t.border}`, cursor: 'pointer', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' },
    savedVehicle: { fontFamily: 'monospace', fontSize: 13, color: t.text, flex: 1, minWidth: 100 },
    savedBlank: { fontFamily: 'monospace', fontSize: 11, color: '#f5a623' },
    btnDel: { background: 'transparent', border: 'none', color: '#787878', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1, minWidth: 28, minHeight: 28 },
    empty: { fontFamily: 'monospace', fontSize: 11, color: t.muteVal, letterSpacing: 1, padding: '6px 0' },
    themeToggle: { background: 'transparent', border: `1px solid ${t.border}`, color: t.text, fontSize: 16, padding: '7px 10px', cursor: 'pointer', fontFamily: 'monospace' },
    savedSearchInput: { background: t.input, border: `1px solid ${t.border === '#2a2a2a' ? '#3a3a3a' : t.border}`, color: t.text, fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', width: '100%', outline: 'none', marginBottom: 8 },
    ignitionPanel: { background: 'rgba(245,166,35,0.08)', borderLeft: '3px solid #f5a623', color: t.text, fontFamily: 'monospace', fontSize: 12, padding: '12px 14px', marginBottom: 14, display: 'grid', gap: 8 },
    ignitionButton: { background: 'transparent', border: '1px solid #f5a623', color: '#f5a623', fontFamily: 'monospace', fontSize: 11, padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase', minHeight: 36 },
    savedNoteInput: { background: t.input, border: `1px solid ${t.border}`, color: t.text, fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', width: '100%', outline: 'none' },
    savedNoteText: { fontFamily: 'monospace', fontSize: 11, color: '#787878', marginTop: 4 },
    footer: { marginTop: 32, paddingTop: 14, borderTop: `1px solid ${t.border}`, fontFamily: 'monospace', fontSize: 9, color: t.muteVal, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  };

  // ── Render result field rows ────────────────────────────────────────────────
  function renderResultFields() {
    const rows = [];
    if (blanks.length > 0) {
      rows.push(
        <div key="blanks" style={S.dataRow(false)}>
          <div style={S.dataKey}>Key Blank(s)</div>
          <div style={S.dataValHi}>{blanks.map(b => {
            const isOem = b.toUpperCase().includes('OEM');
            const isCopied = copiedBlank === b;
            return (
              <span key={b}
                    style={{...S.tag, background: isCopied ? 'rgba(245,166,35,0.3)' : S.tag.background, fontSize: isOem ? 11 : 12}}
                    onClick={() => copyToClipboard(b)}
                    title="Tap to copy">
                {isCopied ? '✓ Copied' : (isOem ? `[OEM] ${b.replace(/^OEM#?\s*/i, '')}` : b)}
              </span>
            );
          })}</div>
        </div>
      );
    }
    RESULT_FIELDS.forEach(f => {
      const val = result[f.key];
      if (!val && !f.fallback) return;
      const display = val || f.fallback;
      const valStyle = !val && f.mutedIfEmpty ? S.dataValMuted : S.dataVal;
      rows.push(
        <div key={f.key} style={S.dataRow(false)}>
          <div style={S.dataKey}>{f.label}</div>
          <div style={valStyle}>{display}</div>
        </div>
      );
    });
    // Programming row (special — has badge)
    rows.push(
      <div key="prog" style={S.dataRow(false)}>
        <div style={S.dataKey}>Programming</div>
        <div style={result.programmingRequired ? S.dataValYes : S.dataValMuted}>
          {result.programmingRequired ? '⚡ Required' : '✓ Not Required'}
        </div>
      </div>
    );
    if (result.programmingRequired && result.programmingMethod) {
      rows.push(
        <div key="progMethod" style={S.dataRow(false)}>
          <div style={S.dataKey}>Program Method</div>
          <div style={S.dataVal}>
            <div>{result.programmingMethod}</div>
            {result.programmingProcedure?.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.programmingProcedure.map(letter => (
                  <button key={letter} style={S.obpToggle} onClick={() => loadObpProcedure(letter)}>
                    {expandedObp === letter ? '▼' : '▶'} View OBP {letter} Steps
                  </button>
                ))}
              </div>
            )}
            {expandedObp && result.programmingProcedure?.includes(expandedObp) && obpData?.[expandedObp] && (
              <div style={S.obpPanel}>
                <div style={S.obpTitle}>{obpData[expandedObp].title || `Procedure ${expandedObp}`}</div>
                {obpData[expandedObp].vehicles && <div style={{ color: t.mute, marginBottom: 6 }}>Applies to: {obpData[expandedObp].vehicles}</div>}
                {obpData[expandedObp].requirement && <div style={{ color: '#f5a623', marginBottom: 6 }}>⚠ {obpData[expandedObp].requirement}</div>}
                {obpData[expandedObp].notes && <div style={{ marginBottom: 8, fontStyle: 'italic' }}>{obpData[expandedObp].notes}</div>}
                {['steps', 'steps_originate', 'steps_add', 'steps_rke'].map(stepKey => {
                  const steps = obpData[expandedObp][stepKey];
                  if (!steps?.length) return null;
                  const label = { steps_originate: 'Originate New Key', steps_add: 'Add Additional Key', steps_rke: 'Program Remote (RKE)', steps: 'Procedure' }[stepKey];
                  return (
                    <div key={stepKey} style={{ marginTop: 10 }}>
                      <div style={{ color: '#f5a623', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                      <ol style={{ paddingLeft: 18, margin: 0 }}>
                        {steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                      </ol>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (result.notes) {
      rows.push(
        <div key="notes" style={S.dataRow(true)}>
          <div style={S.dataKey}>Notes</div>
          <div style={S.notesBox}>{result.notes}</div>
        </div>
      );
    }
    return rows;
  }

  return (
    <div style={S.app}>
      <div style={S.inner}>
        {/* HEADER */}
        <header style={S.header}>
          <div>
            <div style={S.logo}>KEY<span style={{color:'#f5a623'}}>REF</span> PRO</div>
            <div style={S.logoSub}>AUTOMOTIVE KEY DATABASE · 2025 REFERENCE</div>
          </div>
          <button style={S.themeToggle} onClick={() => setDarkMode(p => !p)} title="Toggle theme">
            {darkMode ? '☀' : '☾'}
          </button>
        </header>

        {/* MODE TOGGLE */}
        <div style={S.modeToggle}>
          <button style={S.modeBtn(mode === 'vehicle')} onClick={() => setMode('vehicle')}>🚗 Vehicle Lookup</button>
          <button style={S.modeBtn(mode === 'blank')} onClick={() => setMode('blank')}>🔑 Blank Lookup</button>
        </div>

        {/* VEHICLE LOOKUP MODE */}
        {mode === 'vehicle' && (
          <>
            <div style={S.panel}>
              <div style={S.panelLabel}><span style={S.labelBar}/>Vehicle Lookup</div>

              {/* VIN Decoder */}
              <div style={S.vinRow}>
                <input
                  type="text"
                  value={vinInput}
                  onChange={e => setVinInput(e.target.value.toUpperCase().slice(0, 17))}
                  placeholder="Paste VIN to auto-fill year (optional)"
                  style={S.vinInput}
                  maxLength={17}
                />
                <button style={S.vinBtn} onClick={applyVin} disabled={vinInput.length < 10}>Decode</button>
              </div>

              <div style={S.formRow}>
                <div style={S.field}>
                  <div style={S.fieldLabel}>Year</div>
                  <input type="number" min="1980" max="2025" value={year} onChange={e => setYear(e.target.value)} style={S.inputNum} placeholder="e.g. 2020"/>
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
                  <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                    <button style={S.ignitionButton} onClick={() => setModel(ignitionPrompt.prox)}>Yes — W/ Prox</button>
                    <button style={S.ignitionButton} onClick={() => setModel(ignitionPrompt.regular)}>No — Regular Ignition</button>
                  </div>
                </div>
              )}

              <button style={S.btnLookup(!canLookup)} disabled={!canLookup} onClick={runLookup}>
                {loading ? 'SEARCHING…' : 'RUN LOOKUP'}
              </button>
            </div>

            {error && <div style={S.errMsg}>{error}</div>}

            {result && vehicle && (
              <div style={S.resultCard}>
                <div style={S.resultHeader}>
                  <div>
                    <div style={S.resultVehicle}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
                    <div style={{fontFamily:'monospace', fontSize:9, color:'#787878', marginTop:4}}>
                      Source: {result.dataSource || 'Database'}
                    </div>
                    <div style={{fontFamily:'monospace', fontSize:9, color:'#787878', marginTop:2}}>
                      Matched range: {result.yearStart}–{result.yearEnd}
                    </div>
                  </div>
                  <button style={S.btnSave(isSaved)} onClick={saveResult}>{isSaved ? '✓ SAVED' : '+ SAVE'}</button>
                </div>
                <div style={S.resultBody}>{renderResultFields()}</div>
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
                      return (
                        <div key={`${r.year}-${r.make}-${r.model}`} style={S.savedItem} onClick={() => loadSaved(r)}>
                          <div style={S.savedVehicle}>{r.year} {r.make} {r.model}</div>
                          <div style={{...S.savedBlank, flex:1, textAlign:'center'}}>{bl}</div>
                          <div style={{fontFamily:'monospace', fontSize:10, color:'#787878'}}>{timeAgo(r.ts)}</div>
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
                <input type="text" value={savedFilter} onChange={e => setSavedFilter(e.target.value)}
                       placeholder="Search saved lookups..." style={S.savedSearchInput}/>
              )}
              <div style={S.savedList}>
                {saved.length === 0
                  ? <div style={S.empty}>No saved lookups yet.</div>
                  : filteredSaved.map(s => {
                      const bl = Array.isArray(s.result.keyBlanks) ? s.result.keyBlanks[0] : (s.result.keyBlanks || '');
                      const itemKey = `${s.year}-${s.make}-${s.model}`;
                      if (editingNoteId === itemKey) {
                        return (
                          <div key={itemKey} style={S.savedItem}>
                            <input autoFocus type="text" value={editingNoteText}
                                   onChange={e => setEditingNoteText(e.target.value)}
                                   onBlur={() => commitSavedNote(itemKey)}
                                   onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitSavedNote(itemKey); }}}
                                   placeholder="Add a note..." style={S.savedNoteInput}/>
                          </div>
                        );
                      }
                      return (
                        <div key={itemKey} style={S.savedItem} onClick={() => loadSaved(s)}>
                          <div style={{flex:1, minWidth:100}}>
                            <div style={S.savedVehicle}>{s.year} {s.make} {s.model}</div>
                            {s.note && <div style={S.savedNoteText}>{s.note}</div>}
                          </div>
                          <div style={{...S.savedBlank, textAlign:'center'}}>{bl}</div>
                          <div style={{fontFamily:'monospace', fontSize:10, color:'#787878'}}>{timeAgo(s.ts)}</div>
                          <button style={S.btnDel} onClick={e => { e.stopPropagation(); startEditNote(s); }}>✎</button>
                          <button style={S.btnDel} onClick={e => { e.stopPropagation(); deleteSaved(s.year, s.make, s.model); }}>×</button>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </>
        )}

        {/* BLANK LOOKUP MODE */}
        {mode === 'blank' && (
          <div style={S.panel}>
            <div style={S.panelLabel}><span style={S.labelBar}/>Reverse Blank Lookup</div>
            <div style={{...S.field, marginBottom: 12}}>
              <div style={S.fieldLabel}>Key Blank Number</div>
              <input
                type="text"
                value={blankQuery}
                onChange={e => runBlankSearch(e.target.value)}
                placeholder={reverseLoading ? 'Building index…' : 'e.g. HO03-PT, HU92RP, B111-PT'}
                style={S.inputNum}
                disabled={reverseLoading || !reverseIndex}
              />
              {reverseLoading && <div style={{fontFamily:'monospace', fontSize:11, color:t.mute, marginTop:6}}>Loading database… (one-time, takes ~2 sec)</div>}
              {reverseIndex && !reverseLoading && (
                <div style={{fontFamily:'monospace', fontSize:10, color:t.mute, marginTop:6}}>
                  {Object.keys(reverseIndex).length} unique blanks indexed
                </div>
              )}
            </div>
            <div style={S.savedList}>
              {!blankQuery.trim() ? <div style={S.empty}>Type a blank number to see compatible vehicles.</div>
                : blankResults.length === 0 ? <div style={S.empty}>No matches for "{blankQuery}"</div>
                : blankResults.map((v, i) => (
                  <div key={`${v.blank}-${v.make}-${v.model}-${i}`} style={S.savedItem}
                       onClick={() => {
                         setMode('vehicle');
                         setMake(v.make);
                         setModel(v.model);
                         setYear(String(v.yearStart));
                       }}>
                    <div style={{flex:1, minWidth:100}}>
                      <div style={S.savedVehicle}>{v.yearStart}–{v.yearEnd} {v.make}</div>
                      <div style={{fontFamily:'monospace', fontSize:11, color:t.mute}}>{v.model}</div>
                    </div>
                    <div style={S.savedBlank}>{v.blank}</div>
                  </div>
                ))
              }
              {blankResults.length === 100 && (
                <div style={S.empty}>Showing first 100 matches — refine your search for more.</div>
              )}
            </div>
          </div>
        )}

        <div style={S.footer}>KeyRef Pro · Professional Use Only · 2025 Reference Guide</div>
      </div>
    </div>
  );
}
