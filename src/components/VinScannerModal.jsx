import { useEffect, useRef, useState } from 'react';

// ── VinScannerModal ────────────────────────────────────────────────────────
// Full-screen camera overlay for scanning a VIN barcode.
// Uses the native BarcodeDetector API (Chrome/Edge/Android, Safari iOS 17+).
//
// On a successful detection of a 17-character VIN, calls onScan(vin) and
// closes itself. Manual close via the ✕ button or onClose handler.
//
// VIN stickers on US vehicles since ~2000 use Code 39 barcodes, found on:
//   - Driver's door jamb sticker
//   - Dashboard near the windshield (visible from outside)
//   - Vehicle registration card

const SCAN_FORMATS = ['code_39', 'code_128', 'qr_code', 'data_matrix'];
// VIN format: 17 chars, alphanumeric excluding I, O, Q (to avoid 1/0 confusion)
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Returns true if the current browser supports BarcodeDetector. */
export function isScannerSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function VinScannerModal({ onScan, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const detectorRef = useRef(null);
  const cancelledRef = useRef(false);

  const [status,   setStatus]   = useState('starting'); // starting | scanning | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    cancelledRef.current = false;

    async function start() {
      if (!isScannerSupported()) {
        setStatus('error');
        setErrorMsg('Your browser does not support barcode scanning. Try Chrome on Android, or paste the VIN manually.');
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({ formats: SCAN_FORMATS });
      } catch {
        setStatus('error');
        setErrorMsg('Could not initialize barcode detector on this device.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelledRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus('scanning');
        scanLoop();
      } catch (e) {
        setStatus('error');
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
          setErrorMsg('Camera permission denied. Enable camera access for this site in your browser settings.');
        } else if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') {
          setErrorMsg('No rear camera found on this device.');
        } else {
          setErrorMsg('Could not access camera: ' + (e.message || e.name || 'unknown error'));
        }
      }
    }

    async function scanLoop() {
      if (cancelledRef.current) return;
      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      try {
        const codes = await detector.detect(video);
        for (const c of codes) {
          const raw = (c.rawValue || '').toUpperCase().trim();
          const candidate = extractVinCandidate(raw);
          if (candidate && VIN_PATTERN.test(candidate)) {
            // Haptic confirmation
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(80);
            }
            stopCamera();
            cancelledRef.current = true;
            onScan(candidate);
            return;
          }
        }
      } catch {
        // detect() can throw transient errors — keep looping
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    function stopCamera() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }

    start();

    return () => {
      cancelledRef.current = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    cancelledRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onClose();
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="VIN Scanner">
      <div style={topBarStyle}>
        <div style={topTitleStyle}>Scan VIN Barcode</div>
        <button
          onClick={handleClose}
          style={closeBtnStyle}
          aria-label="Close scanner"
        >
          ✕
        </button>
      </div>

      <div style={videoWrapStyle}>
        <video
          ref={videoRef}
          style={videoStyle}
          playsInline
          muted
          autoPlay
        />
        <div style={reticleStyle} aria-hidden="true" />
      </div>

      <div style={bottomBarStyle}>
        {status === 'starting' && (
          <div style={statusTextStyle}>Starting camera…</div>
        )}
        {status === 'scanning' && (
          <div style={statusTextStyle}>
            Aim at the VIN barcode
            <div style={statusHintStyle}>
              Door jamb sticker, dashboard, or registration card
            </div>
          </div>
        )}
        {status === 'error' && (
          <div style={statusErrorStyle}>{errorMsg}</div>
        )}
      </div>
    </div>
  );
}

// Extract a 17-char VIN candidate from a possibly-noisy barcode payload.
// Some VIN barcodes embed prefixes like "I/" before the actual VIN.
function extractVinCandidate(raw) {
  if (!raw) return null;
  const match = raw.match(/[A-HJ-NPR-Z0-9]{17}/);
  return match ? match[0] : null;
}

// ── Styles ─────────────────────────────────────────────────────────────────
// Self-contained dark overlay. Doesn't depend on the app's theme system —
// the scanner is always a dark, opaque, full-screen experience.

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: '#000',
  display: 'flex',
  flexDirection: 'column',
  color: '#fff',
};

const topBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  paddingTop: 'max(14px, env(safe-area-inset-top))',
  background: 'rgba(0,0,0,0.85)',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const topTitleStyle = {
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: 0.3,
};

const closeBtnStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff',
  width: 36,
  height: 36,
  borderRadius: 18,
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const videoWrapStyle = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#000',
};

const videoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const reticleStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '85%',
  maxWidth: 480,
  height: 110,
  border: '2px solid rgba(255,255,255,0.9)',
  borderRadius: 8,
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
  pointerEvents: 'none',
};

const bottomBarStyle = {
  padding: '20px 18px 28px',
  paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
  background: 'rgba(0,0,0,0.85)',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  textAlign: 'center',
};

const statusTextStyle = {
  fontSize: 15,
  lineHeight: 1.5,
};

const statusHintStyle = {
  opacity: 0.65,
  fontSize: 13,
  marginTop: 4,
};

const statusErrorStyle = {
  fontSize: 14,
  lineHeight: 1.5,
  color: '#ff8a8a',
};
