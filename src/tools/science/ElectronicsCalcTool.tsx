import React, { useState, useMemo } from 'react';
import { Zap } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type ElecTab = 'ohm' | 'network' | 'divider' | 'rc';

export const ElectronicsCalcTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<ElecTab>('ohm');

  // Ohm's law: pick 2 knowns
  const [ohmPair, setOhmPair] = useState<'vr' | 'vi' | 'ir' | 'pr'>('vr');
  const [voltage, setVoltage] = useState(12);
  const [current, setCurrent] = useState(0.5);
  const [resistance, setResistance] = useState(24);
  const [power, setPower] = useState(6);

  // Series/Parallel
  const [resList, setResList] = useState('100, 220, 470');

  // Voltage divider & LED
  const [vin, setVin] = useState(5);
  const [r1, setR1] = useState(1000);
  const [r2, setR2] = useState(2000);
  const [vLed, setVLed] = useState(2.1);
  const [iLedMa, setILedMa] = useState(15);

  // RC circuit
  const [rcR, setRcR] = useState(10000);
  const [rcCuf, setRcCuf] = useState(10);

  const ohmResult = useMemo(() => {
    let v = voltage;
    let i = current;
    let r = resistance;
    let p = power;
    if (ohmPair === 'vr' && r > 0) {
      i = v / r;
      p = v * i;
    } else if (ohmPair === 'vi' && i !== 0) {
      r = v / i;
      p = v * i;
    } else if (ohmPair === 'ir') {
      v = i * r;
      p = v * i;
    } else if (ohmPair === 'pr' && r > 0 && p >= 0) {
      v = Math.sqrt(p * r);
      i = v / r;
    }
    return { v, i, r, p };
  }, [ohmPair, voltage, current, resistance, power]);

  const networkResult = useMemo(() => {
    const vals = resList
      .split(/[\s,;]+/)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0);
    if (!vals.length) return null;
    const series = vals.reduce((a, b) => a + b, 0);
    const parallel = 1 / vals.reduce((a, b) => a + 1 / b, 0);
    return { count: vals.length, series, parallel };
  }, [resList]);

  const dividerVout = r1 + r2 > 0 ? vin * (r2 / (r1 + r2)) : 0;
  const ledResistor = iLedMa > 0 ? Math.max(0, (vin - vLed) / (iLedMa / 1000)) : 0;

  const tauSec = rcR * (rcCuf * 1e-6);
  const fcHz = tauSec > 0 ? 1 / (2 * Math.PI * tauSec) : 0;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            {t('tool_electronics_calc_title', 'Electronics & Circuit Calculator')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_electronics_calc_desc', 'Ohm\'s law, series/parallel networks, voltage dividers, LED resistors, and RC filter cutoff frequency.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { id: 'ohm' as const, label: t('elec_tab_ohm', 'Ohm\'s Law') },
            { id: 'network' as const, label: t('elec_tab_network', 'Series / Parallel') },
            { id: 'divider' as const, label: t('elec_tab_divider', 'Divider & LED') },
            { id: 'rc' as const, label: t('elec_tab_rc', 'RC Filter') },
          ].map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                tab === tb.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'ohm' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'vr' as const, label: t('elec_know_vr', 'Know V & R') },
              { id: 'vi' as const, label: t('elec_know_vi', 'Know V & I') },
              { id: 'ir' as const, label: t('elec_know_ir', 'Know I & R') },
              { id: 'pr' as const, label: t('elec_know_pr', 'Know P & R') },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setOhmPair(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  ohmPair === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 block">
              {t('elec_voltage_v', 'Voltage V (V)')}
              <input
                type="number"
                step="any"
                disabled={ohmPair === 'ir' || ohmPair === 'pr'}
                value={ohmPair === 'ir' || ohmPair === 'pr' ? Number(ohmResult.v.toFixed(4)) : voltage}
                onChange={e => setVoltage(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-sm text-indigo-300 disabled:opacity-70"
              />
            </label>
            <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 block">
              {t('elec_current_a', 'Current I (A)')}
              <input
                type="number"
                step="any"
                disabled={ohmPair === 'vr' || ohmPair === 'pr'}
                value={ohmPair === 'vr' || ohmPair === 'pr' ? Number(ohmResult.i.toFixed(4)) : current}
                onChange={e => setCurrent(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-sm text-emerald-300 disabled:opacity-70"
              />
            </label>
            <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 block">
              {t('elec_resistance_ohm', 'Resistance R (Ω)')}
              <input
                type="number"
                step="any"
                disabled={ohmPair === 'vi'}
                value={ohmPair === 'vi' ? Number(ohmResult.r.toFixed(4)) : resistance}
                onChange={e => setResistance(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-sm text-amber-300 disabled:opacity-70"
              />
            </label>
            <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 block">
              {t('elec_power_w', 'Power P (W)')}
              <input
                type="number"
                step="any"
                disabled={ohmPair !== 'pr'}
                value={ohmPair !== 'pr' ? Number(ohmResult.p.toFixed(4)) : power}
                onChange={e => setPower(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-sm text-rose-300 disabled:opacity-70"
              />
            </label>
          </div>
        </div>
      )}

      {tab === 'network' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <label className="text-xs text-slate-400 block">
            {t('elec_resistors_list', 'Resistor Values (Ω, comma or space separated)')}
            <input
              type="text"
              value={resList}
              onChange={e => setResList(e.target.value)}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-200"
            />
          </label>
          {networkResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('elec_series_total', 'Series Total (R_s)')}</span>
                <span className="text-2xl font-bold font-mono text-indigo-300 mt-1 block">{networkResult.series.toFixed(3)} Ω</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('elec_parallel_total', 'Parallel Total (R_p)')}</span>
                <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">{networkResult.parallel.toFixed(3)} Ω</span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'divider' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('elec_voltage_divider', 'Voltage Divider')}</h3>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-slate-400">
                Vin (V)
                <input type="number" step="any" value={vin} onChange={e => setVin(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200" />
              </label>
              <label className="text-xs text-slate-400">
                R1 (Ω)
                <input type="number" step="any" value={r1} onChange={e => setR1(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200" />
              </label>
              <label className="text-xs text-slate-400">
                R2 (Ω)
                <input type="number" step="any" value={r2} onChange={e => setR2(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200" />
              </label>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Vout</span>
              <span className="text-xl font-bold font-mono text-indigo-300">{dividerVout.toFixed(4)} V</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('elec_led_resistor', 'LED Series Resistor')}</h3>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-slate-400">
                Vs (V)
                <input type="number" step="any" value={vin} onChange={e => setVin(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200" />
              </label>
              <label className="text-xs text-slate-400">
                Vf LED (V)
                <input type="number" step="0.1" value={vLed} onChange={e => setVLed(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200" />
              </label>
              <label className="text-xs text-slate-400">
                If (mA)
                <input type="number" step="any" value={iLedMa} onChange={e => setILedMa(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200" />
              </label>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('elec_recommended_r', 'Minimum Series Resistance')}</span>
              <span className="text-xl font-bold font-mono text-emerald-300">{ledResistor.toFixed(1)} Ω</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'rc' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              {t('elec_resistance_ohm', 'Resistance R (Ω)')}
              <input type="number" step="any" value={rcR} onChange={e => setRcR(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('elec_capacitance_uf', 'Capacitance C (µF)')}
              <input type="number" step="any" value={rcCuf} onChange={e => setRcCuf(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-200" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('elec_time_constant', 'Time Constant τ = R × C')}</span>
              <span className="text-2xl font-bold font-mono text-indigo-300 mt-1 block">{(tauSec * 1000).toFixed(3)} ms</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('elec_cutoff_freq', 'Cutoff Frequency fc (-3 dB)')}</span>
              <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">{fcHz.toFixed(3)} Hz</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
