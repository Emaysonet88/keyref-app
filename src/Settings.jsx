import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [fontSize, setFontSize] = useState(14);
  const [darkMode, setDarkMode] = useState(true);

  const S = {
    app: {
      background: darkMode ? '#0d0d0d' : '#f5f5f5',
      color: darkMode ? '#e8e8e8' : '#1a1a1a',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'IBM Plex Sans, sans-serif',
      transition: 'background-color 0.3s, color 0.3s',
      position: 'relative',
    },
    grid: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `repeating-linear-gradient(0deg, ${darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'} 0px, ${darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'} 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, ${darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'} 0px, ${darkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'} 1px, transparent 1px, transparent 20px)`,
      pointerEvents: 'none',
      zIndex: 0,
    },
    inner: {
      maxWidth: 900,
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    backButton: {
      background: 'transparent',
      border: `1px solid ${darkMode ? '#2a2a2a' : '#d0d0d0'}`,
      color: '#f5a623',
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '14px',
      fontFamily: 'monospace',
      marginBottom: '32px',
      transition: 'background-color 0.2s, border-color 0.2s',
    },
    controlsSection: {
      border: `1px solid ${darkMode ? '#2a2a2a' : '#d0d0d0'}`,
      borderRadius: '4px',
      padding: '20px',
      marginBottom: '40px',
    },
    controlRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
      gap: '20px',
    },
    controlRowLast: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
    },
    label: {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: darkMode ? '#787878' : '#666',
      minWidth: '120px',
    },
    toggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    toggleSwitch: {
      width: '50px',
      height: '24px',
      background: darkMode ? '#2a2a2a' : '#ccc',
      border: `1px solid ${darkMode ? '#444' : '#999'}`,
      borderRadius: '12px',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background-color 0.2s',
    },
    toggleDot: {
      width: '20px',
      height: '20px',
      background: '#f5a623',
      borderRadius: '10px',
      position: 'absolute',
      top: '2px',
      left: darkMode ? '28px' : '2px',
      transition: 'left 0.2s',
    },
    sliderContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1,
    },
    slider: {
      flex: 1,
      height: '6px',
      background: darkMode ? '#2a2a2a' : '#ddd',
      borderRadius: '3px',
      cursor: 'pointer',
      outline: 'none',
    },
    sliderValue: {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#f5a623',
      minWidth: '40px',
      textAlign: 'right',
    },
    attribution: {
      border: `1px solid ${darkMode ? '#2a2a2a' : '#d0d0d0'}`,
      borderRadius: '4px',
      padding: '12px',
      fontFamily: 'monospace',
      fontSize: '11px',
      color: darkMode ? '#787878' : '#888',
      lineHeight: '1.6',
      textAlign: 'center',
    },
  };

  const handleBackClick = () => {
    window.location.href = '/';
  };

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div style={S.app}>
      <div style={S.grid} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet" />
      
      <div style={S.inner}>
        {/* BACK BUTTON */}
        <button style={S.backButton} onClick={handleBackClick}>← BACK</button>

        {/* CONTROLS SECTION */}
        <div style={S.controlsSection}>
          {/* DARK/LIGHT TOGGLE */}
          <div style={S.controlRow}>
            <div style={S.label}>Theme</div>
            <div style={S.toggle}>
              <span style={{fontFamily: 'monospace', fontSize: '12px', color: darkMode ? '#787878' : '#666'}}>
                {darkMode ? 'DARK' : 'LIGHT'}
              </span>
              <div 
                style={S.toggleSwitch}
                onClick={handleDarkModeToggle}
              >
                <div style={S.toggleDot} />
              </div>
            </div>
          </div>

          {/* FONT SIZE SLIDER */}
          <div style={S.controlRowLast}>
            <div style={S.label}>Font Size</div>
            <div style={S.sliderContainer}>
              <input
                type="range"
                min="12"
                max="18"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{...S.slider, accentColor: '#f5a623'}}
              />
              <div style={S.sliderValue}>{fontSize}px</div>
            </div>
          </div>
        </div>

        {/* ATTRIBUTION - BOTTOM */}
        <div style={S.attribution}>
          Sourced from 2025 Auto Truck Key Blank Reference Guide
        </div>
      </div>
    </div>
  );
}