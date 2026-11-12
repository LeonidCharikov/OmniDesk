import React, { useState, useMemo } from 'react';
import { Scale, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol, SUPPORTED_FIAT_CURRENCIES } from '../../services/currencyService';

interface Holding {
  id: number;
  name: string;
  currentValue: string;
  targetPct: string;
}

export const PortfolioRebalancerTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [holdings, setHoldings] = useState<Holding[]>([
    { id: 1, name: 'Global Equities ETF', currentValue: '42000', targetPct: '60' },
    { id: 2, name: 'Government Bonds', currentValue: '18000', targetPct: '25' },
    { id: 3, name: 'Gold / Commodities', currentValue: '7500', targetPct: '10' },
    { id: 4, name: 'Cash / T-Bills', currentValue: '2500', targetPct: '5' },
  ]);
  const [newCash, setNewCash] = useState('5000');

  // DCA vs Lump Sum comparison
  const [lumpCapital, setLumpCapital] = useState('24000');
  const [dcaMonths, setDcaMonths] = useState('12');
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState('8');
  const [horizonYears, setHorizonYears] = useState('10');

  const analysis = useMemo(() => {
    const cashAdd = Number(newCash) || 0;
    const totalCurrent = holdings.reduce((s, h) => s + (Number(h.currentValue) || 0), 0);
    const targetSum = holdings.reduce((s, h) => s + (Number(h.targetPct) || 0), 0);
    const totalAfter = Math.max(0, totalCurrent + cashAdd);

    const rows = holdings.map(h => {
      const cur = Number(h.currentValue) || 0;
      const tgt = Number(h.targetPct) || 0;
      const curPct = totalCurrent > 0 ? (cur / totalCurrent) * 100 : 0;
      const targetVal = targetSum > 0 ? totalAfter * (tgt / targetSum) : 0;
      const delta = targetVal - cur;
      return {
        ...h,
        cur,
        tgt,
        curPct,
        drift: curPct - tgt,
        targetVal,
        delta,
      };
    });

    return { totalCurrent, totalAfter, targetSum, rows };
  }, [holdings, newCash]);

  const dcaComparison = useMemo(() => {
    const cap = Math.max(0, Number(lumpCapital) || 0);
    const months = Math.max(1, Math.min(120, Math.round(Number(dcaMonths) || 12)));
    const rAnnual = (Number(expectedAnnualReturn) || 0) / 100;
    const rMonthly = Math.pow(1 + rAnnual, 1 / 12) - 1;
    const totalMonths = Math.max(months, Math.round((Number(horizonYears) || 10) * 12));

    const lumpFuture = cap * Math.pow(1 + rMonthly, totalMonths);
    const monthlySlice = cap / months;
    let dcaBalance = 0;
    for (let m = 1; m <= totalMonths; m++) {
      if (m <= months) dcaBalance += monthlySlice;
      dcaBalance *= 1 + rMonthly;
    }

    return {
      lumpFuture,
      dcaBalance,
      diff: lumpFuture - dcaBalance,
      monthlySlice,
    };
  }, [lumpCapital, dcaMonths, expectedAnnualReturn, horizonYears]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('rebal_title', 'Portfolio Rebalancer & DCA Planner')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'rebal_subtitle',
                  'Calculate exact buy/sell rebalancing orders with new cash contributions and compare Lump-Sum vs. DCA.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200"
            >
              {SUPPORTED_FIAT_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setHoldings(prev => [
                  ...prev,
                  { id: Date.now(), name: `Asset ${prev.length + 1}`, currentValue: '0', targetPct: '0' },
                ])
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('rebal_add_asset', 'Add Asset')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('rebal_current_total', 'Current Portfolio')}</div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {formatCurrency(analysis.totalCurrent, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <label className="block text-xs text-slate-400 mb-1">
              {t('rebal_new_cash', 'New Contribution / Cash')} ({currSymbol})
            </label>
            <input
              type="number"
              value={newCash}
              onChange={e => setNewCash(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('rebal_target_sum', 'Target Allocation Sum')}</div>
            <div
              className={`text-lg font-bold font-mono mt-0.5 ${
                Math.abs(analysis.targetSum - 100) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {analysis.targetSum.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">{t('rebal_col_asset', 'Asset')}</th>
                <th className="py-2 px-3">{t('rebal_col_value', 'Value')} ({currSymbol})</th>
                <th className="py-2 px-3">{t('rebal_col_cur_pct', 'Current %')}</th>
                <th className="py-2 px-3">{t('rebal_col_target_pct', 'Target %')}</th>
                <th className="py-2 px-3">{t('rebal_col_action', 'Action (Buy / Sell)')}</th>
                <th className="py-2 pl-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {analysis.rows.map(row => (
                <tr key={row.id}>
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={row.name}
                      onChange={e =>
                        setHoldings(prev =>
                          prev.map(h => (h.id === row.id ? { ...h, name: e.target.value } : h))
                        )
                      }
                      className="w-full min-w-[140px] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={row.currentValue}
                      onChange={e =>
                        setHoldings(prev =>
                          prev.map(h => (h.id === row.id ? { ...h, currentValue: e.target.value } : h))
                        )
                      }
                      className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-slate-200"
                    />
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-300">{row.curPct.toFixed(1)}%</td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="1"
                      value={row.targetPct}
                      onChange={e =>
                        setHoldings(prev =>
                          prev.map(h => (h.id === row.id ? { ...h, targetPct: e.target.value } : h))
                        )
                      }
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-slate-200"
                    />
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold">
                    <span
                      className={
                        row.delta > 0.5
                          ? 'text-emerald-400'
                          : row.delta < -0.5
                            ? 'text-rose-400'
                            : 'text-slate-400'
                      }
                    >
                      {row.delta >= 0 ? '+' : ''}
                      {formatCurrency(row.delta, currency)}
                    </span>
                  </td>
                  <td className="py-2 pl-2 text-right">
                    {holdings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setHoldings(prev => prev.filter(h => h.id !== row.id))}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                        title={t('delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DCA vs Lump Sum */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">
          {t('rebal_dca_title', 'Lump-Sum vs. Dollar-Cost Averaging (DCA)')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('rebal_dca_capital', 'Total Capital')} ({currSymbol})
            </label>
            <input
              type="number"
              value={lumpCapital}
              onChange={e => setLumpCapital(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('rebal_dca_months', 'DCA Deploy (Months)')}
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={dcaMonths}
              onChange={e => setDcaMonths(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('rebal_dca_return', 'Annual Return (%)')}
            </label>
            <input
              type="number"
              step="0.5"
              value={expectedAnnualReturn}
              onChange={e => setExpectedAnnualReturn(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('rebal_dca_horizon', 'Horizon (Years)')}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={horizonYears}
              onChange={e => setHorizonYears(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('rebal_lump_result', 'Lump-Sum End Value')}</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(dcaComparison.lumpFuture, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">
              {t('rebal_dca_result', 'DCA End Value')} ({formatCurrency(dcaComparison.monthlySlice, currency)}/{t('be_months_short', 'mo')})
            </div>
            <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
              {formatCurrency(dcaComparison.dcaBalance, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('rebal_dca_diff', 'Lump-Sum Advantage')}</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {formatCurrency(dcaComparison.diff, currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
