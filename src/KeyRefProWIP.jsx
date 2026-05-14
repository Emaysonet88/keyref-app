import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { decodeVin, buildSearchIndex, search as runSearch } from './search-utils';

// ── Local storage helpers ────────────────────────────────────────────────────
const store = {
  get: (key, def = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

// ── Time formatting ──────────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Ignition variant detector ────────────────────────────────────────────────
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

// ── Result card field configuration ──────────────────────────────────────────
const RESULT_FIELDS = [
  { key: 'keyType',         label: 'Key Type',         fallback: '—' },
  { key: 'transponderChip', label: 'Transponder Chip', fallback: 'None / Not Required', mutedIfEmpty: true },
  { key: 'codeRange',       label: 'Code Range' },
  { key: 'cloningMethod',   label: 'Cloning Method' },
  { key: 'substitutes',     label: 'Substitutes' },
  { key: 'lockApps',        label: 'Lock Apps' },
  { key: 'cardNo',          label: 'Card No.' },
];

// ── Database search ──────────────────────────────────────────────────────────
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
  // ── Core lookup state ──────────────────────────────────────────────────────
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

  // ── UI / mode state ────────────────────────────────────────────────────────
  const [mode, setMode] = useState('vehicle'); // 'vehicle' | 'search' | 'blank'
  const [vinInput, setVinInput] = useState('');
  const [vinFlash, setVinFlash] = useState('');
  const [copiedBlank, setCopiedBlank] = useState(null);
  const [expandedObp, setExpandedObp] = useState(null);
  const [obpData, setObpData] = useState(null);
  const [darkMode, setDarkMode] = useState(() => store.get('keyref_theme', 'dark') === 'dark');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 600);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSync, setLastSync] = useState(() => store.get('keyref_last_sync', null));

  // ── Saved & recent ─────────────────────────────────────────────────────────
  const [saved, setSavedState]     = useState(() => store.get('keyref_saved'));
  const [recent, setRecentState]   = useState(() => store.get('keyref_recent'));
  const [savedFilter, setSavedFilter] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editingNoteText, setEditingNoteText] = useState('');

  // ── Universal search state ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState(() => store.get('keyref_search_history'));
  const [allDataIndex, setAllDataIndex] = useState(null); // unified search index
  const [allDataLoading, setAllDataLoading] = useState(false);
  const searchInputRef = useRef(null);

  // ── Reverse blank lookup state ─────────────────────────────────────────────
  const [blankQuery, setBlankQuery] = useState('');
  const [blankResults, setBlankResults] = useState([]);

  const ignitionPrompt = useMemo(() => getIgnitionPrompt(models, model), [models, model]);

  // ── Effects ────────────────────────────────────────────────────────────────
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
        setError('Failed to load makes data. Please refresh.');
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

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // Ignore when typing in inputs
      if (e.target.matches('input, textarea, select')) {
        if (e.key === 'Escape' && e.target === searchInputRef.current) {
          setSearchQuery('');
          setSearchResults([]);
          e.target.blur();
        }
        return;
      }
      if (e.key === '/' && (mode === 'search' || mode === 'vehicle')) {
        e.preventDefault();
        setMode('search');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  // ── Unified data fetch (used by search + reverse blank) ────────────────────
  const ensureAllData = useCallback(async () => {
    if (allDataIndex || allDataLoading || !makesIndex) return allDataIndex;
    setAllDataLoading(true);
    try {
      const files = Object.values(makesIndex).map(v => v.file);
      const responses = await Promise.all(
        files.map(f => fetch(`/data/inventory/${f}`).then(r => r.json()).catch(() => null))
      );
      const idx = buildSearchIndex(responses);
      setAllDataIndex(idx);
      const now = Date.now();
      store.set('keyref_last_sync', now);
      setLastSync(now);
      return idx;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setAllDataLoading(false);
    }
  }, [allDataIndex, allDataLoading, makesIndex]);

  // Lazy-load index when switching to search or blank mode
  useEffect(() => {
    if ((mode === 'search' || mode === 'blank') && !allDataIndex && !allDataLoading) {
      ensureAllData();
    }
  }, [mode, allDataIndex, allDataLoading, ensureAllData]);

  // ── Run search whenever query or index changes ─────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || !allDataIndex) { setSearchResults([]); return; }
    setSearchResults(runSearch(allDataIndex, searchQuery, { maxResults: 50 }));
  }, [searchQuery, allDataIndex]);

  // ── Run blank lookup whenever query or index changes ───────────────────────
  useEffect(() => {
    if (!blankQuery.trim() || !allDataIndex) { setBlankResults([]); return; }
    const q = blankQuery.toUpperCase().trim();
    const matches = [];
    for (const r of allDataIndex.models) {
      for (const blank of (r.keyBlanks || [])) {
        if (blank?.toUpperCase().includes(q)) {
          matches.push({ ...r, blank });
          break;
        }
      }
      if (matches.length >= 100) break;
    }
    setBlankResults(matches);
  }, [blankQuery, allDataIndex]);

  // ── Search history ─────────────────────────────────────────────────────────
  const pushSearchHistory = useCallback((q) => {
    if (!q.trim()) return;
    const cleaned = q.trim();
    const next = [cleaned, ...store.get('keyref_search_history').filter(h => h !== cleaned)].slice(0, 10);
    store.set('keyref_search_history', next);
    setSearchHistory(next);
  }, []);

  // ── Recent vehicle lookups ─────────────────────────────────────────────────
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
    const decoded = decodeVin(vinInput);
    if (!decoded) {
      setVinFlash('Invalid VIN — must be at least 10 chars');
      setTimeout(() => setVinFlash(''), 2500);
      return;
    }
    setYear(String(decoded.year));
    let msg = `Year: ${decoded.year}`;
    if (decoded.make) {
      // Match against makes list (case-insensitive)
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

  async function loadObpProcedure(letter) {
    if (expandedObp === letter) { setExpandedObp(null); return; }
    setExpandedObp(letter);
    if (!obpData) {
      try {
        const r = await fetch('/data/procedures/obp.json');
        if (r.ok) setObpData(await r.json());
      } catch (e) { console.error(e); }
    }
  }

  function handleSearchResultClick(r) {
    setMode('vehicle');
    setMake(r.make);
    setModel(r.model);
    setYear(String(r.yearStart));
    pushSearchHistory(searchQuery);
    setSearchQuery('');
    setSearchResults([]);
  }

  function handleBlankResultClick(r) {
    setMode('vehicle');
    setMake(r.make);
    setModel(r.model);
    setYear(String(r.yearStart));
    setBlankQuery('');
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const isSaved = vehicle && saved.some(s => s.year === vehicle.year && s.make === vehicle.make && s.model === vehicle.model);
  const blanks = result ? (Array.isArray(result.keyBlanks) ? result.keyBlanks : [result.keyBlanks]).filter(Boolean) : [];
  const canLookup = year && make && model && !loading && makesIndex;
  const filteredSaved = saved.filter(s => `${s.year} ${s.make} ${s.model}`.toLowerCase().includes(savedFilter.toLowerCase()));

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = useMemo(() => darkMode ? {
    bg: '#0d0d0d', panel: '#161616', border: '#2a2a2a', borderStrong: '#3a3a3a',
    text: '#e8e8e8', mute: '#787878', input: '#0d0d0d', muteVal: '#4a4a4a',
    notesBg: '#0d0d0d', headerBg: '#1e1e1e', logo: '#e8e8e8',
  } : {
    bg: '#f5f0e8', panel: '#ffffff', border: '#ddd', borderStrong: '#bbb',
    text: '#1a1a1a', mute: '#555', input: '#ffffff', muteVal: '#888',
    notesBg: '#f5f0e8', headerBg: '#f5f0e8', logo: '#1a1a1a',
  }, [darkMode]);

  const S = {
    app: { background: t.bg, minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif", color: t.text, padding: '0 16px 60px' },
    inner: { maxWidth: 1000, margin: '0 auto' },
    header: { padding: '24px 0 18px', borderBottom: `1px solid ${t.border}`, marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
    logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? 36 : 46, letterSpacing: 2, lineHeight: 1, color: t.logo },
    logoSub: { fontFamily: 'monospace', fontSize: 9, color: '#787878', letterSpacing: 3, marginTop: 3 },
    headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
    statusBadge: (online) => ({ fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, padding: '4px 8px', border: `1px solid ${online ? '#52e0a0' : '#e0a052'}`, color: online ? '#52e0a0' : '#e0a052', textTransform: 'uppercase' }),
    panel: { background: t.panel, border: `1px solid ${t.border}`, padding: 20, marginBottom: 16 },
    panelLabel: { fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, color: '#f5a623', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    panelLabelHint: { fontFamily: 'monospace', fontSize: 9, color: t.mute, letterSpacing: 1, textTransform: 'none', marginLeft: 'auto' },
    labelBar: { width: 12, height: 2, background: '#f5a623', display: 'block' },
    modeToggle: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
    modeBtn: (active) => ({ flex: 1, minWidth: 100, background: active ? '#f5a623' : 'transparent', border: `1px solid ${active ? '#f5a623' : t.border}`, color: active ? '#000' : t.text, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, padding: '10px 12px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: active ? 600 : 400 }),
    formRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '90px 1fr 1fr', gap: 10, marginBottom: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    fieldLabel: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: t.mute, textTransform: 'uppercase' },
    selWrap: { position: 'relative' },
    select: { background: t.input, border: `1px solid ${t.borderStrong}`, color: t.text, fontFamily: 'monospace', fontSize: 13, padding: '9px 28px 9px 10px', width: '100%', appearance: 'none', WebkitAppearance: 'none', outline: 'none' },
    selArrow: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#f5a623', fontSize: 11, pointerEvents: 'none' },
    inputNum: { background: t.input, border: `1px solid ${t.borderStrong}`, color: t.text, fontFamily: 'monospace', fontSize: 13, padding: '9px 10px', width: '100%', outline: 'none' },
    vinRow: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'stretch' },
    vinInput: { flex: 1, background: t.input, border: `1px solid ${t.borderStrong}`, color: t.text, fontFamily: 'monospace', fontSize: 11, padding: '8px 10px', outline: 'none', textTransform: 'uppercase' },
    vinBtn: { background: 'transparent', border: '1px solid #f5a623', color: '#f5a623', fontFamily: 'monospace', fontSize: 10, padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' },
    vinFlash: { fontFamily: 'monospace', fontSize: 11, color: '#52e0a0', marginBottom: 12, padding: '6px 10px', background: 'rgba(82,224,160,0.08)', borderLeft: '2px solid #52e0a0' },
    btnLookup: (disabled) => ({ width: '100%', background: disabled ? '#555' : '#f5a623', border: 'none', color: disabled ? '#999' : '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, padding: 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, minHeight: 44 }),
    errMsg: { background: 'rgba(224,82,82,0.08)', borderLeft: '3px solid #e05252', color: '#e05252', fontFamily: 'monospace', fontSize: 12, padding: '11px 15px', marginBottom: 14 },
    resultCard: { background: t.panel, border: `1px solid ${t.border}`, marginBottom: 16, overflow: 'hidden' },
    resultHeader: { background: t.headerBg, borderBottom: `1px solid ${t.border}`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    resultVehicle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? 20 : 24, letterSpacing: 1, color: '#f5a623', lineHeight: 1 },
    btnSave: (s) => ({ background: 'transparent', border: `1px solid ${s ? '#52e0a0' : '#3a3a3a'}`, color: s ? '#52e0a0' : '#787878', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, padding: '5px 11px', cursor: s ? 'default' : 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', minHeight: 44 }),
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
    savedSearchInput: { background: t.input, border: `1px solid ${t.borderStrong}`, color: t.text, fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', width: '100%', outline: 'none', marginBottom: 8 },
    ignitionPanel: { background: 'rgba(245,166,35,0.08)', borderLeft: '3px solid #f5a623', color: t.text, fontFamily: 'monospace', fontSize: 12, padding: '12px 14px', marginBottom: 14, display: 'grid', gap: 8 },
    ignitionButton: { background: 'transparent', border: '1px solid #f5a623', color: '#f5a623', fontFamily: 'monospace', fontSize: 11, padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase', minHeight: 36 },
    savedNoteInput: { background: t.input, border: `1px solid ${t.border}`, color: t.text, fontFamily: 'monospace', fontSize: 12, padding: '8px 10px', width: '100%', outline: 'none' },
    savedNoteText: { fontFamily: 'monospace', fontSize: 11, color: '#787878', marginTop: 4 },
    footer: { marginTop: 32, paddingTop: 14, borderTop: `1px solid ${t.border}`, fontFamily: 'monospace', fontSize: 9, color: t.muteVal, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
    searchInput: { background: t.input, border: `1px solid ${t.borderStrong}`, color: t.text, fontFamily: 'monospace', fontSize: 14, padding: '12px 14px', width: '100%', outline: 'none', marginBottom: 10 },
    historyPill: { background: 'transparent', border: `1px solid ${t.border}`, color: t.mute, fontFamily: 'monospace', fontSize: 10, padding: '4px 10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 },
    typeBadge: (type) => {
      const c = { model: '#f5a623', chip: '#52e0a0', obp: '#a78bfa', codeRange: '#5fa6e0', fuzzy: '#787878' }[type] || '#787878';
      return { fontFamily: 'monospace', fontSize: 8, letterSpacing: 1, padding: '2px 6px', border: `1px solid ${c}`, color: c, textTransform: 'uppercase', borderRadius: 2 };
    },
  };

  // ── Render result fields (data-driven) ─────────────────────────────────────
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
          <div style={S.headerRight}>
            <div style={S.statusBadge(isOnline)}>{isOnline ? '● Online' : '○ Offline'}</div>
            <button style={S.themeToggle} onClick={() => setDarkMode(p => !p)} title="Toggle theme">
              {darkMode ? '☀' : '☾'}
            </button>
          </div>
        </header>

        {/* MODE TOGGLE */}
        <div style={S.modeToggle}>
          <button style={S.modeBtn(mode === 'vehicle')} onClick={() => setMode('vehicle')}>🚗 Vehicle</button>
          <button style={S.modeBtn(mode === 'search')} onClick={() => setMode('search')}>🔍 Search</button>
          <button style={S.modeBtn(mode === 'blank')} onClick={() => setMode('blank')}>🔑 Blank</button>
        </div>

        {/* ────────────────── VEHICLE LOOKUP MODE ────────────────── */}
        {mode === 'vehicle' && (
          <>
            <div style={S.panel}>
              <div style={S.panelLabel}><span style={S.labelBar}/>Vehicle Lookup</div>

              <div style={S.vinRow}>
                <input
                  type="text"
                  value={vinInput}
                  onChange={e => setVinInput(e.target.value.toUpperCase().slice(0, 17))}
                  placeholder="Paste VIN to auto-fill year + make"
                  style={S.vinInput}
                  maxLength={17}
                />
                <button style={S.vinBtn} onClick={applyVin} disabled={vinInput.length < 10}>Decode</button>
              </div>
              {vinFlash && <div style={S.vinFlash}>✓ {vinFlash}</div>}

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

        {/* ────────────────── UNIVERSAL SEARCH MODE ────────────────── */}
        {mode === 'search' && (
          <div style={S.panel}>
            <div style={S.panelLabel}>
              <span style={S.labelBar}/>Universal Search
              <span style={S.panelLabelHint}>press / to focus</span>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={allDataLoading ? 'Loading database…' : 'Search models, chips (Megamos), OBP letters, code ranges…'}
              style={S.searchInput}
              disabled={allDataLoading || !allDataIndex}
              autoFocus
            />
            {allDataLoading && <div style={{fontFamily:'monospace', fontSize:11, color:t.mute, marginBottom:10}}>Building search index… one-time, ~2s</div>}

            {searchHistory.length > 0 && !searchQuery && (
              <div style={{marginBottom: 14}}>
                <div style={{fontFamily:'monospace', fontSize:9, color:t.mute, letterSpacing:2, marginBottom:8, textTransform:'uppercase'}}>Recent searches</div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
                  {searchHistory.map(h => (
                    <button key={h} style={S.historyPill} onClick={() => setSearchQuery(h)}>{h}</button>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && (
              <div style={{fontFamily:'monospace', fontSize:10, color:t.mute, marginBottom:8}}>
                {searchResults.length === 0 ? `No matches for "${searchQuery}"` : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
              </div>
            )}

            <div style={S.savedList}>
              {searchResults.map((r, i) => (
                <div key={`${r.type}-${r.make}-${r.model}-${r.yearStart}-${i}`}
                     style={S.savedItem}
                     onClick={() => handleSearchResultClick(r)}>
                  <div style={{flex:1, minWidth:100}}>
                    <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                      <span style={S.typeBadge(r.type)}>{r.type}</span>
                      <span style={S.savedVehicle}>{r.label}</span>
                    </div>
                    <div style={S.savedNoteText}>{r.sublabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────────────────── REVERSE BLANK LOOKUP MODE ────────────────── */}
        {mode === 'blank' && (
          <div style={S.panel}>
            <div style={S.panelLabel}><span style={S.labelBar}/>Reverse Blank Lookup</div>
            <div style={{...S.field, marginBottom: 12}}>
              <div style={S.fieldLabel}>Key Blank Number</div>
              <input
                type="text"
                value={blankQuery}
                onChange={e => setBlankQuery(e.target.value)}
                placeholder={allDataLoading ? 'Loading database…' : 'e.g. HO03-PT, HU92RP, B111-PT'}
                style={S.inputNum}
                disabled={allDataLoading || !allDataIndex}
              />
              {allDataLoading && <div style={{fontFamily:'monospace', fontSize:11, color:t.mute, marginTop:6}}>Loading database…</div>}
              {allDataIndex && !allDataLoading && (
                <div style={{fontFamily:'monospace', fontSize:10, color:t.mute, marginTop:6}}>
                  Database ready · {allDataIndex.models.length} model-years indexed
                </div>
              )}
            </div>
            <div style={S.savedList}>
              {!blankQuery.trim() ? <div style={S.empty}>Type a blank number to see compatible vehicles.</div>
                : blankResults.length === 0 ? <div style={S.empty}>No matches for "{blankQuery}"</div>
                : blankResults.map((v, i) => (
                  <div key={`${v.blank}-${v.make}-${v.model}-${i}`} style={S.savedItem} onClick={() => handleBlankResultClick(v)}>
                    <div style={{flex:1, minWidth:100}}>
                      <div style={S.savedVehicle}>{v.yearStart}–{v.yearEnd} {v.make}</div>
                      <div style={{fontFamily:'monospace', fontSize:11, color:t.mute}}>{v.model}</div>
                    </div>
                    <div style={S.savedBlank}>{v.blank}</div>
                  </div>
                ))
              }
              {blankResults.length === 100 && (
                <div style={S.empty}>Showing first 100 — refine your search for more.</div>
              )}
            </div>
          </div>
        )}

        <div style={S.footer}>
          KeyRef Pro · Professional Use Only · 2025 Reference Guide
          {lastSync && (
            <div style={{marginTop:6, fontSize:8, opacity:0.6}}>
              Data cached: {timeAgo(lastSync)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
