import React, { useState, useMemo } from 'react';
import { Thermometer, Flame, Wind, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  computeWallHeatTransfer,
  computeRadiationHeatW,
  computeCarnotOtto,
  computeVanDerWaals,
  computePsychrometrics,
  type WallLayer,
} from '../../utils/scienceMathExt.logic';

type ThermoTab = 'heat' | 'cycles' | 'psychro';

const VDW_PRESETS: Array<{ name: string; a: number; b: number }> = [
  { name: 'CO₂ (Carbon Dioxide)', a: 3.658, b: 0.04286 },
  { name: 'H₂O (Water Vapor)', a: 5.537, b: 0.03049 },
  { name: 'N₂ (Nitrogen)', a: 1.370, b: 0.0387 },
  { name: 'CH₄ (Methane)', a: 2.303, b: 0.0431 },
  { name: 'NH₃ (Ammonia)', a: 4.225, b: 0.0371 },
];

export const ThermoHeatLabTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<ThermoTab>('heat');

  // Tab 1: Multi-layer wall conduction + radiation
  const [layers, setLayers] = useState<WallLayer[]>([
    { name: 'Brick', thicknessM: 0.12, conductivityWmK: 0.72 },
    { name: 'Mineral Wool', thicknessM: 0.14, conductivityWmK: 0.038 },
    { name: 'Plasterboard', thicknessM: 0.015, conductivityWmK: 0.25 },
  ]);
  const [wallArea, setWallArea] = useState('20');
  const [deltaT, setDeltaT] = useState('25');

  const [emissivity, setEmissivity] = useState('0.9');
  const [radArea, setRadArea] = useState('1.5');
  const [objTempK, setObjTempK] = useState('373.15');
  const [surrTempK, setSurrTempK] = useState('293.15');

  // Tab 2: Carnot / Otto & Van der Waals
  const [tHotK, setTHotK] = useState('650');
  const [tColdK, setTColdK] = useState('300');
  const [compRatio, setCompRatio] = useState('10');
  const [gamma, setGamma] = useState('1.4');

  const [vdwMoles, setVdwMoles] = useState('2');
  const [vdwVolL, setVdwVolL] = useState('1.5');
  const [vdwTempK, setVdwTempK] = useState('300');
  const [vdwA, setVdwA] = useState('3.658');
  const [vdwB, setVdwB] = useState('0.04286');

  // Tab 3: Psychrometrics
  const [airTempC, setAirTempC] = useState('24');
  const [relHumidity, setRelHumidity] = useState('60');
  const [pressureKpa, setPressureKpa] = useState('101.325');

  const wallRes = useMemo(
    () => computeWallHeatTransfer(layers, Number(wallArea) || 0, Number(deltaT) || 0),
    [layers, wallArea, deltaT]
  );

  const radW = useMemo(
    () => computeRadiationHeatW(Number(emissivity) || 0, Number(radArea) || 0, Number(objTempK) || 0, Number(surrTempK) || 0),
    [emissivity, radArea, objTempK, surrTempK]
  );

  const cycleRes = useMemo(
    () => computeCarnotOtto(Number(tHotK) || 0, Number(tColdK) || 0, Number(compRatio) || 1, Number(gamma) || 1.4),
    [tHotK, tColdK, compRatio, gamma]
  );

  const vdwRes = useMemo(
    () => computeVanDerWaals(Number(vdwMoles) || 0, Number(vdwVolL) || 0, Number(vdwTempK) || 0, Number(vdwA) || 0, Number(vdwB) || 0),
    [vdwMoles, vdwVolL, vdwTempK, vdwA, vdwB]
  );

  const psyRes = useMemo(
    () => computePsychrometrics(Number(airTempC) || 0, Number(relHumidity) || 50, Number(pressureKpa) || 101.325),
    [airTempC, relHumidity, pressureKpa]
  );

  const updateLayer = (idx: number, patch: Partial<WallLayer>) => {
    setLayers(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('thermo_title', 'Thermodynamics, Heat Transfer & Psychrometrics Lab')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'thermo_subtitle',
                  'Multi-layer wall conduction (R/U-value), Stefan-Boltzmann radiation, Carnot/Otto cycles, Van der Waals real gas, and moist-air psychrometrics.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTab('heat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                tab === 'heat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              {t('thermo_tab_heat', 'Heat Transfer')}
            </button>
            <button
              onClick={() => setTab('cycles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                tab === 'cycles' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" />
              {t('thermo_tab_cycles', 'Cycles & Real Gas')}
            </button>
            <button
              onClick={() => setTab('psychro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                tab === 'psychro' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              {t('thermo_tab_psychro', 'Psychrometrics')}
            </button>
          </div>
        </div>

        {/* TAB 1: HEAT TRANSFER */}
        {tab === 'heat' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('thermo_wall_heading', 'Composite Wall Conduction (Fourier Law)')}
                </h3>
                <button
                  onClick={() => setLayers(prev => [...prev, { name: 'Air Gap', thicknessM: 0.05, conductivityWmK: 0.026 }])}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('thermo_add_layer', 'Add Layer')}
                </button>
              </div>

              <div className="space-y-2">
                {layers.map((layer, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="col-span-5 sm:col-span-5">
                      <label className="block text-[10px] text-slate-500">{t('thermo_material', 'Material')}</label>
                      <input
                        type="text"
                        value={layer.name}
                        onChange={e => updateLayer(idx, { name: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] text-slate-500">{t('thermo_thickness', 'Thickness (m)')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={layer.thicknessM}
                        onChange={e => updateLayer(idx, { thicknessM: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] text-slate-500">{t('thermo_k_val', 'k (W/m·K)')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={layer.conductivityWmK}
                        onChange={e => updateLayer(idx, { conductivityWmK: Math.max(0.001, Number(e.target.value) || 0.001) })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pt-3">
                      <button
                        onClick={() => setLayers(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}
                        disabled={layers.length <= 1}
                        className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_area', 'Area A (m²)')}</label>
                  <input type="number" value={wallArea} onChange={e => setWallArea(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_dt', 'ΔT (K or °C)')}</label>
                  <input type="number" value={deltaT} onChange={e => setDeltaT(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{t('thermo_total_r', 'Total R-Value')}</div>
                  <div className="text-sm font-bold font-mono text-indigo-300 mt-0.5">{wallRes.totalR.toFixed(3)} m²·K/W</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{t('thermo_u_val', 'U-Value')}</div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{wallRes.uValue.toFixed(3)} W/m²·K</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{t('thermo_heat_flux', 'Heat Loss Q̇')}</div>
                  <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">{wallRes.heatFluxW.toFixed(1)} W</div>
                </div>
              </div>
            </div>

            {/* Stefan-Boltzmann Radiation */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('thermo_rad_heading', 'Thermal Radiation (Stefan-Boltzmann Law)')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_emissivity', 'Emissivity ε (0–1)')}</label>
                  <input type="number" step="0.05" min="0" max="1" value={emissivity} onChange={e => setEmissivity(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_area', 'Area A (m²)')}</label>
                  <input type="number" step="0.1" value={radArea} onChange={e => setRadArea(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_t_obj', 'Object T (K)')}</label>
                  <input type="number" value={objTempK} onChange={e => setObjTempK(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_t_surr', 'Surroundings T (K)')}</label>
                  <input type="number" value={surrTempK} onChange={e => setSurrTempK(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{t('thermo_net_rad', 'Net Radiated Power')}</div>
                  <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">{radW.toFixed(2)} W</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CYCLES & REAL GAS */}
        {tab === 'cycles' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('thermo_cycles_heading', 'Carnot Heat Engine, Heat Pump COP & Otto Cycle')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_t_hot', 'Hot Reservoir T_H (K)')}</label>
                  <input type="number" value={tHotK} onChange={e => setTHotK(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_t_cold', 'Cold Reservoir T_C (K)')}</label>
                  <input type="number" value={tColdK} onChange={e => setTColdK(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_comp_ratio', 'Otto Compression Ratio (r)')}</label>
                  <input type="number" step="0.5" value={compRatio} onChange={e => setCompRatio(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_gamma', 'Heat Capacity Ratio γ')}</label>
                  <input type="number" step="0.05" value={gamma} onChange={e => setGamma(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">{t('thermo_carnot_eff', 'Carnot Max Efficiency η')}</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{cycleRes.carnotEffPct.toFixed(2)}%</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">{t('thermo_cop_hp', 'Carnot Heat Pump COP')}</div>
                  <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">{cycleRes.copHeatPump.toFixed(2)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">{t('thermo_otto_eff', 'Ideal Otto Efficiency')}</div>
                  <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">{cycleRes.ottoEffPct.toFixed(2)}%</div>
                </div>
              </div>
            </div>

            {/* Van der Waals Real Gas */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('thermo_vdw_heading', 'Van der Waals Real Gas vs. Ideal Gas')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {VDW_PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setVdwA(String(p.a));
                        setVdwB(String(p.b));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-300"
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_moles', 'Moles n')}</label>
                  <input type="number" step="0.5" value={vdwMoles} onChange={e => setVdwMoles(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_vol_l', 'Volume V (L)')}</label>
                  <input type="number" step="0.1" value={vdwVolL} onChange={e => setVdwVolL(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('thermo_temp_k', 'Temp T (K)')}</label>
                  <input type="number" value={vdwTempK} onChange={e => setVdwTempK(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">a (L²·atm/mol²)</label>
                  <input type="number" step="0.01" value={vdwA} onChange={e => setVdwA(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">b (L/mol)</label>
                  <input type="number" step="0.001" value={vdwB} onChange={e => setVdwB(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">{t('thermo_ideal_p', 'Ideal Gas Pressure')}</div>
                  <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                    {vdwRes.idealAtm.toFixed(3)} atm ({vdwRes.idealKpa.toFixed(1)} kPa)
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">{t('thermo_real_p', 'Van der Waals Real Pressure')}</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {Number.isFinite(vdwRes.realAtm)
                      ? `${vdwRes.realAtm.toFixed(3)} atm (${vdwRes.realKpa.toFixed(1)} kPa)`
                      : t('thermo_vol_too_small', 'Volume ≤ nb')}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-400">{t('thermo_deviation', 'Real vs. Ideal Deviation')}</div>
                  <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                    {vdwRes.deviationPct >= 0 ? '+' : ''}
                    {vdwRes.deviationPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PSYCHROMETRICS */}
        {tab === 'psychro' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('thermo_dry_bulb', 'Dry-Bulb Temp (°C)')}</label>
                <input type="number" step="0.5" value={airTempC} onChange={e => setAirTempC(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('thermo_rh', 'Relative Humidity (%)')}</label>
                <input type="number" min="1" max="100" value={relHumidity} onChange={e => setRelHumidity(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('thermo_atm_kpa', 'Atmospheric Pressure (kPa)')}</label>
                <input type="number" step="0.5" value={pressureKpa} onChange={e => setPressureKpa(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('thermo_dew_point', 'Dew Point')}</div>
                <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">{psyRes.dewPointC.toFixed(2)} °C</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('thermo_wet_bulb', 'Wet-Bulb Temp')}</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{psyRes.wetBulbC.toFixed(2)} °C</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('thermo_hum_ratio', 'Humidity Ratio')}</div>
                <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">{psyRes.humidityRatioGkg.toFixed(2)} g/kg</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('thermo_es', 'Sat. Vapor Press. e_s')}</div>
                <div className="text-base font-bold font-mono text-slate-200 mt-0.5">{psyRes.esKpa.toFixed(3)} kPa</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('thermo_ea', 'Actual Vapor Press. e_a')}</div>
                <div className="text-base font-bold font-mono text-slate-200 mt-0.5">{psyRes.eaKpa.toFixed(3)} kPa</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
