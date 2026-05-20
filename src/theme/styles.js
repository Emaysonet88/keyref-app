// ── KeyRef Pro — shared style factory ────────────────────────────────────────
// All theme-flipping colors are CSS variables (defined in src/index.css). The
// `isMobile` flag is the one bit of dynamic state that's awkward in pure CSS
// (we'd need a sub-600 px media-query branch on every rule), so we leave that
// in JS. Components destructure only the styles they need.
//
// PREMIUM PASS — three changes, all driven from this file:
//
// 1. TYPOGRAPHY: Inter (UI/body) + JetBrains Mono (data/code/labels).
//    Real type scale: 9 / 10 / 11 / 13 / 15 / 18 / 24 / 28 / 32 / 46.
//    Letter-spacing and line-height unified for visual rhythm.
//
// 2. MICROINTERACTIONS: every interactive element has consistent transitions.
//    Buttons scale 97% on press (handled globally in index.css). Inputs glow
//    on focus. Rows shift subtly on hover. All honor prefers-reduced-motion.
//
// 3. RESULT CARD POLISH: dataValHi bumped, new hero-blank treatment,
//    copyBtn for per-field copy, dataGroup/dataGroupLabel for visual
//    grouping in ResultCard.
//
// Font constants up top — single source of truth.

const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Roboto Mono', ui-monospace, monospace";
const FONT_DISPLAY = "'Bebas Neue', sans-serif";

// Type scale — every fontSize in the app should pull from here.
const SIZE = {
  micro:  9,    // tiny uppercase labels
  tiny:   10,   // standard caps labels
  small:  11,   // secondary text, status badges
  body:   13,   // standard body / data
  bodyLg: 15,   // emphasized data
  h3:     18,   // section headings
  h2:     22,   // result card title (mobile)
  h2Lg:   26,   // result card title (desktop)
  h1:     32,   // logo / hero (mobile)
  h1Lg:   46,   // logo / hero (desktop)
};

const TRACK = {
  tight:   0,
  body:    0.1,
  label:   1,
  caps:    2,
  display: 3,
};

const TRANSITION = {
  fast: '120ms ease',
  base: '180ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '240ms cubic-bezier(0.4, 0, 0.2, 1)',
};

