import React, { useState, useMemo } from 'react';
import { PiggyBank } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol, SUPPORTED_FIAT_CURRENCIES } from '../../services/currencyService';

interface ProjectionYear {
  year: number;
  age: number;
  realBalance: number;
  nominalBalance: number;
  contributions: number;
}

export const FireSimulatorTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [currentAge, setCurrentAge] = useState('30');
  const [retireAgeTarget, setRetireAgeTarget] = useState('65');
  const [currentPortfolio, setCurrentPortfolio] = useState('400000');
  const [monthlySavings, setMonthlySavings] = useState('25000');
  const [annualExpenses, setAnnualExpenses] = useState('480000');
  const [nominalReturnPct, setNominalReturnPct] = useState('8');
  const [inflationPct, setInflationPct] = useState('2.5');
  const [swrPct, setSwrPct] = useState('4');

  const sim = useMemo(() => {
    const ageNow = Math.max(15, Math.min(85, Number(currentAge) || 30));
    const ageTarget = Math.max(ageNow + 1, Math.min(95, Number(retireAgeTarget) || 65));
    const startBal = Math.max(0, Number(currentPortfolio) || 0);
    const monthly = Math.max(0, Number(monthlySavings) || 0);
    const expenses = Math.max(0, Number(annualExpenses) || 0);
    const nom = (Number(nominalReturnPct) || 0) / 100;
    const inf = (Number(inflationPct) || 0) / 100;
    const swr = Math.max(0.5, Number(swrPct) || 4) / 100;

    // Fisher equation real return
    const realAnnualReturn = (1 + nom) / (1 + inf) - 1;
    const realMonthlyReturn = Math.pow(1 + Math.max(-0.5, realAnnualReturn), 1 / 12) - 1;
    const nomMonthlyReturn = Math.pow(1 + Math.max(-0.5, nom), 1 / 12) - 1;

    const fireNumber = expenses / swr;
    const leanFireNumber = (expenses * 0.75) / swr;
    const fatFireNumber = (expenses * 1.5) / swr;

    const yearsToTraditional = ageTarget - ageNow;
    const coastFireNumber =
      realAnnualReturn > -0.5
        ? fireNumber / Math.pow(1 + realAnnualReturn, yearsToTraditional)
        : fireNumber;

    let realBal = startBal;
    let nomBal = startBal;
    let totalContrib = startBal;
    let yearsToFire: number | null = startBal >= fireNumber ? 0 : null;
    const series: ProjectionYear[] = [
      { year: 0, age: ageNow, realBalance: realBal, nominalBalance: nomBal, contributions: totalContrib },
    ];

    const maxYears = 50;
    for (let y = 1; y <= maxYears; y++) {
      for (let m = 1; m <= 12; m++) {
        realBal = realBal * (1 + realMonthlyReturn) + monthly;
        nomBal = nomBal * (1 + nomMonthlyReturn) + monthly;
        totalContrib += monthly;
        if (yearsToFire === null && realBal >= fireNumber) {
          yearsToFire = (y - 1) + m / 12;
        }
      }
      if (y <= 40) {
        series.push({
          year: y,
          age: ageNow + y,
          realBalance: realBal,
          nominalBalance: nomBal,
          contributions: totalContrib,
        });
      }
    }

    const progressPct = fireNumber > 0 ? Math.min(100, (startBal / fireNumber) * 100) : 0;
    const monthlyPassiveNow = (startBal * swr) / 12;

    return {
      realAnnualReturn: realAnnualReturn * 100,
      fireNumber,
      leanFireNumber,
      fatFireNumber,
      coastFireNumber,
      yearsToFire,
      fireAge: yearsToFire !== null ? ageNow + yearsToFire : null,
      progressPct,
      monthlyPassiveNow,
      series: series.filter((_, i) => i === 0 || i % 5 === 0 || i === series.length - 1),
    };
  }, [
    currentAge,
    retireAgeTarget,
    currentPortfolio,
    monthlySavings,
    annualExpenses,
    nominalReturnPct,
    inflationPct,
    swrPct,
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('fire_title', 'FIRE & Inflation-Adjusted Retirement Simulator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'fire_subtitle',
                  'Simulate Financial Independence (FIRE), Coast-FIRE, real purchasing power, and safe withdrawal rates.'
                )}
              </p>
            </div>
          </div>

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
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('fire_age', 'Current Age')}</label>
            <input
              type="number"
              value={currentAge}
              onChange={e => setCurrentAge(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('fire_target_age', 'Trad. Retire Age (Coast)')}
            </label>
            <input
              type="number"
              value={retireAgeTarget}
              onChange={e => setRetireAgeTarget(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('fire_portfolio', 'Current Portfolio')} ({currSymbol})
            </label>
            <input
              type="number"
              value={currentPortfolio}
              onChange={e => setCurrentPortfolio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('fire_monthly_save', 'Monthly Savings')} ({currSymbol})
            </label>
            <input
              type="number"
              value={monthlySavings}
              onChange={e => setMonthlySavings(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('fire_annual_exp', 'Annual Expenses')} ({currSymbol})
            </label>
            <input
              type="number"
              value={annualExpenses}
              onChange={e => setAnnualExpenses(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('fire_nom_return', 'Nominal Return (%)')}
            </label>
            <input
              type="number"
              step="0.5"
              value={nominalReturnPct}
              onChange={e => setNominalReturnPct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('fire_inflation', 'Inflation (%)')}
            </label>
            <input
              type="number"
              step="0.5"
              value={inflationPct}
              onChange={e => setInflationPct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('fire_swr', 'Safe Withdrawal (%)')}
            </label>
            <input
              type="number"
              step="0.25"
              value={swrPct}
              onChange={e => setSwrPct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {t('fire_progress', 'Progress to Standard FIRE')} ({sim.progressPct.toFixed(1)}%)
            </span>
            <span className="font-mono text-indigo-300">
              {t('fire_real_return', 'Real Return')}: {sim.realAnnualReturn.toFixed(2)}% / yr
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all"
              style={{ width: `${sim.progressPct}%` }}
            />
          </div>
        </div>

        {/* Core KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('fire_number', 'FIRE Target Number')}</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(sim.fireNumber, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('fire_years_left', 'Years to FIRE')}</div>
            <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
              {sim.yearsToFire !== null
                ? `${sim.yearsToFire.toFixed(1)} ${t('npv_yrs_short', 'yrs')} (${t('fire_age_short', 'Age')} ${sim.fireAge?.toFixed(1)})`
                : '> 50 yrs'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('fire_coast', 'Coast-FIRE Number')}</div>
            <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
              {formatCurrency(sim.coastFireNumber, currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('fire_passive_now', 'Current Passive / mo')}</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {formatCurrency(sim.monthlyPassiveNow, currency)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
            <span className="text-slate-400">{t('fire_lean', 'Lean FIRE (75% expenses)')}</span>
            <span className="font-mono text-slate-200">{formatCurrency(sim.leanFireNumber, currency)}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
            <span className="text-slate-400">{t('fire_fat', 'Fat FIRE (150% expenses)')}</span>
            <span className="font-mono text-slate-200">{formatCurrency(sim.fatFireNumber, currency)}</span>
          </div>
        </div>
      </div>

      {/* Milestone Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          {t('fire_milestones', 'Real vs. Nominal Portfolio Milestones')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4">{t('npv_year', 'Year')}</th>
                <th className="py-2 px-4">{t('fire_age_short', 'Age')}</th>
                <th className="py-2 px-4">{t('fire_col_contrib', 'Total Contributed')}</th>
                <th className="py-2 px-4">{t('fire_col_real', "Real Value (Today's Money)")}</th>
                <th className="py-2 pl-4">{t('fire_col_nominal', 'Nominal Value')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sim.series.map(row => (
                <tr key={row.year}>
                  <td className="py-2 pr-4 text-slate-300">{row.year}</td>
                  <td className="py-2 px-4 text-slate-400">{row.age}</td>
                  <td className="py-2 px-4 text-slate-300">{formatCurrency(row.contributions, currency)}</td>
                  <td className="py-2 px-4 text-emerald-400 font-semibold">
                    {formatCurrency(row.realBalance, currency)}
                  </td>
                  <td className="py-2 pl-4 text-indigo-300">{formatCurrency(row.nominalBalance, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
