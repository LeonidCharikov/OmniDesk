import React, { useState, useMemo } from 'react';
import { ListOrdered } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { evaluateSequenceSeries, type SequenceMode } from '../../utils/scienceMathExt.logic';

export const SequencesSeriesTool: React.FC = () => {
  const { t } = useI18n();

  const [mode, setMode] = useState<SequenceMode>('geometric');
  const [a1, setA1] = useState('1');
  const [diffOrRatio, setDiffOrRatio] = useState('0.5');
  const [pPower, setPPower] = useState('2');
  const [customExpr, setCustomExpr] = useState('1 / (n * (n + 1))');
  const [count, setCount] = useState('20');

  const result = useMemo(
    () =>
      evaluateSequenceSeries({
        mode,
        a1: Number(a1) || 0,
        diffOrRatio: Number(diffOrRatio) || 0,
        pPower: Number(pPower) || 1,
        customExpr,
        count: Number(count) || 20,
      }),
    [mode, a1, diffOrRatio, pPower, customExpr, count]
  );

  // SVG plot of terms a(n) and partial sums S(n)
  const svgW = 620;
  const svgH = 210;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const vals = result.terms.flatMap(r => [r.term, r.partialSum]);
  const minV = Math.min(0, ...(vals.length ? vals : [0]));
  const maxV = Math.max(1, ...(vals.length ? vals : [1]));
  const spanV = Math.max(1e-6, maxV - minV);
  const nLen = Math.max(1, result.terms.length);

  const toX = (n: number) => padL + ((n - 1) / Math.max(1, nLen - 1)) * (svgW - padL - padR);
  const toY = (v: number) => svgH - padB - ((v - minV) / spanV) * (svgH - padT - padB);

  const partialSumPath = result.terms
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(r.n).toFixed(1)} ${toY(r.partialSum).toFixed(1)}`)
    .join(' ');
  const termPath = result.terms
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(r.n).toFixed(1)} ${toY(r.term).toFixed(1)}`)
    .join(' ');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ListOrdered className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('seq_title', 'Sequences, Series & Convergence Explorer')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'seq_subtitle',
                  'Inspect Arithmetic, Geometric, Fibonacci, p-Series, and custom a(n) formulas with partial sums, ratio test, and convergence hints.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(
              [
                ['arithmetic', t('seq_mode_arith', 'Arithmetic')],
                ['geometric', t('seq_mode_geom', 'Geometric')],
                ['pseries', t('seq_mode_p', 'p-Series')],
                ['fibonacci', t('seq_mode_fib', 'Fibonacci')],
                ['custom', t('seq_mode_custom', 'Custom a(n)')],
              ] as Array<[SequenceMode, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {(mode === 'arithmetic' || mode === 'geometric' || mode === 'fibonacci') && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('seq_a1', 'First Term a₁')}</label>
              <input type="number" step="0.5" value={a1} onChange={e => setA1(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
            </div>
          )}
          {mode === 'arithmetic' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('seq_diff', 'Common Difference (d)')}</label>
              <input type="number" step="0.5" value={diffOrRatio} onChange={e => setDiffOrRatio(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
            </div>
          )}
          {mode === 'geometric' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('seq_ratio', 'Common Ratio (r)')}</label>
              <input type="number" step="0.1" value={diffOrRatio} onChange={e => setDiffOrRatio(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
            </div>
          )}
          {mode === 'pseries' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('seq_p_power', 'Exponent p in 1 / n^p')}</label>
              <input type="number" step="0.25" value={pPower} onChange={e => setPPower(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
            </div>
          )}
          {mode === 'custom' && (
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">{t('seq_custom_formula', 'Formula a(n)')}</label>
              <input type="text" value={customExpr} onChange={e => setCustomExpr(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-indigo-300" />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('seq_count', 'Terms (N)')}</label>
            <input type="number" min="2" max="100" value={count} onChange={e => setCount(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
        </div>

        {!result.valid ? (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
            {t('seq_invalid_expr', 'Formula produced an invalid or non-finite value.')}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('seq_partial_sum', 'Partial Sum S(N)')}</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{result.sumTotal.toFixed(6)}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('seq_convergence', 'Series Behavior')}</div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    result.convergenceHint === 'converges'
                      ? 'text-emerald-400'
                      : result.convergenceHint === 'diverges'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {result.convergenceHint === 'converges'
                    ? t('seq_conv_yes', 'Converges')
                    : result.convergenceHint === 'diverges'
                    ? t('seq_conv_no', 'Diverges')
                    : t('seq_conv_unknown', 'Inconclusive')}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('seq_closed_sum', 'Infinite Sum S(∞)')}</div>
                <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
                  {result.closedFormSum !== null ? result.closedFormSum.toFixed(6) : '—'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('seq_ratio_test', 'Last Ratio |aₙ / aₙ₋₁|')}</div>
                <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                  {result.lastRatio !== null ? result.lastRatio.toFixed(5) : '—'}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">{t('seq_plot_title', 'Terms a(n) vs. Partial Sums S(n)')}</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> S(n)
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <span className="w-3 h-0.5 bg-indigo-400 inline-block" /> a(n)
                  </span>
                </div>
              </div>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-52">
                <line x1={padL} y1={toY(0)} x2={svgW - padR} y2={toY(0)} stroke="currentColor" className="text-slate-800" />
                <path d={partialSumPath} fill="none" stroke="#34d399" strokeWidth="2.4" />
                <path d={termPath} fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 2" />
                {result.closedFormSum !== null && result.closedFormSum <= maxV && result.closedFormSum >= minV && (
                  <line
                    x1={padL}
                    y1={toY(result.closedFormSum)}
                    x2={svgW - padR}
                    y2={toY(result.closedFormSum)}
                    stroke="#fbbf24"
                    strokeDasharray="4 3"
                    strokeWidth="1.2"
                  />
                )}
              </svg>
            </div>

            {/* Terms Table */}
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-950 sticky top-0 text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="py-2 px-3">n</th>
                    <th className="py-2 px-3">a(n)</th>
                    <th className="py-2 px-3">S(n)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.terms.map(r => (
                    <tr key={r.n}>
                      <td className="py-1.5 px-3 text-slate-400">{r.n}</td>
                      <td className="py-1.5 px-3 text-indigo-300">{r.term.toFixed(6)}</td>
                      <td className="py-1.5 px-3 text-emerald-400">{r.partialSum.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
