import { useState, useEffect } from "react";

const COMMON_MAKES = ['Acura','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge',
  'Ford','GMC','Honda','Hyundai','Infiniti','Jeep','Kia','Lexus','Lincoln','Mazda',
  'Mercury','Mercedes-Benz','Mitsubishi','Nissan','Oldsmobile','Pontiac','Ram',
  'Saturn','Subaru','Toyota','Volkswagen','Volvo'];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1980 }, (_, i) => currentYear - i);

// Mock database of vehicle key information
const MOCK_KEY_DATABASE = {
  'Honda Civic': { keyBlanks: ['HON66-PT', 'HON66-OE'], keyType: 'Transponder', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'OBDII diagnostic', remoteFobPartNumbers: ['72147-TGG-A51', '72147-TGG-A61'], keywayOrProfile: 'HON66', notes: 'Most models 1999+. Chip must be programmed via OBDII.' },
  'Toyota Camry': { keyBlanks: ['TOY142-PT', 'TOY8R'], keyType: 'Transponder', transponderChip: 'ID4C', programmingRequired: true, programmingMethod: 'Smart key programming', remoteFobPartNumbers: ['89742-06110', '89742-02170'], keywayOrProfile: 'TOY8', notes: 'Program via smart key system. Some years support OBDII.' },
  'Ford F-150': { keyBlanks: ['FO21-PT', 'FO38R'], keyType: 'Transponder', transponderChip: 'ID4D63', programmingRequired: true, programmingMethod: 'Steering wheel programming', remoteFobPartNumbers: ['6L3Z-15K601-A', '7L3Z-15K601-A'], keywayOrProfile: 'FO21', notes: 'Programming: Ignition ON-OFF cycle with new key.' },
  'Chevrolet Silverado': { keyBlanks: ['GM4-PT', 'GM4R'], keyType: 'Transponder', transponderChip: 'ID4C', programmingRequired: true, programmingMethod: 'Onboard programming', remoteFobPartNumbers: ['25769130', '16263388'], keywayOrProfile: 'GM4', notes: 'Requires second working key present.' },
  'BMW 3 Series': { keyBlanks: ['BMW3-PT', 'BMW3R'], keyType: 'Smart/Proximity', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'Dealer tool required', remoteFobPartNumbers: ['66132408379', '66132408380'], keywayOrProfile: 'BMW3', notes: 'Proximity key. Programming requires dealer diagnostic tool.' },
  'Mercedes-Benz C-Class': { keyBlanks: ['MBZ-PT', 'MB2R'], keyType: 'Smart/Proximity', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'Dealer programming', remoteFobPartNumbers: ['2048200082', '2048200182'], keywayOrProfile: 'MBZ', notes: 'Infrared remote. Programming via STAR diagnostic.' },
  'Nissan Altima': { keyBlanks: ['NSN11-PT', 'NSN11R'], keyType: 'Transponder', transponderChip: 'ID4C', programmingRequired: true, programmingMethod: 'Smart key programming', remoteFobPartNumbers: ['28268-ZT50A', '28268-ZT60A'], keywayOrProfile: 'NSN11', notes: 'Program via power window method or dealer.' },
  'Mazda CX-5': { keyBlanks: ['MAZ24-PT', 'MAZ24R'], keyType: 'Transponder', transponderChip: 'ID4D', programmingRequired: true, programmingMethod: 'Smart key system', remoteFobPartNumbers: ['BHB37-75-201E', 'BHB37-75-201D'], keywayOrProfile: 'MAZ24', notes: 'Most Mazda models use similar programming.' },
  'Volkswagen Jetta': { keyBlanks: ['VW3-PT', 'VAG3R'], keyType: 'Transponder', transponderChip: 'ID48', programmingRequired: true, programmingMethod: 'Dealer VAS tool', remoteFobPartNumbers: ['1J0959753AG', '1K0959753E'], keywayOrProfile: 'VAG3', notes: 'ID48 or ID48CAN depending on year.' },
  'Jeep Wrangler': { keyBlanks: ['JEEP3-PT', 'JEEP3R'], keyType: 'Transponder', transponderChip: 'ID46', programmingRequired: true, programmingMethod: 'Onboard programming', remoteFobPartNumbers: ['68039701AA', '68039701AB'], keywayOrProfile: 'JEEP3', notes: 'Ignition ON-OFF programming cycle available.' },
};

