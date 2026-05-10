import { useState, useEffect } from "react";

// 2025 PDF Database - Ilco Auto/Truck Key Blank Reference Guide
const KEY_DATABASE_2025 = {
  'Acura': {
    'CL': [
      { yearStart: 1998, yearEnd: 2003, keyBlanks: ['HD106-PT', 'HD107-PT'], keyType: 'Mechanical', transponderChip: 'Megamos (13)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP/SDD/TKO', notes: 'Fixed Code System' },
    ],
    'CSX': [
      { yearStart: 2006, yearEnd: 2011, keyBlanks: ['HO03-PT(V)'], keyType: 'High Security', transponderChip: 'Philips (46)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'Encrypted System' },
    ],
    'ILX': [
      { yearStart: 2016, yearEnd: 2022, keyBlanks: ['K001-N718'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: null, notes: 'Smart Pro/TCP/MVPP compatible' },
    ],
    'MDX': [
      { yearStart: 2007, yearEnd: 2013, keyBlanks: ['HO03-PT(V)', 'HO03-GTK'], keyType: 'High Security', transponderChip: 'Philips (46)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP/SDD/TKO', notes: 'Encrypted System' },
      { yearStart: 2001, yearEnd: 2006, keyBlanks: ['HD106-PT', 'HD107-PT'], keyType: 'Mechanical', transponderChip: 'Megamos (13)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP/SDD/TKO', notes: 'Fixed Code System' },
    ],
    'NSX': [
      { yearStart: 1997, yearEnd: 2005, keyBlanks: ['HD106-PT', 'HD107-PT'], keyType: 'Mechanical', transponderChip: 'Megamos (13)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP/SDD/TKO', notes: 'Fixed Code System' },
    ],
    'RDX': [
      { yearStart: 2019, yearEnd: 2025, keyBlanks: ['K001-N718'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: null, notes: '2025 Database' },
    ],
    'TL': [
      { yearStart: 2007, yearEnd: 2014, keyBlanks: ['HO03-PT(V)', 'HO03-GTK'], keyType: 'High Security', transponderChip: 'Philips (46)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP/SDD/TKO', notes: 'Encrypted System' },
      { yearStart: 1999, yearEnd: 2003, keyBlanks: ['HD106-PT', 'HD107-PT'], keyType: 'Mechanical', transponderChip: 'Megamos (13)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP/SDD/TKO', notes: 'Fixed Code System' },
    ],
    'TLX': [
      { yearStart: 2021, yearEnd: 2025, keyBlanks: ['K001-N718'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: null, notes: '2025 Database' },
    ],
  },
  'BMW': {
    '1 Series': [
      { yearStart: 2008, yearEnd: 2011, keyBlanks: ['HU92RP'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Dealer FOB, Rolling Code System' },
    ],
    '3 Series': [
      { yearStart: 2012, yearEnd: 2025, keyBlanks: ['HU92RP'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro RW5', notes: 'High Security, Rolling Code' },
    ],
    '5 Series': [
      { yearStart: 1995, yearEnd: 1996, keyBlanks: ['S7BW-P', 'S6BW'], keyType: 'Mechanical', transponderChip: null, programmingRequired: false, programmingMethod: null, notes: 'High Security Key' },
      { yearStart: 2002, yearEnd: 2008, keyBlanks: ['HU92RMH'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Philips (46) Encrypted System' },
    ],
    '7 Series': [
      { yearStart: 2008, yearEnd: 2009, keyBlanks: ['HU92RP'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro RW5', notes: 'Dealer FOB, Phillips Rolling Code' },
    ],
  },
  'Honda': {
    'Accord': [
      { yearStart: 2013, yearEnd: 2025, keyBlanks: ['HON66'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Honda keyway profile HON66' },
    ],
    'Civic': [
      { yearStart: 2012, yearEnd: 2025, keyBlanks: ['HON66'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Honda keyway profile HON66' },
    ],
    'CR-V': [
      { yearStart: 2012, yearEnd: 2025, keyBlanks: ['HON66'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Honda keyway profile HON66' },
    ],
  },
  'Ford': {
    'F-150': [
      { yearStart: 2015, yearEnd: 2025, keyBlanks: ['FO38'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Ford IDS', notes: 'Ford laser cut key' },
    ],
    'Fusion': [
      { yearStart: 2013, yearEnd: 2025, keyBlanks: ['FO38'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Ford IDS', notes: 'Ford laser cut key' },
    ],
    'Mustang': [
      { yearStart: 2015, yearEnd: 2025, keyBlanks: ['FO38'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Ford IDS', notes: 'Ford laser cut key' },
    ],
  },
  'Toyota': {
    'Camry': [
      { yearStart: 2012, yearEnd: 2025, keyBlanks: ['TOY143'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Toyota laser cut key' },
    ],
    'Corolla': [
      { yearStart: 2014, yearEnd: 2025, keyBlanks: ['TOY143'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Toyota laser cut key' },
    ],
    'RAV4': [
      { yearStart: 2013, yearEnd: 2025, keyBlanks: ['TOY143'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Toyota laser cut key' },
    ],
  },
  'Chevrolet': {
    'Silverado': [
      { yearStart: 2014, yearEnd: 2025, keyBlanks: ['B111-PT'], keyType: 'Laser Cut', transponderChip: 'Philips PCF7937E', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'GM laser cut key, Encrypted System' },
    ],
    'Malibu': [
      { yearStart: 2013, yearEnd: 2025, keyBlanks: ['B111-PT'], keyType: 'Laser Cut', transponderChip: 'Philips PCF7937E', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'GM laser cut key' },
    ],
  },
  'Dodge': {
    'Ram 1500': [
      { yearStart: 2014, yearEnd: 2025, keyBlanks: ['C-DAM'], keyType: 'Laser Cut', transponderChip: null, programmingRequired: false, programmingMethod: 'Smart Pro', notes: 'Chrysler laser cut key' },
    ],
    'Caravan': [
      { yearStart: 2001, yearEnd: 2007, keyBlanks: ['CH690-CH'], keyType: 'Mechanical', transponderChip: 'Megamos', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'Chrysler key' },
    ],
  },
  'Cadillac': {
    'Escalade': [
      { yearStart: 2015, yearEnd: 2025, keyBlanks: ['B111-PT'], keyType: 'Laser Cut', transponderChip: 'Philips PCF7937E', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'GM laser cut key, Encrypted System' },
    ],
    'DeVille': [
      { yearStart: 2000, yearEnd: 2005, keyBlanks: ['B99-PT', 'B100-PT'], keyType: 'Mechanical', transponderChip: 'Megamos', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'Fixed Code System' },
    ],
    'CTS': [
      { yearStart: 2003, yearEnd: 2007, keyBlanks: ['B111-PT'], keyType: 'High Security', transponderChip: 'Philips (46)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'Encrypted System' },
    ],
  },
  'Buick': {
    'LaCrosse': [
      { yearStart: 2005, yearEnd: 2025, keyBlanks: ['B111-PT'], keyType: 'High Security', transponderChip: 'Philips (46)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'Encrypted System' },
    ],
    'Enclave': [
      { yearStart: 2007, yearEnd: 2017, keyBlanks: ['B111-PT'], keyType: 'High Security', transponderChip: 'Philips (46)', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'Encrypted System' },
    ],
  },
  'GMC': {
    'Sierra': [
      { yearStart: 2014, yearEnd: 2025, keyBlanks: ['B111-PT'], keyType: 'Laser Cut', transponderChip: 'Philips PCF7937E', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'GM laser cut key' },
    ],
    'Yukon': [
      { yearStart: 2015, yearEnd: 2025, keyBlanks: ['B111-PT'], keyType: 'Laser Cut', transponderChip: 'Philips PCF7937E', programmingRequired: true, programmingMethod: 'Smart Pro/TCP/MVPP', notes: 'GM laser cut key' },
    ],
  },
  'Nissan': {
    'Altima': [
      { yearStart: 2013, yearEnd: 2025, keyBlanks: ['NS-DAM'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Nissan Consult', notes: 'Nissan smart key' },
    ],
    'Maxima': [
      { yearStart: 2009, yearEnd: 2025, keyBlanks: ['NS-DAM'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Nissan Consult', notes: 'Nissan smart key' },
    ],
    'Rogue': [
      { yearStart: 2014, yearEnd: 2025, keyBlanks: ['NS-DAM'], keyType: 'Smart Key', transponderChip: null, programmingRequired: false, programmingMethod: 'Nissan Consult', notes: 'Nissan smart key' },
    ],
  },
  'Hyundai': {
    'Elantra': [
      { yearStart: 2011, yearEnd: 2025, keyBlanks: ['HY24'], keyType: 'Laser Cut', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'Hyundai laser cut key' },
    ],
    'Sonata': [
      { yearStart: 2011, yearEnd: 2025, keyBlanks: ['HY24'], keyType: 'Laser Cut', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'Hyundai laser cut key' },
    ],
  },
  'Kia': {
    'Forte': [
      { yearStart: 2010, yearEnd: 2025, keyBlanks: ['KIA-DAM'], keyType: 'Laser Cut', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'Kia laser cut key' },
    ],
    'Sportage': [
      { yearStart: 2011, yearEnd: 2025, keyBlanks: ['KIA-DAM'], keyType: 'Laser Cut', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'Kia laser cut key' },
    ],
  },
  'Jeep': {
    'Wrangler': [
      { yearStart: 2007, yearEnd: 2025, keyBlanks: ['J-DAM'], keyType: 'Laser Cut', transponderChip: 'PCF7937E', programmingRequired: true, programmingMethod: 'Smart Pro', notes: 'Jeep laser cut key' },
    ],
    'Grand Cherokee': [
      { yearStart: 2011, yearEnd: 2025, keyBlanks: ['J-DAM'], keyType: 'Laser Cut', transponderChip: 'PCF7937E', programmingRequired: true, programmingMethod: 'Smart Pro', notes: 'Jeep laser cut key' },
    ],
  },
  'Mazda': {
    'CX-5': [
      { yearStart: 2013, yearEnd: 2025, keyBlanks: ['MAZ24'], keyType: 'Laser Cut', transponderChip: 'ID51', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'Mazda laser cut key' },
    ],
    'Mazda3': [
      { yearStart: 2014, yearEnd: 2025, keyBlanks: ['MAZ24'], keyType: 'Laser Cut', transponderChip: 'ID51', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'Mazda laser cut key' },
    ],
  },
  'Volkswagen': {
    'Passat': [
      { yearStart: 2012, yearEnd: 2025, keyBlanks: ['HU66'], keyType: 'Laser Cut', transponderChip: 'ID48', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'VW laser cut key, High Security' },
    ],
    'Jetta': [
      { yearStart: 2011, yearEnd: 2025, keyBlanks: ['HU66'], keyType: 'Laser Cut', transponderChip: 'ID48', programmingRequired: true, programmingMethod: 'Smart Pro/TCP', notes: 'VW laser cut key' },
    ],
  },
};

const COMMON_MAKES = Object.keys(KEY_DATABASE_2025).sort();
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1980 }, (_, i) => currentYear - i);

function getSaved() { try { return JSON.parse(localStorage.getItem('keyref_saved') || '[]'); } catch { return []; } }
function setSaved(arr) { try { localStorage.setItem('keyref_saved', JSON.stringify(arr.slice(0, 30))); } catch {} }

function searchDatabase(year, make, model) {
  if (!make || !model) return null;
  const makeData = KEY_DATABASE_2025[make];
  if (!makeData || !makeData[model]) return null;
  
  const entries = makeData[model];
  const matching = entries.find(e => year >= e.yearStart && year <= e.yearEnd);
  
  if (matching) {
    return {
      keyBlanks: matching.keyBlanks,
      keyType: matching.keyType,
      transponderChip: matching.transponderChip,
      programmingRequired: matching.programmingRequired,
      programmingMethod: matching.programmingMethod,
      notes: matching.notes,
      dataSource: '2025 PDF Database',
    };
  }
  return null;
}

export default function KeyRefPro() {
  const [year, setYear]        = useState('');
  const [make, setMake]        = useState('');
  const [model, setModel]      = useState('');
  const [models, setModels]    = useState([]);
  const [modLoad, setModLoad]  = useState(false);
  const [loading, setLoading]  = useState(false);
  const [result, setResult]    = useState(null);
  const [vehicle, setVehicle]  = useState(null);
  const [error, setError]      = useState('');
  const [saved, setSavedState] = useState(getSaved);
  const [dataSource, setDataSource] = useState('database'); // 'database' or 'api'

  useEffect(() => {
    if (!make) { setModels([]); setModel(''); return; }
    setModLoad(true); setModel(''); setModels([]);
    
    // Use local database when available
    const makeData = KEY_DATABASE_2025[make];
    if (makeData) {
      const modelList = Object.keys(makeData).sort();
      setModels(modelList);
      setModLoad(false);
    } else {
      // Fallback to NHTSA API for makes not in database
      const url = year
        ? `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
        : `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`;
      fetch(url).then(r => r.json())
        .then(d => setModels([...new Set(d.Results.map(r => r.Model_Name).filter(Boolean))].sort()))
        .catch(() => setModels([]))
        .finally(() => setModLoad(false));
    }
  }, [make, year]);

  const canLookup = year && make && model && !loading;

  async function runLookup() {
    if (!canLookup) return;
    setLoading(true); setError(''); setResult(null);
    
    try {
      if (dataSource === 'database') {
        // Search local database
        const dbResult = searchDatabase(parseInt(year), make, model);
        if (dbResult) {
          setResult(dbResult);
          setVehicle({ year, make, model });
        } else {
          setError(`No data found for ${year} ${make} ${model} in 2025 database. Please use API when available.`);
        }
      } else {
        // API lookup (when available)
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content:
              `You are an expert automotive locksmith database. For a ${year} ${make} ${model}, return ONLY valid JSON:
{"keyBlanks":["key blank numbers e.g. HD106-PT"],"keyType":"Mechanical|Transponder|Smart/Proximity|Switchblade/Flip|Laser-Cut/Sidewinder","transponderChip":"chip ID or null","programmingRequired":true or false,"programmingMethod":"method or null","remoteFobPartNumbers":["part numbers or empty array"],"keywayOrProfile":"e.g. HON66 or null","notes":"brief locksmith notes about this vehicle","dataSource":"API"}
Use real OEM/aftermarket part numbers. Return ONLY the JSON object, no markdown backticks.` }]
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const raw = data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
        setResult(JSON.parse(raw));
        setVehicle({ year, make, model });
      }
    } catch(e) {
      setError('Lookup failed: ' + (e.message || 'Please try again.'));
    } finally { setLoading(false); }

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
    btnLookup: (disabled) => ({ width: '100%', background: disabled ? '#555' : '#f5a623', border: 'none', color: disabled ? '#999' : '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, padding: 13, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: disabled ? 0.5 : 1 }),
    errMsg: { background: 'rgba(224,82,82,0.08)', borderLeft: '3px solid #e05252', color: '#e05252', fontFamily: 'monospace', fontSize: 12, padding: '11px 15px', marginBottom: 14 },
    resultCard: { background: '#161616', border: '1px solid #2a2a2a', marginBottom: 16, overflow: 'hidden' },
    resultHeader: { background: '#1e1e1e', borderBottom: '1px solid #2a2a2a', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    resultVehicle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, color: '#f5a623', lineHeight: 1 },
    btnSave: (saved) => ({ background: 'transparent', border: `1px solid ${saved ? '#52e0a0' : '#3a3a3a'}`, color: saved ? '#52e0a0' : '#787878', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, padding: '5px 11px', cursor: saved ? 'default' : 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }),
    resultBody: { padding: 18, display: 'grid', gap: 10 },
    dataRow: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'start', borderBottom: '1px solid #2a2a2a', paddingBottom: 10 },
    dataRowLast: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'start' },
    dataKey: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#787878', textTransform: 'uppercase', paddingTop: 2 },
    dataVal: { fontFamily: 'monospace', fontSize: 13, color: '#e8e8e8', lineHeight: 1.5 },
    dataValHi: { fontFamily: 'monospace', fontSize: 15, color: '#f5a623', fontWeight: 600, lineHeight: 1.5 },
    dataValYes: { fontFamily: 'monospace', fontSize: 13, color: '#52e0a0', lineHeight: 1.5 },
    dataValMuted: { fontFamily: 'monospace', fontSize: 13, color: '#4a4a4a', lineHeight: 1.5 },
    tag: { display: 'inline-block', background: 'rgba(245,166,35,0.12)', border: '1px solid #c47d0e', color: '#f5a623', fontFamily: 'monospace', fontSize: 12, padding: '2px 8px', margin: '2px 4px 2px 0' },
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
      <div style={S.inner}>

        {/* HEADER */}
        <header style={S.header}>
          <div>
            <div style={S.logo}>KEY<span style={S.logoSpan}>REF</span> PRO</div>
            <div style={S.logoSub}>AUTOMOTIVE KEY DATABASE · 2025 PDF DATA</div>
          </div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <div style={{...S.badge, background: dataSource === 'database' ? 'rgba(82,224,160,0.12)' : 'rgba(245,166,35,0.12)', borderColor: dataSource === 'database' ? '#4caf50' : '#c47d0e', color: dataSource === 'database' ? '#52e0a0' : '#f5a623'}}>
              {dataSource === 'database' ? '✓ 2025' : '⚡ API'}
            </div>
          </div>
        </header>

        {/* DATA SOURCE TOGGLE */}
        <div style={S.panel}>
          <div style={S.panelLabel}><span style={S.labelBar}/>Data Source</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
            <button 
              onClick={() => setDataSource('database')}
              style={{
                padding: 12,
                border: `2px solid ${dataSource === 'database' ? '#52e0a0' : '#3a3a3a'}`,
                background: dataSource === 'database' ? 'rgba(82,224,160,0.1)' : '#0d0d0d',
                color: dataSource === 'database' ? '#52e0a0' : '#787878',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: 1,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              2025 Database
            </button>
            <button 
              onClick={() => setDataSource('api')}
              style={{
                padding: 12,
                border: `2px solid ${dataSource === 'api' ? '#f5a623' : '#3a3a3a'}`,
                background: dataSource === 'api' ? 'rgba(245,166,35,0.1)' : '#0d0d0d',
                color: dataSource === 'api' ? '#f5a623' : '#787878',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: 1,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              API (Future)
            </button>
          </div>
          {dataSource === 'database' && <div style={{...S.empty, marginTop: 10}}>Ilco 2025 Auto/Truck Key Blank Reference Database</div>}
          {dataSource === 'api' && <div style={{...S.empty, marginTop: 10, color: '#f5a623'}}>Ready for custom API integration</div>}
        </div>

        {/* FORM */}
        <div style={S.panel}>
          <div style={S.panelLabel}><span style={S.labelBar}/>Vehicle Lookup</div>
          <div style={S.formRow}>
            <div style={S.field}>
              <div style={S.fieldLabel}>Year</div>
              <div style={S.selWrap}>
                <select style={S.select} value={year} onChange={e => setYear(e.target.value)}>
                  <option value="">—</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span style={S.selArrow}>▾</span>
              </div>
            </div>
            <div style={S.field}>
              <div style={S.fieldLabel}>Make</div>
              <div style={S.selWrap}>
                <select style={S.select} value={make} onChange={e => setMake(e.target.value)}>
                  <option value="">— Select —</option>
                  {COMMON_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span style={S.selArrow}>▾</span>
              </div>
            </div>
            <div style={S.field}>
              <div style={S.fieldLabel}>Model</div>
              <div style={S.selWrap}>
                <select style={{...S.select, opacity: (!make || modLoad) ? 0.4 : 1}} value={model} onChange={e => setModel(e.target.value)} disabled={!make || modLoad}>
                  <option value="">{modLoad ? 'Loading...' : '— Select —'}</option>
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
                  <div style={S.dataValHi}>{blanks.map(b => <span key={b} style={S.tag}>{b}</span>)}</div>
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
                  const bl = Array.isArray(s.result.keyBlanks) ? s.result.keyBlanks.join(', ') : (s.result.keyBlanks || '');
                  return (
                    <div key={`${s.year}-${s.make}-${s.model}`} style={S.savedItem} onClick={() => loadSaved(s)}>
                      <div style={S.savedVehicle}>{s.year} {s.make} {s.model}</div>
                      <div style={S.savedBlank}>{bl}</div>
                      <button style={S.btnDel} onClick={e => { e.stopPropagation(); deleteSaved(s.year, s.make, s.model); }}>×</button>
                    </div>
                  );
                })
            }
          </div>
        </div>

        <div style={S.footer}>KeyRef Pro · Professional Use Only · 2025 Ilco Database + API Ready</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}