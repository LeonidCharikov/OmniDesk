import React, { useMemo, useState } from 'react';
import { Orbit } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  cAbs,
  cAdd,
  cArgRad,
  cDiv,
  cMul,
  cNthRoots,
  cPow,
  cSub,
  formatComplex,
} from '../../utils/mathSuite.logic';

export const ComplexNumbersTool: React.FC = () => {
  const { t } = useI18n();
  const [aRe, setARe] = useState(3);
  const [aIm, setAIm] = useState(4);
  const [bRe, setBRe] = useState(1);
  const [bIm, setBIm] = useState(-2);
  const [powerN, setPowerN] = useState(3);

  const z1 = useMemo(() => ({ re: aRe, im: aIm }), [aRe, aIm]);
  const z2 = useMemo(() => ({ re: bRe, im: bIm }), [bRe, bIm]);

  const ops = useMemo(() => {
    const r1 = cAbs(z1);
    const arg1Deg = (cArgRad(z1) * 180) / Math.PI;
    const r2 = cAbs(z2);
    const arg2Deg = (cArgRad(z2) * 180) / Math.PI;
    return {
      r1,
      arg1Deg,
      r2,
      arg2Deg,
      add: cAdd(z1, z2),
      sub: cSub(z1, z2),
      mul: cMul(z1, z2),
      div: cDiv(z1, z2),
      pow: cPow(z1, powerN),
      roots: cNthRoots(z1, Math.max(2, Math.min(8, Math.round(powerN)))),
    };
  }, [z1, z2, powerN]);

  const maxRadius = useMemo(() => {
    const mags = [ops.r1, ops.r2, ...ops.roots.map(cAbs), 1];
    return Math.max(...mags) * 1.25;
  }, [ops]);

  const mapPt = (re: number, im: number) => ({
    x: 140 + (re / maxRadius) * 115,
    y: 140 - (im / maxRadius) * 115,
  });

  const p1 = mapPt(z1.re, z1.im);
  const p2 = mapPt(z2.re, z2.im);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Orbit className="w-5 h-5 text-indigo-400" />
          {t('tool_complex_numbers_title', 'Complex Numbers & Polar Form Studio')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_complex_numbers_desc', 'Arithmetic, rectangular ↔ polar conversion, De Moivre powers/roots, and Argand plane plot.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,310px] gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-semibold text-indigo-300">z₁ = a + bi</span>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="any" value={aRe} onChange={e => setARe(Number(e.target.value))} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-white" />
                <input type="number" step="any" value={aIm} onChange={e => setAIm(Number(e.target.value))} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-white" />
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {ops.r1.toFixed(3)} ∠ {ops.arg1Deg.toFixed(1)}°
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-semibold text-emerald-300">z₂ = c + di</span>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="any" value={bRe} onChange={e => setBRe(Number(e.target.value))} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-white" />
                <input type="number" step="any" value={bIm} onChange={e => setBIm(Number(e.target.value))} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-white" />
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {ops.r2.toFixed(3)} ∠ {ops.arg2Deg.toFixed(1)}°
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-semibold text-amber-300">{t('complex_power_n', 'Power / Roots (n)')}</span>
              <input
                type="number"
                min={2}
                max={8}
                value={powerN}
                onChange={e => setPowerN(Math.max(2, Math.min(8, Number(e.target.value))))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-white"
              />
              <div className="text-[11px] font-mono text-slate-400">z₁^{powerN} = {formatComplex(ops.pow, 3)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">z₁ + z₂</span>
              <span className="text-sm font-bold font-mono text-white">{formatComplex(ops.add, 3)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">z₁ − z₂</span>
              <span className="text-sm font-bold font-mono text-white">{formatComplex(ops.sub, 3)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">z₁ × z₂</span>
              <span className="text-sm font-bold font-mono text-indigo-300">{formatComplex(ops.mul, 3)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">z₁ ÷ z₂</span>
              <span className="text-sm font-bold font-mono text-emerald-300">{formatComplex(ops.div, 3)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
              {t('complex_nth_roots', '{n}-th Roots of z₁', { n: ops.roots.length })}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ops.roots.map((rt, idx) => (
                <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300">
                  w<sub>{idx}</sub> = {formatComplex(rt, 3)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 self-start">
            {t('complex_argand', 'Argand Plane')}
          </span>
          <svg viewBox="0 0 280 280" className="w-full max-w-[260px] h-64 bg-slate-950 rounded-xl border border-slate-800 my-2">
            <line x1={10} y1={140} x2={270} y2={140} stroke="#475569" strokeDasharray="3 3" />
            <line x1={140} y1={10} x2={140} y2={270} stroke="#475569" strokeDasharray="3 3" />
            <circle cx={140} cy={140} r={(Math.pow(ops.r1, 1 / ops.roots.length) / maxRadius) * 115} fill="none" stroke="#f59e0b" strokeDasharray="4 4" opacity="0.5" />
            <line x1={140} y1={140} x2={p1.x} y2={p1.y} stroke="#6366f1" strokeWidth="2.5" />
            <circle cx={p1.x} cy={p1.y} r="4.5" fill="#6366f1" />
            <line x1={140} y1={140} x2={p2.x} y2={p2.y} stroke="#10b981" strokeWidth="2.5" />
            <circle cx={p2.x} cy={p2.y} r="4.5" fill="#10b981" />
            {ops.roots.map((rt, i) => {
              const pr = mapPt(rt.re, rt.im);
              return <circle key={i} cx={pr.x} cy={pr.y} r="3.5" fill="#f59e0b" />;
            })}
          </svg>
          <div className="flex items-center justify-around w-full text-[11px] font-mono text-slate-400">
            <span className="text-indigo-300">● z₁</span>
            <span className="text-emerald-300">● z₂</span>
            <span className="text-amber-300">● wₖ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
