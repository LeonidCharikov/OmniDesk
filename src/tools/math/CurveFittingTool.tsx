import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { fitCurve, FitModelType, parseXyPoints } from '../../utils/mathSuite.logic';

const DEFAULT_DATA = `1, 2.3
2, 4.9
3, 9.1
4, 15.8
5, 24.7
6, 36.2`;

export const CurveFittingTool: React.FC = () => {
  const { t } = useI18n();
  const [rawData, setRawData] = useState(DEFAULT_DATA);
  const [model, setModel] = useState<FitModelType>('poly2');
  const [predictX, setPredictX] = useState(7);

  const points = useMemo(() => parseXyPoints(rawData), [rawData]);
  const fit = useMemo(() => fitCurve(points, model), [points, model]);

  const plot = useMemo(() => {
    if (!fit || points.length < 2) return null;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const spanX = Math.max(1e-6, maxX - minX);
    const padX = spanX * 0.12;
    const x0 = minX - padX;
    const x1 = maxX + padX;

    const curvePts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 100; i++) {
      const x = x0 + ((x1 - x0) * i) / 100;
      const y = fit.predict(x);
      if (Number.isFinite(y)) curvePts.push({ x, y });
    }
    const allY = [...ys, ...curvePts.map(p => p.y)];
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const padY = Math.max(0.5, (maxY - minY) * 0.15);
    const y0 = minY - padY;
    const y1 = maxY + padY;

    const W = 540;
    const H = 220;
    const sx = (x: number) => ((x - x0) / (x1 - x0)) * W;
    const sy = (y: number) => H - ((y - y0) / (y1 - y0)) * H;
    const d = curvePts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
    return { W, H, d, dots: points.map(p => ({ cx: sx(p.x), cy: sy(p.y), ...p })) };
  }, [fit, points]);

  const getPipeText = () => {
    if (!fit) return '';
    return [
      `Model: ${model}`,
      `Equation: y = ${fit.formula}`,
      `R^2 = ${fit.rSquared.toFixed(6)}`,
      `RMSE = ${fit.rmse.toFixed(6)}`,
      `Predict(${predictX}) = ${fit.predict(predictX).toFixed(6)}`,
    ].join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            {t('tool_curve_fitting_title', 'Regression & Curve Fitting')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_curve_fitting_desc', 'Fit linear, polynomial, exponential, logarithmic, or power models to X/Y data with R² and residuals.')}
          </p>
        </div>
        <SendToToolButton sourceToolId="curve-fitting" getText={getPipeText} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <label className="text-xs text-slate-400 block">
            {t('fit_xy_input', 'X, Y Data Pairs (one per line)')}
            <textarea
              rows={8}
              value={rawData}
              onChange={e => setRawData(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'linear', label: t('fit_linear', 'Linear') },
                { id: 'poly2', label: t('fit_quad', 'Quadratic') },
                { id: 'poly3', label: t('fit_cubic', 'Cubic') },
                { id: 'exponential', label: t('fit_exp', 'Exp') },
                { id: 'logarithmic', label: t('fit_log', 'Log') },
                { id: 'power', label: t('fit_power', 'Power') },
              ] as const
            ).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  model === m.id ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="text-xs text-slate-400 block">
            {t('fit_predict_x', 'Predict y at x =')}
            <input
              type="number"
              step="any"
              value={predictX}
              onChange={e => setPredictX(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300"
            />
          </label>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          {fit && plot ? (
            <>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                  {t('fit_equation', 'Fitted Equation')}
                </span>
                <div className="text-lg font-bold font-mono text-indigo-300 mt-1">y = {fit.formula}</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">R²</span>
                  <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">{fit.rSquared.toFixed(5)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">RMSE</span>
                  <span className="text-xl font-bold font-mono text-amber-300 tabular-nums">{fit.rmse.toFixed(4)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">ŷ({predictX})</span>
                  <span className="text-xl font-bold font-mono text-white tabular-nums">
                    {fit.predict(predictX).toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <svg viewBox={`0 0 ${plot.W} ${plot.H}`} className="w-full h-56 overflow-visible">
                  <path d={plot.d} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                  {plot.dots.map((pt, idx) => (
                    <circle key={idx} cx={pt.cx} cy={pt.cy} r="4.5" fill="#10b981" stroke="#fff" strokeWidth="1.2" />
                  ))}
                </svg>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              {t('fit_need_more', 'Enter at least 2 valid numeric X, Y pairs (and positive values for log/exp/power models).')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
