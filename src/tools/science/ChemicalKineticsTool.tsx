import React, { useState, useMemo } from 'react';
import { Activity, Flame } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { computeKinetics, computeArrhenius, type ReactionOrder } from '../../utils/scienceMathExt.logic';

export const ChemicalKineticsTool: React.FC = () => {
  const { t } = useI18n();

  const [order, setOrder] = useState<ReactionOrder>(1);
  const [c0, setC0] = useState('1.0');
  const [kRate, setKRate] = useState('0.05');
  const [timeS, setTimeS] = useState('25');

  // Arrhenius inputs
  const [preExpA, setPreExpA] = useState('1e11');
  const [eaKj, setEaKj] = useState('75');
  const [t1K, setT1K] = useState('298.15');
  const [t2K, setT2K] = useState('318.15');

  const kin = useMemo(
    () => computeKinetics(order, Number(c0) || 1, Number(kRate) || 0.01, Number(timeS) || 0),
    [order, c0, kRate, timeS]
  );

  const arrh = useMemo(
    () => computeArrhenius(Number(preExpA) || 1, Number(eaKj) || 0, Number(t1K) || 298, Number(t2K) || 308),
    [preExpA, eaKj, t1K, t2K]
  );

  // Concentration decay SVG
  const svgW = 620;
  const svgH = 200;
  const padL = 50;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const maxT = Math.max(1e-6, kin.curve[kin.curve.length - 1]?.t ?? 1);
  const maxC = Math.max(1e-6, Number(c0) || 1);

  const toX = (tv: number) => padL + (tv / maxT) * (svgW - padL - padR);
  const toY = (cv: number) => svgH - padB - (cv / maxC) * (svgH - padT - padB);

  const curvePath = kin.curve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.t).toFixed(1)} ${toY(pt.c).toFixed(1)}`)
    .join(' ');

  const kUnit = order === 0 ? 'M·s⁻¹' : order === 1 ? 's⁻¹' : 'M⁻¹·s⁻¹';
  const rateLawFormula =
    order === 0
      ? '[A](t) = [A]₀ − k·t'
      : order === 1
      ? '[A](t) = [A]₀ · e^(−k·t)'
      : '1/[A](t) = 1/[A]₀ + k·t';

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('kin_title', 'Chemical Kinetics & Arrhenius Studio')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'kin_subtitle',
                  'Analyze 0th, 1st, and 2nd-order reaction decay curves, half-life (t½), and Arrhenius activation energy scaling.'
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {([0, 1, 2] as ReactionOrder[]).map(ord => (
              <button
                key={ord}
                onClick={() => setOrder(ord)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  order === ord ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {ord === 0
                  ? t('kin_order_0', '0th Order')
                  : ord === 1
                  ? t('kin_order_1', '1st Order')
                  : t('kin_order_2', '2nd Order')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('kin_c0', 'Initial Concentration [A]₀ (M)')}</label>
            <input type="number" step="0.1" min="0.0001" value={c0} onChange={e => setC0(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('kin_k', 'Rate Constant k')} ({kUnit})
            </label>
            <input type="number" step="0.005" min="0.000001" value={kRate} onChange={e => setKRate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('kin_time', 'Elapsed Time t (s)')}</label>
            <input type="number" step="1" min="0" value={timeS} onChange={e => setTimeS(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('kin_ct', 'Concentration [A](t)')}</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{kin.ct.toFixed(4)} M</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('kin_halflife', 'Half-Life t½')}</div>
            <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">{kin.halfLife.toFixed(3)} s</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('kin_reacted', 'Percent Reacted')}</div>
            <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">{kin.percentReacted.toFixed(2)}%</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('kin_law', 'Integrated Law')}</div>
            <div className="text-xs font-bold font-mono text-slate-200 mt-1.5">{rateLawFormula}</div>
          </div>
        </div>

        {/* Decay SVG */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">{t('kin_curve_title', 'Concentration Decay Curve [A](t)')}</span>
            <span className="font-mono text-slate-400">t½ = {kin.halfLife.toFixed(2)} s</span>
          </div>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48">
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
              const y = toY(maxC * f);
              return (
                <g key={f}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="currentColor" className="text-slate-800" strokeDasharray="3 3" />
                  <text x={padL - 6} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                    {(maxC * f).toFixed(2)}
                  </text>
                </g>
              );
            })}
            <path d={curvePath} fill="none" stroke="#a78bfa" strokeWidth="2.5" />
            {kin.halfLife <= maxT && (
              <>
                <line x1={toX(kin.halfLife)} y1={padT} x2={toX(kin.halfLife)} y2={svgH - padB} stroke="#fbbf24" strokeDasharray="4 3" strokeWidth="1.2" />
                <circle cx={toX(kin.halfLife)} cy={toY(maxC / 2)} r="4" fill="#fbbf24" />
              </>
            )}
            <circle cx={toX(Math.min(maxT, Number(timeS) || 0))} cy={toY(kin.ct)} r="5" fill="#34d399" />
            <text x={svgW / 2} y={svgH - 6} textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
              t (s): 0 – {maxT.toFixed(1)}
            </text>
          </svg>
        </div>
      </div>

      {/* Arrhenius Equation Panel */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">{t('kin_arrh_title', 'Arrhenius Equation & Temperature Rate Scaling')}</h3>
            <p className="text-xs text-slate-400">
              {t('kin_arrh_desc', 'k = A · exp(−Ea / RT). Compare rate constants across two temperatures.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('kin_pre_exp', 'Pre-exponential A')}</label>
            <input type="text" value={preExpA} onChange={e => setPreExpA(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('kin_ea', 'Activation Energy Ea (kJ/mol)')}</label>
            <input type="number" step="1" value={eaKj} onChange={e => setEaKj(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('kin_t1', 'Temperature T₁ (K)')}</label>
            <input type="number" step="1" value={t1K} onChange={e => setT1K(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('kin_t2', 'Temperature T₂ (K)')}</label>
            <input type="number" step="1" value={t2K} onChange={e => setT2K(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">k(T₁)</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">{arrh.k1.toExponential(3)}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">k(T₂)</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{arrh.k2.toExponential(3)}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('kin_rate_ratio', 'Speedup Ratio k₂ / k₁')}</div>
            <div className="text-base font-bold font-mono text-amber-300 mt-0.5">× {arrh.ratio.toFixed(3)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
