import React, { useMemo, useState } from 'react';
import { Scale, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  countSignificantFigures,
  propagateFormulaError,
  UncertainVar,
} from '../../utils/mathSuite.logic';

export const ErrorPropagationTool: React.FC = () => {
  const { t } = useI18n();
  const [formula, setFormula] = useState('m * v^2 / 2');
  const [vars, setVars] = useState<UncertainVar[]>([
    { name: 'm', value: 2.5, uncertainty: 0.05 },
    { name: 'v', value: 12.4, uncertainty: 0.2 },
  ]);
  const [sigInput, setSigInput] = useState('0.0045080');
  const [sigTarget, setSigTarget] = useState(3);

  const propagated = useMemo(() => propagateFormulaError(formula, vars), [formula, vars]);
  const sigCount = useMemo(() => countSignificantFigures(sigInput), [sigInput]);
  const roundedSig = useMemo(() => {
    const n = Number(sigInput);
    return Number.isFinite(n) ? n.toPrecision(Math.max(1, Math.min(12, sigTarget))) : '—';
  }, [sigInput, sigTarget]);

  const updateVar = (idx: number, patch: Partial<UncertainVar>) => {
    setVars(prev => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const addVar = () => {
    const nextChar = String.fromCharCode(97 + (vars.length % 26));
    setVars(prev => [...prev, { name: nextChar, value: 1, uncertainty: 0.01 }]);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          {t('tool_error_propagation_title', 'Error Propagation & Significant Figures')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_error_propagation_desc', 'Compute combined measurement uncertainty δf via numerical partial derivatives and analyze significant digits.')}
        </p>
      </div>

      {/* Uncertainty Propagation */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="flex-1 min-w-[240px] text-xs text-slate-400">
            {t('err_formula_label', 'Formula f(x, y, ...)')}
            <input
              type="text"
              value={formula}
              onChange={e => setFormula(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300"
            />
          </label>
          <button
            type="button"
            onClick={addVar}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('err_add_var', 'Add Variable')}
          </button>
        </div>

        <div className="space-y-2">
          {vars.map((v, idx) => (
            <div key={idx} className="grid grid-cols-[80px,1fr,1fr,auto] gap-2 items-center">
              <input
                type="text"
                value={v.name}
                onChange={e => updateVar(idx, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                className="px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-indigo-300 text-center"
              />
              <input
                type="number"
                step="any"
                value={v.value}
                onChange={e => updateVar(idx, { value: Number(e.target.value) })}
                placeholder="Value"
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-white"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-slate-500">±</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={v.uncertainty}
                  onChange={e => updateVar(idx, { uncertainty: Math.abs(Number(e.target.value)) })}
                  placeholder="δx"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-amber-300"
                />
              </div>
              <button
                type="button"
                onClick={() => setVars(prev => prev.filter((_, i) => i !== idx))}
                disabled={vars.length <= 1}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {propagated ? (
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('err_combined', 'Result (f ± δf)')}</span>
                <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
                  {propagated.value.toPrecision(5)} ± {propagated.uncertainty.toPrecision(3)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('err_rel_pct', 'Relative Uncertainty')}</span>
                <span className="text-xl font-bold font-mono text-amber-300 tabular-nums">
                  ±{propagated.relativePercent.toFixed(3)}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('err_variance_share', 'Variance Contributions')}</span>
                <div className="space-y-1 mt-1">
                  {propagated.contributions.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-indigo-300">{c.name}</span>
                      <span className="text-slate-300">{c.varianceSharePct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {t('err_invalid_formula', 'Unable to evaluate formula with current variables.')}
          </div>
        )}
      </div>

      {/* Significant Figures */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('err_sig_figs_title', 'Significant Figures Analyzer & Rounder')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="sm:col-span-2 text-xs text-slate-400">
            {t('err_number_input', 'Measurement String')}
            <input
              type="text"
              value={sigInput}
              onChange={e => setSigInput(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('err_round_to', 'Round to N sig figs')}
            <input
              type="number"
              min={1}
              max={12}
              value={sigTarget}
              onChange={e => setSigTarget(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
            />
          </label>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
            <span className="text-[11px] text-slate-400">{sigCount} {t('err_sig_digits', 'sig figs')}</span>
            <span className="text-lg font-bold font-mono text-indigo-300">{roundedSig}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
