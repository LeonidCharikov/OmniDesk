import React, { useMemo, useState } from 'react';
import { Ruler } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  calculateBeamDeflection,
  calculateReynolds,
  CODATA_CONSTANTS,
  ENGINEERING_MATERIALS,
} from '../../utils/scienceSuite.logic';

export const MaterialsMechanicsTool: React.FC = () => {
  const { t } = useI18n();
  // Beam bending
  const [support, setSupport] = useState<'simply-supported' | 'cantilever'>('simply-supported');
  const [loadN, setLoadN] = useState(2500);
  const [lengthM, setLengthM] = useState(3);
  const [youngGpa, setYoungGpa] = useState(200);
  const [inertiaCm4, setInertiaCm4] = useState(450);

  // Fluid Reynolds
  const [density, setDensity] = useState(998); // water kg/m3
  const [velocity, setVelocity] = useState(1.2);
  const [diameterMm, setDiameterMm] = useState(50);
  const [viscosity, setViscosity] = useState(0.001002);

  // Search filter for CODATA
  const [search, setSearch] = useState('');

  const beam = useMemo(
    () => calculateBeamDeflection(support, loadN, lengthM, youngGpa, inertiaCm4),
    [support, loadN, lengthM, youngGpa, inertiaCm4]
  );

  const reynolds = useMemo(
    () => calculateReynolds(density, velocity, diameterMm / 1000, viscosity),
    [density, velocity, diameterMm, viscosity]
  );

  const filteredCodata = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CODATA_CONSTANTS;
    return CODATA_CONSTANTS.filter(
      c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Ruler className="w-5 h-5 text-cyan-400" />
          {t('tool_materials_mechanics_title', 'Materials, Structural Mechanics & CODATA')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_materials_mechanics_desc', 'Beam deflection & bending moment, pipe Reynolds flow regime, material properties, and CODATA constants.')}
        </p>
      </div>

      {/* Beam Deflection */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('mat_beam_title', 'Beam Bending Deflection & Max Moment')}
          </h3>
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setSupport('simply-supported')}
              className={`px-2.5 py-1 text-xs rounded-lg ${support === 'simply-supported' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              {t('mat_simply_sup', 'Simply Supported (Center Load)')}
            </button>
            <button
              type="button"
              onClick={() => setSupport('cantilever')}
              className={`px-2.5 py-1 text-xs rounded-lg ${support === 'cantilever' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              {t('mat_cantilever', 'Cantilever (End Load)')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-slate-400">
            Load F (N)
            <input type="number" step="100" value={loadN} onChange={e => setLoadN(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Span Length L (m)
            <input type="number" min={0.1} step="0.1" value={lengthM} onChange={e => setLengthM(Math.max(0.1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Young&apos;s Modulus E (GPa)
            <input type="number" min={0.1} step="1" value={youngGpa} onChange={e => setYoungGpa(Math.max(0.1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300" />
          </label>
          <label className="text-xs text-slate-400">
            Moment of Inertia I (cm⁴)
            <input type="number" min={1} step="10" value={inertiaCm4} onChange={e => setInertiaCm4(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ENGINEERING_MATERIALS.map(m => (
            <button
              key={m.name}
              type="button"
              onClick={() => setYoungGpa(m.youngGpa)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] font-mono text-slate-300"
            >
              {m.name} ({m.youngGpa} GPa)
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('mat_max_deflection', 'Max Deflection δ_max')}</span>
            <span className="text-2xl font-bold font-mono text-indigo-300">{beam.maxDeflectionMm.toFixed(3)} mm</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('mat_max_moment', 'Max Bending Moment M_max')}</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">{beam.maxMomentNm.toFixed(1)} N·m</span>
          </div>
        </div>
      </div>

      {/* Reynolds Number */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('mat_reynolds_title', 'Fluid Pipe Flow Reynolds Number (Re = ρvD / μ)')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-slate-400">
            Density ρ (kg/m³)
            <input type="number" min={0.1} step="any" value={density} onChange={e => setDensity(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Flow Velocity v (m/s)
            <input type="number" min={0} step="0.1" value={velocity} onChange={e => setVelocity(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Pipe Diameter D (mm)
            <input type="number" min={0.1} step="1" value={diameterMm} onChange={e => setDiameterMm(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Viscosity μ (Pa·s)
            <input type="number" min={1e-6} step="0.0001" value={viscosity} onChange={e => setViscosity(Math.max(1e-6, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white" />
          </label>
        </div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 block">Reynolds Number (Re)</span>
            <span className="text-2xl font-bold font-mono text-amber-300">{Math.round(reynolds.re).toLocaleString()}</span>
          </div>
          <span className="text-sm font-mono uppercase font-bold text-indigo-300">
            {t('mat_regime', 'Regime')}: {reynolds.regime}
          </span>
        </div>
      </div>

      {/* CODATA Physical Constants */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('mat_codata_title', 'CODATA Physical Constants Reference')}
          </h3>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search_placeholder', 'Search...')}
            className="w-52 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
          />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-950 border border-slate-800">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-2.5">Symbol</th>
                <th className="p-2.5">Constant</th>
                <th className="p-2.5">Value</th>
                <th className="p-2.5">Unit</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodata.map(c => (
                <tr key={c.symbol} className="border-b border-slate-800/40">
                  <td className="p-2.5 text-indigo-300 font-bold">{c.symbol}</td>
                  <td className="p-2.5 text-slate-200 font-sans">{c.name}</td>
                  <td className="p-2.5 text-emerald-300">{c.value}</td>
                  <td className="p-2.5 text-slate-400">{c.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
