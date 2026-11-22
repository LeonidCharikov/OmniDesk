import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { solveLinearProgram2D, type LinearConstraint2D } from '../../utils/scienceMathExt.logic';

const INITIAL_CONSTRAINTS: LinearConstraint2D[] = [
  { a: 2, b: 1, op: '<=', rhs: 20 },
  { a: 1, b: 2, op: '<=', rhs: 22 },
  { a: 1, b: 0, op: '<=', rhs: 8 },
];

export const LinearProgrammingTool: React.FC = () => {
  const { t } = useI18n();

  const [c1, setC1] = useState('40');
  const [c2, setC2] = useState('30');
  const [maximize, setMaximize] = useState(true);
  const [constraints, setConstraints] = useState<LinearConstraint2D[]>(INITIAL_CONSTRAINTS);

  const result = useMemo(
    () => solveLinearProgram2D(Number(c1) || 0, Number(c2) || 0, maximize, constraints),
    [c1, c2, maximize, constraints]
  );

  const updateConstraint = (idx: number, patch: Partial<LinearConstraint2D>) => {
    setConstraints(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  // SVG feasible polygon projection
  const svgW = 460;
  const svgH = 300;
  const padL = 44;
  const padR = 20;
  const padT = 20;
  const padB = 34;

  const maxX = Math.max(5, ...result.vertices.map(v => v.x)) * 1.18;
  const maxY = Math.max(5, ...result.vertices.map(v => v.y)) * 1.18;

  const toX = (x: number) => padL + (x / maxX) * (svgW - padL - padR);
  const toY = (y: number) => svgH - padB - (y / maxY) * (svgH - padT - padB);

  const polygonPoints = result.vertices.map(v => `${toX(v.x).toFixed(1)},${toY(v.y).toFixed(1)}`).join(' ');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('lp_title', 'Linear Programming 2D Feasible Region & Optimizer')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'lp_subtitle',
                  'Maximize or minimize Z = c₁·x + c₂·y subject to linear inequalities (x ≥ 0, y ≥ 0) with corner-point evaluation.'
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMaximize(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                maximize ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('lp_maximize', 'Maximize Z')}
            </button>
            <button
              onClick={() => setMaximize(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                !maximize ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('lp_minimize', 'Minimize Z')}
            </button>
          </div>
        </div>

        {/* Objective Function */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-3 text-sm font-mono">
          <span className="text-slate-400">{maximize ? 'Max' : 'Min'} Z =</span>
          <input
            type="number"
            value={c1}
            onChange={e => setC1(e.target.value)}
            className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300"
          />
          <span className="text-slate-400">· x +</span>
          <input
            type="number"
            value={c2}
            onChange={e => setC2(e.target.value)}
            className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300"
          />
          <span className="text-slate-400">· y</span>
          <span className="text-xs text-slate-500 ml-auto">{t('lp_nonneg', 'Implicit: x ≥ 0, y ≥ 0')}</span>
        </div>

        {/* Constraints */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('lp_constraints', 'Linear Constraints')}
            </h3>
            <button
              onClick={() => setConstraints(prev => [...prev, { a: 1, b: 1, op: '<=', rhs: 15 }])}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('lp_add_constraint', 'Add Constraint')}
            </button>
          </div>

          <div className="space-y-2">
            {constraints.map((c, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                <input
                  type="number"
                  value={c.a}
                  onChange={e => updateConstraint(idx, { a: Number(e.target.value) || 0 })}
                  className="w-20 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                />
                <span className="text-slate-400">x +</span>
                <input
                  type="number"
                  value={c.b}
                  onChange={e => updateConstraint(idx, { b: Number(e.target.value) || 0 })}
                  className="w-20 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                />
                <span className="text-slate-400">y</span>
                <select
                  value={c.op}
                  onChange={e => updateConstraint(idx, { op: e.target.value as '<=' | '>=' })}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300"
                >
                  <option value="<=">≤</option>
                  <option value=">=">≥</option>
                </select>
                <input
                  type="number"
                  value={c.rhs}
                  onChange={e => updateConstraint(idx, { rhs: Number(e.target.value) || 0 })}
                  className="w-24 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                />
                <button
                  onClick={() => setConstraints(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}
                  disabled={constraints.length <= 1}
                  className="ml-auto p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Optimal Result + Feasible Region SVG */}
        {!result.feasible || !result.optimal ? (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
            {t('lp_infeasible', 'No feasible region found for the current constraints.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-white">{t('lp_feasible_plot', 'Feasible Region Polygon')}</div>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-64">
                <line x1={padL} y1={svgH - padB} x2={svgW - padR} y2={svgH - padB} stroke="currentColor" className="text-slate-700" />
                <line x1={padL} y1={padT} x2={padL} y2={svgH - padB} stroke="currentColor" className="text-slate-700" />
                {result.vertices.length >= 3 && (
                  <polygon points={polygonPoints} fill="#6366f1" fillOpacity="0.22" stroke="#818cf8" strokeWidth="2" />
                )}
                {result.vertices.map((v, idx) => {
                  const isOpt = result.optimal && Math.hypot(v.x - result.optimal.x, v.y - result.optimal.y) < 1e-6;
                  return (
                    <g key={idx}>
                      <circle cx={toX(v.x)} cy={toY(v.y)} r={isOpt ? 6 : 4} fill={isOpt ? '#34d399' : '#c7d2fe'} />
                      <text x={toX(v.x) + 7} y={toY(v.y) - 6} className="fill-slate-300 text-[10px] font-mono">
                        ({v.x.toFixed(1)}, {v.y.toFixed(1)})
                      </text>
                    </g>
                  );
                })}
                <text x={svgW - padR} y={svgH - 8} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                  x ({maxX.toFixed(1)})
                </text>
                <text x={padL - 6} y={padT + 8} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                  y ({maxY.toFixed(1)})
                </text>
              </svg>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                  {t('lp_optimal_solution', 'Optimal Corner Solution')}
                </div>
                <div className="text-2xl font-bold font-mono text-white">Z* = {result.optimal.z.toFixed(4)}</div>
                <div className="text-xs font-mono text-slate-300">
                  x* = {result.optimal.x.toFixed(4)} · y* = {result.optimal.y.toFixed(4)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-white">{t('lp_vertices_table', 'Feasible Vertices')}</div>
                <table className="w-full text-xs text-left font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-1.5">x</th>
                      <th className="py-1.5">y</th>
                      <th className="py-1.5">Z = c₁x + c₂y</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {result.vertices.map((v, i) => {
                      const isOpt = result.optimal && Math.hypot(v.x - result.optimal.x, v.y - result.optimal.y) < 1e-6;
                      return (
                        <tr key={i} className={isOpt ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                          <td className="py-1.5">{v.x.toFixed(3)}</td>
                          <td className="py-1.5">{v.y.toFixed(3)}</td>
                          <td className="py-1.5">{v.z.toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