function getSaved() { try { return JSON.parse(localStorage.getItem('keyref_saved') || '[]'); } catch { return []; } }
function setSaved(arr) { try { localStorage.setItem('keyref_saved', JSON.stringify(arr.slice(0, 30))); } catch {} }
function getApiSettings() { try { return JSON.parse(localStorage.getItem('keyref_api') || '{"useMock":true,"apiEndpoint":""}'); } catch { return {useMock:true,apiEndpoint:''}; } }
function setApiSettings(s) { try { localStorage.setItem('keyref_api', JSON.stringify(s)); } catch {} }

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
  const [apiSettings, setApiSettingsState] = useState(getApiSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!make) { setModels([]); setModel(''); return; }
    setModLoad(true); setModel(''); setModels([]);
    const url = year
      ? `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
      : `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`;
    fetch(url).then(r => r.json())
      .then(d => setModels([...new Set(d.Results.map(r => r.Model_Name).filter(Boolean))].sort()))
      .catch(() => setModels([]))
      .finally(() => setModLoad(false));
  }, [make, year]);

  const canLookup = year && make && model && !loading;

  async function runLookup() {
    if (!canLookup) return;
    setLoading(true); setError(''); setResult(null);
    try {
      let resultData = null;
      
      if (apiSettings.useMock) {
        // Use mock database
        const vehicleKey = `${make} ${model}`;
        if (MOCK_KEY_DATABASE[vehicleKey]) {
          resultData = MOCK_KEY_DATABASE[vehicleKey];
        } else {
          throw new Error(`Mock data not available for ${vehicleKey}. Try: ${Object.keys(MOCK_KEY_DATABASE).join(', ')}`);
        }
      } else {
        // Use custom API
        if (!apiSettings.apiEndpoint) {
          throw new Error('API endpoint not configured. Enable settings.');
        }
        const res = await fetch(apiSettings.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, make, model })
        });
        if (!res.ok) throw new Error(`API error: ${res.statusText}`);
        const data = await res.json();
        resultData = data;
      }
      
      setResult(resultData);
      setVehicle({ year, make, model });
    } catch(e) {
      setError('Lookup failed: ' + (e.message || 'Please try again.'));
    } finally { setLoading(false); }
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

  function updateApiSettings(newSettings) {
    setApiSettingsState(newSettings);
    setApiSettings(newSettings);
  }

  const isSaved = vehicle && saved.some(s => s.year===vehicle.year && s.make===vehicle.make && s.model===vehicle.model);
  const blanks = result ? (Array.isArray(result.keyBlanks) ? result.keyBlanks : [result.keyBlanks]).filter(Boolean) : [];
  const fobs   = result ? (Array.isArray(result.remoteFobPartNumbers) ? result.remoteFobPartNumbers : []).filter(Boolean) : [];

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
            <div style={S.logoSub}>AUTOMOTIVE KEY DATABASE · AI-POWERED</div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <button onClick={() => setShowSettings(!showSettings)} style={{background:'transparent', border:'none', color:'#f5a623', cursor:'pointer', fontSize:18, padding:8}}>⚙️</button>
            <div style={S.badge}>● LIVE</div>
          </div>
        </header>

        {/* SETTINGS */}
        {showSettings && (
          <div style={S.panel}>
            <div style={S.panelLabel}><span style={S.labelBar}/>API Settings</div>
            <div style={S.formRow}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:12}}>
                  <input type="radio" name="apiMode" checked={apiSettings.useMock} onChange={() => updateApiSettings({...apiSettings, useMock:true})} />
                  <span style={S.fieldLabel}>Use Mock Data (Demo)</span>
                </label>
              </div>
            </div>
            <div style={S.formRow}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                  <input type="radio" name="apiMode" checked={!apiSettings.useMock} onChange={() => updateApiSettings({...apiSettings, useMock:false})} />
                  <span style={S.fieldLabel}>Use Custom API Endpoint</span>
                </label>
              </div>
            </div>
            {!apiSettings.useMock && (
              <div style={{marginTop:12}}>
                <input 
                  type="text" 
                  placeholder="API endpoint URL (POST)" 
                  value={apiSettings.apiEndpoint} 
                  onChange={e => updateApiSettings({...apiSettings, apiEndpoint:e.target.value})}
                  style={{...S.select, marginBottom:8}}
                />
                <div style={{fontFamily:'monospace', fontSize:10, color:'#787878', lineHeight:1.6}}>
                  Expected JSON: {'{year, make, model}'} → {'{keyBlanks, keyType, transponderChip, ...}'} 
                </div>
              </div>
            )}
            <button onClick={() => setShowSettings(false)} style={{...S.btnLookup(false), marginTop:12}}>CLOSE</button>
          </div>
        )}

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
              <div style={S.resultVehicle}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
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

        <div style={S.footer}>KeyRef Pro · Professional Use Only · NHTSA + Anthropic AI</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
