import React, { useMemo, useState } from 'react';
import { FlaskConical, Printer } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { printPlainText } from '../../services/printService';
import { generateSerialDilution } from '../../utils/scienceSuite.logic';

export const SolutionDilutionTool: React.FC = () => {
  const { t } = useI18n();
  // C1V1 = C2V2
  const [c1, setC1] = useState(10);
  const [c2, setC2] = useState(1);
  const [v2, setV2] = useState(50);
  const [concUnit, setConcUnit] = useState<'M' | 'mM' | 'µM' | 'mg/mL' | '%'>('mM');

  // Serial dilution
  const [serialFactor, setSerialFactor] = useState(2);
  const [tubeVol, setTubeVol] = useState(10);
  const [tubeCount, setTubeCount] = useState(6);

  // Unit conversions
  const [ppmVal, setPpmVal] = useState(250);
  const [molarMass, setMolarMass] = useState(58.44);

  const v1Needed = useMemo(() => (c1 > 0 ? (c2 * v2) / c1 : 0), [c1, c2, v2]);
  const solventNeeded = Math.max(0, v2 - v1Needed);
  const serialSteps = useMemo(
    () => generateSerialDilution(c1, serialFactor, tubeVol, tubeCount),
    [c1, serialFactor, tubeVol, tubeCount]
  );

  const mgPerL = ppmVal;
  const pctWv = ppmVal / 10000;
  const molarFromPpm = molarMass > 0 ? (ppmVal / 1000) / molarMass : 0;

  const handlePrintSheet = () => {
    const lines = [
      `Lab Solution & Dilution Bench Sheet`,
      `===================================`,
      `Stock Dilution (C1*V1 = C2*V2):`,
      `  Stock C1: ${c1} ${concUnit}`,
      `  Target C2: ${c2} ${concUnit}, Final V2: ${v2} mL`,
      `  -> Transfer Stock V1: ${v1Needed.toFixed(3)} mL`,
      `  -> Add Diluent/Solvent: ${solventNeeded.toFixed(3)} mL`,
      ``,
      `Serial Dilution (1:${serialFactor}, ${tubeVol} mL/tube):`,
      ...serialSteps.map(
        s =>
          `  Tube ${s.tube}: ${s.transferMl.toFixed(2)} mL prev + ${s.diluentMl.toFixed(2)} mL diluent -> ${s.concentration.toPrecision(4)} ${concUnit} (1:${s.cumulativeFactor.toFixed(1)})`
      ),
    ];
    void printPlainText(lines.join('\n'), { title: 'Solution Dilution Bench Sheet', monospace: true });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            {t('tool_solution_dilution_title', 'Solution Dilution & Serial Dilution Planner')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_solution_dilution_desc', 'C₁V₁ = C₂V₂ calculator, multi-step serial dilution tables, ppm/M/% converters, and printable lab sheets.')}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrintSheet}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          {t('dil_print_sheet', 'Print Bench Sheet')}
        </button>
      </div>

      {/* C1V1 = C2V2 */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">C₁V₁ = C₂V₂</h3>
          <select value={concUnit} onChange={e => setConcUnit(e.target.value as typeof concUnit)} className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-indigo-300">
            {(['M', 'mM', 'µM', 'mg/mL', '%'] as const).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            {t('dil_stock_c1', 'Stock Concentration C₁')} ({concUnit})
            <input type="number" min={0.0001} step="any" value={c1} onChange={e => setC1(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('dil_target_c2', 'Target Concentration C₂')} ({concUnit})
            <input type="number" min={0} step="any" value={c2} onChange={e => setC2(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('dil_final_v2', 'Final Volume V₂ (mL)')}
            <input type="number" min={0} step="any" value={v2} onChange={e => setV2(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('dil_stock_vol', 'Required Stock Volume (V₁)')}</span>
            <span className="text-2xl font-bold font-mono text-indigo-300">{v1Needed.toFixed(3)} mL</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('dil_solvent_vol', 'Diluent / Solvent to Add')}</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">{solventNeeded.toFixed(3)} mL</span>
          </div>
        </div>
      </div>

      {/* Serial Dilution */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('dil_serial_title', 'Serial Dilution Planner')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            {t('dil_factor', 'Step Dilution Factor (1:N)')}
            <input type="number" min={1.1} step="0.5" value={serialFactor} onChange={e => setSerialFactor(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('dil_tube_vol', 'Final Volume per Tube (mL)')}
            <input type="number" min={0.1} step="any" value={tubeVol} onChange={e => setTubeVol(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('dil_num_tubes', 'Number of Tubes')}
            <input type="number" min={1} max={16} value={tubeCount} onChange={e => setTubeCount(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl bg-slate-950 border border-slate-800">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-2.5">{t('dil_tube', 'Tube')}</th>
                <th className="p-2.5">{t('dil_transfer', 'Transfer (mL)')}</th>
                <th className="p-2.5">{t('dil_diluent', 'Diluent (mL)')}</th>
                <th className="p-2.5">{t('dil_cum_factor', 'Factor')}</th>
                <th className="p-2.5">{t('dil_conc', 'Concentration')}</th>
              </tr>
            </thead>
            <tbody>
              {serialSteps.map(s => (
                <tr key={s.tube} className="border-b border-slate-800/50">
                  <td className="p-2.5 text-slate-300">#{s.tube}</td>
                  <td className="p-2.5 text-indigo-300">{s.transferMl.toFixed(2)} mL</td>
                  <td className="p-2.5 text-slate-300">{s.diluentMl.toFixed(2)} mL</td>
                  <td className="p-2.5 text-amber-300">1 : {s.cumulativeFactor.toFixed(1)}</td>
                  <td className="p-2.5 text-emerald-300 font-semibold">
                    {s.concentration.toPrecision(4)} {concUnit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ppm / % w/v / Molarity */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('dil_ppm_conv', 'ppm / ppb / % w/v / Molarity Converter')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="text-xs text-slate-400">
            ppm (mg/L)
            <input type="number" step="any" value={ppmVal} onChange={e => setPpmVal(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('dil_molar_mass', 'Molar Mass (g/mol)')}
            <input type="number" step="any" min={0.1} value={molarMass} onChange={e => setMolarMass(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">ppb (µg/L)</span>
            <span className="text-base font-bold font-mono text-white">{(mgPerL * 1000).toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">% (w/v)</span>
            <span className="text-base font-bold font-mono text-indigo-300">{pctWv.toFixed(4)}%</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Molarity (M)</span>
            <span className="text-base font-bold font-mono text-emerald-300">{molarFromPpm.toExponential(3)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
