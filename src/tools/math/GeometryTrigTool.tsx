import React, { useMemo, useState } from 'react';
import { Triangle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { solveTriangle, TriangleMode } from '../../utils/mathSuite.logic';

type GeoTab = 'triangle' | 'shapes';
type ShapeId = 'circle' | 'cylinder' | 'sphere' | 'cone' | 'trapezoid';

export const GeometryTrigTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<GeoTab>('triangle');
  const [triMode, setTriMode] = useState<TriangleMode>('SSS');
  const [v1, setV1] = useState(5);
  const [v2, setV2] = useState(6);
  const [v3, setV3] = useState(7);

  const [shape, setShape] = useState<ShapeId>('cylinder');
  const [dimA, setDimA] = useState(4);
  const [dimB, setDimB] = useState(10);
  const [dimC, setDimC] = useState(6);

  const tri = useMemo(() => solveTriangle(triMode, v1, v2, v3), [triMode, v1, v2, v3]);

  const triSvg = useMemo(() => {
    if (!tri.valid) return null;
    // Place side c on bottom from (0,0) to (c,0), vertex C at (b cos A, b sin A)
    const radA = (tri.A * Math.PI) / 180;
    const rawPts = [
      { x: 0, y: 0 },
      { x: tri.c, y: 0 },
      { x: tri.b * Math.cos(radA), y: tri.b * Math.sin(radA) },
    ];
    const minX = Math.min(...rawPts.map(p => p.x));
    const maxX = Math.max(...rawPts.map(p => p.x));
    const maxY = Math.max(0.1, ...rawPts.map(p => p.y));
    const span = Math.max(maxX - minX, maxY, 0.1);
    const scale = 170 / span;
    const offX = (260 - (maxX - minX) * scale) / 2 - minX * scale;
    const offY = 195;
    const pts = rawPts.map(p => ({ x: offX + p.x * scale, y: offY - p.y * scale }));
    return pts;
  }, [tri]);

  const shapeResults = useMemo(() => {
    const a = Math.max(0, dimA);
    const b = Math.max(0, dimB);
    const c = Math.max(0, dimC);
    if (shape === 'circle') {
      return [
        { label: t('geo_area', 'Area'), val: `${(Math.PI * a * a).toFixed(4)}` },
        { label: t('geo_circumference', 'Circumference'), val: `${(2 * Math.PI * a).toFixed(4)}` },
        { label: t('geo_diameter', 'Diameter'), val: `${(2 * a).toFixed(4)}` },
      ];
    }
    if (shape === 'sphere') {
      return [
        { label: t('geo_volume', 'Volume'), val: `${((4 / 3) * Math.PI * a ** 3).toFixed(4)}` },
        { label: t('geo_surface', 'Surface Area'), val: `${(4 * Math.PI * a * a).toFixed(4)}` },
      ];
    }
    if (shape === 'cylinder') {
      return [
        { label: t('geo_volume', 'Volume'), val: `${(Math.PI * a * a * b).toFixed(4)}` },
        { label: t('geo_surface', 'Surface Area'), val: `${(2 * Math.PI * a * (a + b)).toFixed(4)}` },
        { label: t('geo_lateral', 'Lateral Area'), val: `${(2 * Math.PI * a * b).toFixed(4)}` },
      ];
    }
    if (shape === 'cone') {
      const slant = Math.hypot(a, b);
      return [
        { label: t('geo_volume', 'Volume'), val: `${((Math.PI * a * a * b) / 3).toFixed(4)}` },
        { label: t('geo_surface', 'Surface Area'), val: `${(Math.PI * a * (a + slant)).toFixed(4)}` },
        { label: t('geo_slant', 'Slant Height'), val: `${slant.toFixed(4)}` },
      ];
    }
    // Trapezoid (bases a, b, height c)
    return [
      { label: t('geo_area', 'Area'), val: `${(((a + b) / 2) * c).toFixed(4)}` },
      { label: t('geo_midsegment', 'Midsegment'), val: `${((a + b) / 2).toFixed(4)}` },
    ];
  }, [shape, dimA, dimB, dimC, t]);

  const inputLabels: Record<TriangleMode, [string, string, string]> = {
    SSS: ['Side a', 'Side b', 'Side c'],
    SAS: ['Side a', 'Angle C (°)', 'Side b'],
    ASA: ['Angle A (°)', 'Side c', 'Angle B (°)'],
    AAS: ['Angle A (°)', 'Angle B (°)', 'Side a'],
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Triangle className="w-5 h-5 text-indigo-400" />
            {t('tool_geometry_trig_title', 'Geometry & Trigonometry Solver')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_geometry_trig_desc', 'Solve SSS/SAS/ASA/AAS triangles with Law of Sines/Cosines and compute 2D/3D areas and volumes.')}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('triangle')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${tab === 'triangle' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t('geo_tab_triangle', 'Triangle Solver')}
          </button>
          <button
            type="button"
            onClick={() => setTab('shapes')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${tab === 'shapes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t('geo_tab_shapes', '2D & 3D Shapes')}
          </button>
        </div>
      </div>

      {tab === 'triangle' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
            <div className="flex flex-wrap gap-2">
              {(['SSS', 'SAS', 'ASA', 'AAS'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setTriMode(m);
                    if (m === 'SSS') { setV1(5); setV2(6); setV3(7); }
                    if (m === 'SAS') { setV1(5); setV2(60); setV3(7); }
                    if (m === 'ASA') { setV1(45); setV2(10); setV3(60); }
                    if (m === 'AAS') { setV1(40); setV2(70); setV3(8); }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${
                    triMode === m ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[v1, v2, v3].map((val, idx) => (
                <label key={idx} className="text-xs text-slate-400">
                  {inputLabels[triMode][idx]}
                  <input
                    type="number"
                    step="any"
                    value={val}
                    onChange={e => {
                      const n = Number(e.target.value);
                      if (idx === 0) setV1(n);
                      else if (idx === 1) setV2(n);
                      else setV3(n);
                    }}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white"
                  />
                </label>
              ))}
            </div>

            {tri.valid ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">{t('geo_sides', 'Sides (a, b, c)')}</span>
                  <span className="text-sm font-bold font-mono text-indigo-300">
                    {tri.a.toFixed(3)}, {tri.b.toFixed(3)}, {tri.c.toFixed(3)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">{t('geo_angles', 'Angles (A, B, C)')}</span>
                  <span className="text-sm font-bold font-mono text-emerald-300">
                    {tri.A.toFixed(2)}°, {tri.B.toFixed(2)}°, {tri.C.toFixed(2)}°
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">{t('geo_area', 'Area')}</span>
                  <span className="text-xl font-bold font-mono text-white">{tri.area.toFixed(4)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">{t('geo_perimeter', 'Perimeter')}</span>
                  <span className="text-base font-bold font-mono text-slate-200">{tri.perimeter.toFixed(4)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Inradius (r)</span>
                  <span className="text-base font-bold font-mono text-amber-300">{tri.inradius.toFixed(4)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Circumradius (R)</span>
                  <span className="text-base font-bold font-mono text-sky-300">{tri.circumradius.toFixed(4)}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                {t('geo_invalid_tri', 'Invalid triangle dimensions (violates triangle inequality or angle sum ≥ 180°).')}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center">
            {triSvg ? (
              <svg viewBox="0 0 260 220" className="w-full h-56 bg-slate-950 rounded-xl border border-slate-800">
                <polygon
                  points={triSvg.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill="rgba(99, 102, 241, 0.2)"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                />
                {triSvg.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="#10b981" />
                    <text x={p.x + (i === 0 ? -12 : 8)} y={p.y + (i === 2 ? -8 : 14)} fill="#e2e8f0" fontSize="11" fontFamily="monospace">
                      {['A', 'B', 'C'][i]}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div className="text-xs text-slate-500">—</div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="flex flex-wrap gap-2">
            {(['circle', 'sphere', 'cylinder', 'cone', 'trapezoid'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setShape(s)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium ${
                  shape === s ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-slate-400">
              {shape === 'trapezoid' ? 'Base a' : 'Radius (r)'}
              <input type="number" min={0} step="any" value={dimA} onChange={e => setDimA(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            {(shape === 'cylinder' || shape === 'cone' || shape === 'trapezoid') && (
              <label className="text-xs text-slate-400">
                {shape === 'trapezoid' ? 'Base b' : 'Height (h)'}
                <input type="number" min={0} step="any" value={dimB} onChange={e => setDimB(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
              </label>
            )}
            {shape === 'trapezoid' && (
              <label className="text-xs text-slate-400">
                Height (h)
                <input type="number" min={0} step="any" value={dimC} onChange={e => setDimC(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
              </label>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {shapeResults.map(r => (
              <div key={r.label} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{r.label}</span>
                <span className="text-2xl font-bold font-mono text-indigo-300">{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
