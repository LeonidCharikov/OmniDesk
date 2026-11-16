import React, { useState, useMemo, useRef, useEffect, useCallback, useId } from 'react';
import {
  Pipette,
  Copy,
  Check,
  Shuffle,
  Download,
  Plus,
  Trash2,
  Palette,
  Disc,
  Grid3X3,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  clamp,
  FLAT_UI_CHART,
  generateHarmonyHexes,
  generateHarmonyHsv,
  generateTintsAndShades,
  generateWebSafeChart,
  getContrastingTextColor,
  HarmonyMode,
  hexToRgb,
  HsvColor,
  hsvToHex,
  hsvToRgb,
  MATERIAL_CHART,
  normalizeHex,
  parseHexWithAlpha,
  parseRgbString,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToOklch,
  TAILWIND_COLOR_CHART,
  TAILWIND_SHADES,
} from '../../utils/colorMath';
import { saveBinaryWithDialog, saveTextWithDialog } from '../../services/fileSystemService';

type StudioTab = 'picker' | 'wheel' | 'charts' | 'converter';
type ChartKind = 'tailwind' | 'material' | 'flat' | 'websafe';
type CodeFormat = 'hex' | 'rgb' | 'hsl' | 'oklch' | 'cmyk';

interface EyeDropperConstructor {
  new (): { open: () => Promise<{ sRGBHex: string }> };
}

const PALETTE_STORAGE_KEY = 'omnidesk_color_studio_palette_v1';

const DEFAULT_SAVED_PALETTE = ['#FA5039', '#6366F1', '#10B981', '#F59E0B', '#EC4899'];

const HARMONY_MODES: HarmonyMode[] = [
  'analogous',
  'complementary',
  'triadic',
  'split-complementary',
  'tetradic',
  'square',
  'monochromatic',
];

