import React, { useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  calculateElectrochemistry,
  calculateFaradayElectrolysis,
  HALF_CELLS,
} from '../../utils/scienceSuite.logic';

export const ElectrochemistryTool: React.FC = () => {
  const { t } = useI18n();
  const [cathodeId, setCathodeId] = useState('Cu');
  const [anodeId, setAnodeId] = useState('Zn');
  const [tempK, setTempK] = useState(298.15);
  const [reactionQ, setReactionQ] = useState(1.0);

  // Faraday Electrolysis
  const [currentA, setCurrentA] = useState(2.5);
  const [timeMin, setTimeMin] = useState(30);
  const [depositId, setDepositId] = useState('Cu');

  const cathode = useMemo(() => HALF_CELLS.find(h => h.id === cathodeId) || HALF_CELLS[0], [cathodeId]);
  const anode = useMemo(() => HALF_CELLS.find(h => h.id === anodeId) || HALF_CELLS[1], [anodeId]);
  const depositCell = useMemo(() => HALF_CELLS.find(h => h.id === depositId) || HALF_CELLS[8], [depositId]);

  const lcmElectrons = useMemo(() => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    return (cathode.electrons * anode.electrons) / gcd(cathode.electrons, anode.electrons);
  }, [cathode.electrons, anode.electrons]);

  const cell = useMemo(
    () => calculateElectrochemistry(cathode.e0, anode.e0, lcmElectrons, tempK, reactionQ),
    [cathode.e0, anode.e0, lcmElectrons, tempK, reactionQ]
  );

  const faraday = useMemo(
    () => calculateFaradayElectrolysis(currentA, timeMin * 60, depositCell.molarMass, depositCell.electrons),
    [currentA, timeMin, depositCell]
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          {t('tool_electrochemistry_redox_title', 'Electrochemistry & Redox Studio')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_electrochemistry_redox_desc', 'Standard reduction potentials (E°), galvanic cell voltage, Nernst equation, and Faraday electrolysis.')}
        </p>
      </div>

      {/* Galvanic Cell & Nernst */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('echem_cell_builder', 'Galvanic Cell & Nernst Equation')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-slate-400">
            {t('echem_cathode', 'Cathode (Reduction)')}
            <select value={cathodeId} onChange={e => setCathodeId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300">
              {HALF_CELLS.map(h => (
                <option key={h.id} value={h.id}>
                  {h.reaction} ({h.e0 >= 0 ? '+' : ''}{h.e0.toFixed(2)} V)
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('echem_anode', 'Anode (Oxidation)')}
            <select value={anodeId} onChange={e => setAnodeId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-300">
              {HALF_CELLS.map(h => (
                <option key={h.id} value={h.id}>
                  {h.reaction} ({h.e0 >= 0 ? '+' : ''}{h.e0.toFixed(2)} V)
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Temperature (K)
            <input type="number" min={1} step="any" value={tempK} onChange={e => setTempK(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Reaction Quotient (Q)
            <input type="number" min={1e-12} step="0.1" value={reactionQ} onChange={e => setReactionQ(Math.max(1e-12, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">E°_cell (Standard)</span>
            <span className="text-2xl font-bold font-mono text-indigo-300">{cell.e0Cell.toFixed(3)} V</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">E_cell (Nernst, n={lcmElectrons})</span>
            <span className={`text-2xl font-bold font-mono ${cell.spontaneous ? 'text-emerald-300' : 'text-rose-300'}`}>
              {cell.eCellNernst.toFixed(3)} V
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">ΔG = −nFE</span>
            <span className="text-xl font-bold font-mono text-amber-300">{cell.deltaGKj.toFixed(2)} kJ/mol</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('echem_mode', 'Cell Type')}</span>
            <span className={`text-sm font-bold ${cell.spontaneous ? 'text-emerald-300' : 'text-amber-300'}`}>
              {cell.spontaneous ? t('echem_galvanic', 'Spontaneous (Galvanic)') : t('echem_electrolytic', 'Non-spontaneous (Electrolytic)')}
            </span>
          </div>
        </div>
      </div>

      {/* Faraday Electrolysis */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('echem_faraday_title', "Faraday's Law of Electrolysis")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            {t('echem_species', 'Electroplated Species')}
            <select value={depositId} onChange={e => setDepositId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white">
              {HALF_CELLS.map(h => (
                <option key={h.id} value={h.id}>
                  {h.id} — {h.molarMass} g/mol (n={h.electrons})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('echem_current_a', 'Current I (A)')}
            <input type="number" min={0} step="0.1" value={currentA} onChange={e => setCurrentA(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            {t('echem_time_min', 'Duration (minutes)')}
            <input type="number" min={0} step="1" value={timeMin} onChange={e => setTimeMin(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('echem_charge', 'Total Charge (Q = It)')}</span>
            <span className="text-xl font-bold font-mono text-white">{faraday.chargeC.toFixed(1)} C</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('echem_moles_dep', 'Moles Deposited')}</span>
            <span className="text-xl font-bold font-mono text-indigo-300">{faraday.molesSubstance.toFixed(5)} mol</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('echem_mass_dep', 'Deposited Mass')}</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">{faraday.massGrams.toFixed(4)} g</span>
          </div>
        </div>
      </div>
    </div>
  );
};
