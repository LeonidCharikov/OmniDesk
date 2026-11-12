import React, { useState, useMemo } from 'react';
import { Atom } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type PhysTab = 'projectile' | 'gas' | 'energy' | 'wave';

export const PhysicsToolkitTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<PhysTab>('projectile');

  // Projectile
  const [v0, setV0] = useState(25);
  const [angleDeg, setAngleDeg] = useState(45);
  const [h0, setH0] = useState(0);
  const [gravity, setGravity] = useState(9.80665);

  // Ideal Gas PV = nRT
  const [gasSolve, setGasSolve] = useState<'P' | 'V' | 'n' | 'T'>('P');
  const [pressKpa, setPressKpa] = useState(101.325);
  const [volL, setVolL] = useState(22.414);
  const [molesN, setMolesN] = useState(1);
  const [tempK, setTempK] = useState(273.15);

  // Energy & Momentum
  const [massKg, setMassKg] = useState(5);
  const [velMs, setVelMs] = useState(10);
  const [heightM, setHeightM] = useState(12);

  // Wave & dB
  const [freqHz, setFreqHz] = useState(440);
  const [speedMs, setSpeedMs] = useState(343);
  const [powerRatio, setPowerRatio] = useState(10);

  const proj = useMemo(() => {
    const rad = (angleDeg * Math.PI) / 180;
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad);
    const g = Math.max(0.01, gravity);
    const disc = Math.max(0, vy * vy + 2 * g * h0);
    const flightTime = (vy + Math.sqrt(disc)) / g;
    const range = vx * flightTime;
    const maxHeight = h0 + (vy > 0 ? (vy * vy) / (2 * g) : 0);
    return { flightTime, range, maxHeight };
  }, [v0, angleDeg, h0, gravity]);

  const gasOut = useMemo(() => {
    const R = 8.314462618; // kPa·L / (mol·K)
    if (gasSolve === 'P' && volL > 0) return (molesN * R * tempK) / volL;
    if (gasSolve === 'V' && pressKpa > 0) return (molesN * R * tempK) / pressKpa;
    if (gasSolve === 'n' && tempK > 0) return (pressKpa * volL) / (R * tempK);
    if (gasSolve === 'T' && molesN > 0) return (pressKpa * volL) / (molesN * R);
    return 0;
  }, [gasSolve, pressKpa, volL, molesN, tempK]);

  const ke = 0.5 * massKg * velMs * velMs;
  const pe = massKg * 9.80665 * heightM;
  const momentum = massKg * velMs;

  const wavelength = freqHz > 0 ? speedMs / freqHz : 0;
  const periodMs = freqHz > 0 ? 1000 / freqHz : 0;
  const dbPower = powerRatio > 0 ? 10 * Math.log10(powerRatio) : 0;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Atom className="w-5 h-5 text-indigo-400" />
            {t('tool_physics_toolkit_title', 'Physics & Mechanics Toolkit')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_physics_toolkit_desc', 'Projectile kinematics, Ideal Gas Law (PV = nRT), kinetic/potential energy, and wave/decibel solvers.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { id: 'projectile' as const, label: t('phys_tab_projectile', 'Projectile') },
            { id: 'gas' as const, label: 'PV = nRT' },
            { id: 'energy' as const, label: t('phys_tab_energy', 'Energy') },
            { id: 'wave' as const, label: t('phys_tab_wave', 'Waves & dB') },
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

      {tab === 'projectile' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs text-slate-400">
              {t('phys_v0', 'Initial Velocity (m/s)')}
              <input type="number" step="any" value={v0} onChange={e => setV0(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('phys_angle', 'Launch Angle (°)')}
              <input type="number" step="any" value={angleDeg} onChange={e => setAngleDeg(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('phys_h0', 'Initial Height (m)')}
              <input type="number" step="any" value={h0} onChange={e => setH0(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('phys_gravity', 'Gravity g (m/s²)')}
              <input type="number" step="any" value={gravity} onChange={e => setGravity(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_range', 'Horizontal Range')}</span>
              <span className="text-2xl font-bold font-mono text-indigo-300">{proj.range.toFixed(2)} m</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_max_height', 'Max Height')}</span>
              <span className="text-2xl font-bold font-mono text-emerald-300">{proj.maxHeight.toFixed(2)} m</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_flight_time', 'Time of Flight')}</span>
              <span className="text-2xl font-bold font-mono text-amber-300">{proj.flightTime.toFixed(2)} s</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'gas' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">{t('phys_solve_for', 'Solve for')}:</span>
            {(['P', 'V', 'n', 'T'] as const).map(v => (
              <button
                key={v}
                onClick={() => setGasSolve(v)}
                className={`px-3 py-1 rounded-lg font-mono ${gasSolve === v ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs text-slate-400">
              P (kPa)
              <input type="number" step="any" disabled={gasSolve === 'P'} value={gasSolve === 'P' ? Number(gasOut.toFixed(3)) : pressKpa} onChange={e => setPressKpa(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 disabled:opacity-75" />
            </label>
            <label className="text-xs text-slate-400">
              V (L)
              <input type="number" step="any" disabled={gasSolve === 'V'} value={gasSolve === 'V' ? Number(gasOut.toFixed(3)) : volL} onChange={e => setVolL(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 disabled:opacity-75" />
            </label>
            <label className="text-xs text-slate-400">
              n (mol)
              <input type="number" step="any" disabled={gasSolve === 'n'} value={gasSolve === 'n' ? Number(gasOut.toFixed(4)) : molesN} onChange={e => setMolesN(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-300 disabled:opacity-75" />
            </label>
            <label className="text-xs text-slate-400">
              T (K)
              <input type="number" step="any" disabled={gasSolve === 'T'} value={gasSolve === 'T' ? Number(gasOut.toFixed(2)) : tempK} onChange={e => setTempK(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-rose-300 disabled:opacity-75" />
            </label>
          </div>
        </div>
      )}

      {tab === 'energy' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-slate-400">
              {t('phys_mass_kg', 'Mass (kg)')}
              <input type="number" step="any" value={massKg} onChange={e => setMassKg(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('phys_velocity_ms', 'Velocity (m/s)')}
              <input type="number" step="any" value={velMs} onChange={e => setVelMs(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('phys_height_m', 'Height (m)')}
              <input type="number" step="any" value={heightM} onChange={e => setHeightM(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_ke', 'Kinetic Energy (½mv²)')}</span>
              <span className="text-2xl font-bold font-mono text-indigo-300">{ke.toFixed(2)} J</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_pe', 'Potential Energy (mgh)')}</span>
              <span className="text-2xl font-bold font-mono text-emerald-300">{pe.toFixed(2)} J</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_momentum', 'Momentum (p = mv)')}</span>
              <span className="text-2xl font-bold font-mono text-amber-300">{momentum.toFixed(2)} kg·m/s</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'wave' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-slate-400">
              {t('phys_freq_hz', 'Frequency (Hz)')}
              <input type="number" step="any" value={freqHz} onChange={e => setFreqHz(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('phys_wave_speed', 'Wave Speed (m/s, 343 sound / 299792458 light)')}
              <input type="number" step="any" value={speedMs} onChange={e => setSpeedMs(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
            <label className="text-xs text-slate-400">
              {t('phys_power_ratio', 'Power Ratio (P2 / P1)')}
              <input type="number" step="any" value={powerRatio} onChange={e => setPowerRatio(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_wavelength', 'Wavelength (λ)')}</span>
              <span className="text-2xl font-bold font-mono text-indigo-300">{wavelength.toPrecision(5)} m</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_period', 'Period (T)')}</span>
              <span className="text-2xl font-bold font-mono text-emerald-300">{periodMs.toPrecision(5)} ms</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('phys_gain_db', 'Gain (10 log10)')}</span>
              <span className="text-2xl font-bold font-mono text-amber-300">{dbPower.toFixed(3)} dB</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
