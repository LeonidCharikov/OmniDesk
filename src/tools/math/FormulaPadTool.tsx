import React, { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { evaluateFormulaPad } from '../../utils/mathSuite.logic';

const STORAGE_KEY = 'omnidesk_formula_pad_v1';

const DEFAULT_PAD = `# Unit-aware live math scratchpad
speed = 12 km / 45 min in km/h
distance = 180 km in mi
mass = 2.5 kg + 450 g in lb
subtotal = 420 * 3
vat = subtotal * 21%
total = subtotal + vat`;

export const FormulaPadTool: React.FC = () => {
  const { t } = useI18n();
  const [content, setContent] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_PAD;
    } catch {
      return DEFAULT_PAD;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch {
      // ignore quota error
    }
  }, [content]);

  const lines = useMemo(() => evaluateFormulaPad(content), [content]);

  const getPipeText = () =>
    lines
      .filter(l => l.raw.trim())
      .map(l => (l.formatted ? `${l.raw}   # => ${l.formatted}` : l.raw))
      .join('\n');

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-indigo-400" />
            {t('tool_formula_pad_title', 'Unit-Aware Formula Scratchpad')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_formula_pad_desc', 'Multi-line live math notepad where variables flow line-to-line with automatic unit conversions.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setContent(DEFAULT_PAD)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
          >
            {t('fpad_reset_sample', 'Reset Sample')}
          </button>
          <button
            type="button"
            onClick={() => setContent('')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700"
            title={t('clear', 'Clear')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <SendToToolButton sourceToolId="formula-pad" getText={getPipeText} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            {t('fpad_editor', 'Expressions')}
          </span>
          <textarea
            rows={14}
            value={content}
            onChange={e => setContent(e.target.value)}
            spellCheck={false}
            className="w-full p-4 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl font-mono text-sm leading-7 text-slate-100 focus:outline-none resize-y"
          />
          <p className="text-[11px] font-mono text-slate-500">
            {t('fpad_units_hint', 'Supports: mm, cm, m, km, in, ft, mi, mg, g, kg, lb, oz, ms, s, min, h, day, m/s, km/h, mph, KB, MB, GB, %')}
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            {t('fpad_results', 'Live Results')}
          </span>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm leading-7 min-h-[26rem] space-y-0">
            {lines.map(line => (
              <div key={line.lineNumber} className="h-7 flex items-center justify-between gap-2 truncate">
                <span className="text-[11px] text-slate-600 w-5 shrink-0">{line.lineNumber}</span>
                {line.error ? (
                  <span className="text-xs text-rose-400 truncate">{line.error}</span>
                ) : line.formatted ? (
                  <span className="text-emerald-300 font-semibold truncate tabular-nums">= {line.formatted}</span>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
