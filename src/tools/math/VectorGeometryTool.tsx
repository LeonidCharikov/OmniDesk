import React, { useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { analyzeVectors, planeFromThreePoints, Vec3 } from '../../utils/mathSuite.logic';

function fmtVec(v: Vec3): string {
  return `(${Number(v.x.toFixed(3))}, ${Number(v.y.toFixed(3))}, ${Number(v.z.toFixed(3))})`;
}

export const VectorGeometryTool: React.FC = () => {
  const { t } = useI18n();
  const [vecA, setVecA] = useState<Vec3>({ x: 3, y: 2, z: 1 });
  const [vecB, setVecB] = useState<Vec3>({ x: -1, y: 4, z: 2 });
  const [vecC, setVecC] = useState<Vec3>({ x: 0, y: 0, z: 3 });

  const stats = useMemo(() => analyzeVectors(vecA, vecB), [vecA, vecB]);
  const plane = useMemo(() => planeFromThreePoints(vecA, vecB, vecC), [vecA, vecB, vecC]);

  // Isometric projection for SVG 3D preview
  const iso = (v: Vec3) => {
    const scale = 20;
    const cx = 180;
    const cy = 115;
    const px = cx + (v.x - v.y) * 0.866 * scale;
    const py = cy + (v.x + v.y) * 0.45 * scale - v.z * scale;
    return { x: px, y: py };
  };

  const origin = iso({ x: 0, y: 0, z: 0 });
  const ptA = iso(vecA);
  const ptB = iso(vecB);
  const ptSum = iso(stats.sum);

  const renderVecInputs = (label: string, v: Vec3, setV: (nv: Vec3) => void, accent: string) => (
    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
      <span className={`text-xs font-mono font-semibold ${accent}`}>{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {(['x', 'y', 'z'] as const).map(axis => (
          <label key={axis} className="text-[11px] font-mono text-slate-400">
            {axis.toUpperCase()}
            <input
              type="number"
              step="any"
              value={v[axis]}
              onChange={e => setV({ ...v, [axis]: Number(e.target.value) })}
              className="mt-1 w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-white"
            />
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          {t('tool_vector_geometry_title', 'Vector & 3D Geometry Calculator')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_vector_geometry_desc', 'Dot & cross products, angle, projection, unit vectors, 3-point plane equations, and isometric 3D view.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderVecInputs('Vector A', vecA, setVecA, 'text-indigo-300')}
            {renderVecInputs('Vector B', vecB, setVecB, 'text-emerald-300')}
            {renderVecInputs(t('vec_third_point', 'Point C (Plane)'), vecC, setVecC, 'text-amber-300')}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">A · B ({t('vec_dot', 'Dot Product')})</span>
              <span className="text-xl font-bold font-mono text-indigo-300">{stats.dot.toFixed(4)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('vec_angle', 'Angle θ')}</span>
              <span className="text-xl font-bold font-mono text-emerald-300">{stats.angleDeg.toFixed(2)}°</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">|A| / |B|</span>
              <span className="text-base font-bold font-mono text-white">
                {stats.magA.toFixed(3)} / {stats.magB.toFixed(3)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">A × B ({t('vec_cross', 'Cross')})</span>
              <span className="text-sm font-bold font-mono text-amber-300">{fmtVec(stats.cross)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">proj_B(A)</span>
              <span className="text-sm font-bold font-mono text-sky-300">{fmtVec(stats.projAonB)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">A + B</span>
              <span className="text-sm font-bold font-mono text-slate-200">{fmtVec(stats.sum)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block mb-1">{t('vec_plane_eq', 'Plane through A, B, C')}</span>
            {plane.valid ? (
              <span className="text-indigo-300 font-semibold">
                {plane.normal.x.toFixed(2)}x + {plane.normal.y.toFixed(2)}y + {plane.normal.z.toFixed(2)}z = {plane.d.toFixed(2)}
              </span>
            ) : (
              <span className="text-amber-300">{t('vec_collinear', 'Points are collinear — plane is not unique.')}</span>
            )}
          </div>
        </div>

        {/* Isometric SVG Preview */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('vec_iso_preview', 'Isometric 3D Vector Preview')}
          </span>
          <svg viewBox="0 0 360 230" className="w-full h-56 my-2 bg-slate-950 rounded-xl border border-slate-800">
            {/* Axes */}
            <line x1={origin.x} y1={origin.y} x2={iso({ x: 5, y: 0, z: 0 }).x} y2={iso({ x: 5, y: 0, z: 0 }).y} stroke="#475569" strokeDasharray="3 3" />
            <line x1={origin.x} y1={origin.y} x2={iso({ x: 0, y: 5, z: 0 }).x} y2={iso({ x: 0, y: 5, z: 0 }).y} stroke="#475569" strokeDasharray="3 3" />
            <line x1={origin.x} y1={origin.y} x2={iso({ x: 0, y: 0, z: 5 }).x} y2={iso({ x: 0, y: 0, z: 5 }).y} stroke="#475569" strokeDasharray="3 3" />
            {/* Vectors */}
            <line x1={origin.x} y1={origin.y} x2={ptA.x} y2={ptA.y} stroke="#6366f1" strokeWidth="2.5" />
            <circle cx={ptA.x} cy={ptA.y} r="4" fill="#6366f1" />
            <line x1={origin.x} y1={origin.y} x2={ptB.x} y2={ptB.y} stroke="#10b981" strokeWidth="2.5" />
            <circle cx={ptB.x} cy={ptB.y} r="4" fill="#10b981" />
            <line x1={origin.x} y1={origin.y} x2={ptSum.x} y2={ptSum.y} stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="5 3" />
            <circle cx={ptSum.x} cy={ptSum.y} r="3.5" fill="#f59e0b" />
          </svg>
          <div className="flex items-center justify-around text-[11px] font-mono text-slate-400">
            <span className="text-indigo-300">● A</span>
            <span className="text-emerald-300">● B</span>
            <span className="text-amber-300">● A + B</span>
          </div>
        </div>
      </div>
    </div>
  );
};
