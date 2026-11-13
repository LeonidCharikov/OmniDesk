import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { ScanLine, Upload, Camera, StopCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface ScanRecord {
  id: string;
  text: string;
  format: string;
  timestamp: string;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; format: string }>>;
}

function isSafeHttpUrl(text: string): boolean {
  try {
    const u = new URL(text.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const QrBarcodeReaderTool: React.FC = () => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [scanningCam, setScanningCam] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [results, setResults] = useState<ScanRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stopCamera = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanningCam(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const addResult = (text: string, format: string) => {
    setResults(prev => {
      if (prev[0]?.text === text) return prev;
      return [
        {
          id: Date.now().toString(),
          text,
          format,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ];
    });
  };

  const decodeCanvas = async (canvas: HTMLCanvasElement): Promise<{ text: string; format: string } | null> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imgData.data, imgData.width, imgData.height);
    if (qr?.data) {
      return { text: qr.data, format: 'QR_CODE' };
    }

    const DetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorInstance;
      }
    ).BarcodeDetector;

    if (DetectorCtor) {
      try {
        const detector = new DetectorCtor({
          formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39'],
        });
        const found = await detector.detect(canvas);
        if (found.length > 0 && found[0].rawValue) {
          return { text: found[0].rawValue, format: found[0].format.toUpperCase() };
        }
      } catch {
        // ignore unsupported format
      }
    }
    return null;
  };

  const handleImageFile = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('load failed'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const decoded = await decodeCanvas(canvas);
      if (decoded) {
        addResult(decoded.text, decoded.format);
        setStatusMsg(t('qbr_found_success', 'Code decoded successfully!'));
      } else {
        setErrorMsg(t('qbr_not_found', 'No QR code or barcode detected in this image.'));
      }
    } catch {
      setErrorMsg(t('qbr_read_error', 'Failed to read image file.'));
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanningCam(true);

      const canvas = document.createElement('canvas');
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const v = videoRef.current;
        if (v.readyState >= 2 && v.videoWidth > 0) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const decoded = await decodeCanvas(canvas);
            if (decoded) {
              addResult(decoded.text, decoded.format);
              setStatusMsg(t('qbr_found_success', 'Code decoded successfully!'));
              stopCamera();
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };
      rafRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch {
      setErrorMsg(t('qbr_cam_error', 'Camera access denied or unavailable.'));
      stopCamera();
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
      if (item) {
        void handleImageFile(item.getAsFile());
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('qbr_title', 'QR & Barcode Reader')}</h2>
              <p className="text-xs text-slate-400">
                {t('qbr_subtitle', 'Scan QR codes or barcodes locally from an uploaded image, pasted screenshot, or camera.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!scanningCam ? (
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{t('qbr_start_cam', 'Scan with Camera')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>{t('qbr_stop_cam', 'Stop Camera')}</span>
              </button>
            )}
          </div>
        </div>

        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            void handleImageFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-950/60 text-center cursor-pointer transition-colors space-y-1.5"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => void handleImageFile(e.target.files?.[0])}
          />
          <Upload className="w-6 h-6 text-indigo-400 mx-auto" />
          <div className="text-sm font-medium text-slate-200">
            {t('qbr_drop_hint', 'Drop an image, click to upload, or press Ctrl+V to paste a screenshot')}
          </div>
        </div>

        <video
          ref={videoRef}
          muted
          playsInline
          className={`w-full max-h-72 rounded-xl bg-black object-contain ${scanningCam ? 'block' : 'hidden'}`}
        />

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}
        {statusMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300">
            {statusMsg}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">
              {t('qbr_decoded_results', 'Decoded Results')} ({results.length})
            </div>
            {results.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono text-slate-500">
                    {item.format} · {item.timestamp}
                  </div>
                  <div className="text-sm font-mono text-white break-all mt-1">{item.text}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isSafeHttpUrl(item.text) && (
                    <a
                      href={item.text.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-indigo-300 hover:text-white flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('open', 'Open')}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => copyText(item.id, item.text)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === item.id ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
