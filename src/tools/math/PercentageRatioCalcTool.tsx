import React, { useState } from 'react';
import { Percent } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const PercentageRatioCalcTool: React.FC = () => {
  const { t } = useI18n();

  // 1. What is X% of Y?
  const [p1, setP1] = useState('15');
  const [v1, setV1] = useState('240');

  // 2. X is what % of Y?
  const [x2, setX2] = useState('45');
  const [y2, setY2] = useState('180');

  // 3. % Change from A to B
  const [from3, setFrom3] = useState('120');
  const [to3, setTo3] = useState('150');

  // 4. Add / Subtract %
  const [base4, setBase4] = useState('500');
  const [pct4, setPct4] = useState('21');
  const [dir4, setDir4] = useState<'add' | 'sub'>('add');

  // 5. Ratio / Aspect Resize (A : B = C : D)
  const [rA, setRA] = useState('16');
  const [rB, setRB] = useState('9');
  const [rC, setRC] = useState('1920');

  const nP1 = Number(p1) || 0;
  const nV1 = Number(v1) || 0;
  const res1 = (nP1 / 100) * nV1;

  const nX2 = Number(x2) || 0;
  const nY2 = Number(y2) || 0;
  const res2 = nY2 !== 0 ? (nX2 / nY2) * 100 : null;

  const nFrom3 = Number(from3) || 0;
  const nTo3 = Number(to3) || 0;
  const res3 = nFrom3 !== 0 ? ((nTo3 - nFrom3) / Math.abs(nFrom3)) * 100 : null;

  const nBase4 = Number(base4) || 0;
  const nPct4 = Number(pct4) || 0;
  const res4 = dir4 === 'add' ? nBase4 * (1 + nPct4 / 100) : nBase4 * (1 - nPct4 / 100);

  const nRA = Number(rA) || 0;
  const nRB = Number(rB) || 0;
  const nRC = Number(rC) || 0;
  const resD = nRA !== 0 ? (nRB * nRC) / nRA : null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Percent className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {t('pr_title', 'Simple Percentage & Ratio Calculator')}
            </h2>
            <p className="text-xs text-slate-400">
              {t('pr_subtitle', 'Everyday percentage calculations, percentage change, and proportional ratio scaling.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300">{t('pr_mode1', 'What is X% of Y?')}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="number"
                value={p1}
                onChange={e => setP1(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <span className="text-slate-400">% {t('pr_of', 'of')}</span>
              <input
                type="number"
                value={v1}
                onChange={e => setV1(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <span className="text-slate-400">=</span>
              <span className="text-lg font-bold font-mono tabular-nums text-indigo-300">
                {Number(res1.toFixed(4))}
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300">{t('pr_mode2', 'X is what % of Y?')}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="number"
                value={x2}
                onChange={e => setX2(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <span className="text-slate-400">{t('pr_is_what_pct', 'is % of')}</span>
              <input
                type="number"
                value={y2}
                onChange={e => setY2(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <span className="text-slate-400">=</span>
              <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
                {res2 !== null ? `${Number(res2.toFixed(2))}%` : '—'}
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300">{t('pr_mode3', 'Percentage Change (From → To)')}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="number"
                value={from3}
                onChange={e => setFrom3(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <span className="text-slate-400">→</span>
              <input
                type="number"
                value={to3}
                onChange={e => setTo3(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <span className="text-slate-400">=</span>
              <span
                className={`text-lg font-bold font-mono tabular-nums ${
                  res3 === null ? 'text-slate-400' : res3 >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {res3 !== null ? `${res3 >= 0 ? '+' : ''}${Number(res3.toFixed(2))}%` : '—'}
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300">{t('pr_mode4', 'Increase / Decrease by %')}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="number"
                value={base4}
                onChange={e => setBase4(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <select
                value={dir4}
                onChange={e => setDir4(e.target.value as 'add' | 'sub')}
                className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
              >
                <option value="add">+</option>
                <option value="sub">-</option>
              </select>
              <input
                type="number"
                value={pct4}
                onChange={e => setPct4(e.target.value)}
                className="w-20 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
              />
              <span className="text-slate-400">% =</span>
              <span className="text-lg font-bold font-mono tabular-nums text-amber-300">
                {Number(res4.toFixed(4))}
              </span>
            </div>
          </div>
        </div>

        {/* Aspect Ratio & Proportion */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-300">
              {t('pr_mode5', 'Proportion & Aspect Ratio Solver (A : B = C : ?)')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '16:9', a: '16', b: '9' },
                { label: '4:3', a: '4', b: '3' },
                { label: '3:2', a: '3', b: '2' },
                { label: '1:1', a: '1', b: '1' },
                { label: '9:16', a: '9', b: '16' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setRA(p.a);
                    setRB(p.b);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white hover:border-indigo-500/40"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="number"
              value={rA}
              onChange={e => setRA(e.target.value)}
              className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
            />
            <span className="text-slate-400">:</span>
            <input
              type="number"
              value={rB}
              onChange={e => setRB(e.target.value)}
              className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
            />
            <span className="text-slate-400">=</span>
            <input
              type="number"
              value={rC}
              onChange={e => setRC(e.target.value)}
              className="w-28 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-white"
            />
            <span className="text-slate-400">:</span>
            <span className="text-lg font-bold font-mono tabular-nums text-indigo-300">
              {resD !== null ? Number(resD.toFixed(2)) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
