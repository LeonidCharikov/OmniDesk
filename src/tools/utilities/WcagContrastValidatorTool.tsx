import React, { useState, useMemo, useId } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowLeftRight, 
  Eye, 
  Info, 
  RotateCcw,
  Sliders,
  Type,
  Layout,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

// Convert hex string to RGB
const hexToRgb = (hex: string): RGB => {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(char => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num) || c.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

// Convert RGB to Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number): HSL => {
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

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

// Convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number): RGB => {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

// Relative luminance per W3C WCAG 2.1 specs
const getLuminance = (rgb: RGB): number => {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Contrast ratio (L1 + 0.05) / (L2 + 0.05)
const getContrastRatio = (lum1: number, lum2: number): number => {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Color deficiency simulation matrices
const simulateColorDeficiency = (rgb: RGB, type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'): RGB => {
  const { r, g, b } = rgb;
  switch (type) {
    case 'protanopia':
      return {
        r: Math.round(0.56667 * r + 0.43333 * g),
        g: Math.round(0.55833 * r + 0.44167 * g),
        b: Math.round(0.24167 * g + 0.75833 * b),
      };
    case 'deuteranopia':
      return {
        r: Math.round(0.625 * r + 0.375 * g),
        g: Math.round(0.70 * r + 0.30 * g),
        b: Math.round(0.30 * g + 0.70 * b),
      };
    case 'tritanopia':
      return {
        r: Math.round(0.95 * r + 0.05 * g),
        g: Math.round(0.43333 * g + 0.56667 * b),
        b: Math.round(0.475 * g + 0.525 * b),
      };
    case 'achromatopsia': {
      const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return { r: y, g: y, b: y };
    }
  }
};

const PRESETS = [
  { label: 'Dark UI Light Text', fg: '#F8FAFC', bg: '#0F172A' },
  { label: 'Light UI Dark Text', fg: '#0F172A', bg: '#FFFFFF' },
  { label: 'Indigo on Dark', fg: '#818CF8', bg: '#0B0F19' },
  { label: 'High Contrast Alert', fg: '#FEF08A', bg: '#000000' },
  { label: 'Subdued Gray on Dark', fg: '#64748B', bg: '#090D16' },
  { label: 'Warning Amber on Slate', fg: '#FBBF24', bg: '#1E293B' },
];

export const WcagContrastValidatorTool: React.FC = () => {
  const { t } = useI18n();
  const [foreground, setForeground] = useState<string>('#60A5FA');
  const [background, setBackground] = useState<string>('#0F172A');
  const [showSliders, setShowSliders] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const fgInputId = useId();
  const bgInputId = useId();

  const fgRgb = useMemo(() => hexToRgb(foreground), [foreground]);
  const bgRgb = useMemo(() => hexToRgb(background), [background]);

  const fgHsl = useMemo(() => rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b), [fgRgb]);
  const bgHsl = useMemo(() => rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b), [bgRgb]);

  const fgLum = useMemo(() => getLuminance(fgRgb), [fgRgb]);
  const bgLum = useMemo(() => getLuminance(bgRgb), [bgRgb]);

  const contrast = useMemo(() => getContrastRatio(fgLum, bgLum), [fgLum, bgLum]);
  const roundedRatio = Math.round(contrast * 100) / 100;

  // WCAG Criteria Checkers
  const passesAANormal = contrast >= 4.5;
  const passesAALarge = contrast >= 3.0;
  const passesAAUI = contrast >= 3.0;
  const passesAAANormal = contrast >= 7.0;
  const passesAAALarge = contrast >= 4.5;

  // Swap FG and BG
  const handleSwap = () => {
    const temp = foreground;
    setForeground(background);
    setBackground(temp);
  };

  // Auto-tune foreground lightness to reach a target ratio
  const handleAutoTune = (targetRatio: number) => {
    const bgL = bgLum;
    // Determine whether to go lighter or darker
    const shouldGoLighter = bgL < 0.5;
    let bestHex = foreground;
    let minDiff = 999;

    const baseHsl = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
    for (let l = 0; l <= 100; l += 1) {
      const candidateRgb = hslToRgb(baseHsl.h, baseHsl.s, l);
      const candidateLum = getLuminance(candidateRgb);
      const ratio = getContrastRatio(candidateLum, bgL);
      if (ratio >= targetRatio) {
        const diff = Math.abs(ratio - targetRatio);
        if (diff < minDiff) {
          minDiff = diff;
          bestHex = rgbToHex(candidateRgb.r, candidateRgb.g, candidateRgb.b);
          if (shouldGoLighter && l >= 50) break;
          if (!shouldGoLighter && l <= 50) break;
        }
      }
    }
    setForeground(bestHex);
  };

  // Copy full audit report
  const handleCopyReport = () => {
    const report = [
      `OmniDesk WCAG 2.1 Accessibility Contrast Report`,
      `Foreground: ${foreground.toUpperCase()} (RGB: ${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b})`,
      `Background: ${background.toUpperCase()} (RGB: ${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`,
      `Contrast Ratio: ${roundedRatio.toFixed(2)} : 1`,
      `----------------------------------------`,
      `WCAG Level AA:`,
      `  - Normal Text (>= 4.5:1): ${passesAANormal ? 'PASS' : 'FAIL'}`,
      `  - Large Text (>= 3.0:1): ${passesAALarge ? 'PASS' : 'FAIL'}`,
      `  - UI Components & Graphics (>= 3.0:1): ${passesAAUI ? 'PASS' : 'FAIL'}`,
      `WCAG Level AAA:`,
      `  - Normal Text (>= 7.0:1): ${passesAAANormal ? 'PASS' : 'FAIL'}`,
      `  - Large Text (>= 4.5:1): ${passesAAALarge ? 'PASS' : 'FAIL'}`,
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Vision deficiency variations
  const visionDeficiencies = useMemo(() => {
    const types: Array<{ id: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'; name: string; desc: string }> = [
      { id: 'protanopia', name: t('wcag_protanopia', 'Protanopie (Červená)'), desc: t('wcag_protanopia_desc', 'Absence červených čípků (~1% mužů)') },
      { id: 'deuteranopia', name: t('wcag_deuteranopia', 'Deuteranopie (Zelená)'), desc: t('wcag_deuteranopia_desc', 'Absence zelených čípků (~1% populace)') },
      { id: 'tritanopia', name: t('wcag_tritanopia', 'Tritanopie (Modrá)'), desc: t('wcag_tritanopia_desc', 'Porucha vnímání modré/žluté (vzácná)') },
      { id: 'achromatopsia', name: t('wcag_achromatopsia', 'Achromatopsie (Černobílá)'), desc: t('wcag_achromatopsia_desc', 'Úplná barvoslepost / stupně šedi') },
    ];

    return types.map(item => {
      const simFg = simulateColorDeficiency(fgRgb, item.id);
      const simBg = simulateColorDeficiency(bgRgb, item.id);
      const simLumFg = getLuminance(simFg);
      const simLumBg = getLuminance(simBg);
      const simRatio = getContrastRatio(simLumFg, simLumBg);
      return {
        ...item,
        simFgHex: rgbToHex(simFg.r, simFg.g, simFg.b),
        simBgHex: rgbToHex(simBg.r, simBg.g, simBg.b),
        ratio: Math.round(simRatio * 100) / 100,
        passesAA: simRatio >= 4.5,
      };
    });
  }, [fgRgb, bgRgb, t]);

  // Visual status color
  const statusColor = 
    contrast >= 7.0 ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40' :
    contrast >= 4.5 ? 'text-indigo-400 bg-indigo-950/40 border-indigo-500/40' :
    contrast >= 3.0 ? 'text-amber-400 bg-amber-950/40 border-amber-500/40' :
    'text-rose-400 bg-rose-950/40 border-rose-500/40';

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_wcag_validator_title', 'WCAG Contrast Validator')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
              WCAG 2.1 Standard
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_wcag_validator_desc', 'Ověření barevného kontrastu popředí a pozadí, výpočet poměru L1/L2, simulace zrakových vad a zpětná vazba pro přístupnost.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSliders(!showSliders)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              showSliders 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t('wcag_toggle_sliders', 'RGB / HSL Posuvníky')}</span>
          </button>
          <button
            onClick={handleCopyReport}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors flex items-center gap-1.5"
            title="Kopírovat kompletní report přístupnosti"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? t('copied', 'Zkopírováno') : t('wcag_copy_report', 'Kopírovat audit')}</span>
          </button>
        </div>
      </div>

      {/* Main Contrast Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Color Pickers & Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('wcag_color_selection', 'Barevné vstupy')}
              </span>
              <button
                onClick={handleSwap}
                className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5"
                title="Prohodit barvy popředí a pozadí"
              >
                <ArrowLeftRight className="w-3 h-3 text-indigo-400" />
                <span>{t('wcag_swap_colors', 'Prohodit')}</span>
              </button>
            </div>

            {/* Foreground Color Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor={fgInputId} className="font-medium text-slate-300">
                  {t('wcag_foreground_color', 'Barva popředí (Text & Ikony)')}
                </label>
                <span className="font-mono text-slate-400 text-[11px]">{foreground.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-xl border border-slate-700 shrink-0 relative overflow-hidden shadow-inner cursor-pointer"
                  style={{ backgroundColor: foreground }}
                >
                  <input
                    type="color"
                    value={foreground}
                    onChange={e => setForeground(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Vybrat barvu popředí"
                  />
                </div>
                <input
                  id={fgInputId}
                  type="text"
                  value={foreground}
                  onChange={e => setForeground(e.target.value)}
                  maxLength={7}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-white focus:outline-none uppercase"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            {/* Background Color Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor={bgInputId} className="font-medium text-slate-300">
                  {t('wcag_background_color', 'Barva pozadí (Plocha & Podklad)')}
                </label>
                <span className="font-mono text-slate-400 text-[11px]">{background.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-xl border border-slate-700 shrink-0 relative overflow-hidden shadow-inner cursor-pointer"
                  style={{ backgroundColor: background }}
                >
                  <input
                    type="color"
                    value={background}
                    onChange={e => setBackground(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Vybrat barvu pozadí"
                  />
                </div>
                <input
                  id={bgInputId}
                  type="text"
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                  maxLength={7}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-white focus:outline-none uppercase"
                  placeholder="#0F172A"
                />
              </div>
            </div>

            {/* Sliders if toggled */}
            {showSliders && (
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('wcag_fine_tune_fg', 'Jemné doladění popředí (RGB & Světlost)')}
                </span>

                {/* Lightness Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{t('wcag_lightness', 'Světlost (HSL Lightness)')}</span>
                    <span>{fgHsl.l}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={fgHsl.l}
                    onChange={e => {
                      const rgb = hslToRgb(fgHsl.h, fgHsl.s, parseInt(e.target.value));
                      setForeground(rgbToHex(rgb.r, rgb.g, rgb.b));
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Red, Green, Blue */}
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <span className="block text-rose-400 font-bold">R: {fgRgb.r}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <span className="block text-emerald-400 font-bold">G: {fgRgb.g}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <span className="block text-blue-400 font-bold">B: {fgRgb.b}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Auto-Tune Helpers */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t('wcag_smart_fix_title', 'Automatické optimalizace kontrastu')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAutoTune(4.5)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 text-[11px] font-medium text-indigo-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{t('wcag_fix_aa', 'Doladit na AA (4.5:1)')}</span>
                </button>
                <button
                  onClick={() => handleAutoTune(7.0)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-[11px] font-medium text-emerald-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t('wcag_fix_aaa', 'Doladit na AAA (7.0:1)')}</span>
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {t('wcag_presets', 'Doporučené vzory')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setForeground(p.fg);
                      setBackground(p.bg);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full border border-slate-700" 
                      style={{ backgroundColor: p.fg }} 
                    />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contrast Score, Badges, and Live Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Ratio Hero Banner */}
          <div className={`p-6 rounded-2xl border transition-all ${statusColor} flex flex-wrap items-center justify-between gap-4 shadow-lg`}>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80 block">
                {t('wcag_contrast_ratio', 'Vypočtený Kontrastní Poměr')}
              </span>
              <div className="text-4xl md:text-5xl font-mono font-black mt-1 tabular-nums tracking-tight">
                {roundedRatio.toFixed(2)}{' '}
                <span className="text-xl md:text-2xl font-normal opacity-75">: 1</span>
              </div>
              <p className="text-xs mt-1.5 opacity-90 max-w-sm">
                {contrast >= 7.0
                  ? t('wcag_status_excellent', 'Vynikající kontrast. Splňuje nejpřísnější úroveň AAA pro veškerý text a grafické prvky.')
                  : contrast >= 4.5
                  ? t('wcag_status_good', 'Dobrý kontrast. Splňuje úroveň AA pro běžný text a AAA pro velký text.')
                  : contrast >= 3.0
                  ? t('wcag_status_moderate', 'Dostatečné pouze pro velký text (18pt+) a UI grafické komponenty. Selhává pro běžný text.')
                  : t('wcag_status_fail', 'Nedostatečný kontrast. Nesplňuje minimální přístupnostní standardy WCAG.')}
              </p>
            </div>

            {/* Overall Stamp */}
            <div className="text-center px-4 py-3 rounded-xl bg-slate-950/50 border border-current/20 backdrop-blur">
              <span className="text-[11px] font-mono uppercase tracking-wider block opacity-75">
                {t('wcag_evaluation', 'Celkové hodnocení')}
              </span>
              <span className="text-xl font-bold font-mono block mt-0.5">
                {contrast >= 7.0 ? 'AAA Pass' : contrast >= 4.5 ? 'AA Pass' : contrast >= 3.0 ? 'AA Large' : 'Fail'}
              </span>
            </div>
          </div>

          {/* Compliance Checklist Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* AA Normal Text */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">AA Běžný Text</span>
                {passesAANormal ? (
                  <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                  </span>
                ) : (
                  <span className="text-xs font-mono font-semibold text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> FAIL
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block">Minimálně 4.5 : 1</span>
            </div>

            {/* AA Large Text */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">AA Velký Text</span>
                {passesAALarge ? (
                  <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                  </span>
                ) : (
                  <span className="text-xs font-mono font-semibold text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> FAIL
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block">Minimálně 3.0 : 1 (18pt+)</span>
            </div>

            {/* AAA Normal Text */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">AAA Nejvyšší</span>
                {passesAAANormal ? (
                  <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                  </span>
                ) : (
                  <span className="text-xs font-mono font-semibold text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> FAIL
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block">Minimálně 7.0 : 1</span>
            </div>
          </div>

          {/* Interactive Live Preview Sandbox */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {t('wcag_live_preview', 'Živý náhled v zadaných barvách')}
            </span>

            {/* Sandbox Canvas */}
            <div 
              className="p-6 rounded-xl border border-slate-700/60 transition-colors shadow-inner space-y-4"
              style={{ backgroundColor: background, color: foreground }}
            >
              <div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {t('wcag_preview_heading', 'Přístupná typografie a UI design')}
                </h3>
                <p className="text-sm mt-1 leading-relaxed opacity-90 max-w-xl">
                  {t('wcag_preview_body', 'Kvalitní barevný kontrast zajišťuje, že lidé se zrakovým omezením nebo při práci na přímém slunečním světle mohou pohodlně číst a ovládat vaše desktopové rozhraní bez únavy očí.')}
                </p>
                <span className="text-xs mt-2 block font-mono opacity-75">
                  {t('wcag_preview_caption', '12px popisek · WCAG 2.1 Standard ověřování')}
                </span>
              </div>

              {/* Sample UI Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  className="px-4 py-2 rounded-lg text-xs font-semibold shadow transition-transform hover:scale-105"
                  style={{ backgroundColor: foreground, color: background }}
                >
                  {t('wcag_sample_btn_primary', 'Primární tlačítko')}
                </button>
                <button 
                  className="px-4 py-2 rounded-lg text-xs font-semibold border transition-transform hover:scale-105"
                  style={{ borderColor: foreground, color: foreground }}
                >
                  {t('wcag_sample_btn_outline', 'Obrysové tlačítko')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vision Deficiency Simulator Section */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">
            {t('wcag_deficiency_simulator', 'Simulátor zrakových vad (Barvoslepost & Daltonismus)')}
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          {t('wcag_deficiency_desc', 'Jak vaše barevná dvojice vypadá pro uživatele s různými typy dichromazie a monochromazie.')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visionDeficiencies.map(v => (
            <div key={v.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">{v.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  v.passesAA ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {v.ratio.toFixed(2)} : 1
                </span>
              </div>

              {/* Simulated Swatch */}
              <div 
                className="p-3 rounded-lg border border-slate-700/50 text-center font-semibold text-xs transition-colors shadow-inner"
                style={{ backgroundColor: v.simBgHex, color: v.simFgHex }}
              >
                Ukázkový text
              </div>

              <span className="text-[10px] text-slate-500 block leading-tight">
                {v.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
