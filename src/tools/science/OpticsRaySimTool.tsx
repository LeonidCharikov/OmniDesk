import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { solveSnell, solveThinLens } from '../../utils/scienceSuite.logic';

const MEDIA_INDICES = [
  { name: 'Air / Vacuum', n: 1.0003 },
  { name: 'Water', n: 1.333 },
  { name: 'Crown Glass', n: 1.52 },
  { name: 'Flint Glass', n: 1.66 },
  { name: 'Diamond', n: 2.417 },
];

export const OpticsRaySimTool: React.FC = () => {
  const { t } = useI18n();
  const [focalCm, setFocalCm] = useState(12);
  const [objDistCm, setObjDistCm] = useState(28);
  const [objHeightCm, setObjHeightCm] = useState(5);

  const [n1, setN1] = useState(1.0003);
  const [n2, setN2] = useState(1.52);
  const [theta1, setTheta1] = useState(35);

  const lens = useMemo(() => solveThinLens(focalCm, objDistCm, objHeightCm), [focalCm, objDistCm, objHeightCm]);
  const snell = useMemo(() => solveSnell(n1, n2, theta1), [n1, n2, theta1]);

  // Thin-lens SVG coordinates
  const W = 560;
  const H = 220;
  const cx = W / 2;
  const cy = H / 2;
  const scaleX = 4.2;
  const scaleY = 7;
  const objX = cx - Math.min(250, objDistCm * scaleX);
  const objTipY = cy - Math.max(-85, Math.min(85, objHeightCm * scaleY));
  const fRightX = cx + Math.max(-220, Math.min(220, focalCm * scaleX));
  const fLeftX = cx - Math.max(-220, Math.min(220, focalCm * scaleX));
  const imgX = Number.isFinite(lens.di) ? Math.max(20, Math.min(W - 20, cx + lens.di * scaleX)) : W - 20;
  const imgTipY = Number.isFinite(lens.imageHeight) ? Math.max(20, Math.min(H - 20, cy - lens.imageHeight * scaleY)) : cy;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-indigo-400" />
          {t('tool_optics_ray_sim_title', 'Optics & Lens / Snell Ray Simulator')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_optics_ray_sim_desc', 'Thin-lens equation with live 3-ray SVG diagram, magnification, Snell refraction, TIR & Brewster angle.')}
        </p>
      </div>

      {/* Thin Lens Ray Diagram */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('opt_thin_lens', 'Thin Lens Equation (1/f = 1/d₀ + 1/dᵢ)')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-xs text-slate-400">
            {t('opt_focal', 'Focal Length f (cm, + conv / − div)')}: <span className="font-mono text-indigo-300">{focalCm} cm</span>
            <input type="range" min={-30} max={30} step={1} value={focalCm} onChange={e => setFocalCm(Number(e.target.value) || 1)} className="mt-1.5 w-full accent-indigo-500" />
          </label>
          <label className="text-xs text-slate-400">
            {t('opt_obj_dist', 'Object Distance d₀')}: <span className="font-mono text-emerald-300">{objDistCm} cm</span>
            <input type="range" min={4} max={55} step={1} value={objDistCm} onChange={e => setObjDistCm(Number(e.target.value))} className="mt-1.5 w-full accent-emerald-500" />
          </label>
          <label className="text-xs text-slate-400">
            {t('opt_obj_height', 'Object Height h₀')}: <span className="font-mono text-white">{objHeightCm} cm</span>
            <input type="range" min={1} max={10} step={0.5} value={objHeightCm} onChange={e => setObjHeightCm(Number(e.target.value))} className="mt-1.5 w-full accent-indigo-500" />
          </label>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56">
            {/* Optical axis */}
            <line x1={10} y1={cy} x2={W - 10} y2={cy} stroke="#475569" strokeDasharray="4 4" />
            {/* Lens body */}
            <ellipse cx={cx} cy={cy} rx={focalCm >= 0 ? 8 : 4} ry={85} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
            {/* Focal points */}
            <circle cx={fLeftX} cy={cy} r="3.5" fill="#f59e0b" />
            <circle cx={fRightX} cy={cy} r="3.5" fill="#f59e0b" />
            <text x={fLeftX - 4} y={cy + 16} fill="#fbbf24" fontSize="10" fontFamily="monospace">F</text>
            <text x={fRightX - 4} y={cy + 16} fill="#fbbf24" fontSize="10" fontFamily="monospace">F&prime;</text>

            {/* Object arrow */}
            <line x1={objX} y1={cy} x2={objX} y2={objTipY} stroke="#10b981" strokeWidth="3" />
            <circle cx={objX} cy={objTipY} r="3.5" fill="#10b981" />

            {/* Principal rays */}
            {Number.isFinite(lens.di) && (
              <>
                {/* Parallel ray -> through focus -> image */}
                <line x1={objX} y1={objTipY} x2={cx} y2={objTipY} stroke="#38bdf8" strokeWidth="1.5" />
                <line x1={cx} y1={objTipY} x2={imgX} y2={imgTipY} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray={lens.isReal ? undefined : '4 3'} />
                {/* Chief ray through center */}
                <line x1={objX} y1={objTipY} x2={imgX} y2={imgTipY} stroke="#a855f7" strokeWidth="1.5" strokeDasharray={lens.isReal ? undefined : '4 3'} />
                {/* Image arrow */}
                <line x1={imgX} y1={cy} x2={imgX} y2={imgTipY} stroke="#f43f5e" strokeWidth="3" strokeDasharray={lens.isReal ? undefined : '4 2'} />
                <circle cx={imgX} cy={imgTipY} r="3.5" fill="#f43f5e" />
              </>
            )}
          </svg>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('opt_img_dist', 'Image Distance dᵢ')}</span>
            <span className="text-xl font-bold font-mono text-indigo-300">
              {Number.isFinite(lens.di) ? `${lens.di.toFixed(2)} cm` : '∞'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('opt_mag', 'Magnification (M)')}</span>
            <span className="text-xl font-bold font-mono text-emerald-300">
              {Number.isFinite(lens.magnification) ? `${lens.magnification.toFixed(2)}×` : '∞'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('opt_power', 'Optical Power')}</span>
            <span className="text-xl font-bold font-mono text-amber-300">{lens.opticalPowerD.toFixed(2)} D</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('opt_img_type', 'Image Nature')}</span>
            <span className="text-sm font-bold text-white">
              {lens.isReal ? t('opt_real', 'Real') : t('opt_virtual', 'Virtual')} ·{' '}
              {lens.isUpright ? t('opt_upright', 'Upright') : t('opt_inverted', 'Inverted')}
            </span>
          </div>
        </div>
      </div>

      {/* Snell's Law */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('opt_snell_title', "Snell's Law & Total Internal Reflection (n₁ sin θ₁ = n₂ sin θ₂)")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            n₁ ({t('opt_medium1', 'Incident Medium')})
            <select value={n1} onChange={e => setN1(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white">
              {MEDIA_INDICES.map(m => (
                <option key={m.name} value={m.n}>{m.name} ({m.n})</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            n₂ ({t('opt_medium2', 'Refracted Medium')})
            <select value={n2} onChange={e => setN2(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white">
              {MEDIA_INDICES.map(m => (
                <option key={m.name} value={m.n}>{m.name} ({m.n})</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('opt_incident_angle', 'Incident Angle θ₁')}: <span className="font-mono text-indigo-300">{theta1}°</span>
            <input type="range" min={0} max={89} value={theta1} onChange={e => setTheta1(Number(e.target.value))} className="mt-2 w-full accent-indigo-500" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('opt_refracted_angle', 'Refracted Angle θ₂')}</span>
            <span className={`text-xl font-bold font-mono ${snell.tir ? 'text-rose-300' : 'text-emerald-300'}`}>
              {snell.tir ? t('opt_tir', 'Total Internal Reflection') : `${snell.theta2Deg!.toFixed(2)}°`}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('opt_critical', 'Critical Angle θ_c')}</span>
            <span className="text-xl font-bold font-mono text-amber-300">
              {snell.criticalAngleDeg !== null ? `${snell.criticalAngleDeg.toFixed(2)}°` : 'N/A (n₁ ≤ n₂)'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('opt_brewster', 'Brewster Angle θ_B')}</span>
            <span className="text-xl font-bold font-mono text-indigo-300">{snell.brewsterAngleDeg.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
