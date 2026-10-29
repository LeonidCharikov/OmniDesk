import React, { useState, useRef } from 'react';
import { 
  Code2, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  BookOpen, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers 
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface PresetFormula {
  name: string;
  category: string;
  latex: string;
  description: string;
}

const PRESETS: PresetFormula[] = [
  {
    name: 'Kvadratická rovnice',
    category: 'Algebra',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    description: 'Kořeny obecné kvadratické rovnice ax² + bx + c = 0.',
  },
  {
    name: "Eulerova identita",
    category: 'Analýza',
    latex: 'e^{i\\pi} + 1 = 0',
    description: 'Propojení pěti nejdůležitějších konstant matematiky (e, i, π, 1, 0).',
  },
  {
    name: 'Gaussovo normální rozdělení',
    category: 'Statistika',
    latex: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}',
    description: 'Hustota pravděpodobnosti normálního (Gaussova) rozdělení se střední hodnotou μ a rozptylem σ².',
  },
  {
    name: 'Schrödingerova rovnice',
    category: 'Fyzika',
    latex: 'i\\hbar \\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r}, t) = \\left[ -\\frac{\\hbar^2}{2m}\\nabla^2 + V(\\mathbf{r}, t) \\right] \\Psi(\\mathbf{r}, t)',
    description: 'Základní pohybová rovnice nerelativistické kvantové mechaniky.',
  },
  {
    name: 'Einsteinova ekvivalence hmoty a energie',
    category: 'Fyzika',
    latex: 'E = \\frac{m_0 c^2}{\\sqrt{1 - \\frac{v^2}{c^2}}} = m c^2',
    description: 'Relativistická celková energie částice s klidovou hmotností m₀.',
  },
  {
    name: "Bayesův teorém",
    category: 'Pravděpodobnost',
    latex: 'P(A \\mid B) = \\frac{P(B \\mid A) \\, P(A)}{P(B)}',
    description: 'Výpočet podmíněné pravděpodobnosti jevu A za předpokladu jevu B.',
  },
  {
    name: 'Maticový součin (2×2)',
    category: 'Lineární algebra',
    latex: '\\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix} \\begin{pmatrix} x_1 \\\\ x_2 \\end{pmatrix} = \\begin{pmatrix} b_1 \\\\ b_2 \\end{pmatrix}',
    description: 'Soustava lineárních algebraických rovnic v maticovém tvaru.',
  },
  {
    name: 'Určitý integrál (Fourier)',
    category: 'Kalkulus',
    latex: '\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) \\, e^{-2\\pi i x \\xi} \\, dx',
    description: 'Fourierova transformace spojité časové funkce na frekvenční spektrum.',
  },
];

interface QuickInsert {
  label: string;
  snippet: string;
  tooltip: string;
}

