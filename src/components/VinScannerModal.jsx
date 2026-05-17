import { useEffect, useRef, useState } from 'react';

// ── VinScannerModal ────────────────────────────────────────────────────────
// Full-screen camera overlay for scanning a VIN barcode.
//
// LIVE SCANNING uses the native BarcodeDetector API on devices that support it
// (Chrome/Edge/Samsung Internet on Android). It's fast and hardware-accelerated
// but stumbles on real-world photos with slight angles or small barcodes.
//
// PHOTO ANALYSIS (Take Photo / From Gallery) now uses a TWO-TIER pipeline:
//   1. Native BarcodeDetector on the original + 90/180/270 rotations
//   2. ZXing JS library with TRY_HARDER hint on the original + 90/180/270
//
// ZXing handles tilted, small, and slightly-damaged barcodes much better than
// the native API. It's dynamically imported so the ~200KB cost only loads
// when the locksmith actually tries to decode a photo.
//
// SESSION 6 v5 IMPROVEMENTS:
//   - ZXing fallback for stubborn photos
//   - Better progress text — locksmith sees which method is being tried
//   - Same UI as before; the change is purely in detection robustness

const SCAN_FORMATS = ['code_39', 'code_93', 'code_128', 'codabar', 'qr_code', 'data_matrix'];
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isScannerSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function VinScannerModal({ onScan, onClose }) {
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const trackRef        = useRef(null);
  const rafRef          = useRef(null);
  const detectorRef     = useRef(null);
  const cameraInputRef  = useRef(null);
  const galleryInputRef = useRef(null);
  const cancelledRef    = useRef(false);

  const [status,         setStatus]         = useState('starting');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn,        setTorchOn]        = useState(false);
  const [analyzeStage,   setAnalyzeStage]   = useState(null);

  useEffect(() => {
    cancelledRef.current = false;

    async function start() {
      if (!isScannerSupported()) {
        setStatus('error');
        setErrorMsg('Your browser does not support live barcode scanning. Try Chrome on Android, or paste the VIN manually.');
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
          video: {
            facingMode: { ideal: 'environment' },
            width:      { ideal: 1920 },
            height:     { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelledRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        try {
          const caps = track.getCapabilities ? track.getCapabilities() : {};
          if (caps.torch === true) setTorchSupported(true);
          if (caps.focusMode && caps.focusMode.includes('continuous')) {
            try {
              await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            } catch { /* not fatal */ }
          }
        } catch { /* getCapabilities not implemented */ }

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
        const vin = await detectVinNative(video, detector);
        if (vin) {
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(80);
          stopAll();
          cancelledRef.current = true;
          onScan(vin);
          return;
        }
      } catch { /* transient errors — keep looping */ }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    function stopAll() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      trackRef.current = null;
    }

    start();
    return () => {
      cancelledRef.current = true;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    const newState = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: newState }] });
      setTorchOn(newState);
    } catch {
      setTorchSupported(false);
    }
  }

  // ── Photo analysis pipeline (Take Photo / From Gallery) ──────────────────
  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setErrorMsg('');
    const url = URL.createObjectURL(file);

    try {
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload  = resolve;
        img.onerror = () => reject(new Error('Could not load image'));
      });

      // ── Stage 1: native BarcodeDetector across rotations ───────────────
      setAnalyzeStage('native');
      let vin = await detectVinNativeRotations(img, detectorRef.current);

      // ── Stage 2: ZXing fallback if native failed ───────────────────────
      if (!vin) {
        setAnalyzeStage('zxing');
        vin = await detectVinZxingRotations(img);
      }

      if (vin) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(80);
        stopAllExternal();
        cancelledRef.current = true;
        onScan(vin);
        return;
      }

      setErrorMsg('No VIN barcode found, even after trying both decoders and all rotations. Tips: (1) crop tight to just the barcode, (2) ensure even lighting, (3) avoid glare, (4) hold steady & in focus.');
      setTimeout(() => setErrorMsg(curr =>
        curr.startsWith('No VIN barcode') ? '' : curr
      ), 9000);
    } catch (e) {
      setErrorMsg('Could not analyze image: ' + (e.message || 'unknown error'));
      setTimeout(() => setErrorMsg(curr =>
        curr.startsWith('Could not analyze') ? '' : curr
      ), 5000);
    } finally {
      URL.revokeObjectURL(url);
      setAnalyzeStage(null);
    }
  }

  function stopAllExternal() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
  }

  function handleClose() {
    cancelledRef.current = true;
    stopAllExternal();
    onClose();
  }

  const analyzing = analyzeStage !== null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="VIN Scanner">
      <div style={topBarStyle}>
        <div style={topTitleStyle}>Scan VIN Barcode</div>
        <button onClick={handleClose} style={closeBtnStyle} aria-label="Close scanner">✕</button>
      </div>

      <div style={videoWrapStyle}>
        <video ref={videoRef} style={videoStyle} playsInline muted autoPlay />
        <div style={reticleStyle} aria-hidden="true" />
      </div>

      <div style={bottomBarStyle}>
        {status === 'starting' && <div style={statusTextStyle}>Starting camera…</div>}

        {status === 'scanning' && (
          <>
            <div style={statusTextStyle}>
              {analyzing
                ? (analyzeStage === 'native'
                    ? 'Analyzing image (fast decoder)…'
                    : 'Trying enhanced decoder (this may take a few seconds)…')
                : 'Aim at the VIN barcode'}
              {!analyzing && (
                <div style={statusHintStyle}>
                  Door jamb, dashboard, or registration card
                </div>
              )}
            </div>

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={secondaryBtnStyle}
                disabled={analyzing}
              >
                📸 Take Photo
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                style={secondaryBtnStyle}
                disabled={analyzing}
              >
                🖼️ From Gallery
              </button>
              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  style={{
                    ...secondaryBtnStyle,
                    background: torchOn ? 'rgba(255, 200, 0, 0.25)' : 'transparent',
                    borderColor: torchOn ? 'rgba(255, 200, 0, 0.6)' : 'rgba(255,255,255,0.3)',
                  }}
                  aria-pressed={torchOn}
                >
                  {torchOn ? '🔦 ON' : '🔦 Light'}
                </button>
              )}
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelected}
              style={{ display: 'none' }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
              style={{ display: 'none' }}
            />

            {errorMsg && <div style={photoErrorStyle} role="alert">{errorMsg}</div>}
          </>
        )}

        {status === 'error' && <div style={statusErrorStyle}>{errorMsg}</div>}
      </div>
    </div>
  );
}

