import React, { useState, useMemo } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol, SUPPORTED_FIAT_CURRENCIES } from '../../services/currencyService';

export const FreelanceRateTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [targetNetAnnual, setTargetNetAnnual] = useState('900000');
  const [monthlyOverhead, setMonthlyOverhead] = useState('12000');
  const [taxRatePct, setTaxRatePct] = useState('25');
  const [vacationDays, setVacationDays] = useState('25');
  const [sickHolidaysDays, setSickHolidaysDays] = useState('15');
  const [hoursPerDay, setHoursPerDay] = useState('8');
  const [billablePct, setBillablePct] = useState('70');

  const calc = useMemo(() => {
    const netGoal = Math.max(0, Number(targetNetAnnual) || 0);
    const annualOverhead = Math.max(0, Number(monthlyOverhead) || 0) * 12;
    const tax = Math.max(0, Math.min(80, Number(taxRatePct) || 0)) / 100;
    const vac = Math.max(0, Number(vacationDays) || 0);
    const off = Math.max(0, Number(sickHolidaysDays) || 0);
    const hrsDay = Math.max(1, Number(hoursPerDay) || 8);
    const billPct = Math.max(10, Math.min(100, Number(billablePct) || 70)) / 100;

    // 52 weeks * 5 weekdays = 260 working weekdays baseline
    const workingDays = Math.max(1, 260 - vac - off);
    const totalWorkHours = workingDays * hrsDay;
    const billableHours = totalWorkHours * billPct;

    // NetGoal = (GrossRevenue - AnnualOverhead) * (1 - tax)
    const requiredPreTaxIncome = netGoal / (1 - tax);
    const requiredGrossRevenue = requiredPreTaxIncome + annualOverhead;

    const hourlyRate = requiredGrossRevenue / billableHours;
    const dailyRate = hourlyRate * (hrsDay * billPct);
    const fullDayRate = hourlyRate * hrsDay;
    const weeklyRetainer = requiredGrossRevenue / Math.max(1, workingDays / 5);
    const monthlyRetainer = requiredGrossRevenue / 12;

    // Equivalent salaried employee offer (~1.25x-1.35x benefits/payroll comparison)
    const equivalentSalaryGross = netGoal / (1 - tax);

    return {
      workingDays,
      billableHours,
      annualOverhead,
      requiredGrossRevenue,
      hourlyRate,
      dailyRate,
      fullDayRate,
      weeklyRetainer,
      monthlyRetainer,
      equivalentSalaryGross,
    };
  }, [
    targetNetAnnual,
    monthlyOverhead,
    taxRatePct,
    vacationDays,
    sickHolidaysDays,
    hoursPerDay,
    billablePct,
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <BriefcaseBusiness className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('free_title', 'Freelance Rate & Salary Converter')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'free_subtitle',
                  'Determine sustainable hourly, daily, and monthly retainer rates accounting for taxes, overhead, PTO, and utilization.'
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
            <label className="block text-xs text-slate-400 mb-1">
              {t('free_net_annual', 'Desired Net Income / yr')} ({currSymbol})
            </label>
            <input
              type="number"
              value={targetNetAnnual}
              onChange={e => setTargetNetAnnual(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('free_overhead', 'Business Overhead / mo')} ({currSymbol})
            </label>
            <input
              type="number"
              value={monthlyOverhead}
              onChange={e => setMonthlyOverhead(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('free_tax_pct', 'Effective Tax & Social (%)')}
            </label>
            <input
              type="number"
              min={0}
              max={75}
              value={taxRatePct}
              onChange={e => setTaxRatePct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('free_billable_pct', 'Billable Utilization (%)')}
            </label>
            <input
              type="number"
              min={10}
              max={100}
              value={billablePct}
              onChange={e => setBillablePct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('free_vacation', 'Vacation Days / yr')}
            </label>
            <input
              type="number"
              value={vacationDays}
              onChange={e => setVacationDays(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('free_holidays', 'Holidays & Sick Days')}
            </label>
            <input
              type="number"
              value={sickHolidaysDays}
              onChange={e => setSickHolidaysDays(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('free_hours_day', 'Working Hours / Day')}
            </label>
            <input
              type="number"
              value={hoursPerDay}
              onChange={e => setHoursPerDay(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('free_billable_hours', 'Billable Hours / yr')}</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {Math.round(calc.billableHours).toLocaleString()} h ({calc.workingDays} d)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40">
            <div className="text-xs text-slate-400">{t('free_hourly_rate', 'Target Hourly Rate')}</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {formatCurrency(calc.hourlyRate, currency)}/h
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('free_day_rate', 'Full Day Rate (8h)')}</div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
              {formatCurrency(calc.fullDayRate, currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('free_monthly_retainer', 'Monthly Revenue Goal')}</div>
            <div className="text-xl font-bold font-mono text-slate-200 mt-1">
              {formatCurrency(calc.monthlyRetainer, currency)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('free_gross_annual', 'Required Gross Revenue')}</div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">
              {formatCurrency(calc.requiredGrossRevenue, currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
