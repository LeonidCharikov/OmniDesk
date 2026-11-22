import React, { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  ACID_BASE_PRESETS,
  AcidBasePreset,
  calculateSolutionPh,
  generateTitrationCurve,
} from '../../utils/scienceSuite.logic';

type PhTab = 'ph' | 'buffer' | 'titration';

export const PhTitrationTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<PhTab>('titration');

  // Solution pH
  const [solType, setSolType] = useState<AcidBasePreset['type']>('weak-acid');
  const [molarity, setMolarity] = useState(0.1);
  const [pKa, setPKa] = useState(4.76);

  // Henderson-Hasselbalch Buffer
  const [bufPKa, setBufPKa] = useState(4.76);
  const [acidConc, setAcidConc] = useState(0.1);
  const [baseConc, setBaseConc] = useState(0.15);

  // Titration curve
  const [titType, setTitType] = useState<'strong-acid' | 'weak-acid' | 'weak-base'>('weak-acid');
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [titPKa, setTitPKa] = useState(4.76);

  const phRes = useMemo(() => calculateSolutionPh(solType, molarity, pKa), [solType, molarity, pKa]);
  const bufPh = useMemo(() => bufPKa + Math.log10(Math.max(1e-9, baseConc) / Math.max(1e-9, acidConc)), [bufPKa, acidConc, baseConc]);
  const titration = useMemo(
    () => generateTitrationCurve(titType, cAnalyte, vAnalyte, cTitrant, titPKa),
    [titType, cAnalyte, vAnalyte, cTitrant, titPKa]
  );

  const W = 540;
  const H = 220;
  const maxVol = Math.max(10, titration.eqVolumeMl * 2);
  const sx = (v: number) => 36 + (v / maxVol) * (W - 56);
  const sy = (ph: number) => H - 24 - (ph / 14) * (H - 40);
  const curvePath = titration.points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${sx(pt.volumeMl).toFixed(1)} ${sy(pt.pH).toFixed(1)}`)
    .join(' ');

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            {t('tool_ph_titration_title', 'pH, Buffers & Titration Curve Simulator')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_ph_titration_desc', 'Calculate strong/weak acid-base pH, Henderson-Hasselbalch buffers, and live titration curves.')}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {(
            [
              { id: 'titration', label: t('ph_tab_titration', 'Titration Curve') },
              { id: 'ph', label: t('ph_tab_solution', 'Solution pH') },
              { id: 'buffer', label: t('ph_tab_buffer', 'Buffer Designer') },
            ] as const
          ).map(tb => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                tab === tb.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'titration' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <label className="text-xs text-slate-400">
              {t('ph_analyte_type', 'Analyte')}
              <select
                value={titType}
                onChange={e => setTitType(e.target.value as 'strong-acid' | 'weak-acid' | 'weak-base')}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="weak-acid">{t('ph_weak_acid', 'Weak Acid + Strong Base')}</option>
                <option value="strong-acid">{t('ph_strong_acid', 'Strong Acid + Strong Base')}</option>
                <option value="weak-base">{t('ph_weak_base', 'Weak Base + Strong Acid')}</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              C_analyte (M)
              <input type="number" step="0.01" min={0.001} value={cAnalyte} onChange={e => setCAnalyte(Math.max(0.001, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
            </label>
            <label className="text-xs text-slate-400">
              V_analyte (mL)
              <input type="number" step="1" min={1} value={vAnalyte} onChange={e => setVAnalyte(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
            </label>
            <label className="text-xs text-slate-400">
              C_titrant (M)
              <input type="number" step="0.01" min={0.001} value={cTitrant} onChange={e => setCTitrant(Math.max(0.001, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
            </label>
            <label className="text-xs text-slate-400">
              pKₐ (conjugate)
              <input type="number" step="0.05" value={titPKa} disabled={titType === 'strong-acid'} onChange={e => setTitPKa(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 disabled:opacity-40" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('ph_eq_vol', 'Equivalence Volume')}</span>
              <span className="text-xl font-bold font-mono text-emerald-300">{titration.eqVolumeMl.toFixed(2)} mL</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('ph_eq_ph', 'Equivalence pH')}</span>
              <span className="text-xl font-bold font-mono text-indigo-300">{titration.eqPh.toFixed(2)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('ph_half_eq', 'Half-Equivalence (pH = pKₐ)')}</span>
              <span className="text-xl font-bold font-mono text-amber-300">{titration.halfEqVolumeMl.toFixed(2)} mL</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-60">
              {[0, 4, 7, 10, 14].map(lvl => (
                <g key={lvl}>
                  <line x1={36} y1={sy(lvl)} x2={W - 20} y2={sy(lvl)} stroke="#334155" strokeDasharray={lvl === 7 ? '4 4' : '2 4'} />
                  <text x={8} y={sy(lvl) + 4} fill="#94a3b8" fontSize="10" fontFamily="monospace">{lvl}</text>
                </g>
              ))}
              <line x1={sx(titration.eqVolumeMl)} y1={16} x2={sx(titration.eqVolumeMl)} y2={H - 24} stroke="#10b981" strokeDasharray="4 4" />
              <path d={curvePath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
              <circle cx={sx(titration.eqVolumeMl)} cy={sy(titration.eqPh)} r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
              {titType !== 'strong-acid' && (
                <circle cx={sx(titration.halfEqVolumeMl)} cy={sy(titPKa)} r="4" fill="#f59e0b" />
              )}
              <text x={W / 2 - 40} y={H - 5} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                Titrant Added (0 – {maxVol.toFixed(0)} mL)
              </text>
            </svg>
          </div>
        </div>
      )}

      {tab === 'ph' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="flex flex-wrap gap-2">
            {ACID_BASE_PRESETS.map(p => (
              <button
                key={p.formula}
                type="button"
                onClick={() => {
                  setSolType(p.type);
                  if (p.pKa !== undefined) setPKa(p.pKa);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-xs font-mono text-slate-300"
              >
                {p.formula} {p.pKa !== undefined ? `(pKₐ ${p.pKa})` : ''}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-slate-400">
              {t('ph_species_type', 'Species Type')}
              <select value={solType} onChange={e => setSolType(e.target.value as AcidBasePreset['type'])} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white">
                <option value="strong-acid">Strong Acid</option>
                <option value="weak-acid">Weak Acid</option>
                <option value="strong-base">Strong Base</option>
                <option value="weak-base">Weak Base</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              {t('ph_molarity', 'Concentration (M)')}
              <input type="number" step="0.01" min={1e-7} value={molarity} onChange={e => setMolarity(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              pKₐ
              <input type="number" step="0.05" value={pKa} disabled={solType.startsWith('strong')} onChange={e => setPKa(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300 disabled:opacity-40" />
            </label>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">pH</span>
              <span className="text-2xl font-bold font-mono text-indigo-300">{phRes.pH.toFixed(3)}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">pOH</span>
              <span className="text-2xl font-bold font-mono text-emerald-300">{phRes.pOH.toFixed(3)}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">[H⁺] (M)</span>
              <span className="text-base font-bold font-mono text-white">{phRes.hConc.toExponential(3)}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">[OH⁻] (M)</span>
              <span className="text-base font-bold font-mono text-slate-200">{phRes.ohConc.toExponential(3)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'buffer' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-slate-400">
              pKₐ
              <input type="number" step="0.05" value={bufPKa} onChange={e => setBufPKa(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              [HA] Weak Acid (M)
              <input type="number" step="0.01" min={0.0001} value={acidConc} onChange={e => setAcidConc(Math.max(0.0001, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              [A⁻] Conjugate Base (M)
              <input type="number" step="0.01" min={0.0001} value={baseConc} onChange={e => setBaseConc(Math.max(0.0001, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Henderson-Hasselbalch pH</span>
              <span className="text-3xl font-bold font-mono text-emerald-300">{bufPh.toFixed(3)}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('ph_buffer_range', 'Effective Buffer Zone (pKₐ ± 1)')}</span>
              <span className="text-xl font-bold font-mono text-indigo-300">
                {(bufPKa - 1).toFixed(2)} – {(bufPKa + 1).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
