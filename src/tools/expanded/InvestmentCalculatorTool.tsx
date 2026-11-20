import React, { useMemo, useState } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, getCurrencySymbol, formatCurrency } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { computeInvestmentSchedule } from '../../utils/toolUpgrades.logic';
import { input, box, secondary, Header, downloadText } from './shared';

/* ─────────────────────────────────────────────────────────────
   INVESTMENT & COMPOUND INTEREST CALCULATOR
   (Unified with Periodic Finance Calculator: compounding frequency,
    inflation-adjusted real return, interactive SVG chart & schedule)
   ───────────────────────────────────────────────────────────── */
const PRESETS = [
  { key: 'inv_preset_savings', label: 'High-Yield Savings', initial: 50000, addition: 2000, rate: 4.5, freq: 12, years: 10, inflation: 2.5 },
  { key: 'inv_preset_index', label: 'Global Index ETF', initial: 100000, addition: 5000, rate: 8, freq: 12, years: 20, inflation: 2.5 },
  { key: 'inv_preset_quarterly', label: 'Quarterly Dividend', initial: 150000, addition: 10000, rate: 6.5, freq: 4, years: 15, inflation: 2 },
];

export const InvestmentCalculatorTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [initial, setInitial] = useState(50000);
  const [periodicAddition, setPeriodicAddition] = useState(2500);
  const [rate, setRate] = useState(8);
  const [compoundingPerYear, setCompoundingPerYear] = useState(12);
  const [years, setYears] = useState(15);
  const [inflationPct, setInflationPct] = useState(2.5);
  const [adjustForInflation, setAdjustForInflation] = useState(true);
  const [contributeAtStart, setContributeAtStart] = useState(false);
  const [showTable, setShowTable] = useState(true);

  const summary = useMemo(
    () =>
      computeInvestmentSchedule({
        initial,
        periodicAddition,
        annualRatePct: rate,
        compoundingPerYear,
        years,
        annualInflationPct: adjustForInflation ? inflationPct : 0,
        contributeAtStart,
      }),
    [initial, periodicAddition, rate, compoundingPerYear, years, inflationPct, adjustForInflation, contributeAtStart]
  );

  const interestSharePct =
    summary.finalNominal > 0 ? Math.round((summary.totalInterest / summary.finalNominal) * 100) : 0;

  const exportCsv = () => {
    const headers = ['Year', 'Total Contributed', 'Yearly Interest', 'Total Interest', 'Nominal Balance', 'Real Balance'];
    const lines = [headers.join(',')];
    for (const row of summary.schedule) {
      lines.push(
        [
          row.year,
          row.totalContributed.toFixed(2),
          row.yearlyInterest.toFixed(2),
          row.totalInterest.toFixed(2),
          row.nominalBalance.toFixed(2),
          row.realBalance.toFixed(2),
        ].join(',')
      );
    }
    void downloadText('investment-schedule.csv', lines.join('\n'), 'csv', t('save_csv', 'Save CSV'));
  };

  // SVG chart dimensions
  const chartW = 640;
  const chartH = 220;
  const padL = 12;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxVal = Math.max(1, summary.finalNominal);

  const barCount = summary.schedule.length;
  const barGap = barCount > 30 ? 2 : 4;
  const barWidth = Math.max(3, (plotW - barGap * Math.max(0, barCount - 1)) / Math.max(1, barCount));

  const realLinePoints = summary.schedule
    .map((row, idx) => {
      const x = padL + idx * (barWidth + barGap) + barWidth / 2;
      const y = padT + plotH - (row.realBalance / maxVal) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header
          title="Investment Calculator"
          desc={t(
            'investment_calculator_desc',
            'Compound interest & periodic investment planner with compounding frequency, inflation adjustment, growth chart, and yearly schedule.'
          )}
        />
        <AppCurrencyBadge currency={currency} />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">{t('quick_presets', 'Presets:')}</span>
        {PRESETS.map(p => (
          <button
            key={p.key}
            type="button"
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            onClick={() => {
              setInitial(p.initial);
              setPeriodicAddition(p.addition);
              setRate(p.rate);
              setCompoundingPerYear(p.freq);
              setYears(p.years);
              setInflationPct(p.inflation);
            }}
          >
            {t(p.key, p.label)}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className={box + ' space-y-4'}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            {t('initial_deposit', 'Initial deposit')} ({currSymbol})
            <input
              className={input + ' mt-1'}
              type="number"
              min="0"
              value={initial}
              onChange={e => setInitial(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('regular_addition', 'Contribution per period')} ({currSymbol})
            <input
              className={input + ' mt-1'}
              type="number"
              min="0"
              value={periodicAddition}
              onChange={e => setPeriodicAddition(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('annual_return', 'Expected annual return (%)')}
            <input
              className={input + ' mt-1'}
              type="number"
              step="0.1"
              value={rate}
              onChange={e => setRate(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('compounding_frequency', 'Compounding & contribution frequency')}
            <select
              className={input + ' mt-1'}
              value={compoundingPerYear}
              onChange={e => setCompoundingPerYear(Number(e.target.value))}
            >
              <option value={12}>{t('freq_monthly', 'Monthly (12× / year)')}</option>
              <option value={4}>{t('freq_quarterly', 'Quarterly (4× / year)')}</option>
              <option value={2}>{t('freq_semiannually', 'Semi-annually (2× / year)')}</option>
              <option value={1}>{t('freq_annually', 'Annually (1× / year)')}</option>
              <option value={365}>{t('freq_daily', 'Daily (365× / year)')}</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('investment_years', 'Horizon (years)')}
            <input
              className={input + ' mt-1'}
              type="number"
              min="1"
              max="80"
              value={years}
              onChange={e => setYears(Math.max(1, Math.min(80, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('inv_inflation_rate', 'Annual inflation (%)')}
            <input
              className={input + ' mt-1'}
              type="number"
              step="0.1"
              min="0"
              max="50"
              disabled={!adjustForInflation}
              value={inflationPct}
              onChange={e => setInflationPct(Math.max(0, Number(e.target.value)))}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-5 pt-1 text-xs text-slate-300">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={adjustForInflation}
              onChange={e => setAdjustForInflation(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700"
            />
            {t('inv_adjust_inflation', 'Show inflation-adjusted purchasing power')}
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={contributeAtStart}
              onChange={e => setContributeAtStart(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700"
            />
            {t('inv_contribute_start', 'Contribute at beginning of each period (annuity due)')}
          </label>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={box + ' text-center'}>
          <span className="text-xs text-slate-400 block">{t('total_invested_by_user', 'Total contributed')}</span>
          <span className="text-lg font-bold text-slate-200 mt-1 block">{formatCurrency(summary.totalContributed, currency)}</span>
          <span className="text-[11px] text-slate-500">{100 - interestSharePct}% {t('inv_of_total', 'of final')}</span>
        </div>
        <div className={box + ' text-center'}>
          <span className="text-xs text-slate-400 block">{t('total_compound_interest', 'Compound interest earned')}</span>
          <span className="text-lg font-bold text-indigo-400 mt-1 block">+{formatCurrency(summary.totalInterest, currency)}</span>
          <span className="text-[11px] text-slate-500">
            {interestSharePct}% · APY {summary.effectiveAnnualYieldPct.toFixed(2)}%
          </span>
        </div>
        <div className={box + ' text-center bg-emerald-950/20 border-emerald-800/40'}>
          <span className="text-xs text-slate-400 block">{t('final_portfolio_value', 'Final nominal value')}</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">{formatCurrency(summary.finalNominal, currency)}</span>
        </div>
        <div className={box + ' text-center bg-amber-950/15 border-amber-800/40'}>
          <span className="text-xs text-slate-400 block">{t('inv_real_value', 'Real value (today’s money)')}</span>
          <span className="text-xl font-bold text-amber-300 mt-1 block">{formatCurrency(summary.finalReal, currency)}</span>
          <span className="text-[11px] text-slate-500">
            {adjustForInflation ? `${inflationPct}% ${t('inv_inflation_short', 'inflation')}` : t('inv_no_inflation', 'Unadjusted')}
          </span>
        </div>
      </div>

      {/* Stacked Growth SVG Chart */}
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-200">{t('inv_growth_chart', 'Portfolio Growth Over Time')}</span>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" />
              {t('total_invested_by_user', 'Contributed')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
              {t('total_compound_interest', 'Interest')}
            </span>
            {adjustForInflation && inflationPct > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                {t('inv_real_value', 'Real value')}
              </span>
            )}
          </div>
        </div>

        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-52 overflow-visible" role="img" aria-label={t('inv_growth_chart', 'Portfolio Growth Over Time')}>
          {summary.schedule.map((row, idx) => {
            const x = padL + idx * (barWidth + barGap);
            const totalH = (row.nominalBalance / maxVal) * plotH;
            const contribH = (row.totalContributed / maxVal) * plotH;
            const interestH = Math.max(0, totalH - contribH);
            const yContrib = padT + plotH - contribH;
            const yInterest = yContrib - interestH;
            const showTick = barCount <= 15 || row.year === 1 || row.year === barCount || row.year % 5 === 0;

            return (
              <g key={row.year}>
                <rect x={x} y={yContrib} width={barWidth} height={Math.max(0, contribH)} rx={1.5} className="fill-slate-500/80">
                  <title>{`Year ${row.year}: ${formatCurrency(row.nominalBalance, currency)}`}</title>
                </rect>
                <rect x={x} y={yInterest} width={barWidth} height={interestH} rx={1.5} className="fill-indigo-500/90">
                  <title>{`Year ${row.year} interest: +${formatCurrency(row.totalInterest, currency)}`}</title>
                </rect>
                {showTick && (
                  <text x={x + barWidth / 2} y={chartH - 6} textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
                    {row.year}
                  </text>
                )}
              </g>
            );
          })}
          {adjustForInflation && inflationPct > 0 && summary.schedule.length > 1 && (
            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeLinejoin="round"
              points={realLinePoints}
            />
          )}
        </svg>
      </div>

      {/* Year-by-Year Breakdown Table */}
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
            onClick={() => setShowTable(v => !v)}
          >
            {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {t('inv_yearly_breakdown', 'Year-by-Year Breakdown')} ({summary.schedule.length})
          </button>
          <button type="button" className={secondary} onClick={exportCsv}>
            <Download className="w-3.5 h-3.5 inline mr-1" />
            {t('export_csv', 'Export CSV')}
          </button>
        </div>

        {showTable && (
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 sticky top-0">
                  <th className="p-2 text-left text-slate-400">{t('year_label', 'Year')}</th>
                  <th className="p-2 text-right text-slate-400">{t('total_invested_by_user', 'Contributed')}</th>
                  <th className="p-2 text-right text-slate-400">{t('inv_yearly_interest', 'Yearly Interest')}</th>
                  <th className="p-2 text-right text-slate-400">{t('final_portfolio_value', 'Nominal Balance')}</th>
                  {adjustForInflation && (
                    <th className="p-2 text-right text-slate-400">{t('inv_real_value', 'Real Value')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {summary.schedule.map(row => (
                  <tr key={row.year} className="border-b border-slate-800/50 hover:bg-slate-800/30 font-mono">
                    <td className="p-2 text-slate-300">{row.year}</td>
                    <td className="p-2 text-right text-slate-300">{formatCurrency(row.totalContributed, currency)}</td>
                    <td className="p-2 text-right text-indigo-400">+{formatCurrency(row.yearlyInterest, currency)}</td>
                    <td className="p-2 text-right text-emerald-400 font-semibold">{formatCurrency(row.nominalBalance, currency)}</td>
                    {adjustForInflation && (
                      <td className="p-2 text-right text-amber-300">{formatCurrency(row.realBalance, currency)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
