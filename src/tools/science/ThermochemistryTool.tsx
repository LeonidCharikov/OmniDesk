import React, { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  analyzeGibbs,
  solveIce1to1,
  THERMO_DATABASE,
} from '../../utils/scienceSuite.logic';

export const ThermochemistryTool: React.FC = () => {
  const { t } = useI18n();
  const [deltaH, setDeltaH] = useState(-92.22); // N2 + 3H2 -> 2NH3
  const [deltaS, setDeltaS] = useState(-198.75);
  const [tempK, setTempK] = useState(298.15);

  // ICE table for A + B <-> C + D
  const [initA, setInitA] = useState(1.0);
  const [initB, setInitB] = useState(1.0);
  const [initC, setInitC] = useState(0.0);
  const [initD, setInitD] = useState(0.0);
  const [eqK, setEqK] = useState(4.0);

  const [speciesSearch, setSpeciesSearch] = useState('');

  const gibbs = useMemo(() => analyzeGibbs(deltaH, deltaS, tempK), [deltaH, deltaS, tempK]);
  const ice = useMemo(() => solveIce1to1(initA, initB, initC, initD, eqK), [initA, initB, initC, initD, eqK]);

  const filteredThermo = useMemo(() => {
    const q = speciesSearch.trim().toLowerCase();
    if (!q) return THERMO_DATABASE;
    return THERMO_DATABASE.filter(
      s => s.formula.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [speciesSearch]);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          {t('tool_thermochemistry_eq_title', 'Thermochemistry & Chemical Equilibrium')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_thermochemistry_eq_desc', 'Gibbs free energy (ΔG = ΔH − TΔS), spontaneity threshold, ICE equilibrium solver, and ΔH°f/S° table.')}
        </p>
      </div>

      {/* Gibbs Free Energy */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          ΔG° = ΔH° − T·ΔS°
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            ΔH° (kJ/mol)
            <input type="number" step="any" value={deltaH} onChange={e => setDeltaH(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            ΔS° (J/(mol·K))
            <input type="number" step="any" value={deltaS} onChange={e => setDeltaS(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('thermo_temp_k', 'Temperature T (K)')} ({(tempK - 273.15).toFixed(1)} °C)
            <input type="number" min={1} step="any" value={tempK} onChange={e => setTempK(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300" />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">ΔG° (kJ/mol)</span>
            <span className={`text-2xl font-bold font-mono ${gibbs.spontaneous ? 'text-emerald-300' : 'text-rose-300'}`}>
              {gibbs.deltaG.toFixed(2)}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('thermo_spontaneity', 'Spontaneity')}</span>
            <span className={`text-sm font-bold ${gibbs.spontaneous ? 'text-emerald-300' : 'text-amber-300'}`}>
              {gibbs.spontaneous ? t('thermo_spontaneous', 'Spontaneous (Exergonic)') : t('thermo_nonspontaneous', 'Non-spontaneous')}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">Equilibrium K</span>
            <span className="text-base font-bold font-mono text-indigo-300">{gibbs.equilibriumK.toExponential(3)}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('thermo_crossover', 'Crossover T* (ΔG=0)')}</span>
            <span className="text-base font-bold font-mono text-amber-300">
              {gibbs.crossoverTempK ? `${gibbs.crossoverTempK.toFixed(1)} K` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* ICE Table */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('thermo_ice_title', 'Equilibrium ICE Table (A + B ⇌ C + D)')}
          </h3>
          <span className="text-xs font-mono text-indigo-300">
            Q = {Number.isFinite(ice.qInitial) ? ice.qInitial.toFixed(3) : '∞'} → {ice.direction.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: '[A]₀ (M)', val: initA, set: setInitA },
            { label: '[B]₀ (M)', val: initB, set: setInitB },
            { label: '[C]₀ (M)', val: initC, set: setInitC },
            { label: '[D]₀ (M)', val: initD, set: setInitD },
            { label: 'K_c', val: eqK, set: setEqK },
          ].map(inp => (
            <label key={inp.label} className="text-xs text-slate-400 font-mono">
              {inp.label}
              <input type="number" min={0} step="0.1" value={inp.val} onChange={e => inp.set(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Shift (x)</span>
            <span className="text-base font-bold font-mono text-amber-300">{ice.xShift >= 0 ? '+' : ''}{ice.xShift.toFixed(4)} M</span>
          </div>
          {[
            { label: '[A]_eq', val: ice.eqA },
            { label: '[B]_eq', val: ice.eqB },
            { label: '[C]_eq', val: ice.eqC },
            { label: '[D]_eq', val: ice.eqD },
          ].map(eq => (
            <div key={eq.label} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-mono">{eq.label}</span>
              <span className="text-base font-bold font-mono text-emerald-300">{eq.val.toFixed(4)} M</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reference Table */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('thermo_ref_table', 'Standard Thermodynamic Properties (298.15 K)')}
          </h3>
          <input
            type="text"
            value={speciesSearch}
            onChange={e => setSpeciesSearch(e.target.value)}
            placeholder={t('search_placeholder', 'Search...')}
            className="w-52 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
          />
        </div>
        <div className="overflow-x-auto max-h-64 rounded-xl bg-slate-950 border border-slate-800">
          <table className="w-full text-xs font-mono text-left">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="p-2.5">Formula</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">ΔH°f (kJ/mol)</th>
                <th className="p-2.5">S° (J/mol·K)</th>
                <th className="p-2.5">ΔG°f (kJ/mol)</th>
              </tr>
            </thead>
            <tbody>
              {filteredThermo.map(sp => (
                <tr key={sp.formula} className="border-b border-slate-800/40">
                  <td className="p-2.5 text-indigo-300 font-semibold">{sp.formula}</td>
                  <td className="p-2.5 text-slate-300 font-sans">{sp.name}</td>
                  <td className="p-2.5 text-slate-200">{sp.dHf}</td>
                  <td className="p-2.5 text-amber-300">{sp.S}</td>
                  <td className="p-2.5 text-emerald-300">{sp.dGf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
