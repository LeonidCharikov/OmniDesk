import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { simulateDividendDrip } from '../../utils/financeSuite.logic';

export const DividendDripTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [initialInvestment, setInitialInvestment] = useState('25000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [startingYieldPct, setStartingYieldPct] = useState('3.8');
  const [dividendGrowthPct, setDividendGrowthPct] = useState('6.0');
  const [priceGrowthPct, setPriceGrowthPct] = useState('5.0');
  const [taxRatePct, setTaxRatePct] = useState('15');
  const [years, setYears] = useState('20');
  const [reinvestDividends, setReinvestDividends] = useState(true);

  const result = useMemo(() => {
    return simulateDividendDrip({
      initialInvestment: Number(initialInvestment) || 0,
      monthlyContribution: Number(monthlyContribution) || 0,
      startingYieldPct: Number(startingYieldPct) || 0,
      dividendGrowthPct: Number(dividendGrowthPct) || 0,
      priceGrowthPct: Number(priceGrowthPct) || 0,
      taxRatePct: Number(taxRatePct) || 0,
      reinvestDividends,
      years: Number(years) || 20,
    });
  }, [
    initialInvestment,
    monthlyContribution,
    startingYieldPct,
    dividendGrowthPct,
    priceGrowthPct,
    taxRatePct,
    reinvestDividends,
    years,
  ]);

  const maxAnnualDiv = Math.max(1, ...result.schedule.map(r => r.annualNetDividend));
  const svgW = 640;
  const svgH = 210;
  const padL = 58;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const barGap = 4;
  const count = Math.max(1, result.schedule.length);
  const barW = Math.max(4, (svgW - padL - padR - barGap * count) / count);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('drip_title', 'Dividend & DRIP Income Simulator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'drip_subtitle',
                  'Project compounding quarterly dividends, Yield-on-Cost, withholding tax impact, and automatic DRIP reinvestment.'
                )}
              </p>
            </div>
          </div>
          <AppCurrencyBadge currency={currency} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('drip_initial', 'Initial Investment')} ({currSymbol})
            </label>
            <input type="number" value={initialInvestment} onChange={e => setInitialInvestment(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('drip_monthly', 'Monthly Contribution')} ({currSymbol})
            </label>
            <input type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('drip_yield', 'Starting Yield (%)')}</label>
            <input type="number" step="0.1" value={startingYieldPct} onChange={e => setStartingYieldPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('drip_div_growth', 'Dividend Growth (% / yr)')}</label>
            <input type="number" step="0.5" value={dividendGrowthPct} onChange={e => setDividendGrowthPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('drip_price_growth', 'Share Price Growth (% / yr)')}</label>
            <input type="number" step="0.5" value={priceGrowthPct} onChange={e => setPriceGrowthPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('drip_tax', 'Dividend Tax Rate (%)')}</label>
            <input type="number" step="1" value={taxRatePct} onChange={e => setTaxRatePct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('drip_years', 'Horizon (Years)')}</label>
            <input type="number" min="1" max="50" value={years} onChange={e => setYears(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setReinvestDividends(v => !v)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                reinvestDividends
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {reinvestDividends ? t('drip_reinvest_on', 'DRIP: Reinvest ON') : t('drip_reinvest_off', 'DRIP: Cash Payout')}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('drip_final_portfolio', 'Final Portfolio Value')}</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {formatCurrency(result.finalPortfolioValue, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('drip_final_annual', 'Final Annual Net Div.')}</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(result.finalAnnualNetDividend, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('drip_final_monthly', 'Monthly Passive Income')}</div>
            <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
              {formatCurrency(result.finalMonthlyNetDividend, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('drip_yoc', 'Final Yield-on-Cost')}</div>
            <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
              {result.finalYieldOnCostPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Annual Dividend Bar Chart */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {t('drip_chart_title', 'Annual Net Dividend Snowball')}
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {t('drip_cum_div', 'Cumulative Dividends')}: {formatCurrency(result.totalDividendsEarned, currency)}
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[460px] h-52">
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = svgH - padB - frac * (svgH - padT - padB);
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="currentColor" className="text-slate-800" strokeDasharray="3 3" />
                  <text x={padL - 6} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                    {Math.round(maxAnnualDiv * frac).toLocaleString()}
                  </text>
                </g>
              );
            })}
            {result.schedule.map((row, i) => {
              const h = (row.annualNetDividend / maxAnnualDiv) * (svgH - padT - padB);
              const x = padL + i * (barW + barGap);
              const y = svgH - padB - h;
              return (
                <g key={row.year}>
                  <rect x={x} y={y} width={barW} height={Math.max(1, h)} rx="2" fill="#34d399" opacity="0.85" />
                  {(count <= 15 || row.year % 5 === 0 || row.year === 1) && (
                    <text x={x + barW / 2} y={svgH - 8} textAnchor="middle" className="fill-slate-500 text-[9px] font-mono">
                      Y{row.year}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
