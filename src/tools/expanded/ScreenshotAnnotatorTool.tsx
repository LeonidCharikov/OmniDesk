import React, { useEffect, useRef, useState } from 'react';
import { Download, Undo, Type, Square, ArrowUpRight, Pencil, Printer } from 'lucide-react';
import { saveBinaryWithDialog } from '../../services/fileSystemService';
import { printImageDataUrl } from '../../services/printService';
import { useI18n } from '../../i18n/context';
import { btn, secondary, input, box, FilePicker, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   SCREENSHOT ANNOTATOR (Interactive Canvas: Boxes, Arrows, Text, Freehand, Undo)
   ───────────────────────────────────────────────────────────── */
type AnnotationShape =
  | { type: 'rect'; x: number; y: number; w: number; h: number; color: string; strokeWidth: number }
  | { type: 'arrow'; fromX: number; fromY: number; toX: number; toY: number; color: string; strokeWidth: number }
  | { type: 'text'; x: number; y: number; text: string; color: string; fontSize: number }
  | { type: 'pen'; points: { x: number; y: number }[]; color: string; strokeWidth: number };

export const ScreenshotAnnotatorTool: React.FC = () => {
  const { t } = useI18n();
  const [src, setSrc] = useState('');
  const [fileName, setFileName] = useState('');
  const [tool, setTool] = useState<'rect' | 'arrow' | 'text' | 'pen'>('rect');
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [textInput, setTextInput] = useState(() => t('annotator_sample_text', 'Poznámka k chybě'));
  const [shapes, setShapes] = useState<AnnotationShape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStart, setCurrentStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPenPoints, setCurrentPenPoints] = useState<{ x: number; y: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const load = (file: File) => {
    setFileName(file.name);
    setShapes([]);
    const img = new Image();
    img.onload = () => {
      baseImageRef.current = img;
      redraw();
      setSrc(URL.createObjectURL(file));
    };
    img.src = URL.createObjectURL(file);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) * (c.width / rect.width)),
      y: Math.floor((e.clientY - rect.top) * (c.height / rect.height)),
    };
  };

  const redraw = (temporaryShape?: AnnotationShape) => {
    const c = canvasRef.current;
    if (!c || !baseImageRef.current) return;
    c.width = baseImageRef.current.width;
    c.height = baseImageRef.current.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Draw base image
    ctx.drawImage(baseImageRef.current, 0, 0);

    // Draw all confirmed shapes
    const all = temporaryShape ? [...shapes, temporaryShape] : shapes;
    for (const s of all) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;

      if (s.type === 'rect') {
        ctx.lineWidth = s.strokeWidth;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      } else if (s.type === 'arrow') {
        ctx.lineWidth = s.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(s.fromX, s.fromY);
        ctx.lineTo(s.toX, s.toY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(s.toY - s.fromY, s.toX - s.fromX);
        const headLen = 14;
        ctx.beginPath();
        ctx.moveTo(s.toX, s.toY);
        ctx.lineTo(s.toX - headLen * Math.cos(angle - Math.PI / 6), s.toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(s.toX - headLen * Math.cos(angle + Math.PI / 6), s.toY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fill();
      } else if (s.type === 'text') {
        ctx.font = `bold ${s.fontSize}px sans-serif`;
        // Draw background pill for text readability
        const metrics = ctx.measureText(s.text);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(s.x - 4, s.y - s.fontSize, metrics.width + 8, s.fontSize + 6);
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, s.x, s.y);
      } else if (s.type === 'pen' && s.points.length > 1) {
        ctx.lineWidth = s.strokeWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    redraw();
  }, [shapes]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!baseImageRef.current) return;
    const coords = getCanvasCoords(e);
    if (tool === 'text') {
      if (textInput.trim()) {
        setShapes([...shapes, { type: 'text', x: coords.x, y: coords.y, text: textInput.trim(), color: activeColor, fontSize: 24 }]);
      }
      return;
    }
    setIsDrawing(true);
    setCurrentStart(coords);
    if (tool === 'pen') {
      setCurrentPenPoints([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStart) return;
    const coords = getCanvasCoords(e);

    if (tool === 'rect') {
      redraw({
        type: 'rect',
        x: Math.min(currentStart.x, coords.x),
        y: Math.min(currentStart.y, coords.y),
        w: Math.abs(coords.x - currentStart.x),
        h: Math.abs(coords.y - currentStart.y),
        color: activeColor,
        strokeWidth: 4,
      });
    } else if (tool === 'arrow') {
      redraw({
        type: 'arrow',
        fromX: currentStart.x,
        fromY: currentStart.y,
        toX: coords.x,
        toY: coords.y,
        color: activeColor,
        strokeWidth: 4,
      });
    } else if (tool === 'pen') {
      const nextPoints = [...currentPenPoints, coords];
      setCurrentPenPoints(nextPoints);
      redraw({
        type: 'pen',
        points: nextPoints,
        color: activeColor,
        strokeWidth: 4,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStart) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(false);

    if (tool === 'rect') {
      const w = Math.abs(coords.x - currentStart.x);
      const h = Math.abs(coords.y - currentStart.y);
      if (w > 5 && h > 5) {
        setShapes([
          ...shapes,
          {
            type: 'rect',
            x: Math.min(currentStart.x, coords.x),
            y: Math.min(currentStart.y, coords.y),
            w,
            h,
            color: activeColor,
            strokeWidth: 4,
          },
        ]);
      }
    } else if (tool === 'arrow') {
      setShapes([
        ...shapes,
        {
          type: 'arrow',
          fromX: currentStart.x,
          fromY: currentStart.y,
          toX: coords.x,
          toY: coords.y,
          color: activeColor,
          strokeWidth: 4,
        },
      ]);
    } else if (tool === 'pen') {
      if (currentPenPoints.length > 1) {
        setShapes([...shapes, { type: 'pen', points: currentPenPoints, color: activeColor, strokeWidth: 4 }]);
      }
      setCurrentPenPoints([]);
    }
    setCurrentStart(null);
  };

  const undo = () => {
    setShapes(shapes.slice(0, -1));
  };

  const save = () =>
    canvasRef.current?.toBlob(blob =>
      blob &&
      saveBinaryWithDialog(
        'screenshot-annotated.png',
        blob,
        'image/png',
        [{ name: 'PNG (*.png)', extensions: ['png'] }],
        t('save_screenshot', 'Uložit snímek')
      )
    );

  const printScreenshot = () => {
    if (!canvasRef.current) return;
    void printImageDataUrl(canvasRef.current.toDataURL('image/png'), {
      title: fileName || 'Screenshot',
    });
  };

  return (
    <div className="space-y-5">
      <Header
        title="Screenshot Annotator"
        desc={t('screenshot_desc', 'Draw boxes, arrows, text, and freehand marks on screenshots and export PNG.')}
      />
      <div className={box + ' space-y-4'}>
        <FilePicker
          id="screenshot-input"
          label={t('choose_image', 'Vybrat obrázek')}
          fileName={fileName || undefined}
          accept="image/*"
          onChange={e => e.target.files?.[0] && load(e.target.files[0])}
        />

        {src && (
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={tool === 'rect' ? btn : secondary}
                  onClick={() => setTool('rect')}
                  title={t('annot_box', 'Rámeček / Zvýraznění')}
                >
                  <Square className="w-3.5 h-3.5 inline mr-1" /> {t('annot_box_btn', 'Rámeček')}
                </button>
                <button
                  type="button"
                  className={tool === 'arrow' ? btn : secondary}
                  onClick={() => setTool('arrow')}
                  title={t('annot_arrow', 'Ukazovací šipka')}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 inline mr-1" /> {t('annot_arrow_btn', 'Šipka')}
                </button>
                <button
                  type="button"
                  className={tool === 'pen' ? btn : secondary}
                  onClick={() => setTool('pen')}
                  title={t('annot_pen', 'Kreslení volnou rukou')}
                >
                  <Pencil className="w-3.5 h-3.5 inline mr-1" /> {t('annot_pen_btn', 'Pero')}
                </button>
                <button
                  type="button"
                  className={tool === 'text' ? btn : secondary}
                  onClick={() => setTool('text')}
                  title={t('annot_text', 'Textová poznámka')}
                >
                  <Type className="w-3.5 h-3.5 inline mr-1" /> {t('annot_text_btn', 'Text')}
                </button>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-1.5">
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ffffff'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      activeColor === c ? 'scale-125 border-white' : 'border-slate-800 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setActiveColor(c)}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className={secondary} onClick={undo} disabled={!shapes.length} title={t('undo_last_action', 'Vrátit poslední akci')}>
                  <Undo className="w-3.5 h-3.5 inline mr-1" /> {t('undo', 'Vrátit')}
                </button>
                <button className={secondary} onClick={() => setShapes([])} disabled={!shapes.length}>
                  {t('clear_all', 'Vymazat vše')}
                </button>
                <button className={secondary} onClick={printScreenshot} title={t('print_btn', 'Print')}>
                  <Printer className="w-3.5 h-3.5 inline mr-1 text-indigo-400" /> {t('print_btn', 'Print')}
                </button>
                <button className={btn} onClick={save}>
                  <Download className="w-3.5 h-3.5 inline mr-1" /> {t('save_png', 'Uložit PNG')}
                </button>
              </div>
            </div>

            {tool === 'text' && (
              <div className="flex gap-2 items-center bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400">{t('text_to_insert_click', 'Text k vložení kliknutím:')}</span>
                <input
                  className={input + ' py-1'}
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={t('enter_text_click_image', 'Zadejte text a klikněte do obrázku…')}
                />
              </div>
            )}

            <div className="overflow-auto max-h-[600px] border border-slate-800 rounded-lg p-2 bg-slate-950 text-center">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="max-w-full mx-auto rounded cursor-crosshair shadow"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
