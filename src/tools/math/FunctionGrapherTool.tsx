import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  LineChart, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Eye, 
  EyeOff, 
  Layers, 
  HelpCircle,
  Crosshair
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface GraphFunction {
  id: string;
  name: string;
  expr: string;
  color: string;
  visible: boolean;
}

const PRESET_FUNCTIONS: { name: string; expr: string }[] = [
  { name: 'Parabola & Kořeny', expr: 'x^2 - 4' },
  { name: 'Tlumená vlna', expr: 'sin(3*x) * exp(-0.25*abs(x))' },
  { name: 'Sinc funkce', expr: 'sin(x) / x' },
  { name: 'Kubický polynom', expr: '0.2*x^3 - x^2 - x + 2' },
  { name: 'Gaussovský zvon', expr: '3 * exp(-0.5 * x^2)' },
  { name: 'Racionální lomená', expr: '(2*x) / (x^2 + 1)' },
];

export const FunctionGrapherTool: React.FC = () => {
  const { t, currentLanguage } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Functions state
  const [functions, setFunctions] = useState<GraphFunction[]>([
    { id: '1', name: 'f(x)', expr: 'sin(x) * 2', color: '#6366f1', visible: true },
    { id: '2', name: 'g(x)', expr: '0.2 * x^2 - 2', color: '#f43f5e', visible: true },
    { id: '3', name: 'h(x)', expr: 'cos(2*x)', color: '#10b981', visible: false },
  ]);

  // Viewport / Coordinate space: center (centerX, centerY) in math units, scale (pixels per math unit)
  const [centerX, setCenterX] = useState<number>(0);
  const [centerY, setCenterY] = useState<number>(0);
  const [scale, setScale] = useState<number>(40); // 40 pixels = 1.0 unit

  // Interactive mouse state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorCoord, setCursorCoord] = useState<{ x: number; y: number } | null>(null);

  // Inspector / Tangent state
  const [inspectX, setInspectX] = useState<number>(1.5);
  const [evalResults, setEvalResults] = useState<{ f: number | null; df: number | null }>({ f: null, df: null });

  // Safe Math expression evaluator
  const compileMath = (expr: string): ((x: number) => number) => {
    try {
      // Clean and normalize expression
      let clean = expr
        .replace(/\^/g, '**')
        .replace(/\bpi\b/gi, 'Math.PI')
        .replace(/\be\b/gi, 'Math.E')
        .replace(/\bsin\b/gi, 'Math.sin')
        .replace(/\bcos\b/gi, 'Math.cos')
        .replace(/\btan\b/gi, 'Math.tan')
        .replace(/\basin\b/gi, 'Math.asin')
        .replace(/\bacos\b/gi, 'Math.acos')
        .replace(/\batan\b/gi, 'Math.atan')
        .replace(/\bsqrt\b/gi, 'Math.sqrt')
        .replace(/\babs\b/gi, 'Math.abs')
        .replace(/\bexp\b/gi, 'Math.exp')
        .replace(/\bln\b/gi, 'Math.log')
        .replace(/\blog\b/gi, 'Math.log10')
        .replace(/\bfloor\b/gi, 'Math.floor')
        .replace(/\bceil\b/gi, 'Math.ceil');

      // Create function
      const fn = new Function('x', `"use strict"; try { return (${clean}); } catch(e) { return NaN; }`);
      return (x: number) => {
        const val = fn(x);
        return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : NaN;
      };
    } catch {
      return () => NaN;
    }
  };

  // Redraw canvas
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Coordinate conversion
    const mathToScreenX = (x: number) => width / 2 + (x - centerX) * scale;
    const mathToScreenY = (y: number) => height / 2 - (y - centerY) * scale;
    const screenToMathX = (px: number) => (px - width / 2) / scale + centerX;
    const screenToMathY = (py: number) => -(py - height / 2) / scale + centerY;

    const minX = screenToMathX(0);
    const maxX = screenToMathX(width);
    const minY = screenToMathY(height);
    const maxY = screenToMathY(0);

    // Determine adaptive grid step
    const targetPx = 60;
    const rawStep = targetPx / scale;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const rel = rawStep / magnitude;
    let step = magnitude;
    if (rel > 5) step = 5 * magnitude;
    else if (rel > 2) step = 2 * magnitude;

    // Draw Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Vertical grid lines (X ticks)
    const firstX = Math.floor(minX / step) * step;
    for (let x = firstX; x <= maxX; x += step) {
      const px = mathToScreenX(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();

      if (Math.abs(x) > 1e-6) {
        ctx.fillText(Number(x.toFixed(4)).toString(), px, Math.max(10, Math.min(height - 20, mathToScreenY(0) + 4)));
      }
    }

    // Horizontal grid lines (Y ticks)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const firstY = Math.floor(minY / step) * step;
    for (let y = firstY; y <= maxY; y += step) {
      const py = mathToScreenY(y);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();

      if (Math.abs(y) > 1e-6) {
        ctx.fillText(Number(y.toFixed(4)).toString(), Math.max(30, Math.min(width - 10, mathToScreenX(0) - 6)), py);
      }
    }

    // Main Axes
    const originX = mathToScreenX(0);
    const originY = mathToScreenY(0);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    // X Axis
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Y Axis
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Origin label
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('0', originX - 6, originY + 12);

    // Plot functions
    functions.forEach(fnObj => {
      if (!fnObj.visible || !fnObj.expr.trim()) return;

      const fn = compileMath(fnObj.expr);
      ctx.strokeStyle = fnObj.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      let started = false;
      const stepPx = 1; // 1 pixel step for smooth curves

      for (let px = 0; px <= width; px += stepPx) {
        const mx = screenToMathX(px);
        const my = fn(mx);

        if (isNaN(my)) {
          started = false;
          continue;
        }

        const py = mathToScreenY(my);

        // Clip jumps (asymptotes)
        if (py < -height || py > height * 2) {
          started = false;
          continue;
        }

        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    });

    // Tangent line & probe at inspectX if f(x) is visible
    const f0 = functions[0];
    if (f0 && f0.visible && f0.expr.trim()) {
      const fn = compileMath(f0.expr);
      const y0 = fn(inspectX);
      if (!isNaN(y0)) {
        // Numerical derivative
        const h = 1e-5;
        const dy = (fn(inspectX + h) - fn(inspectX - h)) / (2 * h);

        const screenX0 = mathToScreenX(inspectX);
        const screenY0 = mathToScreenY(y0);

        // Draw probe point
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(screenX0, screenY0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw tangent line segment
        const delta = 2; // in math units
        const tX1 = inspectX - delta;
        const tY1 = y0 - dy * delta;
        const tX2 = inspectX + delta;
        const tY2 = y0 + dy * delta;

        ctx.strokeStyle = '#fbbf2488';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mathToScreenX(tX1), mathToScreenY(tY1));
        ctx.lineTo(mathToScreenX(tX2), mathToScreenY(tY2));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [centerX, centerY, scale, functions, inspectX]);

  // Update inspection values when inspectX or f(x) changes
  useEffect(() => {
    const f0 = functions[0];
    if (!f0 || !f0.expr.trim()) {
      setEvalResults({ f: null, df: null });
      return;
    }
    const fn = compileMath(f0.expr);
    const val = fn(inspectX);
    if (isNaN(val)) {
      setEvalResults({ f: null, df: null });
    } else {
      const h = 1e-5;
      const dfVal = (fn(inspectX + h) - fn(inspectX - h)) / (2 * h);
      setEvalResults({ f: val, df: isNaN(dfVal) ? null : dfVal });
    }
  }, [inspectX, functions]);

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    drawGraph();
  }, [drawGraph]);

  // Mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);

    const mx = (px - canvas.width / 2) / scale + centerX;
    const my = -(py - canvas.height / 2) / scale + centerY;
    setCursorCoord({ x: mx, y: my });

    if (isDragging) {
      const dx = (e.clientX - dragStart.x) * (canvas.width / rect.width);
      const dy = (e.clientY - dragStart.y) * (canvas.height / rect.height);
      setCenterX(prev => prev - dx / scale);
      setCenterY(prev => prev + dy / scale);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale(prev => Math.max(10, Math.min(500, prev * factor)));
  };

  // Zoom buttons
  const zoomIn = () => setScale(prev => Math.min(500, prev * 1.25));
  const zoomOut = () => setScale(prev => Math.max(10, prev * 0.8));
  const resetView = () => {
    setCenterX(0);
    setCenterY(0);
    setScale(40);
  };

  // Export image
  const downloadGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `graph-${Date.now()}.png`;
    a.click();
  };

  const updateFunctionExpr = (id: string, expr: string) => {
    setFunctions(prev => prev.map(f => f.id === id ? { ...f, expr } : f));
  };

  const toggleFunctionVisibility = (id: string) => {
    setFunctions(prev => prev.map(f => f.id === id ? { ...f, visible: !f.visible } : f));
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('tool_function_grapher_title', 'Generátor & Vykreslovač Grafů Funkcí 2D')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_function_grapher_desc', 'Interaktivní vykreslování více funkcí f(x), g(x), h(x), posun tažením myší, zoom, tečna a export grafu do PNG.')}
          </p>
        </div>

        {/* Presets Button */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-500 px-2 font-medium">{t('templates_label', 'Vzory:')}</span>
          {PRESET_FUNCTIONS.slice(0, 4).map((p, idx) => (
            <button
              key={idx}
              onClick={() => updateFunctionExpr('1', p.expr)}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono transition-colors"
            >
              {t(p.name)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas & Graphing Area */}
      <div className="relative rounded-2xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setCursorCoord(null); }}
          onWheel={handleWheel}
          className="w-full h-[400px] cursor-grab active:cursor-grabbing block"
        />

        {/* HUD Overlay: Realtime coordinates */}
        {cursorCoord && (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-indigo-300 flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
            <span>X: {cursorCoord.x.toFixed(3)}</span>
            <span className="text-slate-600">|</span>
            <span>Y: {cursorCoord.y.toFixed(3)}</span>
          </div>
        )}

        {/* Canvas Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={zoomIn}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            title={t('zoom_in', 'Přiblížit (Zoom In)')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            title={t('zoom_out', 'Oddálit (Zoom Out)')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            title={t('reset_view', 'Resetovat zobrazení (0,0)')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800 mx-1" />
          <button
            onClick={downloadGraph}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            title={t('download_png', 'Stáhnout graf ve formátu PNG')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Function Inputs & Value Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Function Inputs */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
            {t('active_functions', 'Aktivní Funkční Výrazy')}
          </span>

          <div className="space-y-3">
            {functions.map(fnObj => (
              <div
                key={fnObj.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80"
              >
                <button
                  onClick={() => toggleFunctionVisibility(fnObj.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title={fnObj.visible ? t('hide_function', 'Skrýt funkci') : t('show_function', 'Zobrazit funkci')}
                >
                  {fnObj.visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <div 
                  className="w-3.5 h-3.5 rounded-full shrink-0" 
                  style={{ backgroundColor: fnObj.color }}
                />

                <span className="font-mono text-xs font-bold text-slate-300 shrink-0">
                  {fnObj.name} =
                </span>

                <input
                  type="text"
                  value={fnObj.expr}
                  onChange={e => updateFunctionExpr(fnObj.id, e.target.value)}
                  placeholder={t('function_placeholder', 'např. sin(x), x^2 - 3, 2*x')}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>
              {t('function_support_hint', 'Podporováno: sin(x), cos(x), tan(x), sqrt(x), exp(x), ln(x), abs(x), mocniny x^2, konstanty pi, e.')}
            </span>
          </div>
        </div>

        {/* Tangent & Inspector Tool */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
            {t('point_inspector_title', 'Inspektor Bodu & Tečna f(x)')}
          </span>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                {t('inspected_point_label', 'Zkoumaný bod x₀:')}
              </label>
              <input
                type="number"
                step="0.1"
                value={inspectX}
                onChange={e => setInspectX(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t('value_fx', 'Hodnota f(x₀):')}</span>
                <span className="text-indigo-400 font-bold">
                  {evalResults.f !== null ? evalResults.f.toFixed(4) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t('tangent_slope', 'Směrnice tečny f\'(x₀):')}</span>
                <span className="text-amber-400 font-bold">
                  {evalResults.df !== null ? evalResults.df.toFixed(4) : 'N/A'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t('tangent_hint', 'Žlutý bod na grafu zobrazuje polohu [x₀, f(x₀)] a čárkovaná linie znázorňuje tečnu funkce v daném bodě.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
