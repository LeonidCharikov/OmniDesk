import React, { useState, useMemo } from 'react';
import { 
  Palette, 
  Sparkles, 
  Copy, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Shuffle, 
  Code2, 
  Layers 
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// Convert hex to rgb
const hexToRgb = (hex: string): RGB => {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

// Convert rgb to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Convert rgb to hsl
const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

// Convert hsl to rgb
const hslToRgb = (h: number, s: number, l: number): RGB => {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

// RGB to CMYK
const rgbToCmyk = (r: number, g: number, b: number) => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rNorm - k) / (1 - k);
  const m = (1 - gNorm - k) / (1 - k);
  const y = (1 - bNorm - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
};

// WCAG 2.1 Relative Luminance calculation
const getLuminance = (rgb: RGB): number => {
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};

// WCAG Contrast Ratio
const getContrastRatio = (fgHex: string, bgHex: string): number => {
  const lum1 = getLuminance(hexToRgb(fgHex));
  const lum2 = getLuminance(hexToRgb(bgHex));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

export const ColorPaletteWcagTool: React.FC = () => {
  const { t, currentLanguage } = useI18n();
  const [baseColor, setBaseColor] = useState<string>('#6366f1'); // Indigo
  const [fgColor, setFgColor] = useState<string>('#ffffff');
  const [bgColor, setBgColor] = useState<string>('#0f172a');
  const [harmonyType, setHarmonyType] = useState<'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'monochromatic'>('analogous');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [colorBlindFilter, setColorBlindFilter] = useState<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'>('none');

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const baseHsl = useMemo(() => rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b), [baseRgb]);
  const baseCmyk = useMemo(() => rgbToCmyk(baseRgb.r, baseRgb.g, baseRgb.b), [baseRgb]);

  // Generate harmony palette
  const palette = useMemo(() => {
    const { h, s, l } = baseHsl;
    const colors: { hex: string; label: string }[] = [{ hex: baseColor, label: 'Base' }];

    if (harmonyType === 'complementary') {
      const compRgb = hslToRgb((h + 180) % 360, s, l);
      colors.push({ hex: rgbToHex(compRgb.r, compRgb.g, compRgb.b), label: 'Komplementární' });
      // Tint & Shade
      const tint = hslToRgb(h, s, Math.min(95, l + 25));
      const shade = hslToRgb(h, s, Math.max(10, l - 25));
      colors.push({ hex: rgbToHex(tint.r, tint.g, tint.b), label: 'Světlý odstín' });
      colors.push({ hex: rgbToHex(shade.r, shade.g, shade.b), label: 'Tmavý stín' });
    } else if (harmonyType === 'analogous') {
      [-30, 30, -60, 60].forEach((offset, idx) => {
        const rgb = hslToRgb((h + offset + 360) % 360, s, l);
        colors.push({ hex: rgbToHex(rgb.r, rgb.g, rgb.b), label: `Analog ${idx + 1}` });
      });
    } else if (harmonyType === 'triadic') {
      [120, 240].forEach((offset, idx) => {
        const rgb = hslToRgb((h + offset) % 360, s, l);
        colors.push({ hex: rgbToHex(rgb.r, rgb.g, rgb.b), label: `Triáda ${idx + 1}` });
      });
      const tint = hslToRgb(h, s, Math.min(95, l + 20));
      colors.push({ hex: rgbToHex(tint.r, tint.g, tint.b), label: 'Zvýraznění' });
    } else if (harmonyType === 'tetradic') {
      [90, 180, 270].forEach((offset, idx) => {
        const rgb = hslToRgb((h + offset) % 360, s, l);
        colors.push({ hex: rgbToHex(rgb.r, rgb.g, rgb.b), label: `Tetráda ${idx + 1}` });
      });
    } else if (harmonyType === 'monochromatic') {
      [85, 70, 50, 30, 15].forEach((lightness, idx) => {
        const rgb = hslToRgb(h, s, lightness);
        colors.push({ hex: rgbToHex(rgb.r, rgb.g, rgb.b), label: `${lightness}% světlost` });
      });
    }

    return colors;
  }, [baseColor, baseHsl, harmonyType]);

  // WCAG evaluations
  const contrastRatio = useMemo(() => getContrastRatio(fgColor, bgColor), [fgColor, bgColor]);
  const normalAA = contrastRatio >= 4.5;
  const normalAAA = contrastRatio >= 7.0;
  const largeAA = contrastRatio >= 3.0;
  const largeAAA = contrastRatio >= 4.5;
  const uiAA = contrastRatio >= 3.0;

  const copyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const randomizeBaseColor = () => {
    const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    setBaseColor(randomHex);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {currentLanguage === 'cs' ? 'Paletka Barev & Kontrastní WCAG Validátor' :
             currentLanguage === 'ru' ? 'Цветовая Палитра & WCAG Валидатор Контраста' :
             currentLanguage === 'de' ? 'Farbpalette & WCAG Kontrast-Prüfer' :
             currentLanguage === 'es' ? 'Paleta de Colores y Validador WCAG' :
             'Color Palette Generator & WCAG Contrast Checker'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {currentLanguage === 'cs' ? 'Generování harmonických palet barev, převody HEX/RGB/HSL/CMYK a ověření přístupnosti WCAG 2.1 (AA/AAA).' :
             currentLanguage === 'ru' ? 'Генератор палитр, конвертер форматов цвета и проверка контрастности по стандарту WCAG 2.1.' :
             currentLanguage === 'de' ? 'Harmonische Farbpaletten, Format-Konverter und WCAG 2.1 Kontrastprüfung.' :
             currentLanguage === 'es' ? 'Paletas armónicas, conversor HEX/RGB/HSL y verificación de contraste WCAG 2.1.' :
             'Harmonious color palettes, color code conversions, and real-time WCAG 2.1 accessibility auditing.'}
          </p>
        </div>

        <button
          onClick={randomizeBaseColor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{t('random_color', 'Náhodná barva')}</span>
        </button>
      </div>

      {/* WCAG Contrast Auditor Section */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
            {t('wcag_contrast_check', 'WCAG 2.1 Kontrola Kontrastu (Text vs. Pozadí)')}
          </span>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{t('contrast_ratio_label', 'Poměr kontrastu:')}</span>
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 font-mono text-lg font-bold text-white tabular-nums">
              {contrastRatio.toFixed(2)} : 1
            </span>
          </div>
        </div>

        {/* Color Pickers & Live Preview Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Foreground Picker */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 flex items-center justify-between">
              <span>{t('fg_color_label', 'Barva Textu (Popředí):')}</span>
              <span className="font-mono text-slate-300">{fgColor.toUpperCase()}</span>
            </label>
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <input
                type="color"
                value={fgColor}
                onChange={e => setFgColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={fgColor}
                onChange={e => setFgColor(e.target.value)}
                className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs uppercase"
              />
            </div>
          </div>

          {/* Background Picker */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 flex items-center justify-between">
              <span>{t('bg_color_label', 'Barva Pozadí:')}</span>
              <span className="font-mono text-slate-300">{bgColor.toUpperCase()}</span>
            </label>
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <input
                type="color"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs uppercase"
              />
            </div>
          </div>

          {/* Quick Swap */}
          <div className="flex items-end">
            <button
              onClick={() => {
                const temp = fgColor;
                setFgColor(bgColor);
                setBgColor(temp);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              {t('swap_fg_bg', 'Prohodit Popředí ↔ Pozadí')}
            </button>
          </div>
        </div>

        {/* Live UI Mock Preview Card */}
        <div
          className="p-6 rounded-2xl border transition-all duration-150 space-y-4 shadow-xl"
          style={{ backgroundColor: bgColor, color: fgColor, borderColor: fgColor + '33' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{t('mock_heading', 'Vzorový Nadpis Komponenty (18pt+)')}</h3>
            <span 
              className="px-3 py-1 rounded-full text-xs font-semibold border"
              style={{ borderColor: fgColor + '55', backgroundColor: fgColor + '15' }}
            >
              {t('mock_badge', 'UI Odznak')}
            </span>
          </div>

          <p className="text-sm leading-relaxed opacity-90 max-w-2xl">
            {t('mock_desc', 'Tento text simuluje skutečný obsah v aplikaci. Přístupnost (Accessibility) zajišťuje, že uživatelé se zrakovými vadami a na méně kvalitních monitorech mohou text pohodlně číst bez únavy očí.')}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              className="px-4 py-2 rounded-xl text-xs font-bold transition-transform"
              style={{ backgroundColor: fgColor, color: bgColor }}
            >
              {t('sample_btn_primary', 'Primární Tlačítko')}
            </button>
            <button
              className="px-4 py-2 rounded-xl text-xs font-medium border"
              style={{ borderColor: fgColor + '66' }}
            >
              {t('sample_btn_secondary', 'Sekundární Tlačítko')}
            </button>
          </div>
        </div>

        {/* WCAG Criteria Badges Table */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Normal Text */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">{t('normal_text_label', 'Běžný text (< 18pt)')}</span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-mono">Úroveň AA (≥ 4.5:1)</span>
              {normalAA ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('passes', 'Vyhovuje')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <XCircle className="w-3.5 h-3.5" /> {t('fails', 'Nevyhovuje')}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-mono">Úroveň AAA (≥ 7.0:1)</span>
              {normalAAA ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('passes', 'Vyhovuje')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <XCircle className="w-3.5 h-3.5" /> {t('fails', 'Nevyhovuje')}
                </span>
              )}
            </div>
          </div>

          {/* Large Text */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">{t('large_text_label', 'Velký text (≥ 18pt / 14pt bold)')}</span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-mono">Úroveň AA (≥ 3.0:1)</span>
              {largeAA ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('passes', 'Vyhovuje')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <XCircle className="w-3.5 h-3.5" /> {t('fails', 'Nevyhovuje')}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-mono">Úroveň AAA (≥ 4.5:1)</span>
              {largeAAA ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('passes', 'Vyhovuje')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <XCircle className="w-3.5 h-3.5" /> {t('fails', 'Nevyhovuje')}
                </span>
              )}
            </div>
          </div>

          {/* UI Components */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">Grafické prvky & Ikony</span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-mono">Úroveň AA (&ge; 3.0:1)</span>
              {uiAA ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Vyhovuje
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <XCircle className="w-3.5 h-3.5" /> Nevyhovuje
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              Vyžadováno pro hranice tlačítek, formulářové rámečky a grafy.
            </p>
          </div>
        </div>
      </div>

      {/* Harmonious Palette Generator */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Barevná Harmonie
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={baseColor}
                onChange={e => setBaseColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-xs text-indigo-400 font-bold">{baseColor.toUpperCase()}</span>
            </div>
          </div>

          {/* Harmony Type Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            {(['analogous', 'complementary', 'triadic', 'tetradic', 'monochromatic'] as const).map(type => (
              <button
                key={type}
                onClick={() => setHarmonyType(type)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  harmonyType === type ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Palette Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {palette.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 group"
            >
              <div
                className="w-full h-16 rounded-lg shadow-inner cursor-pointer relative flex items-center justify-center"
                style={{ backgroundColor: item.hex }}
                onClick={() => copyCode(item.hex, item.hex)}
                title="Kliknutím zkopírujete HEX"
              >
                <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm transition-opacity">
                  Kopírovat
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 block">{item.label}</span>
                <span className="font-mono text-xs font-bold text-white block uppercase">
                  {item.hex}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Color Code Conversions */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block mb-1">HEX</span>
            <span className="text-indigo-400 font-bold">{baseColor.toUpperCase()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">RGB</span>
            <span className="text-slate-200">rgb({baseRgb.r}, {baseRgb.g}, {baseRgb.b})</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">HSL</span>
            <span className="text-slate-200">hsl({baseHsl.h}°, {baseHsl.s}%, {baseHsl.l}%)</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">CMYK</span>
            <span className="text-slate-200">{baseCmyk.c}%, {baseCmyk.m}%, {baseCmyk.y}%, {baseCmyk.k}%</span>
          </div>
        </div>

        {/* Export Palette */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
          <button
            onClick={() => copyCode(
              palette.map((p, i) => `--color-${i + 1}: ${p.hex};`).join('\n'),
              'css'
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            {copiedText === 'css' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>CSS Proměnné</span>
          </button>
          <button
            onClick={() => copyCode(
              JSON.stringify(Object.fromEntries(palette.map((p, i) => [`palette-${i + 1}`, p.hex])), null, 2),
              'json'
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            {copiedText === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>JSON Paleta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
