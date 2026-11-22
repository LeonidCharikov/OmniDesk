import React, { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  calculateDecay,
  calculateElapsedTimeFromFraction,
  ISOTOPE_PRESETS,
} from '../../utils/scienceSuite.logic';

export const IsotopeDecayTool: React.FC = () => {
  const { t } = useI18n();
  const [selectedSymbol, setSelectedSymbol] = useState('¹⁴C');
  const [halfLife, setHalfLife] = useState(5730);
  const [unit, setUnit] = useState('yr');
  const [n0, setN0] = useState(100);
  const [elapsed, setElapsed] = useState(11460);
  const [datingPct, setDatingPct] = useState(25);

  const decay = useMemo(() => calculateDecay(n0, halfLife, elapsed), [n0, halfLife, elapsed]);
  const estimatedAge = useMemo(
    () => calculateElapsedTimeFromFraction(datingPct, halfLife),
    [datingPct, halfLife]
  );

  // SVG exponential decay curve across 5 half-lives
  const W = 540;
  const H = 190;
  const maxT = Math.max(halfLife * 5, elapsed * 1.15);
  const sx = (time: number) => 36 + (time / Math.max(1e-9, maxT)) * (W - 56);
  const sy = (frac: number) => H - 22 - frac * (H - 38);
  const curvePath = Array.from({ length: 81 }, (_, i) => {
    const time = (maxT * i) / 80;
    const frac = Math.exp((-Math.LN2 / Math.max(1e-12, halfLife)) * time);
    return `${i === 0 ? 'M' : 'L'} ${sx(time).toFixed(1)} ${sy(frac).toFixed(1)}`;
  }).join(' ');

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          {t('tool_isotope_decay_title', 'Isotope & Radioactive Decay Calculator')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_isotope_decay_desc', 'Half-life, decay constant λ, remaining sample mass/activity, radiocarbon dating, and decay curve.')}
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <div className="flex flex-wrap gap-2">
          {ISOTOPE_PRESETS.map(iso => (
            <button
              key={iso.symbol}
              type="button"
              onClick={() => {
                setSelectedSymbol(iso.symbol);
                setHalfLife(iso.halfLifeValue);
                setUnit(iso.unit);
                setElapsed(iso.halfLifeValue * 2);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono ${
                selectedSymbol === iso.symbol
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-indigo-500/50'
              }`}
            >
              {iso.symbol} ({iso.mode})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            {t('iso_half_life', 'Half-Life t½')} ({unit})
            <input type="number" min={1e-9} step="any" value={halfLife} onChange={e => setHalfLife(Math.max(1e-9, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('iso_initial_n0', 'Initial Quantity N₀ (g / Bq)')}
            <input type="number" min={0} step="any" value={n0} onChange={e => setN0(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('iso_elapsed_t', 'Elapsed Time t')} ({unit})
            <input type="number" min={0} step="any" value={elapsed} onChange={e => setElapsed(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300" />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('iso_remaining', 'Remaining N(t)')}</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">{decay.remaining.toPrecision(5)}</span>
            <span className="text-[11px] font-mono text-slate-400 block">{decay.fractionPct.toFixed(2)}%</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('iso_half_lives', 'Half-Lives Elapsed')}</span>
            <span className="text-2xl font-bold font-mono text-indigo-300">{decay.halfLivesElapsed.toFixed(3)}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">Decay Constant λ</span>
            <span className="text-base font-bold font-mono text-amber-300">{decay.lambda.toExponential(3)} /{unit}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('iso_mean_life', 'Mean Lifetime τ')}</span>
            <span className="text-base font-bold font-mono text-white">{decay.meanLifetime.toPrecision(5)} {unit}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
            {[0, 0.25, 0.5, 1].map(f => (
              <g key={f}>
                <line x1={36} y1={sy(f)} x2={W - 20} y2={sy(f)} stroke="#334155" strokeDasharray="3 4" />
                <text x={4} y={sy(f) + 4} fill="#94a3b8" fontSize="10" fontFamily="monospace">{Math.round(f * 100)}%</text>
              </g>
            ))}
            <path d={curvePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx={sx(elapsed)} cy={sy(decay.fractionPct / 100)} r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Radiometric Dating */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <label className="text-xs text-slate-400 flex items-center gap-3">
            <span>{t('iso_dating_pct', 'Radiometric Dating — Measured Remaining %')}:</span>
            <input type="number" min={0.01} max={100} step="0.5" value={datingPct} onChange={e => setDatingPct(Math.max(0.01, Math.min(100, Number(e.target.value))))} className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-white" />
          </label>
          <div className="text-sm font-mono">
            <span className="text-slate-400">{t('iso_est_age', 'Estimated Age')}: </span>
            <span className="font-bold text-indigo-300">{estimatedAge.toPrecision(5)} {unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