export const ColorStudioTool: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<StudioTab>('picker');
  const [hsv, setHsv] = useState<HsvColor>({ h: 7, s: 77, v: 98 }); // #FA5039
  const [alpha, setAlpha] = useState<number>(1);
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>('analogous');
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('hex');
  const [showAllHarmonies, setShowAllHarmonies] = useState<boolean>(true);
  const [showExportPanel, setShowExportPanel] = useState<boolean>(false);

  // Charts state
  const [chartKind, setChartKind] = useState<ChartKind>('tailwind');
  const [chartSearch, setChartSearch] = useState<string>('');
  const [hoveredChartItem, setHoveredChartItem] = useState<{ label: string; hex: string } | null>(null);

  // Converter inputs
  const [hexDraft, setHexDraft] = useState<string>('#FA5039');
  const [rgbDraft, setRgbDraft] = useState<string>('250, 80, 57');
  const [hexParseError, setHexParseError] = useState<boolean>(false);
  const [rgbParseError, setRgbParseError] = useState<boolean>(false);

  // Custom saved palette
  const [savedPalette, setSavedPalette] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage failure
    }
    return DEFAULT_SAVED_PALETTE;
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const svCanvasRef = useRef<HTMLDivElement>(null);
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const draggingModeRef = useRef<'sv' | 'wheel' | 'ring' | null>(null);

  const harmonySelectId = useId();
  const formatSelectId = useId();
  const hexInputId = useId();
  const rgbInputId = useId();

  useEffect(() => {
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(savedPalette));
    } catch {
      // ignore
    }
  }, [savedPalette]);

  // Derived color values
  const rgb = useMemo(() => hsvToRgb(hsv.h, hsv.s, hsv.v), [hsv]);
  const hex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);
  const hexWithAlpha = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b, alpha), [rgb, alpha]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb.r, rgb.g, rgb.b), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb.r, rgb.g, rgb.b), [rgb]);
  const tintsShades = useMemo(() => generateTintsAndShades(hex, 11), [hex]);
  const harmonyHexes = useMemo(() => generateHarmonyHexes(hsv, harmonyMode), [hsv, harmonyMode]);
  const harmonyHsvPoints = useMemo(() => generateHarmonyHsv(hsv, harmonyMode), [hsv, harmonyMode]);
  const webSafeChart = useMemo(() => generateWebSafeChart(), []);

  // Keep converter drafts in sync when hsv changes from UI pickers
  useEffect(() => {
    setHexDraft(alpha < 1 ? hexWithAlpha : hex);
    setRgbDraft(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    setHexParseError(false);
    setRgbParseError(false);
  }, [hex, hexWithAlpha, alpha, rgb.r, rgb.g, rgb.b]);

  const setColorFromHex = useCallback((nextHex: string, nextAlpha?: number) => {
    const parsed = parseHexWithAlpha(nextHex);
    if (!parsed) return;
    const c = hexToRgb(parsed.hex);
    setHsv(rgbToHsv(c.r, c.g, c.b));
    if (typeof nextAlpha === 'number') {
      setAlpha(clamp(nextAlpha, 0, 1));
    } else if (parsed.alpha < 1) {
      setAlpha(parsed.alpha);
    }
  }, []);

  const setColorFromRgb = useCallback((r: number, g: number, b: number, nextAlpha?: number) => {
    const cr = clamp(Math.round(r), 0, 255);
    const cg = clamp(Math.round(g), 0, 255);
    const cb = clamp(Math.round(b), 0, 255);
    setHsv(rgbToHsv(cr, cg, cb));
    if (typeof nextAlpha === 'number') {
      setAlpha(clamp(nextAlpha, 0, 1));
    }
  }, []);

  const copyText = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1800);
  }, []);

  const formattedActiveCode = useMemo(() => {
    switch (codeFormat) {
      case 'hex':
        return alpha < 1 ? hexWithAlpha : hex;
      case 'rgb':
        return alpha < 1
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`
          : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      case 'hsl':
        return alpha < 1
          ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha.toFixed(2)})`
          : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      case 'oklch':
        return alpha < 1
          ? `oklch(${oklch.l} ${oklch.c} ${oklch.h} / ${Math.round(alpha * 100)}%)`
          : `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
      case 'cmyk':
        return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
    }
  }, [codeFormat, alpha, hex, hexWithAlpha, rgb, hsl, oklch, cmyk]);

  const randomizeColor = () => {
    const randomH = Math.floor(Math.random() * 360);
    const randomS = Math.floor(45 + Math.random() * 50);
    const randomV = Math.floor(55 + Math.random() * 43);
    setHsv({ h: randomH, s: randomS, v: randomV });
    setAlpha(1);
  };

  const supportsEyeDropper =
    typeof window !== 'undefined' && 'EyeDropper' in (window as unknown as Record<string, unknown>);

  const openEyeDropper = async () => {
    if (!supportsEyeDropper) return;
    try {
      const Ctor = (window as unknown as { EyeDropper: EyeDropperConstructor }).EyeDropper;
      const dropper = new Ctor();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        setColorFromHex(result.sRGBHex, 1);
      }
    } catch {
      // User canceled eyedropper
    }
  };

  const addCurrentToPalette = () => {
    setSavedPalette(prev => (prev.includes(hex) ? prev : [...prev, hex].slice(-24)));
  };

  const removeFromPalette = (targetHex: string) => {
    setSavedPalette(prev => prev.filter(c => c !== targetHex));
  };

  // ── 2D SV Picker Pointer Interactions ──────────────────────────────────────
  const updateSvFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = svCanvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
    setHsv(prev => ({ ...prev, s: Math.round(s), v: Math.round(v) }));
  }, []);

  // ── Color Wheel Canvas Rendering & Pointer Interactions ────────────────────
  const WHEEL_SIZE = 280;
  const OUTER_R = 132;
  const RING_INNER_R = 114;
  const WHEEL_R = 104;

  useEffect(() => {
    if (activeTab !== 'wheel') return;
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_SIZE * dpr;
    canvas.height = WHEEL_SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;

    // 1. Outer Value / Brightness ring (0-360 deg mapped to Value 0%..100% starting from top)
    for (let deg = 0; deg < 360; deg += 1) {
      const startRad = ((deg - 90) * Math.PI) / 180;
      const endRad = ((deg - 88.5) * Math.PI) / 180;
      const vStep = (deg / 360) * 100;
      const ringHex = hsvToHex(hsv.h, hsv.s, vStep);
      ctx.beginPath();
      ctx.arc(cx, cy, (OUTER_R + RING_INNER_R) / 2, startRad, endRad);
      ctx.strokeStyle = ringHex;
      ctx.lineWidth = OUTER_R - RING_INNER_R;
      ctx.stroke();
    }

    // 2. Inner HSV Color Wheel (angle = Hue, radius = Saturation, brightness = hsv.v)
    const imgData = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    const data = imgData.data;

    // Draw wheel pixels cleanly in logical space, then draw onto canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = WHEEL_SIZE;
    offscreen.height = WHEEL_SIZE;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      for (let y = 0; y < WHEEL_SIZE; y++) {
        for (let x = 0; x < WHEEL_SIZE; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= WHEEL_R) {
            const sat = (dist / WHEEL_R) * 100;
            // 0 deg at top (12 o'clock) moving clockwise
            let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
            if (deg < 0) deg += 360;
            const pixelRgb = hsvToRgb(deg, sat, hsv.v);
            const idx = (y * WHEEL_SIZE + x) * 4;
            data[idx] = pixelRgb.r;
            data[idx + 1] = pixelRgb.g;
            data[idx + 2] = pixelRgb.b;
            // Anti-aliased outer edge
            data[idx + 3] = dist > WHEEL_R - 1.2 ? Math.round((WHEEL_R - dist + 0.5) * 200) : 255;
          }
        }
      }
      offCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(offscreen, 0, 0, WHEEL_SIZE, WHEEL_SIZE);
    }

    // 3. Draw harmony guide lines + points
    const points = harmonyHsvPoints;
    const toCoords = (pt: HsvColor) => {
      const rad = ((pt.h - 90) * Math.PI) / 180;
      const r = (pt.s / 100) * WHEEL_R;
      return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
    };

    if (points.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5;
      points.forEach(pt => {
        const coords = toCoords(pt);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      });
      ctx.restore();
    }

    // Harmony secondary handles
    points.forEach((pt, idx) => {
      const coords = toCoords(pt);
      const isPrimary = pt.h === hsv.h && pt.s === hsv.s;
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, isPrimary ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = hsvToHex(pt.h, pt.s, pt.v);
      ctx.fill();
      ctx.lineWidth = isPrimary ? 3 : 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      if (isPrimary) {
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 10.5, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.stroke();
      } else if (idx === points.length - 1 && harmonyMode === 'monochromatic') {
        // Subtle marker on monochromatic stops
      }
    });

    // Outer brightness handle
    const vRad = (((hsv.v / 100) * 360 - 90) * Math.PI) / 180;
    const ringMid = (OUTER_R + RING_INNER_R) / 2;
    const vx = cx + Math.cos(vRad) * ringMid;
    const vy = cy + Math.sin(vRad) * ringMid;
    ctx.beginPath();
    ctx.arc(vx, vy, 7, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  }, [activeTab, hsv, hex, harmonyHsvPoints, harmonyMode]);

  const updateWheelFromPointer = useCallback((clientX: number, clientY: number, mode: 'wheel' | 'ring') => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WHEEL_SIZE - WHEEL_SIZE / 2;
    const y = ((clientY - rect.top) / rect.height) * WHEEL_SIZE - WHEEL_SIZE / 2;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (mode === 'ring') {
      const nextV = clamp(Math.round((deg / 360) * 100), 1, 100);
      setHsv(prev => ({ ...prev, v: nextV }));
    } else {
      const dist = Math.sqrt(x * x + y * y);
      const nextS = clamp(Math.round((dist / WHEEL_R) * 100), 0, 100);
      setHsv(prev => ({ ...prev, h: Math.round(deg) % 360, s: nextS }));
    }
  }, []);

  // ── Exports ────────────────────────────────────────────────────────────────
  const buildExportStrings = (colors: string[]) => {
    const css = `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`;
    const tailwind = `// tailwind.config.js\ncolors: {\n  brand: {\n${colors
      .map((c, i) => `    ${(i + 1) * 100}: '${c}',`)
      .join('\n')}\n  }\n}`;
    const json = JSON.stringify(
      colors.map((c, i) => {
        const r = hexToRgb(c);
        const h = rgbToHsl(r.r, r.g, r.b);
        const ok = rgbToOklch(r.r, r.g, r.b);
        return {
          token: `color-${i + 1}`,
          hex: c,
          rgb: `rgb(${r.r}, ${r.g}, ${r.b})`,
          hsl: `hsl(${h.h}, ${h.s}%, ${h.l}%)`,
          oklch: `oklch(${ok.l} ${ok.c} ${ok.h})`,
        };
      }),
      null,
      2
    );
    const svgWidth = colors.length * 120;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="140" viewBox="0 0 ${svgWidth} 140">\n${colors
      .map((c, i) => {
        const textFill = getContrastingTextColor(c);
        return `  <rect x="${i * 120}" y="0" width="120" height="140" fill="${c}" />\n  <text x="${i * 120 + 60}" y="76" font-family="monospace" font-size="14" font-weight="bold" fill="${textFill}" text-anchor="middle">${c}</text>`;
      })
      .join('\n')}\n</svg>`;
    return { css, tailwind, json, svg };
  };

  const downloadPalettePng = async (colors: string[]) => {
    const width = Math.max(480, colors.length * 160);
    const height = 220;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colW = width / colors.length;
    colors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(idx * colW, 0, colW, height);
      ctx.fillStyle = getContrastingTextColor(c);
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c, idx * colW + colW / 2, height / 2 + 6);
    });

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      await saveBinaryWithDialog(`omnidesk-palette-${hex.slice(1)}.png`, blob, 'image/png', [
        { name: 'PNG Image (*.png)', extensions: ['png'] },
      ]);
    }
  };

  const activeExportColors = useMemo(() => {
    return harmonyHexes.length > 1 ? harmonyHexes : savedPalette;
  }, [harmonyHexes, savedPalette]);

  const exportStrings = useMemo(() => buildExportStrings(activeExportColors), [activeExportColors]);

  const getHarmonyLabel = (mode: HarmonyMode) => {
    switch (mode) {
      case 'analogous': return t('harmony_analogous', 'Analogous');
      case 'complementary': return t('harmony_complementary', 'Complementary');
      case 'triadic': return t('harmony_triadic', 'Triadic');
      case 'split-complementary': return t('harmony_split_complementary', 'Split Complementary');
      case 'tetradic': return t('harmony_tetradic', 'Tetradic');
      case 'square': return t('harmony_square', 'Square');
      case 'monochromatic': return t('harmony_monochromatic', 'Monochromatic');
    }
  };

  const handleHexInputChange = (val: string) => {
    setHexDraft(val);
    const parsed = parseHexWithAlpha(val);
    if (parsed) {
      setHexParseError(false);
      setColorFromHex(parsed.hex, parsed.alpha);
    } else {
      const rgbParsed = parseRgbString(val);
      if (rgbParsed) {
        setHexParseError(false);
        setColorFromRgb(rgbParsed.r, rgbParsed.g, rgbParsed.b, rgbParsed.a);
      } else {
        setHexParseError(val.trim().length > 0);
      }
    }
  };

  const handleRgbInputChange = (val: string) => {
    setRgbDraft(val);
    const parsed = parseRgbString(val);
    if (parsed) {
      setRgbParseError(false);
      setColorFromRgb(parsed.r, parsed.g, parsed.b, parsed.a);
    } else {
      setRgbParseError(val.trim().length > 0);
    }
  };

  const filteredTailwind = useMemo(() => {
    const q = chartSearch.trim().toLowerCase();
    if (!q) return TAILWIND_COLOR_CHART;
    return TAILWIND_COLOR_CHART.filter(
      fam =>
        fam.name.includes(q) ||
        fam.hexes.some(h => h.toLowerCase().includes(q))
    );
  }, [chartSearch]);

  const activeContrastText = getContrastingTextColor(hex);
  const pureHueHex = useMemo(() => hsvToHex(hsv.h, 100, 100), [hsv.h]);

  return (
    <div className="space-y-5">
      {/* Header + Mode Switcher */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('tool_color_studio_title', 'Color Picker, Wheel & Charts Studio')}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {t('tool_color_studio_desc', 'Classic HSV picker, interactive color wheel, Tailwind/Material/Web-Safe charts, color harmonies, and live RGB ↔ Hex converter.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {([
            { id: 'picker', label: t('color_tab_picker', 'Color Picker'), icon: Palette },
            { id: 'wheel', label: t('color_tab_wheel', 'Color Wheel'), icon: Disc },
            { id: 'charts', label: t('color_tab_charts', 'Color Charts'), icon: Grid3X3 },
            { id: 'converter', label: t('color_tab_converter', 'RGB ↔ Hex'), icon: ArrowLeftRight },
          ] as const).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Live Readout + Tints & Shades Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Swatch + Eyedropper */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <div
              className="w-7 h-7 rounded-lg border border-white/10 shadow-inner"
              style={{
                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
              }}
              title={hexWithAlpha}
            />
            {supportsEyeDropper && (
              <button
                type="button"
                onClick={openEyeDropper}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title={t('eyedropper_pick', 'Pick color from screen')}
              >
                <Pipette className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Copyable format readouts */}
          {[
            { id: 'bar-hex', label: 'Hex', val: alpha < 1 ? hexWithAlpha : hex },
            { id: 'bar-rgb', label: 'RGB', val: `${rgb.r}, ${rgb.g}, ${rgb.b}` },
            { id: 'bar-hsl', label: 'HSL', val: `${hsl.h}, ${hsl.s}, ${hsl.l}` },
            { id: 'bar-oklch', label: 'OKLCH', val: `${oklch.l}, ${oklch.c}, ${oklch.h}` },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => copyText(item.val, item.id)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs flex items-center gap-1.5 transition-colors group"
              title={t('click_to_copy', 'Click to copy')}
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{item.label}</span>
              <span className="font-mono font-semibold text-slate-100">{item.val}</span>
              {copiedId === item.id ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-300" />
              )}
            </button>
          ))}
        </div>

        {/* Tints & Shades 11-step interactive strip + Quick actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="flex items-center rounded-xl overflow-hidden border border-slate-800 h-8 shadow-inner"
            aria-label={t('tints_and_shades', 'Tints & Shades')}
          >
            {tintsShades.map((stopHex, idx) => {
              const isSelected = stopHex.toUpperCase() === hex.toUpperCase();
              const dotColor = getContrastingTextColor(stopHex);
              return (
                <button
                  key={`${stopHex}-${idx}`}
                  type="button"
                  onClick={() => setColorFromHex(stopHex)}
                  className="w-5 h-full flex items-center justify-center transition-transform hover:scale-y-110 focus:outline-none"
                  style={{ backgroundColor: stopHex }}
                  title={stopHex}
                >
                  {isSelected && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addCurrentToPalette}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
            title={t('add_to_palette', 'Pin to Palette')}
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('pin_color', 'Pin')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportPanel(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showExportPanel
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('export_colors', 'Export')}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Export Drawer */}
      {showExportPanel && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                {t('export_palette_formats', 'Export Active Harmony Colors')} ({activeExportColors.join(', ')})
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyText(exportStrings.css, 'exp-css')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5"
              >
                {copiedId === 'exp-css' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{t('copy_css_vars', 'Copy CSS')}</span>
              </button>
              <button
                type="button"
                onClick={() => copyText(exportStrings.tailwind, 'exp-tw')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5"
              >
                {copiedId === 'exp-tw' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{t('copy_tailwind', 'Copy Tailwind')}</span>
              </button>
              <button
                type="button"
                onClick={() => copyText(exportStrings.json, 'exp-json')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5"
              >
                {copiedId === 'exp-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{t('copy_json', 'Copy JSON')}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  saveTextWithDialog(`palette-${hex.slice(1)}.svg`, exportStrings.svg, [
                    { name: 'SVG (*.svg)', extensions: ['svg'] },
                  ])
                }
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>SVG</span>
              </button>
              <button
                type="button"
                onClick={() => downloadPalettePng(activeExportColors)}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>
            </div>
          </div>
          <pre className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
            {exportStrings.css}
          </pre>
        </div>
      )}

      {/* TAB 1: CLASSIC COLOR PICKER */}
      {activeTab === 'picker' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: 2D Gradient Square + Hue + Alpha + Format Input */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              {/* 2D Saturation / Value Plane */}
              <div
                ref={svCanvasRef}
                onPointerDown={e => {
                  draggingModeRef.current = 'sv';
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateSvFromPointer(e.clientX, e.clientY);
                }}
                onPointerMove={e => {
                  if (draggingModeRef.current === 'sv') {
                    updateSvFromPointer(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={() => {
                  draggingModeRef.current = null;
                }}
                className="relative w-full h-64 rounded-xl overflow-hidden cursor-crosshair select-none touch-none border border-slate-800 shadow-inner"
                style={{ backgroundColor: pureHueHex }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, #000000, transparent)' }}
                />
                {/* Draggable Crosshair Handle */}
                <div
                  className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg pointer-events-none"
                  style={{
                    left: `${hsv.s}%`,
                    top: `${100 - hsv.v}%`,
                    backgroundColor: hex,
                    boxShadow: '0 0 0 1.5px rgba(15, 23, 42, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)',
                  }}
                />
              </div>

              {/* Hue Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{t('color_hue', 'Hue')}</span>
                  <span>{hsv.h}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={hsv.h}
                  onChange={e => setHsv(prev => ({ ...prev, h: Number(e.target.value) }))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer border border-slate-800"
                  style={{
                    background:
                      'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                  }}
                  aria-label={t('color_hue', 'Hue')}
                />
              </div>

              {/* Alpha Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{t('color_alpha', 'Opacity')}</span>
                  <span>{Math.round(alpha * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(alpha * 100)}
                  onChange={e => setAlpha(Number(e.target.value) / 100)}
                  className="w-full h-2.5 rounded-full appearance-none cursor-pointer border border-slate-800 bg-slate-950"
                  style={{
                    background: `linear-gradient(to right, transparent, ${hex})`,
                  }}
                  aria-label={t('color_alpha', 'Opacity')}
                />
              </div>

              {/* Code Readout + Format Switcher */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div
                  className="w-7 h-7 rounded-lg shrink-0 border border-white/10"
                  style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` }}
                />
                <input
                  type="text"
                  value={codeFormat === 'hex' ? hexDraft : formattedActiveCode}
                  readOnly={codeFormat !== 'hex'}
                  onChange={e => {
                    if (codeFormat === 'hex') handleHexInputChange(e.target.value);
                  }}
                  className="flex-1 bg-transparent font-mono text-sm font-semibold text-white focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => copyText(formattedActiveCode, 'picker-code')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title={t('copy', 'Copy')}
                >
                  {copiedId === 'picker-code' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <label htmlFor={formatSelectId} className="sr-only">
                  {t('color_format', 'Color Format')}
                </label>
                <select
                  id={formatSelectId}
                  value={codeFormat}
                  onChange={e => setCodeFormat(e.target.value as CodeFormat)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="hex">Hex</option>
                  <option value="rgb">RGB</option>
                  <option value="hsl">HSL</option>
                  <option value="oklch">OKLCH</option>
                  <option value="cmyk">CMYK</option>
                </select>
              </div>

              {/* Random + Export Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={randomizeColor}
                  className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('random_palette', 'Random color')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowExportPanel(true)}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('export_colors', 'Export colors')}</span>
                </button>
              </div>
            </div>

            {/* Right: Harmony Selector & Large Preview Swatch Stack */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={harmonySelectId} className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('color_harmony_label', 'Color Harmony')}
                </label>
                <select
                  id={harmonySelectId}
                  value={harmonyMode}
                  onChange={e => setHarmonyMode(e.target.value as HarmonyMode)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {HARMONY_MODES.map(mode => (
                    <option key={mode} value={mode} className="bg-slate-900">
                      {getHarmonyLabel(mode)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-h-[280px] rounded-2xl overflow-hidden border border-slate-800 flex flex-col shadow-inner">
                {harmonyHexes.map((swHex, idx) => {
                  const fg = getContrastingTextColor(swHex);
                  const isBase = swHex.toUpperCase() === hex.toUpperCase();
                  return (
                    <button
                      key={`${swHex}-${idx}`}
                      type="button"
                      onClick={() => copyText(swHex, `stack-${idx}`)}
                      className="flex-1 w-full px-4 py-3 flex items-center justify-between transition-opacity hover:opacity-95 group"
                      style={{ backgroundColor: swHex, color: fg }}
                    >
                      <span className="font-mono text-sm font-bold tracking-wide flex items-center gap-2">
                        {swHex.slice(1)}
                        {isBase && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: fg }}
                          />
                        )}
                      </span>
                      <span className="text-[11px] font-medium opacity-75 group-hover:opacity-100 flex items-center gap-1">
                        {copiedId === `stack-${idx}` ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            {t('copied', 'Copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {swHex}
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* All Color Harmonies Accordion Section */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <button
              type="button"
              onClick={() => setShowAllHarmonies(prev => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-sm font-semibold text-white">
                {t('color_harmonies_title', 'Color Harmonies')}
              </span>
              {showAllHarmonies ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showAllHarmonies && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {HARMONY_MODES.map(mode => {
                  const list = generateHarmonyHexes(hsv, mode);
                  return (
                    <div
                      key={mode}
                      className={`p-3.5 rounded-xl bg-slate-950/70 border space-y-2.5 transition-colors ${
                        harmonyMode === mode ? 'border-indigo-500/60' : 'border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setHarmonyMode(mode)}
                          className="text-xs font-semibold text-slate-200 hover:text-indigo-300 transition-colors"
                        >
                          {getHarmonyLabel(mode)}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(list.join(', '), `harm-${mode}`)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedId === `harm-${mode}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{t('copy', 'Copy')}</span>
                        </button>
                      </div>
                      <div className="h-12 rounded-xl overflow-hidden flex border border-slate-800/80">
                        {list.map((cHex, i) => {
                          const textCol = getContrastingTextColor(cHex);
                          return (
                            <button
                              key={`${cHex}-${i}`}
                              type="button"
                              onClick={() => setColorFromHex(cHex)}
                              className="flex-1 h-full flex items-center justify-center text-[10px] font-mono font-semibold hover:flex-[1.3] transition-all"
                              style={{ backgroundColor: cHex, color: textCol }}
                              title={cHex}
                            >
                              {cHex.toUpperCase() === hex.toUpperCase() ? '●' : cHex}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE COLOR WHEEL */}
      {activeTab === 'wheel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center space-y-5">
            <canvas
              ref={wheelCanvasRef}
              style={{ width: `${WHEEL_SIZE}px`, height: `${WHEEL_SIZE}px` }}
              onPointerDown={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * WHEEL_SIZE - WHEEL_SIZE / 2;
                const y = ((e.clientY - rect.top) / rect.height) * WHEEL_SIZE - WHEEL_SIZE / 2;
                const dist = Math.sqrt(x * x + y * y);
                const mode = dist >= RING_INNER_R - 4 ? 'ring' : 'wheel';
                draggingModeRef.current = mode;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateWheelFromPointer(e.clientX, e.clientY, mode);
              }}
              onPointerMove={e => {
                if (draggingModeRef.current === 'wheel' || draggingModeRef.current === 'ring') {
                  updateWheelFromPointer(e.clientX, e.clientY, draggingModeRef.current);
                }
              }}
              onPointerUp={() => {
                draggingModeRef.current = null;
              }}
              className="cursor-crosshair select-none touch-none"
            />

            <div className="w-full max-w-sm grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">{t('color_hue', 'Hue')}</span>
                <span className="text-slate-100 font-bold">{hsv.h}°</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">{t('color_saturation', 'Sat')}</span>
                <span className="text-slate-100 font-bold">{hsv.s}%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block">{t('color_brightness', 'Value')}</span>
                <span className="text-slate-100 font-bold">{hsv.v}%</span>
              </div>
            </div>

            <div className="w-full max-w-sm flex items-center gap-2">
              <button
                type="button"
                onClick={randomizeColor}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('random_palette', 'Random color')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExportPanel(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('export_colors', 'Export colors')}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('wheel_scheme_colors', 'Harmony Scheme & Codes')}
              </span>
              <select
                value={harmonyMode}
                onChange={e => setHarmonyMode(e.target.value as HarmonyMode)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-100 focus:outline-none cursor-pointer"
              >
                {HARMONY_MODES.map(mode => (
                  <option key={mode} value={mode} className="bg-slate-900">
                    {getHarmonyLabel(mode)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5">
              {harmonyHexes.map((swHex, idx) => {
                const swRgb = hexToRgb(swHex);
                const swHsl = rgbToHsl(swRgb.r, swRgb.g, swRgb.b);
                const fg = getContrastingTextColor(swHex);
                return (
                  <div
                    key={`${swHex}-${idx}`}
                    className="rounded-xl overflow-hidden border border-slate-800 flex flex-col sm:flex-row"
                  >
                    <button
                      type="button"
                      onClick={() => setColorFromHex(swHex)}
                      className="sm:w-36 px-4 py-3.5 font-mono text-sm font-bold flex items-center justify-between sm:justify-center"
                      style={{ backgroundColor: swHex, color: fg }}
                    >
                      <span>{swHex}</span>
                    </button>
                    <div className="flex-1 px-4 py-2.5 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="space-y-0.5 text-slate-300">
                        <div>rgb({swRgb.r}, {swRgb.g}, {swRgb.b})</div>
                        <div className="text-[11px] text-slate-500">
                          hsl({swHsl.h}°, {swHsl.s}%, {swHsl.l}%)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(swHex, `wheel-item-${idx}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1"
                      >
                        {copiedId === `wheel-item-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{t('copy', 'Copy')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COLOR CHARTS (Tailwind, Material, Flat UI, Web Safe) */}
      {activeTab === 'charts' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {([
                { id: 'tailwind', label: t('chart_tailwind', 'Tailwind CSS') },
                { id: 'material', label: t('chart_material', 'Material Design') },
                { id: 'flat', label: t('chart_flat', 'Flat UI') },
                { id: 'websafe', label: t('chart_websafe', 'Web Safe (216)') },
              ] as const).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChartKind(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    chartKind === c.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {chartKind === 'tailwind' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chartSearch}
                  onChange={e => setChartSearch(e.target.value)}
                  placeholder={t('search_color_chart', 'Filter color or hex...')}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Live Hovered Swatch Banner */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg border border-white/15 shrink-0"
                style={{ backgroundColor: hoveredChartItem?.hex || hex }}
              />
              <div>
                <span className="font-semibold text-white block">
                  {hoveredChartItem?.label || t('selected_color', 'Selected color')}
                </span>
                <span className="text-slate-400">{hoveredChartItem?.hex || hex}</span>
              </div>
            </div>
            <span className="text-slate-500 text-[11px] font-sans">
              {t('chart_click_hint', 'Click any swatch to select it and inspect all color codes.')}
            </span>
          </div>

          {chartKind === 'tailwind' && (
            <div className="overflow-x-auto">
              <div className="min-w-[640px] space-y-1.5">
                {/* Column header shades */}
                <div className="grid grid-cols-[88px_repeat(11,minmax(0,1fr))] gap-1 text-[10px] font-mono text-slate-500 text-center pb-1">
                  <div className="text-left pl-1">{t('color_family', 'Family')}</div>
                  {TAILWIND_SHADES.map(sh => (
                    <div key={sh}>{sh}</div>
                  ))}
                </div>
                {filteredTailwind.map(family => (
                  <div
                    key={family.name}
                    className="grid grid-cols-[88px_repeat(11,minmax(0,1fr))] gap-1 items-center"
                  >
                    <span className="text-xs font-medium text-slate-300 capitalize truncate pl-1">
                      {family.name}
                    </span>
                    {family.hexes.map((swatchHex, sIdx) => {
                      const shade = TAILWIND_SHADES[sIdx];
                      const isCurrent = swatchHex.toUpperCase() === hex.toUpperCase();
                      return (
                        <button
                          key={`${family.name}-${shade}`}
                          type="button"
                          onMouseEnter={() =>
                            setHoveredChartItem({
                              label: `${family.name}-${shade} (${swatchHex})`,
                              hex: swatchHex,
                            })
                          }
                          onClick={() => {
                            setColorFromHex(swatchHex, 1);
                            copyText(swatchHex, `tw-${family.name}-${shade}`);
                          }}
                          className={`h-8 rounded-md transition-transform hover:scale-110 hover:z-10 relative flex items-center justify-center ${
                            isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 z-10' : ''
                          }`}
                          style={{ backgroundColor: swatchHex }}
                          title={`${family.name}-${shade}: ${swatchHex}`}
                        >
                          {copiedId === `tw-${family.name}-${shade}` && (
                            <Check
                              className="w-3.5 h-3.5"
                              style={{ color: getContrastingTextColor(swatchHex) }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(chartKind === 'material' || chartKind === 'flat') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {(chartKind === 'material' ? MATERIAL_CHART : FLAT_UI_CHART).map(swatch => {
                const textCol = getContrastingTextColor(swatch.hex);
                return (
                  <button
                    key={swatch.name}
                    type="button"
                    onMouseEnter={() => setHoveredChartItem({ label: swatch.name, hex: swatch.hex })}
                    onClick={() => {
                      setColorFromHex(swatch.hex, 1);
                      copyText(swatch.hex, `chart-${swatch.name}`);
                    }}
                    className="p-3 rounded-xl border border-slate-800 text-left space-y-2 transition-transform hover:-translate-y-0.5 bg-slate-950"
                  >
                    <div
                      className="h-14 rounded-lg flex items-center justify-center font-mono text-xs font-bold"
                      style={{ backgroundColor: swatch.hex, color: textCol }}
                    >
                      {copiedId === `chart-${swatch.name}` ? t('copied', 'Copied') : swatch.hex}
                    </div>
                    <span className="text-xs font-medium text-slate-200 block truncate">
                      {swatch.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {chartKind === 'websafe' && (
            <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-[repeat(18,minmax(0,1fr))] gap-1">
              {webSafeChart.map(swatch => (
                <button
                  key={swatch.hex}
                  type="button"
                  onMouseEnter={() => setHoveredChartItem({ label: `Web Safe ${swatch.hex}`, hex: swatch.hex })}
                  onClick={() => {
                    setColorFromHex(swatch.hex, 1);
                    copyText(swatch.hex, `ws-${swatch.hex}`);
                  }}
                  className="h-7 rounded transition-transform hover:scale-110"
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.hex}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RGB ↔ HEX & COLOR CODE CONVERTER */}
      {activeTab === 'converter' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* RGB -> Hex Sliders & Numeric Inputs */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {t('rgb_to_hex_title', 'RGB to Hex Converter')}
              </h3>
              <span className="font-mono text-xs font-bold text-indigo-300">{hexWithAlpha}</span>
            </div>

            {(
              [
                { key: 'r', label: t('channel_red', 'Red (R)'), val: rgb.r, color: '#EF4444' },
                { key: 'g', label: t('channel_green', 'Green (G)'), val: rgb.g, color: '#22C55E' },
                { key: 'b', label: t('channel_blue', 'Blue (B)'), val: rgb.b, color: '#3B82F6' },
              ] as const
            ).map(ch => (
              <div key={ch.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{ch.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={ch.val}
                    onChange={e => {
                      const next = Number(e.target.value) || 0;
                      setColorFromRgb(
                        ch.key === 'r' ? next : rgb.r,
                        ch.key === 'g' ? next : rgb.g,
                        ch.key === 'b' ? next : rgb.b
                      );
                    }}
                    className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-right text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={ch.val}
                  onChange={e => {
                    const next = Number(e.target.value);
                    setColorFromRgb(
                      ch.key === 'r' ? next : rgb.r,
                      ch.key === 'g' ? next : rgb.g,
                      ch.key === 'b' ? next : rgb.b
                    );
                  }}
                  className="w-full h-2.5 rounded-full appearance-none cursor-pointer bg-slate-950 border border-slate-800"
                  style={{ accentColor: ch.color }}
                />
              </div>
            ))}

            {/* Direct RGB / RGBA string input */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label htmlFor={rgbInputId} className="text-xs font-medium text-slate-400 block">
                {t('rgb_input_label', 'Paste RGB / RGBA value (e.g. 250, 80, 57 or rgb(250, 80, 57))')}
              </label>
              <input
                id={rgbInputId}
                type="text"
                value={rgbDraft}
                onChange={e => handleRgbInputChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-slate-950 border font-mono text-sm text-white focus:outline-none ${
                  rgbParseError ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Hex -> RGB & Full Color Code Breakdown */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {t('hex_to_rgb_title', 'Hex to RGB & Color Codes')}
              </h3>
              <span className="font-mono text-xs text-slate-400">
                ({rgb.r}, {rgb.g}, {rgb.b})
              </span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={hexInputId} className="text-xs font-medium text-slate-400 block">
                {t('hex_input_label', 'Enter Hex code (#RGB, #RRGGBB, or #RRGGBBAA)')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={hexInputId}
                  type="text"
                  value={hexDraft}
                  onChange={e => handleHexInputChange(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl bg-slate-950 border font-mono text-sm uppercase text-white focus:outline-none ${
                    hexParseError ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
                <input
                  type="color"
                  value={hex}
                  onChange={e => setColorFromHex(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-slate-950 border border-slate-800 p-0.5"
                  aria-label={t('native_color_picker', 'System color picker')}
                />
              </div>
            </div>

            {/* Live Swatch Preview */}
            <div
              className="h-24 rounded-xl border border-slate-800 flex items-center justify-center font-mono text-base font-bold shadow-inner"
              style={{
                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
                color: activeContrastText,
              }}
            >
              {hexWithAlpha} — rgb({rgb.r}, {rgb.g}, {rgb.b})
            </div>

            {/* All Copyable Formats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
              {[
                { id: 'fmt-hex', label: 'HEX', val: hexWithAlpha },
                { id: 'fmt-rgb', label: 'CSS RGB', val: alpha < 1 ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})` : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
                { id: 'fmt-hsl', label: 'CSS HSL', val: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
                { id: 'fmt-oklch', label: 'CSS OKLCH', val: `oklch(${oklch.l} ${oklch.c} ${oklch.h})` },
                { id: 'fmt-cmyk', label: 'CMYK', val: `${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%` },
                {
                  id: 'fmt-float',
                  label: t('normalized_float', 'Normalized (0–1)'),
                  val: `${(rgb.r / 255).toFixed(3)}, ${(rgb.g / 255).toFixed(3)}, ${(rgb.b / 255).toFixed(3)}`,
                },
              ].map(row => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => copyText(row.val, row.id)}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-left flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block font-sans uppercase tracking-wider">
                      {row.label}
                    </span>
                    <span className="text-slate-100 truncate block">{row.val}</span>
                  </div>
                  {copiedId === row.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Saved Custom Palette Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('saved_palette_title', 'Saved Custom Palette')} ({savedPalette.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addCurrentToPalette}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium text-indigo-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('add_current_color', 'Add Current')}</span>
            </button>
            <button
              type="button"
              onClick={() => downloadPalettePng(savedPalette)}
              disabled={savedPalette.length === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {savedPalette.map(itemHex => {
            const normalized = normalizeHex(itemHex) || itemHex;
            const isSelected = normalized === hex;
            return (
              <div
                key={normalized}
                className={`group flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl bg-slate-950 border transition-colors ${
                  isSelected ? 'border-indigo-500' : 'border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setColorFromHex(normalized, 1)}
                  className="flex items-center gap-2 text-xs font-mono text-slate-200 hover:text-white"
                >
                  <span
                    className="w-5 h-5 rounded-md border border-white/10 shrink-0"
                    style={{ backgroundColor: normalized }}
                  />
                  <span>{normalized}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromPalette(normalized)}
                  className="text-slate-600 hover:text-rose-400 transition-colors p-0.5"
                  aria-label={t('remove', 'Remove')}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
