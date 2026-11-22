import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  binomialCdf,
  binomialPmf,
  chiSquareCdf,
  chiSquarePdf,
  normalCdf,
  normalPdf,
  poissonCdf,
  poissonPmf,
  runAbProportionTest,
  studentTCdf,
  studentTPdf,
} from '../../utils/mathSuite.logic';

type DistType = 'normal' | 'student-t' | 'chi-square' | 'binomial' | 'poisson' | 'ab-test';

export const ProbabilityDistributionsTool: React.FC = () => {
  const { t } = useI18n();
  const [dist, setDist] = useState<DistType>('normal');

  // Distribution params
  const [mean, setMean] = useState(0);
  const [sd, setSd] = useState(1);
  const [df, setDf] = useState(10);
  const [nTrials, setNTrials] = useState(20);
  const [probP, setProbP] = useState(0.5);
  const [lambda, setLambda] = useState(4);
  const [xVal, setXVal] = useState(1.96);

  // A/B test params
  const [convA, setConvA] = useState(120);
  const [nA, setNA] = useState(1000);
  const [convB, setConvB] = useState(154);
  const [nB, setNB] = useState(1000);

  const metrics = useMemo(() => {
    if (dist === 'normal') {
      const pdf = normalPdf(xVal, mean, sd);
      const cdf = normalCdf(xVal, mean, sd);
      return { pdf, cdf, upper: 1 - cdf, twoTail: 2 * Math.min(cdf, 1 - cdf) };
    }
    if (dist === 'student-t') {
      const pdf = studentTPdf(xVal, df);
      const cdf = studentTCdf(xVal, df);
      return { pdf, cdf, upper: 1 - cdf, twoTail: 2 * Math.min(cdf, 1 - cdf) };
    }
    if (dist === 'chi-square') {
      const x = Math.max(0, xVal);
      const pdf = chiSquarePdf(x, df);
      const cdf = chiSquareCdf(x, df);
      return { pdf, cdf, upper: 1 - cdf, twoTail: 1 - cdf };
    }
    if (dist === 'binomial') {
      const k = Math.max(0, Math.round(xVal));
      const pdf = binomialPmf(k, nTrials, probP);
      const cdf = binomialCdf(k, nTrials, probP);
      return { pdf, cdf, upper: 1 - cdf, twoTail: pdf };
    }
    const k = Math.max(0, Math.round(xVal));
    const pdf = poissonPmf(k, lambda);
    const cdf = poissonCdf(k, lambda);
    return { pdf, cdf, upper: 1 - cdf, twoTail: pdf };
  }, [dist, xVal, mean, sd, df, nTrials, probP, lambda]);

  const abResult = useMemo(() => runAbProportionTest(convA, nA, convB, nB), [convA, nA, convB, nB]);

  const curveSvg = useMemo(() => {
    if (dist === 'ab-test') return null;
    const W = 560;
    const H = 190;
    if (dist === 'binomial' || dist === 'poisson') {
      const maxK = dist === 'binomial' ? Math.min(40, nTrials) : Math.min(35, Math.max(12, Math.ceil(lambda * 3)));
      const bars = Array.from({ length: maxK + 1 }, (_, k) => ({
        k,
        p: dist === 'binomial' ? binomialPmf(k, nTrials, probP) : poissonPmf(k, lambda),
      }));
      const maxP = Math.max(0.01, ...bars.map(b => b.p));
      const bw = W / bars.length;
      return { mode: 'bars' as const, W, H, bars, maxP, bw, cutoff: Math.round(xVal) };
    }

    const minX = dist === 'chi-square' ? 0.01 : dist === 'normal' ? mean - 4 * sd : -5;
    const maxX = dist === 'chi-square' ? Math.max(15, df * 3) : dist === 'normal' ? mean + 4 * sd : 5;
    const pts: Array<{ x: number; y: number }> = [];
    let maxY = 0.01;
    for (let i = 0; i <= 120; i++) {
      const x = minX + ((maxX - minX) * i) / 120;
      const y =
        dist === 'normal' ? normalPdf(x, mean, sd) : dist === 'student-t' ? studentTPdf(x, df) : chiSquarePdf(x, df);
      if (Number.isFinite(y)) {
        maxY = Math.max(maxY, y);
        pts.push({ x, y });
      }
    }
    const sx = (x: number) => ((x - minX) / (maxX - minX)) * W;
    const sy = (y: number) => H - 10 - (y / maxY) * (H - 25);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
    const shaded = pts.filter(p => p.x <= xVal);
    const area =
      shaded.length > 1
        ? `M ${sx(shaded[0].x).toFixed(1)} ${H - 10} ` +
          shaded.map(p => `L ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ') +
          ` L ${sx(shaded[shaded.length - 1].x).toFixed(1)} ${H - 10} Z`
        : '';
    return { mode: 'curve' as const, W, H, line, area, cutX: sx(Math.max(minX, Math.min(maxX, xVal))) };
  }, [dist, mean, sd, df, nTrials, probP, lambda, xVal]);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            {t('tool_probability_stats_title', 'Probability Distributions & Hypothesis Testing')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_probability_stats_desc', 'Normal, Student-t, Chi-Square, Binomial & Poisson PDF/CDF curves plus A/B hypothesis testing.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {(
            [
              { id: 'normal', label: 'Normal (z)' },
              { id: 'student-t', label: 'Student-t' },
              { id: 'chi-square', label: 'χ²' },
              { id: 'binomial', label: 'Binomial' },
              { id: 'poisson', label: 'Poisson' },
              { id: 'ab-test', label: t('prob_ab_test', 'A/B Test') },
            ] as const
          ).map(tb => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setDist(tb.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                dist === tb.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {dist === 'ab-test' ? (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs text-slate-400">
              {t('prob_conv_a', 'Conversions A')}
              <input type="number" min={0} value={convA} onChange={e => setConvA(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              {t('prob_visitors_a', 'Sample Size A')}
              <input type="number" min={1} value={nA} onChange={e => setNA(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              {t('prob_conv_b', 'Conversions B')}
              <input type="number" min={0} value={convB} onChange={e => setConvB(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              {t('prob_visitors_b', 'Sample Size B')}
              <input type="number" min={1} value={nB} onChange={e => setNB(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
            </label>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('prob_rate_ab', 'Rates (A → B)')}</span>
              <span className="text-lg font-bold font-mono text-white">
                {(abResult.rateA * 100).toFixed(2)}% → {(abResult.rateB * 100).toFixed(2)}%
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('prob_relative_lift', 'Relative Lift')}</span>
              <span className={`text-xl font-bold font-mono ${abResult.liftPercent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {abResult.liftPercent >= 0 ? '+' : ''}
                {abResult.liftPercent.toFixed(2)}%
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">z-Score / p-Value</span>
              <span className="text-lg font-bold font-mono text-indigo-300">
                z = {abResult.zScore.toFixed(3)} · p = {abResult.pValueTwoSided.toFixed(4)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('prob_significance', 'Significance (α = 0.05)')}</span>
              <span className={`text-lg font-bold font-mono ${abResult.significant95 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {abResult.significant95 ? t('prob_sig_yes', 'Statistically Significant') : t('prob_sig_no', 'Not Significant')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dist === 'normal' && (
              <>
                <label className="text-xs text-slate-400">
                  Mean (μ)
                  <input type="number" step="any" value={mean} onChange={e => setMean(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
                </label>
                <label className="text-xs text-slate-400">
                  Std Dev (σ)
                  <input type="number" step="any" min={0.01} value={sd} onChange={e => setSd(Math.max(0.01, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
                </label>
              </>
            )}
            {(dist === 'student-t' || dist === 'chi-square') && (
              <label className="text-xs text-slate-400">
                {t('prob_df', 'Degrees of Freedom (df)')}
                <input type="number" min={1} max={200} value={df} onChange={e => setDf(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
              </label>
            )}
            {dist === 'binomial' && (
              <>
                <label className="text-xs text-slate-400">
                  Trials (n)
                  <input type="number" min={1} max={200} value={nTrials} onChange={e => setNTrials(Math.max(1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
                </label>
                <label className="text-xs text-slate-400">
                  Probability (p)
                  <input type="number" step="0.01" min={0} max={1} value={probP} onChange={e => setProbP(Math.max(0, Math.min(1, Number(e.target.value))))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
                </label>
              </>
            )}
            {dist === 'poisson' && (
              <label className="text-xs text-slate-400">
                Rate (λ)
                <input type="number" step="0.1" min={0.1} value={lambda} onChange={e => setLambda(Math.max(0.1, Number(e.target.value)))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-white" />
              </label>
            )}
            <label className="text-xs text-slate-400">
              {t('prob_query_x', 'Value x / k')}
              <input type="number" step="any" value={xVal} onChange={e => setXVal(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-950 border border-indigo-800/60 rounded-xl font-mono text-sm text-indigo-300" />
            </label>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">PDF / PMF f(x)</span>
              <span className="text-xl font-bold font-mono text-white tabular-nums">{metrics.pdf.toFixed(6)}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">CDF P(X ≤ x)</span>
              <span className="text-xl font-bold font-mono text-indigo-300 tabular-nums">{(metrics.cdf * 100).toFixed(3)}%</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Upper Tail P(X &gt; x)</span>
              <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">{(metrics.upper * 100).toFixed(3)}%</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Two-Tailed p</span>
              <span className="text-xl font-bold font-mono text-amber-300 tabular-nums">{metrics.twoTail.toFixed(5)}</span>
            </div>
          </div>

          {curveSvg && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <svg viewBox={`0 0 ${curveSvg.W} ${curveSvg.H}`} className="w-full h-48">
                {curveSvg.mode === 'curve' ? (
                  <>
                    {curveSvg.area && <path d={curveSvg.area} fill="rgba(99, 102, 241, 0.25)" />}
                    <path d={curveSvg.line} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                    <line x1={curveSvg.cutX} y1={10} x2={curveSvg.cutX} y2={curveSvg.H - 10} stroke="#10b981" strokeDasharray="4 4" strokeWidth="1.5" />
                  </>
                ) : (
                  curveSvg.bars.map(b => {
                    const barH = (b.p / curveSvg.maxP) * (curveSvg.H - 28);
                    return (
                      <rect
                        key={b.k}
                        x={b.k * curveSvg.bw + 2}
                        y={curveSvg.H - 12 - barH}
                        width={Math.max(2, curveSvg.bw - 4)}
                        height={barH}
                        rx="2"
                        fill={b.k <= curveSvg.cutoff ? '#6366f1' : '#334155'}
                      />
                    );
                  })
                )}
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
