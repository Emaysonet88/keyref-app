import { useEffect, useRef, useState } from 'react';

// ── VinScannerModal ────────────────────────────────────────────────────────
// Full-screen camera overlay for scanning a VIN barcode.
//
// LIVE SCANNING uses the native BarcodeDetector API (Chrome/Edge/Samsung
// Internet on Android). Fast, hardware-accelerated.
//
// PHOTO ANALYSIS uses a multi-stage pipeline:
//   0. (if HEIC) heic2any converts to JPEG — dynamic import, ~1.7MB
//   1. createImageBitmap or <img> loads the file
//   2. Auto-downsample if > 2000px on longest side
//   3. Native BarcodeDetector across 4 rotations (0°/90°/180°/270°)
//   4. ZXing TRY_HARDER fallback, also across 4 rotations
//
// CAMERA STARTUP (v7) drops the explicit resolution constraint so the
// browser picks the fastest available default. Capability detection
// (torch, autofocus) deferred until after the camera UI is showing.
// 8-second startup timeout with helpful error if camera hangs.
//
// HEIC SUPPORT (v8) — Apple's HEIC/HEIF format isn't natively decodable on
// Android Chrome or desktop browsers. When the locksmith uploads a HEIC
// from gallery (typical when an iPhone client AirDrops or emails a VIN
// photo), we transparently convert it to JPEG first using heic2any.
// Library is dynamically imported — only the locksmith who actually
// receives a HEIC pays the ~1.7MB load cost.

const SCAN_FORMATS = ['code_39', 'code_93', 'code_128', 'codabar', 'qr_code', 'data_matrix'];
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const MAX_PHOTO_DIMENSION = 2000;
const STARTUP_TIMEOUT_MS = 8000;

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
  const startupTimerRef = useRef(null);

  const [status,         setStatus]         = useState('starting');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn,        setTorchOn]        = useState(false);
  const [analyzeStage,   setAnalyzeStage]   = useState(null);

  useEffect(() => {
    cancelledRef.current = false;

    startupTimerRef.current = setTimeout(() => {
      if (cancelledRef.current) return;
      setStatus(curr => {
        if (curr === 'starting') {
          setErrorMsg('Camera is taking longer than expected to start. Close and try again, or check if another app is using the camera.');
          return 'error';
        }
        return curr;
      });
    }, STARTUP_TIMEOUT_MS);

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
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelledRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play().catch(() => { /* autoplay handles it */ });

        if (startupTimerRef.current) {
          clearTimeout(startupTimerRef.current);
          startupTimerRef.current = null;
        }
        setStatus('scanning');
        scanLoop();

        // Deferred capability setup
        setTimeout(() => {
          if (cancelledRef.current || !trackRef.current) return;
          try {
            const caps = trackRef.current.getCapabilities
              ? trackRef.current.getCapabilities()
              : {};
            if (caps.torch === true) setTorchSupported(true);
            if (caps.focusMode && caps.focusMode.includes('continuous')) {
              trackRef.current
                .applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
                .catch(() => { /* not fatal */ });
            }
          } catch { /* getCapabilities not implemented */ }
        }, 200);
      } catch (e) {
        if (startupTimerRef.current) {
          clearTimeout(startupTimerRef.current);
          startupTimerRef.current = null;
        }
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
      } catch { /* transient — keep looping */ }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    function stopAll() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (startupTimerRef.current) {
        clearTimeout(startupTimerRef.current);
        startupTimerRef.current = null;
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

  // ── Photo analysis pipeline ─────────────────────────────────────────────
  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setErrorMsg('');

    // ── Stage 0: HEIC conversion if needed ──────────────────────────────
    let workingFile = file;
    if (isHeicFile(file)) {
      setAnalyzeStage('heic');
      try {
        workingFile = await convertHeicToJpeg(file);
      } catch (e) {
        const msg = 'Could not convert HEIC photo: ' + (e.message || 'unknown error') + '. Try asking the client to re-send as JPEG.';
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(curr => curr === msg ? '' : curr), 9000);
        setAnalyzeStage(null);
        return;
      }
    }

    setAnalyzeStage('loading');

    let source;
    try {
      source = await loadImageFromFile(workingFile);
      source = await downsampleIfNeeded(source);
    } catch (e) {
      const friendly = formatLoadError(e, workingFile);
      setErrorMsg(friendly);
      setTimeout(() => setErrorMsg(curr => curr === friendly ? '' : curr), 9000);
      setAnalyzeStage(null);
      return;
    }

    try {
      setAnalyzeStage('native');
      let vin = await detectVinNativeRotations(source, detectorRef.current);

      if (!vin) {
        setAnalyzeStage('zxing');
        vin = await detectVinZxingRotations(source);
      }

      if (vin) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(80);
        stopAllExternal();
        cancelledRef.current = true;
        onScan(vin);
        return;
      }

      const msg = 'No VIN barcode found, even after trying both decoders and all rotations. Tips: crop tight to just the barcode, even lighting, no glare, hold steady.';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(curr => curr === msg ? '' : curr), 9000);
    } catch (e) {
      const msg = 'Could not analyze image: ' + (e.message || 'unknown error');
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(curr => curr === msg ? '' : curr), 5000);
    } finally {
      if (source && typeof source.close === 'function') {
        try { source.close(); } catch { /* noop */ }
      }
      setAnalyzeStage(null);
    }
  }

  function stopAllExternal() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (startupTimerRef.current) clearTimeout(startupTimerRef.current);
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
  const progressText =
    !analyzing                    ? 'Aim at the VIN barcode'
    : analyzeStage === 'heic'     ? 'Converting HEIC photo… (first time may take a few seconds)'
    : analyzeStage === 'loading'  ? 'Loading image…'
    : analyzeStage === 'native'   ? 'Analyzing image (fast decoder)…'
                                  : 'Trying enhanced decoder (a few seconds)…';

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
              {progressText}
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
              accept="image/*,.heic,.heif"
              capture="environment"
              onChange={handlePhotoSelected}
              style={{ display: 'none' }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,.heic,.heif"
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

// ── HEIC detection & conversion ────────────────────────────────────────────
// HEIC files come from iPhones by default. Android Chrome (and most other
// non-Apple browsers) can't natively decode them. heic2any is a JS library
// that wraps libheif (compiled to WebAssembly) and converts HEIC → JPEG in
// the browser. It's dynamic-imported so the cost is paid only by users who
// actually need it.

function isHeicFile(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type.includes('heic') || type.includes('heif')
      || name.endsWith('.heic') || name.endsWith('.heif');
}

async function convertHeicToJpeg(file) {
  let mod;
  try {
    mod = await import('heic2any');
  } catch (e) {
    throw new Error('HEIC converter failed to load. Check your internet connection.');
  }
  const heic2any = mod.default || mod;

  // Convert to JPEG. Quality 0.9 keeps barcode bars crisp without bloat.
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });

  // heic2any may return a single Blob or an array for multi-image HEIC.
  // VIN photos are always single-frame, but handle both shapes.
  const blob = Array.isArray(result) ? result[0] : result;
  const convertedName = (file.name || 'photo').replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], convertedName, { type: 'image/jpeg' });
}

