import React, { useRef, useState, useEffect } from 'react';
import {
  Pencil,
  Eraser,
  RotateCcw,
  Trash2,
  Download,
  Copy,
  Check,
  Grid,
  Sparkles,
  Maximize2,
  Palette,
  FileCheck2,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveBinaryWithDialog } from '../../services/fileSystemService';

export const SketchpadTool: React.FC = () => {
  const { t } = useI18n();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#6366f1');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);
  const [showGridGuide, setShowGridGuide] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [copied, setCopied] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set real resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 540 * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Fill background
      if (!isTransparent) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, 540);
      }
      // Save initial blank state
      const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initial]);
    }
  }, [isTransparent]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-15), state]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    const previous = newHistory[newHistory.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory(newHistory);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, 540);
    if (!isTransparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, 540);
    }
    saveState();
  };

  // Coordinates helper
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = strokeWidth;
    if (isEraser) {
      if (isTransparent) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#ffffff';
      }
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
      saveState();
    }
  };

  // Download image as PNG with File Explorer
  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async blob => {
      if (!blob) return;
      await saveBinaryWithDialog(
        `skica_${new Date().toISOString().slice(0, 10)}.png`,
        blob,
        'image/png',
        [
          { name: 'PNG Obrázek (*.png)', extensions: ['png'] },
          { name: 'Všechny soubory (*.*)', extensions: ['*'] }
        ],
        t('save_sketch_title', 'Uložit náčrt / podpis (Průzkumník)')
      );
    }, 'image/png');
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async blob => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // Browser might restrict image clipboard without user prompt
    }
  };

  const PRESET_COLORS = [
    { label: t('color_black', 'Černá'), hex: '#0f172a' },
    { label: t('color_indigo', 'Indigo'), hex: '#6366f1' },
    { label: t('color_emerald', 'Zelená'), hex: '#10b981' },
    { label: t('color_rose', 'Červená'), hex: '#f43f5e' },
    { label: t('color_amber', 'Oranžová'), hex: '#f59e0b' },
    { label: t('color_blue', 'Modrá'), hex: '#3b82f6' },
  ];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_sketchpad_title', 'Jednoduchý skicák & Podpisový arch')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              HTML5 Canvas
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'tool_sketchpad_desc',
              'Rychlé načrtnutí diagramu, myšlenky či elektronický podpis myší nebo dotykem. Export přímo do PNG s průhledným či bílým pozadím.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={undo}
            disabled={history.length <= 1}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1.5"
            title={t('undo_tooltip', 'Vrátit poslední tah (Zpět)')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('undo_btn', 'Zpět')}</span>
          </button>

          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('copied_image', 'Zkopírováno!') : t('copy_image_btn', 'Kopírovat obrázek')}</span>
          </button>

          <button
            onClick={downloadPng}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
            title={t('download_png_tooltip', 'Stáhnout jako PNG obrázek')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('download_png_btn', 'Stáhnout PNG')}</span>
          </button>

          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            title={t('clear_canvas_tooltip', 'Vymazat celé plátno')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tools: Pen vs Eraser */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              onClick={() => setIsEraser(false)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                !isEraser ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{t('tool_pen', 'Pero')}</span>
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                isEraser ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>{t('tool_eraser', 'Guma')}</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* Stroke Width */}
          <div className="flex items-center gap-1">
            {[2, 4, 8, 16].map(w => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center ${
                  strokeWidth === w
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
                title={`${w}px`}
              >
                <div
                  style={{ width: `${Math.min(14, w * 1.5)}px`, height: `${Math.min(14, w * 1.5)}px` }}
                  className="rounded-full bg-current"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Colors Palette */}
        {!isEraser && (
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map(p => (
              <button
                key={p.hex}
                onClick={() => setColor(p.hex)}
                style={{ backgroundColor: p.hex }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === p.hex ? 'scale-110 border-white shadow-md' : 'border-slate-800 hover:scale-105'
                }`}
                title={p.label}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-6 h-6 rounded-full bg-transparent border-0 cursor-pointer"
              title={t('custom_color_picker', 'Vlastní barva')}
            />
          </div>
        )}

        {/* Canvas Options: Background & Grid */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGridGuide(prev => !prev)}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
              showGridGuide
                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={t('toggle_grid_guide', 'Zobrazit pomocnou mřížku pro podpis')}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('guide_grid', 'Mřížka')}</span>
          </button>

          <button
            onClick={() => setIsTransparent(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
              isTransparent
                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isTransparent ? t('bg_transparent', 'Průhledné') : t('bg_white', 'Bílé plátno')}
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl touch-none ${
          isTransparent
            ? 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950'
            : 'bg-white'
        }`}
        style={{ height: '540px' }}
      >
        {/* Subtle Signature guide line */}
        {showGridGuide && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-8 pb-14 opacity-25">
            <div className="w-full border-b-2 border-dashed border-slate-500 flex items-center justify-between pb-1">
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                {t('signature_line_guide', 'Linka pro podpis / skicu')}
              </span>
              <FileCheck2 className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />
      </div>
    </div>
  );
};
