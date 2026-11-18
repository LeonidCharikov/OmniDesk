import React, { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { input, box, FilePicker, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   IMAGE COLOR PICKER
   ───────────────────────────────────────────────────────────── */
export const ColorPickerTool: React.FC = () => {
  const { t } = useI18n();
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [hexColor, setHexColor] = useState('#6366f1');
  const [rgbColor, setRgbColor] = useState('rgb(99, 102, 241)');
  const [hslColor, setHslColor] = useState('hsl(239, 84%, 67%)');
  const [history, setHistory] = useState<string[]>(['#6366f1', '#10b981', '#f59e0b', '#ef4444']);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const piped = consumePendingToolPipe('color-picker');
    if (piped?.kind === 'file' && piped.file) {
      load(piped.file);
    }
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loadedImage || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = loadedImage.naturalWidth || loadedImage.width;
    c.height = loadedImage.naturalHeight || loadedImage.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(loadedImage, 0, 0);
    }
  }, [loadedImage]);

  const load = (file: File) => {
    setFileName(file.name);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    const image = new Image();
    image.onload = () => {
      setLoadedImage(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      if (objectUrlRef.current === url) {
        objectUrlRef.current = null;
      }
      setLoadedImage(null);
    };
    image.src = url;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  const applyHexSelection = (hex: string) => {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
      setHexColor(hex);
      return;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    setHexColor(hex);
    setRgbColor(`rgb(${r}, ${g}, ${b})`);
    setHslColor(rgbToHsl(r, g, b));
  };

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c || c.width === 0 || c.height === 0) return;
    const rect = c.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = Math.max(0, Math.min(c.width - 1, Math.floor((e.clientX - rect.left) * (c.width / rect.width))));
    const y = Math.max(0, Math.min(c.height - 1, Math.floor((e.clientY - rect.top) * (c.height / rect.height))));

    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${Array.from(pixel.slice(0, 3)).map(val => val.toString(16).padStart(2, '0')).join('')}`;
    const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    const hsl = rgbToHsl(pixel[0], pixel[1], pixel[2]);

    setHexColor(hex);
    setRgbColor(rgb);
    setHslColor(hsl);
    if (!history.includes(hex)) {
      setHistory([hex, ...history.slice(0, 9)]);
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="Image Color Picker"
        desc={t('color_picker_desc', 'Open an image and click any pixel to read its HEX, RGB, and HSL color.')}
      />
      <div className={box + ' space-y-4'}>
        <FilePicker
          id="color-picker-input"
          label={t('choose_image', 'Vybrat obrázek')}
          fileName={fileName || undefined}
          accept="image/*"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) load(file);
            e.currentTarget.value = '';
          }}
        />

        {loadedImage ? (
          <div className="overflow-auto max-h-[500px] border border-slate-800 rounded-lg p-2 bg-slate-950 text-center">
            <p className="text-xs text-slate-400 mb-2">
              💡 {t('click_pixel_to_pick', 'Klikněte kdekoliv do obrázku pro výběr barvy:')}
            </p>
            <canvas ref={canvasRef} onClick={pick} className="max-w-full mx-auto rounded cursor-crosshair shadow" />
          </div>
        ) : (
          <div className="p-8 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
            {t('no_image_loaded_color', 'Nahrajte obrázek pro výběr barev.')}
          </div>
        )}

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl border-2 border-slate-700 shadow-md transition-colors"
              style={{ backgroundColor: hexColor }}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white text-base">{hexColor.toUpperCase()}</span>
                <button
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={() => navigator.clipboard.writeText(hexColor)}
                >
                  <Copy className="w-3.5 h-3.5 inline" />
                </button>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {rgbColor} &bull; {hslColor}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block">{t('recent_swatches', 'Nedávno vybrané barvy:')}</span>
            <div className="flex gap-1.5 flex-wrap">
              {history.map(c => (
                <button
                  key={c}
                  className="w-7 h-7 rounded border border-slate-700 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    applyHexSelection(c);
                    navigator.clipboard.writeText(c);
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
