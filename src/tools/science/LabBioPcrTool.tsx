import React, { useMemo, useState } from 'react';
import { Dna } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  analyzePcrPrimer,
  calculateLigationInsertNg,
  convertDnaNgToNm,
  scanRestrictionSites,
} from '../../utils/scienceSuite.logic';

export const LabBioPcrTool: React.FC = () => {
  const { t } = useI18n();
  const [primer, setPrimer] = useState('ATGCGGAATTCGTACCTGGATCCAAGCTT');
  const [naMm, setNaMm] = useState(50);

  // DNA conc
  const [ngUl, setNgUl] = useState(50);
  const [lenBp, setLenBp] = useState(1200);
  const [ssMode, setSsMode] = useState(false);

  // Ligation
  const [vecNg, setVecNg] = useState(50);
  const [vecKb, setVecKb] = useState(4.5);
  const [insKb, setInsKb] = useState(1.2);
  const [ratio, setRatio] = useState(3);

  const primerStats = useMemo(() => analyzePcrPrimer(primer, naMm), [primer, naMm]);
  const enzymeHits = useMemo(() => scanRestrictionSites(primer), [primer]);
  const concNm = useMemo(() => convertDnaNgToNm(ngUl, lenBp, ssMode), [ngUl, lenBp, ssMode]);
  const insertNg = useMemo(() => calculateLigationInsertNg(vecNg, vecKb, insKb, ratio), [vecNg, vecKb, insKb, ratio]);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Dna className="w-5 h-5 text-emerald-400" />
          {t('tool_lab_bio_pcr_title', 'Microbiology & PCR / Lab Bio Calculator')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_lab_bio_pcr_desc', 'PCR primer Tm & annealing temp, restriction enzyme site scanner, ng/µL ↔ nM converter, and ligation ratio.')}
        </p>
      </div>

      {/* PCR Primer & Restriction Sites */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="sm:col-span-3 text-xs text-slate-400">
            {t('pcr_primer_seq', 'Primer / DNA Sequence (5′ → 3′)')}
            <input
              type="text"
              value={primer}
              onChange={e => setPrimer(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-emerald-300 uppercase"
            />
          </label>
          <label className="text-xs text-slate-400">
            [Na⁺] Salt (mM)
            <input type="number" min={1} value={naMm} onChange={e => setNaMm(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('pcr_length', 'Length / GC%')}</span>
            <span className="text-lg font-bold font-mono text-white">
              {primerStats.len} nt · {primerStats.gcPct.toFixed(1)}%
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">T_m (Salt-Adjusted)</span>
            <span className="text-xl font-bold font-mono text-indigo-300">{primerStats.tmSalt.toFixed(1)} °C</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">T_m (Wallace)</span>
            <span className="text-xl font-bold font-mono text-slate-200">{primerStats.tmWallace.toFixed(1)} °C</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('pcr_ta', 'Suggested T_a')}</span>
            <span className="text-xl font-bold font-mono text-emerald-300">{primerStats.recommendedTa.toFixed(1)} °C</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('pcr_gc_clamp', "3' GC Clamp (last 5)")}</span>
            <span className="text-xl font-bold font-mono text-amber-300">{primerStats.gcClamp} / 5</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            {t('pcr_enzymes', 'Detected Restriction Enzyme Cut Sites')}
          </span>
          {enzymeHits.length === 0 ? (
            <div className="text-xs text-slate-500">{t('pcr_no_sites', 'No standard restriction sites found in sequence.')}</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enzymeHits.map(hit => (
                <div key={hit.name} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
                  <span className="text-emerald-300 font-bold">{hit.name}</span>{' '}
                  <span className="text-slate-400">({hit.site})</span> →{' '}
                  <span className="text-indigo-300">pos {hit.positions.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nucleic Acid Concentration & Ligation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('pcr_conc_conv', 'DNA / RNA Mass ↔ Molarity (ng/µL → nM)')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              Concentration (ng/µL)
              <input type="number" min={0} step="any" value={ngUl} onChange={e => setNgUl(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Fragment Length (bp / nt)
              <input type="number" min={1} value={lenBp} onChange={e => setLenBp(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={ssMode} onChange={e => setSsMode(e.target.checked)} className="accent-indigo-500" />
            {t('pcr_ss_mode', 'Single-stranded (ssDNA / RNA, 330 Da/nt)')}
          </label>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('pcr_molarity_out', 'Molar Concentration')}</span>
            <span className="text-2xl font-bold font-mono text-indigo-300">{concNm.toFixed(2)} nM</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('pcr_ligation_title', 'Cloning Ligation Molar Ratio')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              Vector Mass (ng)
              <input type="number" min={1} value={vecNg} onChange={e => setVecNg(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Vector Size (kb)
              <input type="number" min={0.1} step="0.1" value={vecKb} onChange={e => setVecKb(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Insert Size (kb)
              <input type="number" min={0.05} step="0.1" value={insKb} onChange={e => setInsKb(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Insert : Vector Ratio
              <input type="number" min={0.5} step="0.5" value={ratio} onChange={e => setRatio(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('pcr_insert_mass', 'Required Insert Mass')}</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">{insertNg.toFixed(2)} ng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
