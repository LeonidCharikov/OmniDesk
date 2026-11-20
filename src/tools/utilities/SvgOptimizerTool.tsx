import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Copy, Download, FileUp, Sparkles, Code2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { optimizeSvgMarkup, svgToReactJsx } from '../../utils/newTools.logic';

const SAMPLE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Created with Vector Studio -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <metadata>Sample icon metadata</metadata>
  <g></g>
  <rect x="6.0000" y="6.0000" width="52.0000" height="52.0000" rx="14.000" fill="#6366f1" />
  <path d="M20.000 33.500 L28.500 42.000 L44.500 22.500" fill="none" stroke="#ffffff" stroke-width="5.000" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

export const SvgOptimizerTool: React.FC = () => {
  const { t } = useI18n();
  const [rawSvg, setRawSvg] = useState(SAMPLE_SVG);
  const [precision, setPrecision] = useState(2);
  const [removeComments, setRemoveComments] = useState(true);
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [removeDimensions, setRemoveDimensions] = useState(false);
  const [overrideColor, setOverrideColor] = useState('');
  const [previewBg, setPreviewBg] = useState<'dark' | 'light' | 'checker'>('checker');
  const [outputTab, setOutputTab] = useState<'svg' | 'jsx'>('svg');
  const [componentName, setComponentName] = useState('BrandIcon');
  const [copied, setCopied] = useState(false);

  const optimized = useMemo(
    () =>
      optimizeSvgMarkup(rawSvg, {
        precision,
        removeComments,
        removeMetadata,
        removeDimensions,
        overrideColor: overrideColor || undefined,
      }),
    [rawSvg, precision, removeComments, removeMetadata, removeDimensions, overrideColor]
  );

  const sanitizedPreviewSvg = useMemo(
    () => DOMPurify.sanitize(optimized.output, { USE_PROFILES: { svg: true, svgFilters: true } }),
    [optimized.output]
  );

  const jsxCode = useMemo(() => svgToReactJsx(optimized.output, componentName), [optimized.output, componentName]);
  const activeOutput = outputTab === 'svg' ? optimized.output : jsxCode;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then(txt => setRawSvg(txt));
  };

  const copyOutput = () => {
    void navigator.clipboard.writeText(activeOutput);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const downloadOutput = () => {
    const ext = outputTab === 'svg' ? 'svg' : 'tsx';
    void saveTextWithDialog(
      outputTab === 'svg' ? 'optimized.svg' : `${componentName || 'Icon'}.tsx`,
      activeOutput,
      [{ name: ext.toUpperCase(), extensions: [ext] }],
      t('download_result', 'Save output')
    );
  };

  const bgClass =
    previewBg === 'light'
      ? 'bg-white text-slate-900'
      : previewBg === 'dark'
        ? 'od-fixed-dark-stage'
        : 'od-fixed-checker-stage';

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            {t('tool_svg_optimizer_title', 'SVG Inspector & Optimizer')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_svg_optimizer_desc', 'Clean bloated SVG markup, inspect viewBox & icon sizes, recolor strokes/fills, and export optimized SVG or React JSX.')}
          </p>
        </div>
        <label className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
          <FileUp className="w-3.5 h-3.5" />
          {t('svg_load_file', 'Load .svg')}
          <input type="file" accept=".svg,image/svg+xml" className="sr-only" onChange={handleFile} />
        </label>
      </div>

      {/* Options & Stats Bar */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={removeComments} onChange={e => setRemoveComments(e.target.checked)} />
            {t('svg_strip_comments', 'Strip comments')}
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={removeMetadata} onChange={e => setRemoveMetadata(e.target.checked)} />
            {t('svg_strip_metadata', 'Strip metadata & editor attrs')}
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={removeDimensions} onChange={e => setRemoveDimensions(e.target.checked)} />
            {t('svg_strip_dims', 'Remove width/height')}
          </label>
          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">{t('svg_precision', 'Decimals:')}</span>
            <select
              value={precision}
              onChange={e => setPrecision(Number(e.target.value))}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
            >
              {[0, 1, 2, 3].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">{t('svg_recolor', 'Recolor:')}</span>
            <input
              type="text"
              value={overrideColor}
              onChange={e => setOverrideColor(e.target.value)}
              placeholder="currentColor / #hex"
              className="w-36 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200"
            />
          </label>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">{t('svg_size_change', 'Size')}</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {optimized.stats.originalBytes} B → {optimized.stats.optimizedBytes} B ({optimized.stats.savedPercent}%)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">viewBox</span>
            <span className="font-mono text-slate-200">{optimized.stats.viewBox}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">{t('svg_dimensions', 'Dimensions')}</span>
            <span className="font-mono text-slate-200">{optimized.stats.width} × {optimized.stats.height}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">{t('svg_elements', 'Shapes / Paths')}</span>
            <span className="font-mono text-indigo-300">{optimized.stats.elementCount}</span>
          </div>
        </div>

        {/* Multi-size sanitized preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">{t('svg_size_preview', 'Icon Size Preview (16px / 32px / 64px / 96px)')}</span>
            <div className="flex gap-1">
              {(['checker', 'dark', 'light'] as const).map(bg => (
                <button
                  key={bg}
                  type="button"
                  aria-pressed={previewBg === bg}
                  onClick={() => setPreviewBg(bg)}
                  className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                    previewBg === bg ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>
          <div className={`p-5 rounded-xl border border-slate-800 flex flex-wrap items-end justify-center gap-8 ${bgClass}`}>
            {[16, 32, 64, 96].map(sz => (
              <div key={sz} className="flex flex-col items-center gap-2">
                <div
                  style={{ width: sz, height: sz }}
                  className="flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: sanitizedPreviewSvg }}
                />
                <span className="text-[10px] font-mono opacity-80">{sz}px</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source vs Output */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="svg-source-input" className="text-xs font-medium text-slate-300 block">{t('svg_source_input', 'Input SVG Markup')}</label>
            <textarea
              id="svg-source-input"
              aria-label={t('svg_source_input', 'Input SVG Markup')}
              value={rawSvg}
              onChange={e => setRawSvg(e.target.value)}
              className="w-full min-h-60 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div role="tablist" aria-label="SVG output format" className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={outputTab === 'svg'}
                  onClick={() => setOutputTab('svg')}
                  className={`px-2.5 py-1 rounded ${outputTab === 'svg' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  SVG
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={outputTab === 'jsx'}
                  onClick={() => setOutputTab('jsx')}
                  className={`px-2.5 py-1 rounded ${outputTab === 'jsx' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  <Code2 className="w-3 h-3 inline mr-1" />
                  React TSX
                </button>
              </div>
              {outputTab === 'jsx' && (
                <input
                  value={componentName}
                  onChange={e => setComponentName(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 w-36"
                  placeholder="IconName"
                />
              )}
            </div>
            <textarea
              readOnly
              value={activeOutput}
              className="w-full min-h-60 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyOutput} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium">
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {copied ? t('copied', 'Copied!') : t('copy_result', 'Copy result')}
              </button>
              <button type="button" onClick={downloadOutput} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium">
                <Download className="w-3.5 h-3.5 inline mr-1" />
                {t('download', 'Download')}
              </button>
              <SendToToolButton sourceToolId="svg-optimizer" kind="text" getText={() => activeOutput} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