export function makeStyles(isMobile) {
  return {
    // ── App shell ─────────────────────────────────────────────────────────
    app: {
      background: 'var(--bg)',
      minHeight: '100vh',
      fontFamily: FONT_SANS,
      // Cleaner glyph rendering, especially noticeable on Inter
      fontFeatureSettings: '"ss01", "cv11"',
      color: 'var(--text)',
      padding: '0 16px 60px',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
    },
    inner: { maxWidth: 1000, margin: '0 auto' },

    // ── Header ────────────────────────────────────────────────────────────
    header: {
      position: 'relative',
      padding: '24px 0 18px',
      paddingRight: 110,
      borderBottom: '1px solid var(--border)',
      marginBottom: 24,
    },
    logo: {
      fontFamily: FONT_DISPLAY,
      fontSize: isMobile ? SIZE.h1 : SIZE.h1Lg,
      letterSpacing: TRACK.caps,
      lineHeight: 1.05,
      color: 'var(--logo)',
    },
    logoSub: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      color: 'var(--mute-val)',
      letterSpacing: TRACK.display,
      marginTop: 4,
      textTransform: 'uppercase',
    },
    headerRight: {
      position: 'absolute',
      top: 24,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    statusBadge: (online) => ({
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      letterSpacing: TRACK.label,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: online ? 'var(--ok)' : 'var(--warn)',
      opacity: online ? 0.9 : 1,
      textTransform: 'uppercase',
    }),
    themeToggle: {
      background: 'transparent',
      border: 'none',
      color: 'var(--text)',
      cursor: 'pointer',
      width: 36,
      height: 36,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      opacity: 0.65,
      borderRadius: 6,
    },

    // ── Panels ────────────────────────────────────────────────────────────
    panel: {
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      padding: 20,
      marginBottom: 16,
    },
    panelLabel: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.tiny,
      letterSpacing: TRACK.display,
      color: 'var(--accent)',
      textTransform: 'uppercase',
      fontWeight: 600,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    panelLabelHint: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      color: 'var(--mute)',
      letterSpacing: TRACK.label,
      textTransform: 'none',
      marginLeft: 'auto',
      fontWeight: 400,
    },
    labelBar: { width: 12, height: 2, background: 'var(--accent)', display: 'block' },

    // ── Mode toggle ───────────────────────────────────────────────────────
    modeToggle: {
      display: 'flex',
      position: 'relative',
      marginBottom: 16,
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      padding: 4,
      gap: 4,
    },
    modeToggleIndicator: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      background: 'var(--accent)',
      transition: 'left 240ms cubic-bezier(0.4, 0, 0.2, 1), width 240ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
      pointerEvents: 'none',
      zIndex: 0,
    },
    modeBtn: (active) => ({
      flex: 1,
      minWidth: 0,
      background: 'transparent',
      border: 'none',
      color: active ? '#000' : 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      letterSpacing: TRACK.caps,
      padding: '10px 12px',
      textTransform: 'uppercase',
      cursor: 'pointer',
      fontWeight: active ? 600 : 500,
      position: 'relative',
      zIndex: 1,
    }),

    // ── Form fields ───────────────────────────────────────────────────────
    formRow: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '90px 1fr 1fr',
      gap: 10,
      marginBottom: 12,
    },
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    fieldLabel: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      letterSpacing: TRACK.caps,
      color: 'var(--mute)',
      textTransform: 'uppercase',
      fontWeight: 500,
    },
    selWrap: { position: 'relative' },
    select: {
      background: 'var(--input)',
      border: '1px solid var(--border-strong)',
      color: 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      padding: '10px 28px 10px 11px',
      width: '100%',
      appearance: 'none',
      WebkitAppearance: 'none',
      outline: 'none',
    },
    selArrow: {
      position: 'absolute',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--accent)',
      fontSize: SIZE.small,
      pointerEvents: 'none',
    },
    inputNum: {
      background: 'var(--input)',
      border: '1px solid var(--border-strong)',
      color: 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      padding: '10px 11px',
      width: '100%',
      outline: 'none',
    },

    // ── VIN row ───────────────────────────────────────────────────────────
    vinRow: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'stretch' },
    vinInput: {
      flex: 1,
      background: 'var(--input)',
      border: '1px solid var(--border-strong)',
      color: 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      padding: '9px 11px',
      outline: 'none',
      textTransform: 'uppercase',
      letterSpacing: TRACK.body,
    },
    vinBtn: {
      background: 'transparent',
      border: '1px solid var(--accent)',
      color: 'var(--accent)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.tiny,
      fontWeight: 600,
      padding: '9px 13px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: TRACK.label,
      whiteSpace: 'nowrap',
    },
    vinFlash: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      color: 'var(--ok)',
      marginBottom: 12,
      padding: '7px 11px',
      background: 'var(--ok-tint)',
      borderLeft: '2px solid var(--ok)',
    },

    // ── Lookup button + error ─────────────────────────────────────────────
    btnLookup: (disabled) => ({
      width: '100%',
      background: disabled ? '#555' : 'var(--accent)',
      border: 'none',
      color: disabled ? '#999' : '#000',
      fontFamily: FONT_DISPLAY,
      fontSize: 22,
      letterSpacing: TRACK.display,
      padding: 14,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      minHeight: 46,
    }),
    errMsg: {
      background: 'var(--err-tint)',
      borderLeft: '3px solid var(--err)',
      color: 'var(--err)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      padding: '12px 16px',
      marginBottom: 14,
      lineHeight: 1.5,
    },

    // ── Result card ───────────────────────────────────────────────────────
    resultCard: {
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      marginBottom: 16,
      overflow: 'hidden',
    },
    resultHeader: {
      background: 'var(--header-bg)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    resultVehicle: {
      fontFamily: FONT_DISPLAY,
      fontSize: isMobile ? SIZE.h2 : SIZE.h2Lg,
      letterSpacing: TRACK.label,
      color: 'var(--accent)',
      lineHeight: 1.05,
    },
    btnSave: (s) => ({
      background: 'transparent',
      border: `1px solid ${s ? 'var(--ok)' : 'var(--border-strong)'}`,
      color: s ? 'var(--ok)' : 'var(--mute)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.tiny,
      fontWeight: 600,
      letterSpacing: TRACK.caps,
      padding: '6px 12px',
      cursor: s ? 'default' : 'pointer',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      minHeight: 44,
    }),
    resultBody: { padding: 18, display: 'grid', gap: 14 },

    // Group container — used to visually separate Key Info / Programming /
    // Cross-Reference in the ResultCard
    dataGroup: {
      display: 'grid',
      gap: 10,
    },
    dataGroupLabel: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      letterSpacing: TRACK.display,
      color: 'var(--accent)',
      textTransform: 'uppercase',
      fontWeight: 600,
      paddingBottom: 6,
      borderBottom: '1px solid var(--accent-tint)',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },

    dataRow: (isLast) => ({
      display: 'grid',
      gridTemplateColumns: isMobile ? '105px 1fr' : '160px 1fr',
      gap: 10,
      alignItems: 'start',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      paddingBottom: isLast ? 0 : 10,
    }),
    dataKey: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      letterSpacing: TRACK.caps,
      color: 'var(--mute)',
      textTransform: 'uppercase',
      paddingTop: 3,
      fontWeight: 500,
    },
    dataVal: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      color: 'var(--text)',
      lineHeight: 1.55,
      wordBreak: 'break-word',
    },
    dataValHi: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.bodyLg,
      color: 'var(--accent)',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    dataValYes: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      color: 'var(--ok)',
      lineHeight: 1.55,
      fontWeight: 500,
    },
    dataValMuted: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      color: 'var(--mute-val)',
      lineHeight: 1.55,
    },
    tag: {
      display: 'inline-block',
      background: 'var(--accent-tint)',
      border: '1px solid var(--accent-rim)',
      color: 'var(--accent)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      fontWeight: 500,
      padding: '5px 11px',
      margin: '2px 4px 2px 0',
      cursor: 'pointer',
      userSelect: 'none',
      minHeight: 30,
      letterSpacing: TRACK.body,
    },

    // Hero blank — the primary answer to a lookup. Bigger, bolder, with a
    // one-time pulse on first render to draw the eye.
    heroBlank: {
      display: 'inline-block',
      background: 'var(--accent-tint)',
      border: '1px solid var(--accent-rim)',
      color: 'var(--accent)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.h3,
      fontWeight: 700,
      letterSpacing: TRACK.label,
      padding: '8px 16px',
      margin: '2px 6px 2px 0',
      cursor: 'pointer',
      userSelect: 'none',
      minHeight: 38,
      animation: 'heroPulse 1200ms ease-out 200ms 1 both',
    },

    // Inline copy button used on values that the locksmith might want to
    // grab quickly (key blank, chip, code range)
    copyBtn: {
      background: 'transparent',
      border: '1px solid var(--border-strong)',
      color: 'var(--mute)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      fontWeight: 600,
      letterSpacing: TRACK.label,
      padding: '3px 7px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      marginLeft: 8,
      verticalAlign: 'middle',
      minHeight: 24,
    },
    copyBtnSuccess: {
      borderColor: 'var(--ok)',
      color: 'var(--ok)',
    },

    notesBox: {
      background: 'var(--notes-bg)',
      borderLeft: '2px solid var(--accent-rim)',
      padding: '10px 14px',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      color: 'var(--mute)',
      lineHeight: 1.65,
    },

    // ── OBP procedure ─────────────────────────────────────────────────────
    obpToggle: {
      background: 'transparent',
      border: '1px solid var(--accent)',
      color: 'var(--accent)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      fontWeight: 600,
      padding: '7px 13px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      marginTop: 8,
      letterSpacing: TRACK.label,
    },
    obpPanel: {
      background: 'var(--notes-bg)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--accent)',
      padding: 14,
      marginTop: 8,
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      color: 'var(--text)',
      lineHeight: 1.65,
    },
    obpTitle: {
      color: 'var(--accent)',
      fontWeight: 700,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: TRACK.label,
    },

    // ── Saved / recent list rows ──────────────────────────────────────────
    savedList: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 },
    savedItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 13px',
      background: 'var(--input)',
      border: '1px solid var(--border)',
      cursor: 'pointer',
      gap: 10,
      flexWrap: isMobile ? 'wrap' : 'nowrap',
    },
    savedVehicle: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      color: 'var(--text)',
      flex: 1,
      minWidth: 100,
      fontWeight: 500,
    },
    savedBlank: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      color: 'var(--accent)',
      fontWeight: 600,
    },
    btnDel: {
      background: 'transparent',
      border: 'none',
      color: 'var(--mute)',
      cursor: 'pointer',
      fontSize: 18,
      padding: '0 4px',
      lineHeight: 1,
      minWidth: 28,
      minHeight: 28,
    },
    empty: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      color: 'var(--mute-val)',
      letterSpacing: TRACK.label,
      padding: '6px 0',
    },
    savedSearchInput: {
      background: 'var(--input)',
      border: '1px solid var(--border-strong)',
      color: 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      padding: '9px 11px',
      width: '100%',
      outline: 'none',
      marginBottom: 8,
    },
    savedNoteInput: {
      background: 'var(--input)',
      border: '1px solid var(--border)',
      color: 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      padding: '9px 11px',
      width: '100%',
      outline: 'none',
    },
    savedNoteText: {
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      color: 'var(--mute)',
      marginTop: 4,
      lineHeight: 1.5,
    },

    // ── Ignition prompt ───────────────────────────────────────────────────
    ignitionPanel: {
      background: 'var(--accent-tint3)',
      borderLeft: '3px solid var(--accent)',
      color: 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.body,
      padding: '13px 15px',
      marginBottom: 14,
      display: 'grid',
      gap: 8,
      lineHeight: 1.5,
    },
    ignitionButton: {
      background: 'transparent',
      border: '1px solid var(--accent)',
      color: 'var(--accent)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.small,
      fontWeight: 600,
      padding: '9px 13px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: TRACK.label,
      minHeight: 38,
    },

    // ── Universal search ──────────────────────────────────────────────────
    searchInput: {
      background: 'var(--input)',
      border: '1px solid var(--border-strong)',
      color: 'var(--text)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.bodyLg,
      padding: '13px 15px',
      width: '100%',
      outline: 'none',
      marginBottom: 10,
    },
    historyPill: {
      background: 'transparent',
      border: '1px solid var(--border)',
      color: 'var(--mute)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.tiny,
      fontWeight: 500,
      padding: '5px 11px',
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: TRACK.label,
    },
    typeBadge: (type) => {
      const c = {
        model:     'var(--accent)',
        chip:      'var(--ok)',
        obp:       '#a78bfa',
        codeRange: '#5fa6e0',
        fuzzy:     'var(--mute)',
      }[type] || 'var(--mute)';
      return {
        fontFamily: FONT_MONO,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: TRACK.label,
        padding: '3px 7px',
        border: `1px solid ${c}`,
        color: c,
        textTransform: 'uppercase',
        borderRadius: 2,
      };
    },

    // ── Footer ────────────────────────────────────────────────────────────
    footer: {
      marginTop: 32,
      paddingTop: 14,
      borderTop: '1px solid var(--border)',
      fontFamily: FONT_MONO,
      fontSize: SIZE.micro,
      color: 'var(--mute-val)',
      letterSpacing: TRACK.caps,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
  };
}
