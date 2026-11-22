import React, { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  calculateDoppler,
  computeRcBodePoint,
  HarmonicTerm,
  synthesizeFourier,
} from '../../utils/scienceSuite.logic';

type SigTab = 'fourier' | 'bode' | 'doppler';

export const SignalWaveLabTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<SigTab>('fourier');

  // Fourier Harmonics
  const [harmonics, setHarmonics] = useState<HarmonicTerm[]>([
    { n: 1, amplitude: 1, phaseDeg: 0 },
    { n: 3, amplitude: 0.333, phaseDeg: 0 },
    { n: 5, amplitude: 0.2, phaseDeg: 0 },
    { n: 7, amplitude: 0.143, phaseDeg: 0 },
  ]);

  // RC Bode
  const [rOhm, setROhm] = useState(1000);
  const [cNf, setCNf] = useState(100);
  const [filterMode, setFilterMode] = useState<'lowpass' | 'highpass'>('lowpass');

  // Doppler
  const [fSrc, setFSrc] = useState(440);
  const [vWave, setVWave] = useState(343);
  const [vObs, setVObs] = useState(0);
  const [vSrc, setVSrc] = useState(25);

  const wavePts = useMemo(() => synthesizeFourier(harmonics, 200), [harmonics]);

  const fourierPath = useMemo(() => {
    const W = 540;
    const H = 190;
    const maxAbs = Math.max(1, ...wavePts.map(p => Math.abs(p.y)));
    return wavePts
      .map((p, i) => {
        const x = (p.t / (2 * Math.PI)) * W;
        const y = H / 2 - (p.y / (maxAbs * 1.15)) * (H / 2 - 12);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [wavePts]);

  const bodeData = useMemo(() => {
    const cF = cNf * 1e-9;
    const fc = 1 / (2 * Math.PI * Math.max(1e-12, rOhm * cF));
    const minLog = Math.log10(Math.max(1, fc / 100));
    const maxLog = Math.log10(fc * 100);
    const W = 540;
    const H = 190;
    const pts = Array.from({ length: 81 }, (_, i) => {
      const f = Math.pow(10, minLog + ((maxLog - minLog) * i) / 80);
      const b = computeRcBodePoint(f, rOhm, cF, filterMode);
      const x = (i / 80) * W;
      const yDb = 20 + ((-Math.max(-45, Math.min(3, b.magDb)) + 3) / 48) * (H - 35);
      return { x, yDb, f, ...b };
    });
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yDb.toFixed(1)}`).join(' ');
    return { fc, path, W, H };
  }, [rOhm, cNf, filterMode]);

  const doppler = useMemo(() => calculateDoppler(fSrc, vWave, vObs, vSrc), [fSrc, vWave, vObs, vSrc]);

  const applyWavePreset = (preset: 'square' | 'saw' | 'triangle') => {
    if (preset === 'square') {
      setHarmonics([
        { n: 1, amplitude: 1, phaseDeg: 0 },
        { n: 3, amplitude: 0.333, phaseDeg: 0 },
        { n: 5, amplitude: 0.2, phaseDeg: 0 },
        { n: 7, amplitude: 0.143, phaseDeg: 0 },
      ]);
    } else if (preset === 'saw') {
      setHarmonics([
        { n: 1, amplitude: 1, phaseDeg: 0 },
        { n: 2, amplitude: -0.5, phaseDeg: 0 },
        { n: 3, amplitude: 0.333, phaseDeg: 0 },
        { n: 4, amplitude: -0.25, phaseDeg: 0 },
      ]);
    } else {
      setHarmonics([
        { n: 1, amplitude: 1, phaseDeg: 0 },
        { n: 3, amplitude: -1 / 9, phaseDeg: 0 },
        { n: 5, amplitude: 1 / 25, phaseDeg: 0 },
        { n: 7, amplitude: -1 / 49, phaseDeg: 0 },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            {t('tool_signal_wave_lab_title', 'Signal & Wave Lab (Fourier / Bode / Doppler)')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_signal_wave_lab_desc', 'Synthesize Fourier harmonic waves, inspect RC filter Bode plots, and compute acoustic Doppler shift.')}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {(
            [
              { id: 'fourier', label: t('sig_tab_fourier', 'Fourier Synthesis') },
              { id: 'bode', label: t('sig_tab_bode', 'RC Bode Plot') },
              { id: 'doppler', label: t('sig_tab_doppler', 'Doppler Shift') },
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

      {tab === 'fourier' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyWavePreset('square')} className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-indigo-500/50">
              {t('sig_preset_square', 'Square Wave')}
            </button>
            <button type="button" onClick={() => applyWavePreset('saw')} className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-indigo-500/50">
              {t('sig_preset_saw', 'Sawtooth Wave')}
            </button>
            <button type="button" onClick={() => applyWavePreset('triangle')} className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-indigo-500/50">
              {t('sig_preset_tri', 'Triangle Wave')}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <svg viewBox="0 0 540 190" className="w-full h-48">
              <line x1={0} y1={95} x2={540} y2={95} stroke="#334155" strokeDasharray="4 4" />
              <path d={fourierPath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {harmonics.map((h, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-300 font-bold">H{h.n} ({h.n}f₀)</span>
                  <span className="text-slate-400">A = {h.amplitude.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={h.amplitude}
                  onChange={e =>
                    setHarmonics(prev =>
                      prev.map((item, i) => (i === idx ? { ...item, amplitude: Number(e.target.value) } : item))
                    )
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'bode' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-slate-400">
              Resistance R (Ω)
              <input type="number" min={1} step="any" value={rOhm} onChange={e => setROhm(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Capacitance C (nF)
              <input type="number" min={0.1} step="any" value={cNf} onChange={e => setCNf(Math.max(0.1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              {t('sig_filter_type', 'Filter Topology')}
              <select value={filterMode} onChange={e => setFilterMode(e.target.value as 'lowpass' | 'highpass')} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white">
                <option value="lowpass">RC Low-Pass</option>
                <option value="highpass">RC High-Pass</option>
              </select>
            </label>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">{t('sig_cutoff', 'Cutoff Frequency f_c (−3 dB)')}</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">{bodeData.fc.toFixed(2)} Hz</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <svg viewBox={`0 0 ${bodeData.W} ${bodeData.H}`} className="w-full h-48">
              <line x1={bodeData.W / 2} y1={10} x2={bodeData.W / 2} y2={bodeData.H - 10} stroke="#10b981" strokeDasharray="4 4" />
              <path d={bodeData.path} fill="none" stroke="#6366f1" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      )}

      {tab === 'doppler' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs text-slate-400">
              Source Freq f₀ (Hz)
              <input type="number" min={1} value={fSrc} onChange={e => setFSrc(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Wave Speed c (m/s)
              <input type="number" min={1} value={vWave} onChange={e => setVWave(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Observer v_o (+ toward)
              <input type="number" step="any" value={vObs} onChange={e => setVObs(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Source v_s (+ toward)
              <input type="number" step="any" value={vSrc} onChange={e => setVSrc(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('sig_obs_freq', 'Observed Frequency')}</span>
              <span className="text-2xl font-bold font-mono text-indigo-300">{doppler.fObserved.toFixed(2)} Hz</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('sig_shift', 'Frequency Shift Δf')}</span>
              <span className="text-2xl font-bold font-mono text-emerald-300">
                {doppler.shiftHz >= 0 ? '+' : ''}{doppler.shiftHz.toFixed(2)} Hz
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
