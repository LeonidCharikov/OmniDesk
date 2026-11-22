import React, { useMemo, useState } from 'react';
import { LineChart } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { compileSafeMathExpression } from '../../utils/safeMathParser';
import { analyzeCalculus, evaluateTaylor } from '../../utils/mathSuite.logic';

export const CalculusWorkbenchTool: React.FC = () => {
  const { t } = useI18n();
  const [expr, setExpr] = useState('sin(x) + 0.25*x^2');
  const [x0, setX0] = useState(1);
  const [intA, setIntA] = useState(0);
  const [intB, setIntB] = useState(3.14159);
  const [taylorDeg, setTaylorDeg] = useState(4);
  const [showTaylor, setShowTaylor] = useState(true);

  const analysis = useMemo(() => {
    try {
      const fn = compileSafeMathExpression(expr);
      const calc = analyzeCalculus(expr, x0, intA, intB, taylorDeg);
      return { fn, calc, error: null as string | null };
    } catch {
      return { fn: null, calc: null, error: t('calc_wb_invalid', 'Invalid expression syntax.') };
    }
  }, [expr, x0, intA, intB, taylorDeg, t]);

  const svgPlot = useMemo(() => {
    if (!analysis.fn || !analysis.calc) return null;
    const minX = Math.min(intA, intB, x0) - 1.5;
    const maxX = Math.max(intA, intB, x0) + 1.5;
    const samples = 140;
    const pts: Array<{ x: number; y: number; ty: number }> = [];
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i <= samples; i++) {
      const x = minX + ((maxX - minX) * i) / samples;
      const y = analysis.fn(x);
      const ty = evaluateTaylor(analysis.calc.taylorCoeffs, x0, x);
      if (Number.isFinite(y) && Math.abs(y) < 1e4) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        pts.push({ x, y, ty });
      }
    }
    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return null;
    const padY = Math.max(0.5, (maxY - minY) * 0.18);
    minY = Math.min(minY - padY, 0);
    maxY = Math.max(maxY + padY, 0);

    const W = 560;
    const H = 220;
    const sx = (x: number) => ((x - minX) / (maxX - minX)) * W;
    const sy = (y: number) => H - ((y - minY) / (maxY - minY)) * H;
    const yZero = sy(0);

    const curvePath = pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
      .join(' ');

    const taylorPath = pts
      .filter(p => Number.isFinite(p.ty) && p.ty >= minY - padY && p.ty <= maxY + padY)
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.ty).toFixed(1)}`)
      .join(' ');

    const lo = Math.min(intA, intB);
    const hi = Math.max(intA, intB);
    const shadedPts = pts.filter(p => p.x >= lo && p.x <= hi);
    const areaPath =
      shadedPts.length > 1
        ? `M ${sx(shadedPts[0].x).toFixed(1)} ${yZero.toFixed(1)} ` +
          shadedPts.map(p => `L ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ') +
          ` L ${sx(shadedPts[shadedPts.length - 1].x).toFixed(1)} ${yZero.toFixed(1)} Z`
        : '';

    return {
      W,
      H,
      curvePath,
      taylorPath,
      areaPath,
      yZero,
      xZero: sx(0),
      dotX: sx(x0),
      dotY: sy(analysis.calc.fx0),
    };
  }, [analysis, intA, intB, x0]);

  const taylorFormula = useMemo(() => {
    if (!analysis.calc) return '';
    return analysis.calc.taylorCoeffs
      .map((c, k) => {
        if (Math.abs(c) < 1e-5) return null;
        const val = Number(c.toFixed(4));
        const dx = x0 === 0 ? 'x' : `(x ${x0 >= 0 ? '−' : '+'} ${Math.abs(x0)})`;
        if (k === 0) return `${val}`;
        if (k === 1) return `${val >= 0 ? '+ ' : '− '}${Math.abs(val)}·${dx}`;
        return `${val >= 0 ? '+ ' : '− '}${Math.abs(val)}·${dx}^${k}`;
      })
      .filter(Boolean)
      .join(' ') || '0';
  }, [analysis.calc, x0]);

  const getPipeText = () => {
    if (!analysis.calc) return '';
    const c = analysis.calc;
    return [
      `f(x) = ${expr}`,
      `f(${x0}) = ${c.fx0.toFixed(6)}`,
      `f'(${x0}) = ${c.df1.toFixed(6)}`,
      `f''(${x0}) = ${c.df2.toFixed(6)}`,
      `Integral [${intA}, ${intB}] = ${c.integral.toFixed(6)}`,
      `Taylor (deg ${taylorDeg}): ${taylorFormula}`,
    ].join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LineChart className="w-5 h-5 text-indigo-400" />
            {t('tool_calculus_workbench_title', 'Calculus Workbench')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_calculus_workbench_desc', 'Derivatives, definite integrals with shaded area, limits, and Taylor polynomial approximations.')}
          </p>
        </div>
        <SendToToolButton sourceToolId="calculus-workbench" getText={getPipeText} />
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="sm:col-span-2 text-xs text-slate-400">
            f(x)
            <input
              type="text"
              value={expr}
              onChange={e => setExpr(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300"
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('calc_wb_point', 'Point x₀')}
            <input
              type="number"
              step="any"
              value={x0}
              onChange={e => setX0(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('calc_wb_int_a', 'Integral From (a)')}
            <input
              type="number"
              step="any"
              value={intA}
              onChange={e => setIntA(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('calc_wb_int_b', 'Integral To (b)')}
            <input
              type="number"
              step="any"
              value={intB}
              onChange={e => setIntB(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {['sin(x) + 0.25*x^2', 'exp(-x^2)', 'ln(x + 2)', 'x^3 - 3*x'].map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => setExpr(ex)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:border-indigo-500/50"
              >
                {ex}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showTaylor}
              onChange={e => setShowTaylor(e.target.checked)}
              className="accent-indigo-500"
            />
            {t('calc_wb_show_taylor', 'Overlay Taylor polynomial')}
            <select
              value={taylorDeg}
              onChange={e => setTaylorDeg(Number(e.target.value))}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-white"
            >
              {[2, 3, 4, 5, 6].map(d => (
                <option key={d} value={d}>
                  n={d}
                </option>
              ))}
            </select>
          </label>
        </div>

        {analysis.error || !analysis.calc ? (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {analysis.error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">f(x₀)</span>
                <span className="text-xl font-bold font-mono text-white tabular-nums">
                  {analysis.calc.fx0.toFixed(5)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">f&prime;(x₀) ({t('calc_wb_slope', 'Slope')})</span>
                <span className="text-xl font-bold font-mono text-indigo-300 tabular-nums">
                  {analysis.calc.df1.toFixed(5)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">f&Prime;(x₀) ({t('calc_wb_concavity', 'Curvature')})</span>
                <span className="text-xl font-bold font-mono text-amber-300 tabular-nums">
                  {analysis.calc.df2.toFixed(5)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">
                  ∫<sub>a</sub><sup>b</sup> f(x) dx
                </span>
                <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
                  {analysis.calc.integral.toFixed(6)}
                </span>
              </div>
            </div>

            {svgPlot && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <svg viewBox={`0 0 ${svgPlot.W} ${svgPlot.H}`} className="w-full h-56 overflow-visible">
                  <line x1={0} y1={svgPlot.yZero} x2={svgPlot.W} y2={svgPlot.yZero} stroke="currentColor" className="text-slate-700" strokeDasharray="4 4" />
                  <line x1={svgPlot.xZero} y1={0} x2={svgPlot.xZero} y2={svgPlot.H} stroke="currentColor" className="text-slate-700" strokeDasharray="4 4" />
                  {svgPlot.areaPath && <path d={svgPlot.areaPath} fill="rgba(16, 185, 129, 0.22)" />}
                  <path d={svgPlot.curvePath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                  {showTaylor && svgPlot.taylorPath && (
                    <path d={svgPlot.taylorPath} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="6 4" />
                  )}
                  {Number.isFinite(svgPlot.dotY) && (
                    <circle cx={svgPlot.dotX} cy={svgPlot.dotY} r="4.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                  )}
                </svg>
                <div className="mt-3 pt-2 border-t border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                  <div>
                    <span className="text-amber-300">P<sub>{taylorDeg}</sub>(x) ≈ </span>
                    {taylorFormula}
                  </div>
                  <div className="text-slate-400">
                    lim<sub>x→x₀⁻</sub> = {analysis.calc.limitLeft.toFixed(5)} · lim<sub>x→x₀⁺</sub> = {analysis.calc.limitRight.toFixed(5)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