// ── Image loading helpers ──────────────────────────────────────────────────

async function loadImageFromFile(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      try {
        return await createImageBitmap(file);
      } catch { /* fall through to <img> */ }
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const err = new Error('image-decode-failed');
      err.fileType = file.type || 'unknown';
      err.fileName = file.name || '';
      reject(err);
    };
    img.src = url;
  });
}

function formatLoadError(e, file) {
  const type = (file.type || '').toLowerCase();
  if (type && !type.startsWith('image/')) {
    return `That file isn\'t an image (${type}). Pick a photo of the VIN barcode.`;
  }
  return 'Could not load the image. It may be corrupted. Try a different photo or re-save it as JPEG.';
}

async function downsampleIfNeeded(source) {
  const w = source.naturalWidth  || source.width;
  const h = source.naturalHeight || source.height;
  const longest = Math.max(w, h);

  if (longest <= MAX_PHOTO_DIMENSION) return source;

  const scale = MAX_PHOTO_DIMENSION / longest;
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width  = newW;
  canvas.height = newH;
  canvas.getContext('2d').drawImage(source, 0, 0, newW, newH);

  if (typeof source.close === 'function') {
    try { source.close(); } catch { /* noop */ }
  }
  return canvas;
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

async function detectVinNativeRotations(source, detector) {
  let vin = await detectVinNative(source, detector);
  if (vin) return vin;
  for (const rotation of [90, 180, 270]) {
    const canvas = createRotatedCanvas(source, rotation);
    vin = await detectVinNative(canvas, detector);
    if (vin) return vin;
  }
  return null;
}

// ── ZXing fallback ─────────────────────────────────────────────────────────

async function detectVinZxingRotations(source) {
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
    const canvas = rotation === 0 ? sourceToCanvas(source) : createRotatedCanvas(source, rotation);
    try {
      const luminance = new HTMLCanvasElementLuminanceSource(canvas);
      const binary = new BinaryBitmap(new HybridBinarizer(luminance));
      const result = reader.decode(binary);
      const text = (result?.getText() || '').toUpperCase().trim();
      const candidate = extractVinCandidate(text);
      if (candidate && VIN_PATTERN.test(candidate)) return candidate;
    } catch {
      // ZXing throws when nothing's found
    } finally {
      try { reader.reset(); } catch { /* noop */ }
    }
  }
  return null;
}

// ── Canvas helpers ─────────────────────────────────────────────────────────

function sourceToCanvas(source) {
  if (source instanceof HTMLCanvasElement) return source;

  const canvas = document.createElement('canvas');
  const w = source.naturalWidth  || source.width;
  const h = source.naturalHeight || source.height;
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0);
  return canvas;
}

function createRotatedCanvas(source, degrees) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = source.naturalWidth  || source.width;
  const h = source.naturalHeight || source.height;

  if (degrees === 90 || degrees === 270) {
    canvas.width  = h;
    canvas.height = w;
  } else {
    canvas.width  = w;
    canvas.height = h;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2);
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
  marginTop: 12, fontSize: 13, lineHeight: 1.45, color: '#ffb366',
  padding: '10px 12px',
  background: 'rgba(255, 130, 0, 0.1)',
  border: '1px solid rgba(255, 130, 0, 0.3)',
  borderRadius: 6,
  textAlign: 'left',
};
