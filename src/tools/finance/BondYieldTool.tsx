import React, { useState, useMemo } from 'react';
import { Landmark } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { computeBondMetrics } from '../../utils/financeSuite.logic';

export const BondYieldTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [faceValue, setFaceValue] = useState('1000');
  const [couponRatePct, setCouponRatePct] = useState('5.0');
  const [marketPrice, setMarketPrice] = useState('940');
  const [yearsToMaturity, setYearsToMaturity] = useState('10');
  const [paymentsPerYear, setPaymentsPerYear] = useState('2');

  const result = useMemo(() => {
    return computeBondMetrics({
      faceValue: Number(faceValue) || 1000,
      couponRatePct: Number(couponRatePct) || 0,
      marketPrice: Number(marketPrice) || 1000,
      yearsToMaturity: Number(yearsToMaturity) || 10,
      paymentsPerYear: Number(paymentsPerYear) || 2,
    });
  }, [faceValue, couponRatePct, marketPrice, yearsToMaturity, paymentsPerYear]);

  const svgW = 620;
  const svgH = 210;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const prices = result.priceCurve.map(p => p.price);
  const yields = result.priceCurve.map(p => p.yieldPct);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const spanP = Math.max(1, maxP - minP);
  const minY = Math.min(...yields);
  const maxY = Math.max(...yields);
  const spanY = Math.max(0.1, maxY - minY);

  const toX = (y: number) => padL + ((y - minY) / spanY) * (svgW - padL - padR);
  const toY = (p: number) => svgH - padB - ((p - minP) / spanP) * (svgH - padT - padB);

  const curvePath = result.priceCurve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.yieldPct).toFixed(1)} ${toY(pt.price).toFixed(1)}`)
    .join(' ');

  const marketPx = Number(marketPrice) || 1000;
  const shockDown100bps = result.modifiedDuration * 1 + 0.5 * result.convexity * 0.01;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('bond_title', 'Bond Yield, YTM & Duration Calculator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'bond_subtitle',
                  'Compute Yield to Maturity (YTM), Current Yield, Macaulay & Modified Duration, Convexity, and the Price-vs-Yield curve.'
                )}
              </p>
            </div>
          </div>
          <AppCurrencyBadge currency={currency} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('bond_face', 'Face Value')} ({currSymbol})
            </label>
            <input type="number" value={faceValue} onChange={e => setFaceValue(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('bond_coupon', 'Coupon Rate (%)')}</label>
            <input type="number" step="0.125" value={couponRatePct} onChange={e => setCouponRatePct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('bond_price', 'Market Price')} ({currSymbol})
            </label>
            <input type="number" step="5" value={marketPrice} onChange={e => setMarketPrice(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('bond_years', 'Years to Maturity')}</label>
            <input type="number" step="0.5" min="0.5" value={yearsToMaturity} onChange={e => setYearsToMaturity(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('bond_freq', 'Coupons / Year')}</label>
            <select
              value={paymentsPerYear}
              onChange={e => setPaymentsPerYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
            >
              <option value="1">{t('bond_freq_annual', '1 (Annual)')}</option>
              <option value="2">{t('bond_freq_semi', '2 (Semi-Annual)')}</option>
              <option value="4">{t('bond_freq_quarterly', '4 (Quarterly)')}</option>
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('bond_ytm', 'Yield to Maturity (YTM)')}</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{result.ytmPct.toFixed(3)}%</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('bond_curr_yield', 'Current Yield')}</div>
            <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">{result.currentYieldPct.toFixed(3)}%</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('bond_mac_dur', 'Macaulay Duration')}</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {result.macaulayDuration.toFixed(2)} {t('debt_years_short', 'yr')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('bond_mod_dur', 'Modified Duration')}</div>
            <div className="text-base font-bold font-mono text-amber-300 mt-0.5">{result.modifiedDuration.toFixed(2)}%</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('bond_convexity', 'Convexity')}</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">{result.convexity.toFixed(2)}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">
            {t('bond_annual_coupon_label', 'Annual Coupon Cash Flow')}:{' '}
            <strong className="font-mono text-white">{formatCurrency(result.annualCoupon, currency)}</strong>
          </span>
          <span className="text-slate-400">
            {t('bond_shock_label', 'Est. Price Change for -1.00% Yield Drop')}:{' '}
            <strong className="font-mono text-emerald-400">+{shockDown100bps.toFixed(2)}%</strong>
          </span>
        </div>
      </div>

      {/* Price vs Yield Curve */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          {t('bond_curve_title', 'Bond Price vs. Market Yield Curve (Convexity)')}
        </h3>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[460px] h-52">
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const pVal = minP + spanP * frac;
              const y = toY(pVal);
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="currentColor" className="text-slate-800" strokeDasharray="3 3" />
                  <text x={padL - 6} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                    {Math.round(pVal)}
                  </text>
                </g>
              );
            })}
            <path d={curvePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx={toX(result.ytmPct)} cy={toY(marketPx)} r="5" fill="#34d399" />
            <text x={padL} y={svgH - 6} className="fill-slate-500 text-[10px] font-mono">{minY.toFixed(1)}%</text>
            <text x={toX(result.ytmPct)} y={svgH - 6} textAnchor="middle" className="fill-emerald-400 text-[10px] font-mono">
              YTM {result.ytmPct.toFixed(2)}%
            </text>
            <text x={svgW - padR} y={svgH - 6} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{maxY.toFixed(1)}%</text>
          </svg>
        </div>
      </div>
    </div>
  );
};
