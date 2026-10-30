import React, { useState, useRef, useId } from 'react';
import { 
  FileBox, 
  Upload, 
  Download, 
  ArrowRight, 
  FileText, 
  Image as ImageIcon, 
  Table, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sliders,
  FileCode
} from 'lucide-react';
import mammoth from 'mammoth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useI18n } from '../../i18n/context';

type ConversionCategory = 'docs' | 'data' | 'images';

// Helper to make text safe for standard PDF Helvetica font (WinAnsi encoding)
function makeWinAnsiSafe(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?'); // keep printable ASCII and Latin-1 supplement
}

export const MultiFormatConverterTool: React.FC = () => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<ConversionCategory>('docs');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [stats, setStats] = useState<{ originalSize: number; newSize: number; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Image options
  const [targetImageFormat, setTargetImageFormat] = useState<'image/webp' | 'image/png' | 'image/jpeg'>('image/webp');
  const [imageQuality, setImageQuality] = useState<number>(85);
  const [imageScale, setImageScale] = useState<number>(100);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetFormatSelectId = useId();
  const qualityRangeId = useId();
  const scaleSelectId = useId();

  // 1. Convert Word/Text/Markdown to PDF
  const handleDocConversion = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    const start = performance.now();
    try {
      let textContent = '';
      const name = file.name.toLowerCase();

      if (name.endsWith('.docx')) {
        const ab = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: ab });
        textContent = res.value;
      } else {
        textContent = await file.text();
      }

      if (!textContent.trim()) {
        throw new Error(t('file_empty_error', 'Soubor je prázdný nebo z něj nebylo možné vytáhnout text.'));
      }

      // Generate PDF
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 50;
      const fontSize = 10;
      const lineHeight = 14;
      const maxLineWidth = pageWidth - margin * 2;

      const paragraphs = textContent.split('\n');
      const lines: string[] = [];

      for (const rawP of paragraphs) {
        const safeP = makeWinAnsiSafe(rawP);
        if (!safeP.trim()) {
          lines.push('');
          continue;
        }
        const words = safeP.split(/\s+/);
        let currentLine = '';
        for (const w of words) {
          const test = currentLine ? `${currentLine} ${w}` : w;
          if (font.widthOfTextAtSize(test, fontSize) > maxLineWidth) {
            lines.push(currentLine);
            currentLine = w;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) lines.push(currentLine);
      }

      const linesPerPage = Math.floor((pageHeight - margin * 2 - 30) / lineHeight);
      const totalPages = Math.max(1, Math.ceil(lines.length / linesPerPage));

      for (let p = 0; p < totalPages; p++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawText(`${makeWinAnsiSafe(file.name)} (OmniDesk Convert)`, {
          x: margin,
          y: pageHeight - margin + 12,
          size: 8,
          font: fontBold,
          color: rgb(0.3, 0.35, 0.4),
        });

        const pLines = lines.slice(p * linesPerPage, (p + 1) * linesPerPage);
        let y = pageHeight - margin - 15;
        for (const line of pLines) {
          if (line) {
            page.drawText(line, {
              x: margin,
              y,
              size: fontSize,
              font,
              color: rgb(0.15, 0.15, 0.15),
            });
          }
          y -= lineHeight;
        }

        page.drawText(`${t('page', 'Stránka')} ${p + 1} / ${totalPages}`, {
          x: pageWidth - margin - 60,
          y: margin - 15,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultBlobUrl(url);
      const outName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
      setResultFileName(outName);

      setStats({
        originalSize: file.size,
        newSize: blob.size,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('doc_conv_error', 'Chyba při konverzi dokumentu'));
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Convert Data (CSV <-> JSON)
  const handleDataConversion = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    const start = performance.now();
    try {
      const text = await file.text();
      let outputText = '';
      let outName = '';
      let mime = 'text/plain';

      if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.tsv')) {
        // CSV to JSON
        const delimiter = file.name.endsWith('.tsv') ? '\t' : ',';
        const lines = text.trim().split('\n').filter(Boolean);
        if (lines.length < 1) throw new Error(t('csv_empty_error', 'CSV soubor je prázdný'));
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
          const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, unknown> = {};
          headers.forEach((h, idx) => {
            const val = cols[idx] !== undefined ? cols[idx] : '';
            if (val === 'true') obj[h] = true;
            else if (val === 'false') obj[h] = false;
            else if (!isNaN(Number(val)) && val !== '') obj[h] = Number(val);
            else obj[h] = val;
          });
          return obj;
        });
        outputText = JSON.stringify(rows, null, 2);
        outName = file.name.replace(/\.[^/.]+$/, '') + '.json';
        mime = 'application/json';
      } else if (file.name.toLowerCase().endsWith('.json')) {
        // JSON to CSV
        const parsed = JSON.parse(text);
        const arrayData = Array.isArray(parsed) ? parsed : [parsed];
        if (arrayData.length === 0) throw new Error(t('json_empty_error', 'JSON pole je prázdné'));
        const keys = Array.from(new Set(arrayData.flatMap(item => Object.keys(item))));
        const csvRows: string[] = [];
        csvRows.push(keys.map(k => `"${k}"`).join(','));
        for (const item of arrayData) {
          const row = keys.map(k => {
            const val = item[k] === undefined || item[k] === null ? '' : String(item[k]);
            return `"${val.replace(/"/g, '""')}"`;
          });
          csvRows.push(row.join(','));
        }
        outputText = csvRows.join('\n');
        outName = file.name.replace(/\.[^/.]+$/, '') + '.csv';
        mime = 'text/csv';
      } else {
        throw new Error(t('data_format_error', 'Pro převod dat vyberte soubor .csv, .tsv nebo .json'));
      }

      const blob = new Blob([outputText], { type: mime });
      const url = URL.createObjectURL(blob);
      setResultBlobUrl(url);
      setResultFileName(outName);

      setStats({
        originalSize: file.size,
        newSize: blob.size,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('data_conv_error', 'Chyba při konverzi dat'));
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Convert & Optimize Image (PNG, JPG, WebP, etc.)
  const handleImageConversion = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    const start = performance.now();
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(t('image_load_error', 'Nelze načíst obrázek')));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const scaleFactor = imageScale / 100;
      canvas.width = Math.max(1, Math.round(img.width * scaleFactor));
      canvas.height = Math.max(1, Math.round(img.height * scaleFactor));

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(t('canvas_context_error', 'Nelze vytvořit 2D canvas'));

      // White background for JPEG conversion if transparent
      if (targetImageFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const quality = imageQuality / 100;
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          b => {
            if (b) resolve(b);
            else reject(new Error(t('canvas_export_error', 'Chyba při exportu canvasu')));
          },
          targetImageFormat,
          quality
        );
      });

      URL.revokeObjectURL(objectUrl);
      const ext = targetImageFormat === 'image/webp' ? '.webp' : targetImageFormat === 'image/png' ? '.png' : '.jpg';
      const outName = file.name.replace(/\.[^/.]+$/, '') + ext;
      const resultUrl = URL.createObjectURL(blob);
      setResultBlobUrl(resultUrl);
      setResultFileName(outName);
      setImagePreviewUrl(resultUrl);

      setStats({
        originalSize: file.size,
        newSize: blob.size,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('image_conv_error', 'Chyba při konverzi obrázku'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilePicked = (file: File) => {
    setSourceFileName(file.name);
    if (activeCategory === 'docs') {
      handleDocConversion(file);
    } else if (activeCategory === 'data') {
      handleDataConversion(file);
    } else {
      handleImageConversion(file);
    }
  };

  const loadPresetDemo = () => {
    if (activeCategory === 'docs') {
      const mdContent = `# OmniDesk Technical Documentation

## 1. System Architecture
Desktop multi-tool built with high performance and zero telemetry:
- Native shell: Tauri v2 (Rust backend)
- UI: React 19, TypeScript, Tailwind CSS
- Data processing: 100% local in device memory

## 2. Security Standards
Zero external API calls for files. All binary transformations run locally.`;
      const file = new File([mdContent], 'Technical_Document.md', { type: 'text/markdown' });
      setSourceFileName(file.name);
      handleDocConversion(file);
    } else if (activeCategory === 'data') {
      const csv = `ID,Product,Category,Price,InStock
1,Monitor 4K,Hardware,8990,true
2,Mechanical Keyboard,Peripherals,2490,true
3,Ergonomic Chair,Furniture,6800,false`;
      const file = new File([csv], 'inventory_data.csv', { type: 'text/csv' });
      setSourceFileName(file.name);
      handleDataConversion(file);
    } else {
      // Create a sample canvas image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.fillText('OmniDesk Image Test', 50, 160);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'sample_banner.png', { type: 'image/png' });
          setSourceFileName(file.name);
          handleImageConversion(file);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">
          {t('tool_multi_converter_title', 'Univerzální Multi-Formátový Konvertor')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('multi_converter_desc', 'Převod mezi dokumenty (DOCX, MD, TXT → PDF), strukturovanými daty (CSV ↔ JSON) a optimalizace obrázků (PNG, JPG, WebP).')}
        </p>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
        <button
          onClick={() => { setActiveCategory('docs'); setResultBlobUrl(null); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeCategory === 'docs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          {t('cat_docs_pdf', 'Dokumenty (DOCX, MD, TXT → PDF)')}
        </button>
        <button
          onClick={() => { setActiveCategory('data'); setResultBlobUrl(null); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeCategory === 'data' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          {t('cat_data_csv_json', 'Data (CSV ↔ JSON)')}
        </button>
        <button
          onClick={() => { setActiveCategory('images'); setResultBlobUrl(null); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeCategory === 'images' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          {t('cat_images_webp', 'Obrázky & Grafika (PNG, JPG → WebP)')}
        </button>
      </div>

      {/* Image optimization parameters (if activeCategory === 'images') */}
      {activeCategory === 'images' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
          <div className="space-y-1.5">
            <label htmlFor={targetFormatSelectId} className="font-semibold text-slate-400 uppercase tracking-wider block">
              {t('target_format', 'Cílový formát')}
            </label>
            <select
              id={targetFormatSelectId}
              value={targetImageFormat}
              onChange={e => setTargetImageFormat(e.target.value as 'image/webp' | 'image/png' | 'image/jpeg')}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="image/webp">WebP ({t('highest_saving', 'Nejvyšší úspora')})</option>
              <option value="image/png">PNG ({t('lossless', 'Bezztrátový')})</option>
              <option value="image/jpeg">JPEG ({t('photo_jpeg', 'Fotografie')})</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label htmlFor={qualityRangeId} className="font-semibold text-slate-400 uppercase tracking-wider">
                {t('compression_quality', 'Kvalita komprese')}
              </label>
              <span className="font-mono text-indigo-400 font-semibold">{imageQuality} %</span>
            </div>
            <input
              id={qualityRangeId}
              type="range"
              min="10"
              max="100"
              value={imageQuality}
              onChange={e => setImageQuality(parseInt(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={scaleSelectId} className="font-semibold text-slate-400 uppercase tracking-wider block">
              {t('scale_resize', 'Změna měřítka')}
            </label>
            <select
              id={scaleSelectId}
              value={imageScale}
              onChange={e => setImageScale(parseInt(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="100">100 % ({t('original_size', 'Původní velikost')})</option>
              <option value="75">75 % ({t('scale_75', '75 % zmenšení')})</option>
              <option value="50">50 % ({t('scale_50', 'Poloviční rozlišení')})</option>
              <option value="25">25 % ({t('scale_25', 'Čtvrtinové rozlišení')})</option>
            </select>
          </div>
        </div>
      )}

      {/* Upload Zone & Preset Demo */}
      <div className="space-y-3">
        <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 text-center bg-slate-900/20 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFilePicked(f);
            }}
            accept={
              activeCategory === 'docs' 
                ? '.docx,.doc,.md,.txt' 
                : activeCategory === 'data' 
                ? '.csv,.tsv,.json' 
                : 'image/*'
            }
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center pointer-events-none">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              {t('drag_file_here', 'Přetáhněte sem soubor pro okamžitou konverzi')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {activeCategory === 'docs' && t('supports_docs', 'Podporuje .docx, .md, .txt')}
              {activeCategory === 'data' && t('supports_data', 'Podporuje .csv, .tsv, .json')}
              {activeCategory === 'images' && t('supports_images', 'Podporuje .png, .jpg, .webp, .svg, .bmp')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={loadPresetDemo}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {t('try_sample_file', 'Vyzkoušet na ukázkovém souboru →')}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {isProcessing && (
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span className="text-xs font-medium text-slate-300">
            {t('processing_file_in_memory', 'Zpracovávám a optimalizuji soubor v paměti...')}
          </span>
        </div>
      )}

      {/* Results & Stats */}
      {stats && resultBlobUrl && !isProcessing && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">{t('conversion_time', 'Doba zpracování')}</span>
              <span className="text-sm font-semibold font-mono text-emerald-400">{stats.durationMs} ms</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">{t('original_size_label', 'Původní velikost')}</span>
              <span className="text-sm font-semibold font-mono text-slate-300">
                {(stats.originalSize / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">{t('new_size_label', 'Výsledná velikost')}</span>
              <span className="text-sm font-semibold font-mono text-indigo-300">
                {(stats.newSize / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">{t('savings_change', 'Úspora / Změna')}</span>
              <span className={`text-sm font-semibold font-mono ${
                stats.newSize < stats.originalSize ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {(((stats.newSize - stats.originalSize) / stats.originalSize) * 100).toFixed(1)} %
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-200">
                {t('conversion_finished', 'Převod dokončen')}: <strong className="text-white font-mono">{resultFileName}</strong>
              </span>
            </div>
            <a
              href={resultBlobUrl}
              download={resultFileName}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {t('download_converted_file', 'Stáhnout převedený soubor')}
            </a>
          </div>

          {/* Preview based on category */}
          {activeCategory === 'docs' && (
            <div className="h-80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <iframe src={resultBlobUrl} title={t('pdf_preview', 'Náhled PDF')} className="w-full h-full bg-slate-900" />
            </div>
          )}

          {activeCategory === 'images' && imagePreviewUrl && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center">
              <img
                src={imagePreviewUrl}
                alt={t('preview_converted_image', 'Náhled převedeného obrázku')}
                className="max-h-64 rounded-lg object-contain border border-slate-800"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