// ── Native BarcodeDetector helpers ─────────────────────────────────────────

async function detectVinNative(source, detector) {
  try {
    const codes = await detector.detect(source);
    for (const c of codes) {
      const candidate = extractVinCandidate((c.rawValue || '').toUpperCase().trim());
      if (candidate && VIN_PATTERN.test(candidate)) return candidate;
    }
  } catch { /* transient */ }
  return null;
}

async function detectVinNativeRotations(img, detector) {
  let vin = await detectVinNative(img, detector);
  if (vin) return vin;
  for (const rotation of [90, 180, 270]) {
    const canvas = createRotatedCanvas(img, rotation);
    vin = await detectVinNative(canvas, detector);
    if (vin) return vin;
  }
  return null;
}

// ── ZXing fallback ─────────────────────────────────────────────────────────
// Dynamically import @zxing/library so its ~200KB only loads when the user
// actually triggers a photo decode. ZXing's TRY_HARDER mode does extensive
// internal rotation, scaling, and noise reduction — it succeeds where the
// native API gives up.

async function detectVinZxingRotations(img) {
  let mod;
  try {
    mod = await import('@zxing/library');
  } catch (e) {
    console.warn('ZXing failed to load:', e);
    return null;
  }

  const {
    MultiFormatReader,
    BarcodeFormat,
    DecodeHintType,
    HTMLCanvasElementLuminanceSource,
    HybridBinarizer,
    BinaryBitmap,
  } = mod;

  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODABAR,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
  ]);

  const reader = new MultiFormatReader();
  reader.setHints(hints);

  for (const rotation of [0, 90, 180, 270]) {
    const canvas = rotation === 0 ? imgToCanvas(img) : createRotatedCanvas(img, rotation);
    try {
      const luminance = new HTMLCanvasElementLuminanceSource(canvas);
      const binary = new BinaryBitmap(new HybridBinarizer(luminance));
      const result = reader.decode(binary);
      const text = (result?.getText() || '').toUpperCase().trim();
      const candidate = extractVinCandidate(text);
      if (candidate && VIN_PATTERN.test(candidate)) return candidate;
    } catch {
      // ZXing throws when nothing's found — keep trying rotations
    } finally {
      try { reader.reset(); } catch { /* noop */ }
    }
  }
  return null;
}

// ── Canvas helpers ─────────────────────────────────────────────────────────

function imgToCanvas(img) {
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth  || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas;
}

function createRotatedCanvas(img, degrees) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth  || img.width;
  const h = img.naturalHeight || img.height;

  if (degrees === 90 || degrees === 270) {
    canvas.width  = h;
    canvas.height = w;
  } else {
    canvas.width  = w;
    canvas.height = h;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);
  return canvas;
}

function extractVinCandidate(raw) {
  if (!raw) return null;
  const match = raw.match(/[A-HJ-NPR-Z0-9]{17}/);
  return match ? match[0] : null;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
  display: 'flex', flexDirection: 'column', color: '#fff',
};

const topBarStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', paddingTop: 'max(14px, env(safe-area-inset-top))',
  background: 'rgba(0,0,0,0.85)',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const topTitleStyle = { fontSize: 16, fontWeight: 600, letterSpacing: 0.3 };

const closeBtnStyle = {
  background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff', width: 36, height: 36, borderRadius: 18,
  fontSize: 16, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};

const videoWrapStyle = {
  flex: 1, position: 'relative', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000',
};

const videoStyle = { width: '100%', height: '100%', objectFit: 'cover' };

const reticleStyle = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '85%', maxWidth: 480, height: 110,
  border: '2px solid rgba(255,255,255,0.9)', borderRadius: 8,
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', pointerEvents: 'none',
};

const bottomBarStyle = {
  padding: '18px 18px 24px',
  paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
  background: 'rgba(0,0,0,0.85)',
  borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center',
};

const statusTextStyle = { fontSize: 15, lineHeight: 1.5, marginBottom: 12 };
const statusHintStyle = { opacity: 0.65, fontSize: 13, marginTop: 4 };
const buttonRowStyle  = { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' };

const secondaryBtnStyle = {
  background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff', padding: '10px 14px', borderRadius: 8,
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap',
};

const statusErrorStyle = { fontSize: 14, lineHeight: 1.5, color: '#ff8a8a' };

const photoErrorStyle = {
  marginTop: 12, fontSize: 13, lineHeight: 1.4, color: '#ffb366',
  padding: '8px 12px',
  background: 'rgba(255, 130, 0, 0.1)',
  border: '1px solid rgba(255, 130, 0, 0.3)',
  borderRadius: 6,
};
