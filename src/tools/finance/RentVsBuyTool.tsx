import React, { useState, useMemo } from 'react';
import { Home } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { simulateRentVsBuy } from '../../utils/financeSuite.logic';

export const RentVsBuyTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [homePrice, setHomePrice] = useState('450000');
  const [downPaymentPct, setDownPaymentPct] = useState('20');
  const [mortgageRatePct, setMortgageRatePct] = useState('5.5');
  const [loanTermYears, setLoanTermYears] = useState('30');
  const [propertyTaxPct, setPropertyTaxPct] = useState('1.0');
  const [maintenancePct, setMaintenancePct] = useState('1.0');
  const [homeAppreciationPct, setHomeAppreciationPct] = useState('3.5');
  const [closingBuyPct, setClosingBuyPct] = useState('3.0');
  const [closingSellPct, setClosingSellPct] = useState('5.0');
  const [monthlyRent, setMonthlyRent] = useState('2000');
  const [rentInflationPct, setRentInflationPct] = useState('3.0');
  const [investmentReturnPct, setInvestmentReturnPct] = useState('7.0');
  const [horizonYears, setHorizonYears] = useState('15');

  const result = useMemo(() => {
    return simulateRentVsBuy({
      homePrice: Number(homePrice) || 0,
      downPaymentPct: Number(downPaymentPct) || 0,
      mortgageRatePct: Number(mortgageRatePct) || 0,
      loanTermYears: Number(loanTermYears) || 30,
      propertyTaxPct: Number(propertyTaxPct) || 0,
      maintenancePct: Number(maintenancePct) || 0,
      homeAppreciationPct: Number(homeAppreciationPct) || 0,
      closingBuyPct: Number(closingBuyPct) || 0,
      closingSellPct: Number(closingSellPct) || 0,
      monthlyRent: Number(monthlyRent) || 0,
      rentInflationPct: Number(rentInflationPct) || 0,
      investmentReturnPct: Number(investmentReturnPct) || 0,
      horizonYears: Number(horizonYears) || 15,
    });
  }, [
    homePrice,
    downPaymentPct,
    mortgageRatePct,
    loanTermYears,
    propertyTaxPct,
    maintenancePct,
    homeAppreciationPct,
    closingBuyPct,
    closingSellPct,
    monthlyRent,
    rentInflationPct,
    investmentReturnPct,
    horizonYears,
  ]);

  const svgW = 640;
  const svgH = 220;
  const padL = 62;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const allVals = result.schedule.flatMap(r => [r.buyNetWorth, r.rentNetWorth]);
  const maxVal = Math.max(1, ...allVals);
  const minVal = Math.min(0, ...allVals);
  const span = Math.max(1, maxVal - minVal);
  const nYears = Math.max(1, result.schedule.length);

  const toX = (yr: number) => padL + ((yr - 1) / Math.max(1, nYears - 1)) * (svgW - padL - padR);
  const toY = (v: number) => svgH - padB - ((v - minVal) / span) * (svgH - padT - padB);

  const buyPath = result.schedule.map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(r.year).toFixed(1)} ${toY(r.buyNetWorth).toFixed(1)}`).join(' ');
  const rentPath = result.schedule.map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(r.year).toFixed(1)} ${toY(r.rentNetWorth).toFixed(1)}`).join(' ');

  const buyWins = result.advantageBuy >= 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Home className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('rvb_title', 'Rent vs. Buy Home Calculator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'rvb_subtitle',
                  'Compare long-term net worth of buying a home versus renting and investing the down payment and monthly savings.'
                )}
              </p>
            </div>
          </div>
          <AppCurrencyBadge currency={currency} />
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('rvb_home_price', 'Home Price')} ({currSymbol})
            </label>
            <input type="number" value={homePrice} onChange={e => setHomePrice(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_down_pct', 'Down Payment (%)')}</label>
            <input type="number" step="1" value={downPaymentPct} onChange={e => setDownPaymentPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_mortgage_rate', 'Mortgage Rate (%)')}</label>
            <input type="number" step="0.1" value={mortgageRatePct} onChange={e => setMortgageRatePct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_loan_term', 'Loan Term (yrs)')}</label>
            <input type="number" value={loanTermYears} onChange={e => setLoanTermYears(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_monthly_rent', 'Monthly Rent')} ({currSymbol})</label>
            <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_rent_inf', 'Rent Growth (% / yr)')}</label>
            <input type="number" step="0.25" value={rentInflationPct} onChange={e => setRentInflationPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_home_apprec', 'Home Appreciation (% / yr)')}</label>
            <input type="number" step="0.25" value={homeAppreciationPct} onChange={e => setHomeAppreciationPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_inv_return', 'Alt. Investment Return (%)')}</label>
            <input type="number" step="0.25" value={investmentReturnPct} onChange={e => setInvestmentReturnPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_prop_tax', 'Property Tax (% / yr)')}</label>
            <input type="number" step="0.1" value={propertyTaxPct} onChange={e => setPropertyTaxPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_maint_pct', 'Maintenance (% / yr)')}</label>
            <input type="number" step="0.1" value={maintenancePct} onChange={e => setMaintenancePct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_closing_costs', 'Buy / Sell Closing (%)')}</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" step="0.5" value={closingBuyPct} onChange={e => setClosingBuyPct(e.target.value)} className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200" />
              <input type="number" step="0.5" value={closingSellPct} onChange={e => setClosingSellPct(e.target.value)} className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('rvb_horizon', 'Holding Horizon (yrs)')}</label>
            <input type="number" min="1" max="50" value={horizonYears} onChange={e => setHorizonYears(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('rvb_monthly_mortgage', 'Monthly Mortgage (P&I)')}</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {formatCurrency(result.monthlyMortgagePayment, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('rvb_breakeven', 'Buy Break-Even Year')}</div>
            <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
              {result.breakEvenYear !== null
                ? `${t('npv_year', 'Year')} ${result.breakEvenYear}`
                : t('rvb_never_breakeven', 'Rent ahead in horizon')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('rvb_buy_net_worth', 'Final Buy Net Worth')}</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(result.finalBuyNetWorth, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('rvb_verdict_advantage', 'Net Worth Advantage')}</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${buyWins ? 'text-emerald-400' : 'text-amber-400'}`}>
              {buyWins ? t('rvb_buy_wins', 'Buy +') : t('rvb_rent_wins', 'Rent +')}
              {formatCurrency(Math.abs(result.advantageBuy), currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Dual-line SVG Chart */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">
            {t('rvb_chart_title', 'Projected Net Worth: Buy vs. Rent & Invest')}
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              {t('rvb_legend_buy', 'Buy Equity + Side Inv.')}
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" />
              {t('rvb_legend_rent', 'Rent + Invested Cash')}
            </span>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[460px] h-56">
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const val = minVal + span * frac;
              const y = toY(val);
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="currentColor" className="text-slate-800" strokeDasharray="3 3" />
                  <text x={padL - 6} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                    {Math.round(val).toLocaleString()}
                  </text>
                </g>
              );
            })}
            <path d={rentPath} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="5 3" />
            <path d={buyPath} fill="none" stroke="#34d399" strokeWidth="2.5" />
          </svg>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">{t('npv_year', 'Year')}</th>
                <th className="py-2 px-3">{t('rvb_col_home_val', 'Home Value')}</th>
                <th className="py-2 px-3">{t('rvb_col_loan', 'Loan Left')}</th>
                <th className="py-2 px-3">{t('rvb_col_buy_nw', 'Buy Net Worth')}</th>
                <th className="py-2 pl-3">{t('rvb_col_rent_nw', 'Rent Net Worth')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {result.schedule
                .filter((_, idx) => idx === 0 || (idx + 1) % 3 === 0 || idx === result.schedule.length - 1)
                .map(row => (
                  <tr key={row.year}>
                    <td className="py-2 pr-3 text-slate-300">{row.year}</td>
                    <td className="py-2 px-3 text-slate-300">{formatCurrency(row.homeValue, currency)}</td>
                    <td className="py-2 px-3 text-slate-400">{formatCurrency(row.loanBalance, currency)}</td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold">{formatCurrency(row.buyNetWorth, currency)}</td>
                    <td className="py-2 pl-3 text-amber-300">{formatCurrency(row.rentNetWorth, currency)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
