import React, { useState, useMemo } from 'react';
import { Compass } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { solveOdeFirstOrder } from '../../utils/scienceMathExt.logic';

const ODE_PRESETS = [
  { label: "y' = y (Exponential)", expr: 'y', x0: '0', y0: '1', xEnd: '2' },
  { label: "y' = x - y", expr: 'x - y', x0: '0', y0: '1', xEnd: '3' },
  { label: "y' = y * (1 - y) (Logistic)", expr: 'y * (1 - y)', x0: '0', y0: '0.1', xEnd: '6' },
  { label: "y' = sin(x) * y", expr: 'sin(x) * y', x0: '0', y0: '1', xEnd: '6' },
];

export const OdeSlopeFieldTool: React.FC = () => {
  const { t } = useI18n();

  const [expr, setExpr] = useState('x - y');
  const [x0, setX0] = useState('0');
  const [y0, setY0] = useState('1');
  const [xEnd, setXEnd] = useState('3');
  const [steps, setSteps] = useState('30');

  const result = useMemo(
    () => solveOdeFirstOrder(expr, Number(x0) || 0, Number(y0) || 0, Number(xEnd) || 2, Number(steps) || 30),
    [expr, x0, y0, xEnd, steps]
  );

  const svgW = 640;
  const svgH = 290;
  const padL = 50;
  const padR = 20;
  const padT = 18;
  const padB = 30;

  const xStart = Number(x0) || 0;
  const xFinish = Number(xEnd) || 2;
  const xMin = Math.min(xStart, xFinish);
  const xMax = Math.max(xStart, xFinish) === xMin ? xMin + 1 : Math.max(xStart, xFinish);

  const allYs = result.valid
    ? [...result.points.map(p => p.yRk4), ...result.points.map(p => p.yEuler), ...result.slopeSegments.map(s => s.y)]
    : [0, 1];
  const yMin = Math.min(...allYs);
  const yMax = Math.max(...allYs) === yMin ? yMin + 1 : Math.max(...allYs);

  const toX = (xv: number) => padL + ((xv - xMin) / (xMax - xMin)) * (svgW - padL - padR);
  const toY = (yv: number) => svgH - padB - ((yv - yMin) / (yMax - yMin)) * (svgH - padT - padB);

  const rk4Path = result.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x).toFixed(1)} ${toY(p.yRk4).toFixed(1)}`)
    .join(' ');
  const eulerPath = result.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x).toFixed(1)} ${toY(p.yEuler).toFixed(1)}`)
    .join(' ');

  const lastPt = result.points[result.points.length - 1];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('ode_title', 'ODE Solver (RK4 vs. Euler) & Slope Field Studio')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'ode_subtitle',
                  'Solve first-order differential equations dy/dx = f(x, y) locally using 4th-order Runge-Kutta and Euler methods with a direction field.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ODE_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  setExpr(p.expr);
                  setX0(p.x0);
                  setY0(p.y0);
                  setXEnd(p.xEnd);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-[11px] font-mono text-slate-300"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">{t('ode_expr', "dy/dx = f(x, y)")}</label>
            <input
              type="text"
              value={expr}
              onChange={e => setExpr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-indigo-300"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">x₀</label>
            <input type="number" step="0.5" value={x0} onChange={e => setX0(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">y₀</label>
            <input type="number" step="0.5" value={y0} onChange={e => setY0(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('ode_x_end', 'x End')}</label>
            <input type="number" step="0.5" value={xEnd} onChange={e => setXEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('ode_steps', 'Steps (n)')}</label>
            <input type="number" min="4" max="200" value={steps} onChange={e => setSteps(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
        </div>

        {!result.valid ? (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
            {result.error || t('ode_invalid', 'Invalid expression syntax.')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('ode_rk4_end', 'RK4 Final y(x_end)')}</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {lastPt ? lastPt.yRk4.toFixed(6) : '—'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('ode_euler_end', 'Euler Final y(x_end)')}</div>
                <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                  {lastPt ? lastPt.yEuler.toFixed(6) : '—'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('ode_drift', 'Euler vs. RK4 Drift')}</div>
                <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                  {lastPt ? Math.abs(lastPt.yRk4 - lastPt.yEuler).toExponential(3) : '—'}
                </div>
              </div>
            </div>

            {/* Slope Field & Solution SVG */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-white">{t('ode_plot_title', 'Direction Slope Field & Solution Curves')}</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> RK4
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Euler
                  </span>
                </div>
              </div>

              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-72">
                {result.slopeSegments.map((seg, idx) => {
                  const cx = toX(seg.x);
                  const cy = toY(seg.y);
                  const scaleX = (svgW - padL - padR) / (xMax - xMin);
                  const scaleY = (svgH - padT - padB) / (yMax - yMin);
                  const angle = Math.atan((seg.slope * scaleY) / Math.max(1e-6, scaleX));
                  const len = 8;
                  const dx = Math.cos(angle) * len;
                  const dy = -Math.sin(angle) * len;
                  return (
                    <line
                      key={idx}
                      x1={cx - dx}
                      y1={cy - dy}
                      x2={cx + dx}
                      y2={cy + dy}
                      stroke="currentColor"
                      className="text-slate-700"
                      strokeWidth="1.2"
                    />
                  );
                })}
                <path d={eulerPath} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 3" />
                <path d={rk4Path} fill="none" stroke="#34d399" strokeWidth="2.5" />
                <circle cx={toX(xStart)} cy={toY(Number(y0) || 0)} r="4.5" fill="#818cf8" />
                <text x={padL} y={svgH - 8} className="fill-slate-500 text-[10px] font-mono">{xMin.toFixed(2)}</text>
                <text x={svgW - padR} y={svgH - 8} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{xMax.toFixed(2)}</text>
                <text x={padL - 6} y={padT + 8} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{yMax.toFixed(2)}</text>
                <text x={padL - 6} y={svgH - padB} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{yMin.toFixed(2)}</text>
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
