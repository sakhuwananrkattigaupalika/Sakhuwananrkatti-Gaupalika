import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import QRCode from 'qrcode';
import {
  X,
  Camera,
  Upload,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  QrCode as QrCodeIcon,
} from 'lucide-react';
import { Language } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (referenceCode: string) => void;
  lang: Language;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  lang,
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [showDemoQRs, setShowDemoQRs] = useState(false);
  const [demoQrDataUrl, setDemoQrDataUrl] = useState<string | null>(null);
  const [activeDemoRef, setActiveDemoRef] = useState<string>('SKK-2026-001');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'skk-qr-scanner-viewport';

  // Play audio confirmation tone via Web Audio API
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);

      if ('vibrate' in navigator) {
        navigator.vibrate([80, 40, 80]);
      }
    } catch {
      // Audio context may be restricted by autoplay policy
    }
  };

  // Smart Reference Extractor: parses URLs, JSON payloads, or raw strings
  const extractReferenceCode = (rawText: string): string => {
    const text = rawText.trim();

    // 1. Check if it's a full URL containing ref= or id=
    try {
      if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/')) {
        const parsedUrl = new URL(text, window.location.origin);
        const refParam = parsedUrl.searchParams.get('ref') || parsedUrl.searchParams.get('id');
        if (refParam) {
          return refParam.trim().toUpperCase();
        }
      }
    } catch {
      // Not a valid URL, continue parsing
    }

    // 2. Check if it's JSON (e.g. { "ref": "SKK-2026-001" })
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const json = JSON.parse(text);
        if (json.ref) return String(json.ref).trim().toUpperCase();
        if (json.referenceNumber) return String(json.referenceNumber).trim().toUpperCase();
        if (json.id) return String(json.id).trim().toUpperCase();
      } catch {
        // Not JSON
      }
    }

    // 3. Search for Municipal standard pattern: SKK-YYYY-XXXX... or SKK-APP-YYYY-...
    const match = text.match(/SKK-[A-Za-z0-9-]+/i);
    if (match) {
      return match[0].toUpperCase();
    }

    // 4. Default: return clean uppercase text
    return text.toUpperCase();
  };

  // Safely stop scanner
  const stopScannerSafely = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error clearing scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  }, []);

  // Handle successful scan
  const handleSuccess = useCallback(
    async (decodedText: string) => {
      const cleaned = extractReferenceCode(decodedText);
      setScannedResult(cleaned);
      playScanBeep();
      await stopScannerSafely();

      // Short delay for visual checkmark before passing to search
      setTimeout(() => {
        onScanSuccess(cleaned);
        onClose();
      }, 700);
    },
    [onClose, onScanSuccess, stopScannerSafely]
  );

  // Initialize and start live camera
  const startScanner = useCallback(
    async (cameraIdToUse?: string) => {
      setScannerError(null);
      setScannedResult(null);

      try {
        await stopScannerSafely();

        const qrScanner = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        });
        html5QrCodeRef.current = qrScanner;

        // Fetch cameras if not loaded yet
        let targetId = cameraIdToUse;
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
            if (!targetId) {
              // Prefer back/environment camera
              const backCam = devices.find(
                (d) =>
                  d.label.toLowerCase().includes('back') ||
                  d.label.toLowerCase().includes('rear') ||
                  d.label.toLowerCase().includes('environment')
              );
              targetId = backCam ? backCam.id : devices[0].id;
              setSelectedCameraId(targetId);
            }
          }
        } catch (e) {
          console.warn('Could not enumerate cameras, falling back to facingMode:', e);
        }

        const config = {
          fps: 25,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.72);
            return {
              width: Math.max(180, size),
              height: Math.max(180, size),
            };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        };

        const cameraSetting = targetId ? targetId : { facingMode: 'environment' };

        await qrScanner.start(
          cameraSetting,
          config,
          (decodedText) => {
            handleSuccess(decodedText);
          },
          () => {
            // Ignore frame-by-frame non-matches
          }
        );

        setIsScanning(true);

        // Check torch capability
        try {
          const capabilities = qrScanner.getRunningTrackCapabilities?.();
          if (capabilities && 'torch' in capabilities) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: unknown) {
        console.error('Failed to start QR scanner:', err);
        const errMsg = err instanceof Error ? err.message : String(err);

        if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
          setScannerError(
            lang === 'en'
              ? 'Camera permission denied. Please allow camera access in browser settings or upload a QR image below.'
              : 'क्यामेरा अनुमति अस्वीकृत भयो। कृपया ब्राउजर सेटिङमा क्यामेरा अनुमति दिनुहोस् वा तलको बटनबाट QR फोटो अपलोड गर्नुहोस्।'
          );
        } else if (errMsg.includes('NotFoundError') || errMsg.includes('device')) {
          setScannerError(
            lang === 'en'
              ? 'No camera found on this device. You can still scan by uploading an image or screenshot.'
              : 'यस उपकरणमा क्यामेरा फेला परेन। तपाईं ग्यालरीबाट QR को फोटो अपलोड गरी स्क्यान गर्न सक्नुहुन्छ।'
          );
        } else {
          setScannerError(
            lang === 'en'
              ? 'Could not start camera. Please upload a photo of the QR code instead.'
              : 'क्यामेरा सुरु हुन सकेन। कृपया ग्यालरीबाट QR कोडको फोटो छान्नुहोस्।'
          );
        }
        setIsScanning(false);
      }
    },
    [handleSuccess, lang, stopScannerSafely]
  );

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle not supported', e);
    }
  };

  // Flip Camera (between front/back or next camera in list)
  const flipCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    setSelectedCameraId(nextCam.id);
    await startScanner(nextCam.id);
  };

  // Handle Image File / Gallery Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setScannerError(null);

    try {
      // Temporarily stop camera if active
      await stopScannerSafely();

      const qrScanner = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const decodedText = await qrScanner.scanFile(file, true);
      await qrScanner.clear();
      setIsFileScanning(false);
      handleSuccess(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setIsFileScanning(false);
      setScannerError(
        lang === 'en'
          ? 'Could not read a valid QR code from the selected image. Please try another clearer image.'
          : 'छानिएको फोटोमा स्पष्ट QR कोड भेटिएन। कृपया अर्को स्पष्ट फोटो वा स्क्रिनसट छान्नुहोस्।'
      );
      // Restart camera
      startScanner();
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Generate Demo QR Code for testing
  const generateDemoQr = useCallback((ref: string) => {
    setActiveDemoRef(ref);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sakhuwanankarkatti.gov.np';
    const testUrl = `${origin}/?ref=${encodeURIComponent(ref)}`;
    QRCode.toDataURL(testUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#163a63',
        light: '#ffffff',
      },
    })
      .then((url) => setDemoQrDataUrl(url))
      .catch((err) => console.error('Failed to generate test QR', err));
  }, []);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      generateDemoQr('SKK-2026-001');
      // Delay camera start slightly to allow DOM modal render
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScannerSafely();
      };
    } else {
      stopScannerSafely();
    }
  }, [isOpen, generateDemoQr, startScanner, stopScannerSafely]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#163A63] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-teal-300">
              <QrCodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                {lang === 'en' ? 'Municipal QR Tracker Scanner' : 'नागरिक QR ट्र्याकर स्क्यानर'}
              </h3>
              <p className="text-[11px] text-blue-200 font-medium">
                सखुवानान्कारकट्टी गाउँपालिका, सिराहा
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScannerSafely();
              onClose();
            }}
            className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner View Area */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Viewfinder Card */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-square max-h-[340px] mx-auto flex items-center justify-center shadow-inner border-2 border-slate-800">
            {/* The Target DOM Container for Html5Qrcode */}
            <div
              id={containerId}
              className="w-full h-full object-cover overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Target Reticle & Animated Scanner Laser when camera is scanning */}
            {isScanning && !scannedResult && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* 4 Corner Markers */}
                <div className="relative w-56 h-56 border-2 border-white/20 rounded-2xl">
                  {/* Top-Left */}
                  <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-teal-400 rounded-tl-xl" />
                  {/* Top-Right */}
                  <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-teal-400 rounded-tr-xl" />
                  {/* Bottom-Left */}
                  <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-teal-400 rounded-bl-xl" />
                  {/* Bottom-Right */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-teal-400 rounded-br-xl" />

                  {/* Animated Laser Beam */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] animate-[bounce_2.5s_infinite]" />
                </div>
              </div>
            )}

            {/* Success Animation Overlay */}
            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-white p-4 text-center animate-in zoom-in-90 z-20">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2 animate-bounce" />
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold">
                  {lang === 'en' ? 'QR Code Verified!' : 'QR कोड पहिचान भयो!'}
                </span>
                <span className="text-lg sm:text-xl font-mono font-black mt-1 text-white bg-white/10 px-3 py-1 rounded-xl">
                  {scannedResult}
                </span>
                <span className="text-xs text-emerald-200 mt-2">
                  {lang === 'en' ? 'Fetching tracking records...' : 'प्रगति विवरण खुल्दैछ...'}
                </span>
              </div>
            )}

            {/* Camera Loading Spinner */}
            {!isScanning && !scannerError && !scannedResult && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-300 p-4 text-center z-10">
                <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-3" />
                <span className="text-xs font-semibold">
                  {lang === 'en' ? 'Starting municipal camera scanner...' : 'क्यामेरा स्क्यानर खुल्दैछ...'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  कृपया क्यामेरा अनुमति दिनुहोस्
                </span>
              </div>
            )}

            {/* Error Message Display */}
            {scannerError && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-slate-200 p-6 text-center z-20">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <span className="text-xs font-bold text-amber-300 mb-1">
                  {lang === 'en' ? 'Camera Notice' : 'क्यामेरा सूचना'}
                </span>
                <p className="text-[11px] text-slate-300 max-w-xs leading-relaxed mb-4">
                  {scannerError}
                </p>
                <button
                  onClick={() => startScanner()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Try Again' : 'पुनः प्रयास गर्नुहोस्'}</span>
                </button>
              </div>
            )}

            {/* Floating Top In-Viewport Toolbar */}
            {isScanning && (
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-10">
                {/* Torch Toggle */}
                {hasTorch ? (
                  <button
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md transition ${
                      torchOn ? 'bg-amber-400 text-slate-900 shadow-lg' : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                    title={torchOn ? 'बत्ती निभाउनुहोस्' : 'टर्च बाल्नुहोस्'}
                  >
                    {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                  </button>
                ) : <div />}

                {/* Flip Camera */}
                {cameras.length > 1 && (
                  <button
                    onClick={flipCamera}
                    className="p-2 rounded-xl bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition flex items-center gap-1 text-[11px]"
                    title="क्यामेरा बदल्नुहोस् (Flip Camera)"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Flip</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Scanner Instructions */}
          <div className="text-center">
            <p className="text-xs text-slate-600 font-medium">
              {lang === 'en'
                ? 'Align the receipt QR code inside the frame to track progress instantly.'
                : 'रसिद वा फाराममा रहेको QR कोडलाई फ्रेमभित्र राख्नुहोस्, स्थिति स्वतः खुल्नेछ।'}
            </p>
          </div>

          {/* Alternative: Upload Photo / Screenshot from Phone */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold text-slate-800 block">
                {lang === 'en' ? 'Have a saved photo or screenshot?' : 'ग्यालरी वा स्क्रिनसटबाट स्क्यान?'}
              </span>
              <span className="text-[11px] text-slate-500">
                {lang === 'en' ? 'Select a photo containing the QR code' : 'QR कोड भएको फोटो वा रसिद फाइल छान्नुहोस्'}
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isFileScanning}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition flex items-center gap-2 active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-teal-600" />
              <span>{isFileScanning ? 'स्क्यान हुँदैछ...' : 'फोटो छान्नुहोस्'}</span>
            </button>
          </div>

          {/* Interactive Demo QR Tokens (For users testing without paper) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => setShowDemoQRs(!showDemoQRs)}
              className="w-full flex items-center justify-between text-xs font-bold text-[#163A63] hover:text-blue-900 py-1 transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>परीक्षणका लागि नमुना QR टोकनहरू (Demo QR Codes)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {showDemoQRs ? 'लुकाउनुहोस् ▲' : 'हेर्नुहोस् ▼'}
              </span>
            </button>

            {showDemoQRs && (
              <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-2xl p-4 animate-in fade-in space-y-3">
                <p className="text-[11px] text-slate-600">
                  कागजी रसिद नभएमा तलका नमुना दर्ता नम्बरमा ट्याप गरी सिधै ट्र्याक गर्न सक्नुहुन्छ वा QR कोड अर्को फोनबाट स्क्यान गर्न सक्नुहुन्छ:
                </p>

                {/* Quick 1-tap test chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { ref: 'SKK-2026-001', label: 'सडक मर्मत (वडा १)' },
                    { ref: 'SKK-2026-002', label: 'खानेपानी (वडा २)' },
                    { ref: 'SKK-2026-003', label: 'स्वास्थ्य चौकी (वडा ४)' },
                  ].map((item) => (
                    <button
                      key={item.ref}
                      onClick={() => {
                        generateDemoQr(item.ref);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition border ${
                        activeDemoRef === item.ref
                          ? 'bg-[#163A63] text-white border-[#163A63] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.ref}
                    </button>
                  ))}
                </div>

                {/* Generated Demo QR image preview */}
                {demoQrDataUrl && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <img
                      src={demoQrDataUrl}
                      alt={`QR Code for ${activeDemoRef}`}
                      className="w-24 h-24 border border-slate-200 rounded-lg p-1 bg-white shrink-0"
                    />
                    <div className="text-left space-y-1">
                      <div className="text-xs font-bold text-slate-800">
                        {activeDemoRef} को प्रत्यक्ष QR कोड
                      </div>
                      <p className="text-[11px] text-slate-500">
                        यसलाई अर्को उपकरणबाट क्यामेरा देखाएर स्क्यान परीक्षण गर्न सक्नुहुन्छ।
                      </p>
                      <button
                        onClick={() => {
                          onScanSuccess(activeDemoRef);
                          onClose();
                        }}
                        className="mt-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg transition inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>यो नम्बर सिधै ट्र्याक गर्नुहोस्</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>गोप्य र सुरक्षित स्थानीय ट्र्याकिङ</span>
          </span>

          <button
            onClick={() => {
              stopScannerSafely();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            बन्द गर्नुहोस् (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
