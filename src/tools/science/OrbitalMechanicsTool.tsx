import React, { useMemo, useState } from 'react';
import { Orbit } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { calculateOrbitMetrics, CELESTIAL_BODIES } from '../../utils/scienceSuite.logic';

export const OrbitalMechanicsTool: React.FC = () => {
  const { t } = useI18n();
  const [bodyId, setBodyId] = useState('earth');
  const [alt1Km, setAlt1Km] = useState(400); // ISS LEO
  const [alt2Km, setAlt2Km] = useState(35786); // GEO

  const body = useMemo(() => CELESTIAL_BODIES.find(b => b.id === bodyId) || CELESTIAL_BODIES[0], [bodyId]);
  const metrics = useMemo(
    () => calculateOrbitMetrics(body.massKg, body.radiusKm, alt1Km, alt2Km),
    [body, alt1Km, alt2Km]
  );

  // Orbit schematic radii
  const rInner = 42;
  const rOuter = 92;
  const aEll = (rInner + rOuter) / 2;
  const bEll = Math.sqrt(rInner * rOuter);
  const ellCx = 130 - (rOuter - rInner) / 2;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Orbit className="w-5 h-5 text-indigo-400" />
          {t('tool_orbital_mechanics_title', 'Astrophysics & Orbital Mechanics')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_orbital_mechanics_desc', 'Circular & escape velocity, Kepler orbital periods, Hohmann transfer Δv, and Schwarzschild radius.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="flex flex-wrap gap-2">
            {CELESTIAL_BODIES.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBodyId(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  bodyId === b.id ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              {t('orb_alt1', 'Initial Orbit Altitude h₁ (km)')}
              <input type="number" min={0} step="50" value={alt1Km} onChange={e => setAlt1Km(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              {t('orb_alt2', 'Target Orbit Altitude h₂ (km)')}
              <input type="number" min={0} step="100" value={alt2Km} onChange={e => setAlt2Km(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300" />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('orb_v_circ', 'Circular Velocity v₁')}</span>
              <span className="text-xl font-bold font-mono text-indigo-300">{metrics.vCirc1KmS.toFixed(3)} km/s</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('orb_v_esc', 'Escape Velocity')}</span>
              <span className="text-xl font-bold font-mono text-amber-300">{metrics.vEscape1KmS.toFixed(3)} km/s</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('orb_period', 'Orbital Period T₁')}</span>
              <span className="text-xl font-bold font-mono text-white">
                {metrics.period1Min > 120 ? `${(metrics.period1Min / 60).toFixed(2)} h` : `${metrics.period1Min.toFixed(2)} min`}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Hohmann Δv₁ + Δv₂</span>
              <span className="text-xl font-bold font-mono text-emerald-300">{metrics.totalDvKmS.toFixed(3)} km/s</span>
              <span className="text-[11px] font-mono text-slate-400 block">
                ({metrics.dv1KmS.toFixed(2)} + {metrics.dv2KmS.toFixed(2)})
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('orb_transfer_time', 'Transfer Time')}</span>
              <span className="text-xl font-bold font-mono text-sky-300">
                {metrics.transferTimeMin > 120 ? `${(metrics.transferTimeMin / 60).toFixed(2)} h` : `${metrics.transferTimeMin.toFixed(1)} min`}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Schwarzschild r_s</span>
              <span className="text-base font-bold font-mono text-rose-300">
                {metrics.schwarzschildM >= 1000
                  ? `${(metrics.schwarzschildM / 1000).toFixed(2)} km`
                  : `${(metrics.schwarzschildM * 1000).toFixed(2)} mm`}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 self-start">
            {t('orb_hohmann_diagram', 'Hohmann Transfer Orbit')}
          </span>
          <svg viewBox="0 0 260 240" className="w-full h-56 bg-slate-950 rounded-xl border border-slate-800 my-2">
            <circle cx={130} cy={120} r={rOuter} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx={130} cy={120} r={rInner} fill="none" stroke="#10b981" strokeWidth="1.5" />
            <ellipse cx={ellCx} cy={120} rx={aEll} ry={bEll} fill="none" stroke="#f59e0b" strokeWidth="2" />
            <circle cx={130} cy={120} r="16" fill="#3b82f6" />
            <circle cx={130 + rInner} cy={120} r="4" fill="#10b981" />
            <circle cx={130 - rOuter} cy={120} r="4" fill="#f59e0b" />
          </svg>
          <div className="flex items-center justify-around w-full text-[11px] font-mono text-slate-400">
            <span className="text-emerald-300">● r₁</span>
            <span className="text-amber-300">● Transfer</span>
            <span className="text-indigo-300">● r₂</span>
          </div>
        </div>
      </div>
    </div>
  );
};
