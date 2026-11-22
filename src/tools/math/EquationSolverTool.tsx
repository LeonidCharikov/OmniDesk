import React, { useMemo, useState } from 'react';
import { Sigma } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import {
  findNumericRoot,
  formatComplex,
  solveLinearSystem,
  solvePolynomialRoots,
} from '../../utils/mathSuite.logic';

type SolverTab = 'poly' | 'linear' | 'numeric';

export const EquationSolverTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<SolverTab>('poly');

  // Polynomial state (up to degree 4)
  const [degree, setDegree] = useState<2 | 3 | 4>(2);
  const [coeffs, setCoeffs] = useState<number[]>([1, -5, 6, 0, 0]);

  // Linear system state
  const [sysSize, setSysSize] = useState<2 | 3 | 4>(3);
  const [matA, setMatA] = useState<number[][]>([
    [2, 1, -1, 0],
    [-3, -1, 2, 0],
    [-2, 1, 2, 0],
    [0, 0, 0, 1],
  ]);
  const [vecB, setVecB] = useState<number[]>([8, -11, -3, 1]);

  // Numeric root finder
  const [expr, setExpr] = useState('x^3 - 2*x - 5');
  const [rangeA, setRangeA] = useState(1);
  const [rangeB, setRangeB] = useState(3);

  const activeCoeffs = useMemo(() => coeffs.slice(0, degree + 1), [coeffs, degree]);
  const polyRoots = useMemo(() => solvePolynomialRoots(activeCoeffs), [activeCoeffs]);

  const linearSolution = useMemo(() => {
    const subA = matA.slice(0, sysSize).map(r => r.slice(0, sysSize));
    const subB = vecB.slice(0, sysSize);
    return solveLinearSystem(subA, subB);
  }, [matA, vecB, sysSize]);

  const numericRoot = useMemo(() => {
    try {
      return findNumericRoot(expr, rangeA, rangeB);
    } catch {
      return null;
    }
  }, [expr, rangeA, rangeB]);

  const getPipeText = () => {
    if (tab === 'poly') {
      return `Polynomial roots:\n${polyRoots.map((r, i) => `x${i + 1} = ${formatComplex(r)}`).join('\n')}`;
    }
    if (tab === 'linear') {
      if (linearSolution.status === 'singular') return 'Linear system is singular (no unique solution).';
      return [
        ...linearSolution.solution.map((v, i) => `x${i + 1} = ${Number(v.toFixed(6))}`),
        '',
        'Row operations:',
        ...linearSolution.steps,
      ].join('\n');
    }
    return numericRoot && numericRoot.root !== null
      ? `f(x) = ${expr}\nRoot: x ≈ ${numericRoot.root.toFixed(8)} (f(x) = ${numericRoot.fx.toExponential(2)})`
      : '';
  };

  const updateCoeff = (idx: number, val: number) => {
    setCoeffs(prev => prev.map((c, i) => (i === idx ? val : c)));
  };

  const updateMat = (r: number, c: number, val: number) => {
    setMatA(prev => prev.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row)));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sigma className="w-5 h-5 text-indigo-400" />
            {t('tool_equation_solver_title', 'Equation & System Solver')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_equation_solver_desc', 'Solve polynomials (real & complex roots), linear systems Ax = b with row steps, and numerical f(x) = 0 roots.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(
              [
                { id: 'poly', label: t('eq_tab_poly', 'Polynomials') },
                { id: 'linear', label: t('eq_tab_linear', 'Linear Ax = b') },
                { id: 'numeric', label: t('eq_tab_numeric', 'Numeric f(x) = 0') },
              ] as const
            ).map(tb => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  tab === tb.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
          <SendToToolButton sourceToolId="equation-solver" getText={getPipeText} />
        </div>
      </div>

      {tab === 'poly' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">{t('eq_degree', 'Degree')}:</span>
              {([2, 3, 4] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDegree(d)}
                  className={`px-3 py-1 rounded-lg font-mono ${
                    degree === d ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'
                  }`}
                >
                  {d}°
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDegree(2);
                  setCoeffs([1, 0, 4, 0, 0]);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:border-indigo-500/50"
              >
                x² + 4 = 0
              </button>
              <button
                type="button"
                onClick={() => {
                  setDegree(3);
                  setCoeffs([1, -6, 11, -6, 0]);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:border-indigo-500/50"
              >
                x³ − 6x² + 11x − 6 = 0
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {activeCoeffs.map((val, idx) => {
              const power = degree - idx;
              const label = power === 0 ? 'c' : power === 1 ? 'x' : `x^${power}`;
              return (
                <label key={idx} className="text-xs text-slate-400 font-mono">
                  {label}
                  <input
                    type="number"
                    step="any"
                    value={val}
                    onChange={e => updateCoeff(idx, Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
                  />
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            {polyRoots.map((root, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-mono text-slate-400 block">
                  x<sub>{i + 1}</sub> {Math.abs(root.im) > 1e-7 ? `(${t('eq_complex', 'Complex')})` : `(${t('eq_real', 'Real')})`}
                </span>
                <span className="text-lg font-bold font-mono text-indigo-300 mt-1 block">
                  {formatComplex(root, 5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'linear' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">{t('eq_variables', 'Variables')}:</span>
            {([2, 3, 4] as const).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setSysSize(n)}
                className={`px-3 py-1 rounded-lg font-mono ${
                  sysSize === n ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                {n} × {n}
              </button>
            ))}
          </div>

          <div className="space-y-2 overflow-x-auto">
            {Array.from({ length: sysSize }).map((_, r) => (
              <div key={r} className="flex items-center gap-2">
                {Array.from({ length: sysSize }).map((__, c) => (
                  <div key={c} className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      value={matA[r][c]}
                      onChange={e => updateMat(r, c, Number(e.target.value))}
                      className="w-20 px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-white text-center"
                    />
                    <span className="text-xs font-mono text-slate-400">
                      x<sub>{c + 1}</sub>
                      {c < sysSize - 1 ? ' +' : ''}
                    </span>
                  </div>
                ))}
                <span className="text-xs font-mono text-indigo-400 font-bold">=</span>
                <input
                  type="number"
                  step="any"
                  value={vecB[r]}
                  onChange={e => setVecB(prev => prev.map((v, idx) => (idx === r ? Number(e.target.value) : v)))}
                  className="w-24 px-2.5 py-2 bg-slate-950 border border-indigo-800/60 rounded-lg font-mono text-xs text-indigo-300 text-center"
                />
              </div>
            ))}
          </div>

          {linearSolution.status === 'singular' ? (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {t('eq_singular', 'System is singular or underdetermined — no unique solution.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                {linearSolution.solution.map((val, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-mono text-slate-400 block">
                      x<sub>{i + 1}</sub>
                    </span>
                    <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
                      {Number(val.toFixed(6))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  {t('eq_row_ops', 'Gaussian Elimination Steps')}
                </span>
                {linearSolution.steps.map((s, idx) => (
                  <div key={idx} className="text-xs font-mono text-slate-300">
                    {idx + 1}. {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'numeric' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="sm:col-span-2 text-xs text-slate-400">
              {t('eq_func_label', 'Function f(x) = 0')}
              <input
                type="text"
                value={expr}
                onChange={e => setExpr(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300"
              />
            </label>
            <label className="text-xs text-slate-400">
              {t('eq_bracket_min', 'Search Start (a)')}
              <input
                type="number"
                step="any"
                value={rangeA}
                onChange={e => setRangeA(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
              />
            </label>
            <label className="text-xs text-slate-400">
              {t('eq_bracket_max', 'Search End (b)')}
              <input
                type="number"
                step="any"
                value={rangeB}
                onChange={e => setRangeB(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { e: 'x^3 - 2*x - 5', a: 1, b: 3 },
              { e: 'cos(x) - x', a: 0, b: 2 },
              { e: 'exp(x) - 3*x', a: 0, b: 2 },
            ].map(p => (
              <button
                key={p.e}
                type="button"
                onClick={() => {
                  setExpr(p.e);
                  setRangeA(p.a);
                  setRangeB(p.b);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:border-indigo-500/50"
              >
                {p.e} = 0
              </button>
            ))}
          </div>

          {numericRoot && numericRoot.root !== null ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('eq_root_found', 'Root (x)')}</span>
                <span className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
                  {numericRoot.root.toFixed(8)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">f(x)</span>
                <span className="text-xl font-bold font-mono text-indigo-300 tabular-nums">
                  {numericRoot.fx.toExponential(3)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('eq_method', 'Method')}</span>
                <span className="text-lg font-semibold font-mono text-amber-300">
                  {numericRoot.method} ({numericRoot.iterations})
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
              {t('eq_no_root', 'No root converged in this bracket. Try adjusting [a, b] or verify syntax.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
