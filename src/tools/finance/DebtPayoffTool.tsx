import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Trash2, TrendingDown } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { simulateDebtPayoff, type DebtAccount } from '../../utils/financeSuite.logic';

const INITIAL_DEBTS: DebtAccount[] = [
  { id: 'd1', name: 'Credit Card', balance: 4500, aprPct: 21.9, minPayment: 135 },
  { id: 'd2', name: 'Car Loan', balance: 14000, aprPct: 6.5, minPayment: 310 },
  { id: 'd3', name: 'Personal Loan', balance: 7500, aprPct: 11.2, minPayment: 190 },
];

export const DebtPayoffTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [debts, setDebts] = useState<DebtAccount[]>(INITIAL_DEBTS);
  const [extraMonthly, setExtraMonthly] = useState('350');

  const extraVal = Math.max(0, Number(extraMonthly) || 0);

  const { snowball, avalanche } = useMemo(() => {
    return {
      snowball: simulateDebtPayoff(debts, extraVal, 'snowball'),
      avalanche: simulateDebtPayoff(debts, extraVal, 'avalanche'),
    };
  }, [debts, extraVal]);

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + Math.max(0, d.balance), 0), [debts]);
  const totalMin = useMemo(() => debts.reduce((s, d) => s + Math.max(0, d.minPayment), 0), [debts]);
  const interestSavedByAvalanche = snowball.totalInterestPaid - avalanche.totalInterestPaid;
  const monthsSavedByAvalanche = snowball.monthsToPayoff - avalanche.monthsToPayoff;

  const updateDebt = (id: string, patch: Partial<DebtAccount>) => {
    setDebts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  };

  const addDebt = () => {
    const id = `d_${Date.now()}`;
    setDebts(prev => [
      ...prev,
      { id, name: `${t('debt_account_prefix', 'Debt')} ${prev.length + 1}`, balance: 2500, aprPct: 12, minPayment: 80 },
    ]);
  };

  const removeDebt = (id: string) => {
    setDebts(prev => (prev.length > 1 ? prev.filter(d => d.id !== id) : prev));
  };

  // SVG balance curve comparing Snowball vs Avalanche
  const svgW = 640;
  const svgH = 220;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const maxMonths = Math.max(1, snowball.monthsToPayoff, avalanche.monthsToPayoff);
  const maxBal = Math.max(1, totalDebt);

  const buildPath = (pts: Array<{ month: number; totalBalance: number }>) => {
    if (pts.length === 0) return '';
    return pts
      .map((p, idx) => {
        const x = padL + (p.month / maxMonths) * (svgW - padL - padR);
        const y = svgH - padB - (p.totalBalance / maxBal) * (svgH - padT - padB);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const formatDuration = (months: number, capped: boolean) => {
    if (capped) return '> 50 yrs';
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    if (yrs === 0) return `${rem} ${t('debt_months_short', 'mo')}`;
    if (rem === 0) return `${yrs} ${t('debt_years_short', 'yr')}`;
    return `${yrs} ${t('debt_years_short', 'yr')} ${rem} ${t('debt_months_short', 'mo')}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('debt_title', 'Debt Payoff Planner (Snowball vs. Avalanche)')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'debt_subtitle',
                  'Compare Debt Snowball (smallest balance first) against Debt Avalanche (highest APR first) with extra monthly payments.'
                )}
              </p>
            </div>
          </div>
          <AppCurrencyBadge currency={currency} />
        </div>

        {/* Debt Accounts Editor */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('debt_accounts_heading', 'Active Debts')}
            </h3>
            <button
              onClick={addDebt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('debt_add_row', 'Add Debt')}
            </button>
          </div>

          <div className="space-y-2">
            {debts.map(d => (
              <div
                key={d.id}
                className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-950 border border-slate-800"
              >
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] text-slate-500 mb-0.5">{t('debt_col_name', 'Account Name')}</label>
                  <input
                    type="text"
                    value={d.name}
                    onChange={e => updateDebt(d.id, { name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <label className="block text-[10px] text-slate-500 mb-0.5">
                    {t('debt_col_balance', 'Balance')} ({currSymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={d.balance}
                    onChange={e => updateDebt(d.id, { balance: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-0.5">{t('debt_col_apr', 'APR (%)')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={d.aprPct}
                    onChange={e => updateDebt(d.id, { aprPct: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-0.5">
                    {t('debt_col_min', 'Min / mo')} ({currSymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={d.minPayment}
                    onChange={e => updateDebt(d.id, { minPayment: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="col-span-1 flex justify-end pt-3.5">
                  <button
                    onClick={() => removeDebt(d.id)}
                    disabled={debts.length <= 1}
                    title={t('debt_remove_row', 'Remove debt')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extra Monthly Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('debt_extra_monthly', 'Extra Monthly Payment')} ({currSymbol})
            </label>
            <input
              type="number"
              min="0"
              step="25"
              value={extraMonthly}
              onChange={e => setExtraMonthly(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-emerald-400"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[11px] text-slate-400">{t('debt_total_starting', 'Total Starting Debt')}</span>
            <span className="text-base font-bold font-mono text-white">{formatCurrency(totalDebt, currency)}</span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[11px] text-slate-400">{t('debt_total_monthly_budget', 'Total Monthly Commitment')}</span>
            <span className="text-base font-bold font-mono text-indigo-300">
              {formatCurrency(totalMin + extraVal, currency)}
            </span>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Avalanche */}
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                {t('debt_avalanche_title', 'Avalanche (Highest APR First)')}
              </h3>
              {interestSavedByAvalanche > 1 && (
                <span className="text-[11px] font-mono text-emerald-300">
                  {t('debt_saves_prefix', 'Saves')} {formatCurrency(interestSavedByAvalanche, currency)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-400">{t('debt_time_to_free', 'Debt-Free In')}</div>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {formatDuration(avalanche.monthsToPayoff, avalanche.capped)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">{t('debt_total_interest', 'Total Interest')}</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  {formatCurrency(avalanche.totalInterestPaid, currency)}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800/80">
              <div className="font-semibold text-slate-300">{t('debt_payoff_order', 'Payoff Order')}:</div>
              <div className="flex flex-wrap gap-2">
                {avalanche.payoffOrder.map((p, idx) => (
                  <span key={p.id} className="font-mono text-slate-300">
                    {idx + 1}. {p.name} ({t('debt_month_prefix', 'M')}
                    {p.paidOffMonth})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Snowball */}
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-300">
                {t('debt_snowball_title', 'Snowball (Smallest Balance First)')}
              </h3>
              {monthsSavedByAvalanche > 0 && (
                <span className="text-[11px] font-mono text-slate-400">
                  +{monthsSavedByAvalanche} {t('debt_months_short', 'mo')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-400">{t('debt_time_to_free', 'Debt-Free In')}</div>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {formatDuration(snowball.monthsToPayoff, snowball.capped)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">{t('debt_total_interest', 'Total Interest')}</div>
                <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
                  {formatCurrency(snowball.totalInterestPaid, currency)}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800/80">
              <div className="font-semibold text-slate-300">{t('debt_payoff_order', 'Payoff Order')}:</div>
              <div className="flex flex-wrap gap-2">
                {snowball.payoffOrder.map((p, idx) => (
                  <span key={p.id} className="font-mono text-slate-300">
                    {idx + 1}. {p.name} ({t('debt_month_prefix', 'M')}
                    {p.paidOffMonth})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Curve Chart */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">
            {t('debt_chart_title', 'Remaining Debt Balance Over Time')}
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              {t('debt_avalanche_short', 'Avalanche')}
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-3 h-0.5 bg-indigo-400 inline-block" />
              {t('debt_snowball_short', 'Snowball')}
            </span>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[460px] h-56">
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = svgH - padB - frac * (svgH - padT - padB);
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="currentColor" className="text-slate-800" strokeDasharray="3 3" />
                  <text x={padL - 6} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                    {Math.round(maxBal * frac).toLocaleString()}
                  </text>
                </g>
              );
            })}
            <path d={buildPath(snowball.timeline)} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeDasharray="5 3" />
            <path d={buildPath(avalanche.timeline)} fill="none" stroke="#34d399" strokeWidth="2.5" />
            <text x={svgW / 2} y={svgH - 6} textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
              {t('debt_axis_months', 'Months')} (0 – {maxMonths})
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