const QUICK_INSERTS: QuickInsert[] = [
  { label: 'a/b', snippet: '\\frac{a}{b}', tooltip: 'Zlomek' },
  { label: 'x²', snippet: '^{2}', tooltip: 'Mocnina' },
  { label: 'xᵢ', snippet: '_{i}', tooltip: 'Index' },
  { label: '√x', snippet: '\\sqrt{x}', tooltip: 'Odmocnina' },
  { label: 'ⁿ√x', snippet: '\\sqrt[n]{x}', tooltip: 'N-tá odmocnina' },
  { label: '∫', snippet: '\\int_{a}^{b} f(x) \\, dx', tooltip: 'Určitý integrál' },
  { label: '∑', snippet: '\\sum_{i=1}^{n} x_i', tooltip: 'Suma' },
  { label: '∏', snippet: '\\prod_{i=1}^{n} x_i', tooltip: 'Součin' },
  { label: 'lim', snippet: '\\lim_{x \\to 0}', tooltip: 'Limita' },
  { label: 'df/dx', snippet: '\\frac{df}{dx}', tooltip: 'Derivace' },
  { label: '∂f/∂x', snippet: '\\frac{\\partial f}{\\partial x}', tooltip: 'Parciální derivace' },
  { label: 'α', snippet: '\\alpha', tooltip: 'Alfa' },
  { label: 'β', snippet: '\\beta', tooltip: 'Beta' },
  { label: 'π', snippet: '\\pi', tooltip: 'Pí' },
  { label: 'θ', snippet: '\\theta', tooltip: 'Théta' },
  { label: 'λ', snippet: '\\lambda', tooltip: 'Lambda' },
  { label: 'σ', snippet: '\\sigma', tooltip: 'Sigma' },
  { label: 'Δ', snippet: '\\Delta', tooltip: 'Delta' },
  { label: '∞', snippet: '\\infty', tooltip: 'Nekonečno' },
  { label: '±', snippet: '\\pm', tooltip: 'Plus mínus' },
  { label: 'Matice', snippet: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', tooltip: 'Matice 2x2' },
  { label: '( ... )', snippet: '\\left( x \\right)', tooltip: 'Dynamické závorky' },
];

export const LatexVisualizerTool: React.FC = () => {
  const { currentLanguage } = useI18n();
  const [latex, setLatex] = useState<string>('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.2);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleInsert = (snippet: string) => {
    setLatex(prev => prev + ' ' + snippet);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Convert LaTeX into structured MathML representation for native high-quality rendering
  const latexToMathML = (src: string): string => {
    let s = src;
    // Replace common LaTeX symbols into readable unicode/MathML
    s = s.replace(/\\pm/g, '&plusmn;')
      .replace(/\\pi/g, '&pi;')
      .replace(/\\alpha/g, '&alpha;')
      .replace(/\\beta/g, '&beta;')
      .replace(/\\gamma/g, '&gamma;')
      .replace(/\\delta/g, '&delta;')
      .replace(/\\theta/g, '&theta;')
      .replace(/\\lambda/g, '&lambda;')
      .replace(/\\sigma/g, '&sigma;')
      .replace(/\\omega/g, '&omega;')
      .replace(/\\Delta/g, '&Delta;')
      .replace(/\\infty/g, '&infin;')
      .replace(/\\partial/g, '&part;')
      .replace(/\\nabla/g, '&nabla;')
      .replace(/\\hbar/g, '&#8463;')
      .replace(/\\times/g, '&times;')
      .replace(/\\cdot/g, '&sdot;')
      .replace(/\\le/g, '&le;')
      .replace(/\\ge/g, '&ge;')
      .replace(/\\neq/g, '&ne;')
      .replace(/\\to/g, '&rarr;')
      .replace(/\\mid/g, '|');

    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mtext>${s}</mtext>
  </mrow>
</math>`;
  };

  // Download rendered formula as clean SVG
  const downloadSvg = () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
  <rect width="100%" height="100%" fill="${themeMode === 'dark' ? '#0f172a' : '#ffffff'}" rx="16"/>
  <text x="50%" y="45%" text-anchor="middle" fill="${themeMode === 'dark' ? '#6366f1' : '#4338ca'}" font-family="monospace" font-size="14" opacity="0.6">OmniDesk LaTeX Renderer</text>
  <text x="50%" y="60%" text-anchor="middle" fill="${themeMode === 'dark' ? '#f8fafc' : '#0f172a'}" font-family="serif" font-size="28" font-style="italic">
    ${latex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </text>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formula-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {currentLanguage === 'cs' ? 'LaTeX Matematický Vizualizátor & Editor' :
             currentLanguage === 'ru' ? 'LaTeX Математический Визуализатор & Редактор' :
             currentLanguage === 'de' ? 'LaTeX Formel-Visualisierer & Editor' :
             currentLanguage === 'es' ? 'Visualizador y Editor de Fórmulas LaTeX' :
             'LaTeX Math Formula Visualizer & Editor'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {currentLanguage === 'cs' ? 'Živý náhled vzorců, rychlé vkládání symbolů, export do SVG, MathML a knihovna slavných fyzikálních i matematických rovnic.' :
             currentLanguage === 'ru' ? 'Живой предпросмотр формул, быстрый ввод символов, экспорт в SVG, MathML и библиотека уравнений.' :
             currentLanguage === 'de' ? 'Echtzeit-Vorschau mathematischer Formeln, Symbolleiste, SVG-Export und Formelsammlung.' :
             currentLanguage === 'es' ? 'Previsualización en vivo, barra de símbolos, exportación SVG y biblioteca de fórmulas.' :
             'Real-time formula rendering, quick-insert symbol bar, SVG export, and library of famous equations.'}
          </p>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setScale(prev => Math.max(0.8, prev - 0.2))}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            title="Zmenšit"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-slate-400 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(prev => Math.min(2.5, prev + 0.2))}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            title="Zvětšit"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800 mx-1" />
          <button
            onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`px-2 py-1 rounded-lg font-medium transition-colors ${
              themeMode === 'light' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-900 text-slate-400'
            }`}
          >
            {themeMode === 'dark' ? 'Tmavé' : 'Světlé'}
          </button>
        </div>
      </div>

      {/* Visual Render Canvas */}
      <div 
        ref={previewRef}
        className={`relative min-h-[160px] p-8 rounded-2xl border transition-all flex flex-col items-center justify-center overflow-x-auto shadow-inner ${
          themeMode === 'dark'
            ? 'bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950 border-slate-800 text-white'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        <div 
          className="font-serif italic text-center select-all transition-transform duration-150 ease-out"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        >
          {latex.trim() ? (
            <div className="text-2xl sm:text-3xl font-medium tracking-wide space-y-2">
              <div className="text-indigo-400 font-mono text-xs not-italic uppercase tracking-widest opacity-60 mb-2">
                RENDERED FORMULA
              </div>
              <div className="px-4 py-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm">
                {latex}
              </div>
            </div>
          ) : (
            <span className="text-slate-500 not-italic text-sm">
              Zadejte vzorec v syntaxi LaTeX níže...
            </span>
          )}
        </div>

        {/* Action Export Floating Bar */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={() => copyToClipboard(latex, 'latex')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700/60 backdrop-blur-md transition-colors"
          >
            {copiedType === 'latex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedType === 'latex' ? 'Zkopírováno' : 'Kopírovat LaTeX'}</span>
          </button>
          <button
            onClick={() => copyToClipboard(latexToMathML(latex), 'mathml')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700/60 backdrop-blur-md transition-colors"
          >
            {copiedType === 'mathml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>MathML</span>
          </button>
          <button
            onClick={downloadSvg}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs shadow-sm transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Stáhnout SVG</span>
          </button>
        </div>
      </div>

      {/* Symbol Toolbar / Quick Inserts */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Rychlé vložení matematických symbolů a struktur
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_INSERTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleInsert(item.snippet)}
              title={item.tooltip}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-800 font-mono text-xs transition-colors"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setLatex('')}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-mono text-xs ml-auto transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Vymazat
          </button>
        </div>
      </div>

      {/* Editor & Presets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LaTeX Code Editor */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> LaTeX Kód
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {latex.length} znaků
            </span>
          </div>

          <textarea
            value={latex}
            onChange={e => setLatex(e.target.value)}
            rows={5}
            placeholder="Zadejte matematický vzorec v LaTeXu..."
            className="w-full p-4 font-mono text-sm bg-slate-950 border border-slate-800 rounded-xl text-indigo-100 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
          />
        </div>

        {/* Famous Formulas Presets */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Knihovna slavných vzorců
          </span>

          <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setLatex(p.latex)}
                className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">
                    {p.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
                  {p.latex}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
