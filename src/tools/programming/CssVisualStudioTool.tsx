import React, { useMemo, useState } from 'react';
import { Copy, Layers, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type GeneratorTab = 'shadow' | 'glass' | 'gradient' | 'layout' | 'radius';

export const CssVisualStudioTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<GeneratorTab>('shadow');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Shadow state
  const [shX, setShX] = useState(0);
  const [shY, setShY] = useState(18);
  const [shBlur, setShBlur] = useState(36);
  const [shSpread, setShSpread] = useState(-8);
  const [shAlpha, setShAlpha] = useState(0.45);
  const [shColor, setShColor] = useState('#6366f1');
  const [shInset, setShInset] = useState(false);

  // Glassmorphism state
  const [glassBlur, setGlassBlur] = useState(14);
  const [glassOpacity, setGlassOpacity] = useState(0.16);
  const [glassBorder, setGlassBorder] = useState(0.24);
  const [glassRadius, setGlassRadius] = useState(20);

  // Gradient state
  const [gradType, setGradType] = useState<'linear' | 'radial'>('linear');
  const [gradAngle, setGradAngle] = useState(135);
  const [gradC1, setGradC1] = useState('#6366f1');
  const [gradC2, setGradC2] = useState('#ec4899');
  const [gradC3, setGradC3] = useState('#f59e0b');
  const [useThirdStop, setUseThirdStop] = useState(false);

  // Flex / Grid Layout state
  const [layoutKind, setLayoutKind] = useState<'flex' | 'grid'>('flex');
  const [flexDir, setFlexDir] = useState<'row' | 'column'>('row');
  const [justify, setJustify] = useState('space-between');
  const [align, setAlign] = useState('center');
  const [gridCols, setGridCols] = useState(3);
  const [gapPx, setGapPx] = useState(12);

  // Border-radius state
  const [rTL, setRTL] = useState(28);
  const [rTR, setRTR] = useState(12);
  const [rBR, setRBR] = useState(28);
  const [rBL, setRBL] = useState(12);

  const hexToRgba = (hex: string, alpha: number) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const generated = useMemo(() => {
    if (tab === 'shadow') {
      const val = `${shInset ? 'inset ' : ''}${shX}px ${shY}px ${shBlur}px ${shSpread}px ${hexToRgba(shColor, shAlpha)}`;
      return {
        css: `box-shadow: ${val};`,
        tailwind: `shadow-[${val.replace(/\s+/g, '_')}]`,
        style: { boxShadow: val } as React.CSSProperties,
      };
    }
    if (tab === 'glass') {
      const bg = `rgba(255, 255, 255, ${glassOpacity})`;
      const bd = `1px solid rgba(255, 255, 255, ${glassBorder})`;
      return {
        css: `background: ${bg};\nbackdrop-filter: blur(${glassBlur}px);\n-webkit-backdrop-filter: blur(${glassBlur}px);\nborder: ${bd};\nborder-radius: ${glassRadius}px;`,
        tailwind: `bg-white/${Math.round(glassOpacity * 100)} backdrop-blur-[${glassBlur}px] border border-white/${Math.round(glassBorder * 100)} rounded-[${glassRadius}px]`,
        style: {
          background: bg,
          backdropFilter: `blur(${glassBlur}px)`,
          border: bd,
          borderRadius: `${glassRadius}px`,
        } as React.CSSProperties,
      };
    }
    if (tab === 'gradient') {
      const stops = useThirdStop ? `${gradC1}, ${gradC2}, ${gradC3}` : `${gradC1}, ${gradC2}`;
      const bg = gradType === 'linear' ? `linear-gradient(${gradAngle}deg, ${stops})` : `radial-gradient(circle, ${stops})`;
      return {
        css: `background: ${bg};`,
        tailwind: `bg-[${bg.replace(/\s+/g, '_')}]`,
        style: { background: bg } as React.CSSProperties,
      };
    }
    if (tab === 'layout') {
      if (layoutKind === 'flex') {
        return {
          css: `display: flex;\nflex-direction: ${flexDir};\njustify-content: ${justify};\nalign-items: ${align};\ngap: ${gapPx}px;`,
          tailwind: `flex ${flexDir === 'column' ? 'flex-col' : 'flex-row'} justify-${justify.replace('flex-', '').replace('space-', '')} items-${align.replace('flex-', '')} gap-[${gapPx}px]`,
          style: {
            display: 'flex',
            flexDirection: flexDir,
            justifyContent: justify,
            alignItems: align,
            gap: `${gapPx}px`,
          } as React.CSSProperties,
        };
      }
      return {
        css: `display: grid;\ngrid-template-columns: repeat(${gridCols}, minmax(0, 1fr));\ngap: ${gapPx}px;`,
        tailwind: `grid grid-cols-${gridCols} gap-[${gapPx}px]`,
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gap: `${gapPx}px`,
        } as React.CSSProperties,
      };
    }
    const rad = `${rTL}px ${rTR}px ${rBR}px ${rBL}px`;
    return {
      css: `border-radius: ${rad};`,
      tailwind: `rounded-tl-[${rTL}px] rounded-tr-[${rTR}px] rounded-br-[${rBR}px] rounded-bl-[${rBL}px]`,
      style: { borderRadius: rad } as React.CSSProperties,
    };
  }, [tab, shX, shY, shBlur, shSpread, shAlpha, shColor, shInset, glassBlur, glassOpacity, glassBorder, glassRadius, gradType, gradAngle, gradC1, gradC2, gradC3, useThirdStop, layoutKind, flexDir, justify, align, gridCols, gapPx, rTL, rTR, rBR, rBL]);

  const copyCode = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          {t('tool_css_studio_title', 'CSS Visual Generator Studio')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_css_studio_desc', 'Visually craft Box Shadows, Glassmorphism, Gradients, Flexbox/Grid layouts, and Border Radius with instant CSS & Tailwind snippets.')}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-5">
        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit">
          {([
            ['shadow', t('css_tab_shadow', 'Box Shadow')],
            ['glass', t('css_tab_glass', 'Glassmorphism')],
            ['gradient', t('css_tab_gradient', 'Gradient')],
            ['layout', t('css_tab_layout', 'Flex / Grid')],
            ['radius', t('css_tab_radius', 'Border Radius')],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Controls */}
          <div className="space-y-3 text-xs text-slate-300">
            {tab === 'shadow' && (
              <>
                <label className="block">X Offset ({shX}px)<input type="range" min={-50} max={50} value={shX} onChange={e => setShX(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Y Offset ({shY}px)<input type="range" min={-50} max={50} value={shY} onChange={e => setShY(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Blur ({shBlur}px)<input type="range" min={0} max={100} value={shBlur} onChange={e => setShBlur(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Spread ({shSpread}px)<input type="range" min={-30} max={40} value={shSpread} onChange={e => setShSpread(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Opacity ({shAlpha})<input type="range" min={0.05} max={1} step={0.05} value={shAlpha} onChange={e => setShAlpha(Number(e.target.value))} className="w-full mt-1" /></label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2">Color <input type="color" value={shColor} onChange={e => setShColor(e.target.value)} /></label>
                  <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={shInset} onChange={e => setShInset(e.target.checked)} /> Inset</label>
                </div>
              </>
            )}

            {tab === 'glass' && (
              <>
                <label className="block">Blur ({glassBlur}px)<input type="range" min={0} max={32} value={glassBlur} onChange={e => setGlassBlur(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Surface Opacity ({Math.round(glassOpacity * 100)}%)<input type="range" min={0.04} max={0.6} step={0.02} value={glassOpacity} onChange={e => setGlassOpacity(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Border Opacity ({Math.round(glassBorder * 100)}%)<input type="range" min={0} max={0.7} step={0.02} value={glassBorder} onChange={e => setGlassBorder(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Border Radius ({glassRadius}px)<input type="range" min={0} max={48} value={glassRadius} onChange={e => setGlassRadius(Number(e.target.value))} className="w-full mt-1" /></label>
              </>
            )}

            {tab === 'gradient' && (
              <>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setGradType('linear')} className={`px-3 py-1 rounded-lg ${gradType === 'linear' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>Linear</button>
                  <button type="button" onClick={() => setGradType('radial')} className={`px-3 py-1 rounded-lg ${gradType === 'radial' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>Radial</button>
                </div>
                {gradType === 'linear' && (
                  <label className="block">Angle ({gradAngle}°)<input type="range" min={0} max={360} value={gradAngle} onChange={e => setGradAngle(Number(e.target.value))} className="w-full mt-1" /></label>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2">Stop 1 <input type="color" value={gradC1} onChange={e => setGradC1(e.target.value)} /></label>
                  <label className="inline-flex items-center gap-2">Stop 2 <input type="color" value={gradC2} onChange={e => setGradC2(e.target.value)} /></label>
                  <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={useThirdStop} onChange={e => setUseThirdStop(e.target.checked)} /> 3rd Stop</label>
                  {useThirdStop && <input type="color" value={gradC3} onChange={e => setGradC3(e.target.value)} />}
                </div>
              </>
            )}

            {tab === 'layout' && (
              <>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setLayoutKind('flex')} className={`px-3 py-1 rounded-lg ${layoutKind === 'flex' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>Flexbox</button>
                  <button type="button" onClick={() => setLayoutKind('grid')} className={`px-3 py-1 rounded-lg ${layoutKind === 'grid' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>CSS Grid</button>
                </div>
                {layoutKind === 'flex' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <select value={flexDir} onChange={e => setFlexDir(e.target.value as 'row' | 'column')} className="p-2 rounded bg-slate-950 border border-slate-800">
                      <option value="row">row</option>
                      <option value="column">column</option>
                    </select>
                    <select value={justify} onChange={e => setJustify(e.target.value)} className="p-2 rounded bg-slate-950 border border-slate-800">
                      <option value="flex-start">start</option>
                      <option value="center">center</option>
                      <option value="flex-end">end</option>
                      <option value="space-between">between</option>
                      <option value="space-around">around</option>
                    </select>
                    <select value={align} onChange={e => setAlign(e.target.value)} className="p-2 rounded bg-slate-950 border border-slate-800">
                      <option value="stretch">stretch</option>
                      <option value="flex-start">start</option>
                      <option value="center">center</option>
                      <option value="flex-end">end</option>
                    </select>
                  </div>
                ) : (
                  <label className="block">Columns ({gridCols})<input type="range" min={1} max={6} value={gridCols} onChange={e => setGridCols(Number(e.target.value))} className="w-full mt-1" /></label>
                )}
                <label className="block">Gap ({gapPx}px)<input type="range" min={0} max={32} value={gapPx} onChange={e => setGapPx(Number(e.target.value))} className="w-full mt-1" /></label>
              </>
            )}

            {tab === 'radius' && (
              <>
                <label className="block">Top-Left ({rTL}px)<input type="range" min={0} max={80} value={rTL} onChange={e => setRTL(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Top-Right ({rTR}px)<input type="range" min={0} max={80} value={rTR} onChange={e => setRTR(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Bottom-Right ({rBR}px)<input type="range" min={0} max={80} value={rBR} onChange={e => setRBR(Number(e.target.value))} className="w-full mt-1" /></label>
                <label className="block">Bottom-Left ({rBL}px)<input type="range" min={0} max={80} value={rBL} onChange={e => setRBL(Number(e.target.value))} className="w-full mt-1" /></label>
              </>
            )}
          </div>

          {/* Live Preview Stage */}
          <div className="space-y-4">
            <div
              className="h-56 rounded-2xl border border-slate-800 flex items-center justify-center p-6 overflow-hidden"
              style={
                tab === 'glass'
                  ? { background: 'linear-gradient(135deg, #4f46e5 0%, #db2777 50%, #f59e0b 100%)' }
                  : { background: '#0f172a' }
              }
            >
              {tab === 'layout' ? (
                <div className="w-full h-full p-3 rounded-xl bg-slate-950/70 border border-slate-800" style={generated.style}>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="px-4 py-3 rounded-lg bg-indigo-600/80 text-white font-mono text-xs flex items-center justify-center">
                      Item {n}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="w-48 h-28 flex items-center justify-center text-white text-xs font-semibold border border-slate-700/60"
                  style={{
                    background: tab === 'shadow' || tab === 'radius' ? '#1e293b' : undefined,
                    borderRadius: tab === 'shadow' ? '16px' : undefined,
                    ...generated.style,
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {t('css_live_preview', 'Live Preview')}
                </div>
              )}
            </div>

            {/* Generated CSS & Tailwind */}
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">CSS</span>
                  <button type="button" onClick={() => copyCode('css', generated.css)} className="text-indigo-400 hover:text-indigo-300">
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {copiedKey === 'css' ? t('copied', 'Copied!') : t('copy', 'Copy')}
                  </button>
                </div>
                <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap">{generated.css}</pre>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Tailwind CSS</span>
                  <button type="button" onClick={() => copyCode('tw', generated.tailwind)} className="text-indigo-400 hover:text-indigo-300">
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {copiedKey === 'tw' ? t('copied', 'Copied!') : t('copy', 'Copy')}
                  </button>
                </div>
                <pre className="font-mono text-xs text-sky-300 whitespace-pre-wrap break-all">{generated.tailwind}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
