import React, { useState, useRef } from 'react';
import { ImageDown, Upload, Download, ShieldCheck, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface CompressedItem {
  id: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  hadExif: boolean;
  outputUrl: string;
  outputExt: string;
}

function detectJpegExif(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return false;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) return true; // APP1 EXIF/XMP
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    const size = view.getUint16(offset, false);
    if (size < 2) break;
    offset += size;
  }
  return false;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('Blob export failed'));
      },
      mime,
      quality
    );
  });
}

export const PhotoCompressorTool: React.FC = () => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [maxDim, setMaxDim] = useState('1920');
  const [mode, setMode] = useState<'quality' | 'target'>('quality');
  const [qualityPct, setQualityPct] = useState('80');
  const [targetKb, setTargetKb] = useState('400');
  const [isProcessing, setIsProcessing] = useState(false);
  const [items, setItems] = useState<CompressedItem[]>([]);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);
    const maxDimension = Math.max(100, Number(maxDim) || 1920);
    const targetBytes = Math.max(20, Number(targetKb) || 400) * 1024;
    const fixedQuality = Math.max(0.1, Math.min(1, (Number(qualityPct) || 80) / 100));

    const newItems: CompressedItem[] = [];

    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) continue;
      const objUrl = URL.createObjectURL(file);
      try {
        const buffer = await file.arrayBuffer();
        const hadExif = detectJpegExif(buffer);
        const img = await loadImage(objUrl);

        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDimension || h > maxDimension) {
          const ratio = Math.min(maxDimension / w, maxDimension / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        if (format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);

        let finalBlob: Blob;
        if (mode === 'quality') {
          finalBlob = await canvasToBlob(canvas, format, fixedQuality);
        } else {
          // Binary search quality to fit targetBytes
          let lo = 0.1;
          let hi = 0.95;
          let best = await canvasToBlob(canvas, format, lo);
          for (let step = 0; step < 6; step++) {
            const mid = (lo + hi) / 2;
            const candidate = await canvasToBlob(canvas, format, mid);
            if (candidate.size <= targetBytes) {
              best = candidate;
              lo = mid;
            } else {
              hi = mid;
            }
          }
          finalBlob = best;
        }

        const outUrl = URL.createObjectURL(finalBlob);
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          originalSize: file.size,
          compressedSize: finalBlob.size,
          width: w,
          height: h,
          hadExif,
          outputUrl: outUrl,
          outputExt: format === 'image/webp' ? 'webp' : 'jpg',
        });
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    }

    setItems(prev => [...newItems, ...prev]);
    setIsProcessing(false);
  };

  const downloadItem = (item: CompressedItem) => {
    const baseName = item.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = item.outputUrl;
    a.download = `${baseName}-clean.${item.outputExt}`;
    a.click();
  };

  const clearAll = () => {
    items.forEach(i => URL.revokeObjectURL(i.outputUrl));
    setItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ImageDown className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('pc_title', 'Quick Photo Compressor & EXIF Stripper')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('pc_subtitle', 'Shrink photos to a target file size and automatically strip GPS/camera EXIF metadata locally.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('pc_exif_note', 'All EXIF & GPS tags stripped')}</span>
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('pc_format', 'Output Format')}</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            >
              <option value="image/jpeg">JPEG (.jpg)</option>
              <option value="image/webp">WebP (.webp)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('pc_max_dim', 'Max Width/Height (px)')}</label>
            <input
              type="number"
              min="100"
              value={maxDim}
              onChange={e => setMaxDim(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('pc_mode', 'Compression Mode')}</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as typeof mode)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            >
              <option value="quality">{t('pc_mode_quality', 'Quality (%)')}</option>
              <option value="target">{t('pc_mode_target', 'Target Max KB')}</option>
            </select>
          </div>
          <div>
            {mode === 'quality' ? (
              <>
                <label className="block text-xs text-slate-400 mb-1">{t('pc_quality_pct', 'Quality (%)')}</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={qualityPct}
                  onChange={e => setQualityPct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </>
            ) : (
              <>
                <label className="block text-xs text-slate-400 mb-1">{t('pc_target_kb', 'Max Size (KB)')}</label>
                <input
                  type="number"
                  min="20"
                  value={targetKb}
                  onChange={e => setTargetKb(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </>
            )}
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            processFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-950/60 text-center cursor-pointer transition-colors space-y-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => processFiles(e.target.files)}
          />
          <Upload className="w-7 h-7 text-indigo-400 mx-auto" />
          <div className="text-sm font-medium text-slate-200">
            {isProcessing
              ? t('pc_processing', 'Compressing & stripping metadata...')
              : t('pc_drop_hint', 'Drop photos here or click to select (supports batch)')}
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>{items.length} {t('pc_files_ready', 'processed images')}</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('clear', 'Clear')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(item => {
                const savedPct = Math.round((1 - item.compressedSize / Math.max(1, item.originalSize)) * 100);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.outputUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{item.name}</div>
                        <div className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
                          {formatBytes(item.originalSize)} →{' '}
                          <span className="text-emerald-400 font-semibold">{formatBytes(item.compressedSize)}</span>{' '}
                          ({savedPct > 0 ? `-${savedPct}%` : `+${Math.abs(savedPct)}%`})
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.width}×{item.height}px
                          {item.hadExif ? ` · ${t('pc_exif_removed', 'EXIF stripped')}` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('download', 'Download')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
