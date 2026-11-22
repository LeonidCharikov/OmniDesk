import React, { useState, useMemo } from 'react';
import { BriefcaseBusiness, Calculator } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { computeProgressiveSalaryTax, type TaxBracket } from '../../utils/financeSuite.logic';

interface TaxPreset {
  id: string;
  label: string;
  grossAnnual: number;
  standardDeduction: number;
  employeeSocialHealthPct: number;
  employerPayrollPct: number;
  taxCreditAnnual: number;
  brackets: TaxBracket[];
}

const TAX_PRESETS: TaxPreset[] = [
  {
    id: 'cz',
    label: 'Czechia (CZK)',
    grossAnnual: 780000,
    standardDeduction: 0,
    employeeSocialHealthPct: 11.6,
    employerPayrollPct: 33.8,
    taxCreditAnnual: 30840,
    brackets: [
      { upTo: 1582812, ratePct: 15 },
      { upTo: null, ratePct: 23 },
    ],
  },
  {
    id: 'us',
    label: 'US Single (USD)',
    grossAnnual: 95000,
    standardDeduction: 14600,
    employeeSocialHealthPct: 7.65,
    employerPayrollPct: 7.65,
    taxCreditAnnual: 0,
    brackets: [
      { upTo: 11600, ratePct: 10 },
      { upTo: 47150, ratePct: 12 },
      { upTo: 100525, ratePct: 22 },
      { upTo: 191950, ratePct: 24 },
      { upTo: null, ratePct: 32 },
    ],
  },
  {
    id: 'de',
    label: 'Germany (EUR)',
    grossAnnual: 65000,
    standardDeduction: 11604,
    employeeSocialHealthPct: 20.3,
    employerPayrollPct: 20.3,
    taxCreditAnnual: 0,
    brackets: [
      { upTo: 17005, ratePct: 14 },
      { upTo: 66760, ratePct: 30 },
      { upTo: 277825, ratePct: 42 },
      { upTo: null, ratePct: 45 },
    ],
  },
  {
    id: 'uk',
    label: 'UK (GBP)',
    grossAnnual: 55000,
    standardDeduction: 12570,
    employeeSocialHealthPct: 8,
    employerPayrollPct: 13.8,
    taxCreditAnnual: 0,
    brackets: [
      { upTo: 37700, ratePct: 20 },
      { upTo: 125140, ratePct: 40 },
      { upTo: null, ratePct: 45 },
    ],
  },
];

export const FreelanceRateTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [tab, setTab] = useState<'freelance' | 'salary'>('freelance');

  // Freelance Rate state
  const [targetNetAnnual, setTargetNetAnnual] = useState('900000');
  const [monthlyOverhead, setMonthlyOverhead] = useState('12000');
  const [taxRatePct, setTaxRatePct] = useState('25');
  const [vacationDays, setVacationDays] = useState('25');
  const [sickHolidaysDays, setSickHolidaysDays] = useState('15');
  const [hoursPerDay, setHoursPerDay] = useState('8');
  const [billablePct, setBillablePct] = useState('70');

  // Salary Tax & Net Pay state
  const [grossAnnual, setGrossAnnual] = useState(TAX_PRESETS[0].grossAnnual);
  const [standardDeduction, setStandardDeduction] = useState(TAX_PRESETS[0].standardDeduction);
  const [empSocialPct, setEmpSocialPct] = useState(TAX_PRESETS[0].employeeSocialHealthPct);
  const [employerPayrollPct, setEmployerPayrollPct] = useState(TAX_PRESETS[0].employerPayrollPct);
  const [taxCreditAnnual, setTaxCreditAnnual] = useState(TAX_PRESETS[0].taxCreditAnnual);
  const [brackets, setBrackets] = useState<TaxBracket[]>(TAX_PRESETS[0].brackets);

  const calc = useMemo(() => {
    const netGoal = Math.max(0, Number(targetNetAnnual) || 0);
    const annualOverhead = Math.max(0, Number(monthlyOverhead) || 0) * 12;
    const tax = Math.max(0, Math.min(80, Number(taxRatePct) || 0)) / 100;
    const vac = Math.max(0, Number(vacationDays) || 0);
    const off = Math.max(0, Number(sickHolidaysDays) || 0);
    const hrsDay = Math.max(1, Number(hoursPerDay) || 8);
    const billPct = Math.max(10, Math.min(100, Number(billablePct) || 70)) / 100;

    const workingDays = Math.max(1, 260 - vac - off);
    const totalWorkHours = workingDays * hrsDay;
    const billableHours = totalWorkHours * billPct;

    const requiredPreTaxIncome = netGoal / (1 - tax);
    const requiredGrossRevenue = requiredPreTaxIncome + annualOverhead;

    const hourlyRate = requiredGrossRevenue / billableHours;
    const fullDayRate = hourlyRate * hrsDay;
    const monthlyRetainer = requiredGrossRevenue / 12;

    return {
      workingDays,
      billableHours,
      requiredGrossRevenue,
      hourlyRate,
      fullDayRate,
      monthlyRetainer,
    };
  }, [targetNetAnnual, monthlyOverhead, taxRatePct, vacationDays, sickHolidaysDays, hoursPerDay, billablePct]);

  const salaryResult = useMemo(
    () =>
      computeProgressiveSalaryTax({
        grossAnnual,
        standardDeduction,
        employeeSocialHealthPct: empSocialPct,
        employerPayrollPct,
        taxCreditAnnual,
        brackets,
      }),
    [grossAnnual, standardDeduction, empSocialPct, employerPayrollPct, taxCreditAnnual, brackets]
  );

  const applyPreset = (p: TaxPreset) => {
    setGrossAnnual(p.grossAnnual);
    setStandardDeduction(p.standardDeduction);
    setEmpSocialPct(p.employeeSocialHealthPct);
    setEmployerPayrollPct(p.employerPayrollPct);
    setTaxCreditAnnual(p.taxCreditAnnual);
    setBrackets(p.brackets);
  };

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
                {t('free_title', 'Freelance Rate & Salary Tax Converter')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'free_subtitle',
                  'Determine sustainable freelance rates or calculate progressive salary taxes, deductions, and net take-home pay.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTab('freelance')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  tab === 'freelance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('free_tab_rate', 'Freelance Rate')}
              </button>
              <button
                type="button"
                onClick={() => setTab('salary')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1 ${
                  tab === 'salary' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                {t('free_tab_salary_tax', 'Salary Tax & Net Pay')}
              </button>
            </div>
            <AppCurrencyBadge currency={currency} />
          </div>
        </div>

        {tab === 'freelance' && (
          <>
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
          </>
        )}

        {tab === 'salary' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">{t('quick_presets', 'Presets:')}</span>
              {TAX_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <label className="text-xs text-slate-400">
                {t('sal_gross_annual', 'Gross Annual Salary')} ({currSymbol})
                <input
                  type="number"
                  value={grossAnnual}
                  onChange={e => setGrossAnnual(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                {t('sal_deduction', 'Standard Deduction')} ({currSymbol})
                <input
                  type="number"
                  value={standardDeduction}
                  onChange={e => setStandardDeduction(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                {t('sal_tax_credit', 'Annual Tax Credit')} ({currSymbol})
                <input
                  type="number"
                  value={taxCreditAnnual}
                  onChange={e => setTaxCreditAnnual(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                {t('sal_emp_social', 'Employee Social/Health (%)')}
                <input
                  type="number"
                  step="0.1"
                  value={empSocialPct}
                  onChange={e => setEmpSocialPct(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                {t('sal_er_payroll', 'Employer Payroll Tax (%)')}
                <input
                  type="number"
                  step="0.1"
                  value={employerPayrollPct}
                  onChange={e => setEmployerPayrollPct(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40">
                <span className="text-xs text-slate-400 block">{t('sal_net_monthly', 'Net Monthly Take-Home')}</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {formatCurrency(salaryResult.netMonthly, currency)}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatCurrency(salaryResult.netAnnual, currency)} / yr
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('sal_income_tax', 'Income Tax (Annual)')}</span>
                <span className="text-xl font-bold font-mono text-rose-300 mt-1 block">
                  {formatCurrency(salaryResult.incomeTaxAnnual, currency)}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t('sal_marginal', 'Marginal')}: {salaryResult.marginalTaxRatePct}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('sal_social_total', 'Social & Health')}</span>
                <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                  {formatCurrency(salaryResult.socialHealthAnnual, currency)}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t('sal_eff_rate', 'Effective total')}: {salaryResult.effectiveTotalRatePct.toFixed(1)}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('sal_employer_cost', 'Total Employer Cost')}</span>
                <span className="text-xl font-bold font-mono text-indigo-300 mt-1 block">
                  {formatCurrency(salaryResult.employerTotalCostAnnual, currency)}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatCurrency(salaryResult.employerTotalCostAnnual / 12, currency)} / mo
                </span>
              </div>
            </div>

            {salaryResult.bracketBreakdown.length > 0 && (
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-left">
                      <th className="p-2.5">{t('sal_bracket', 'Tax Bracket')}</th>
                      <th className="p-2.5 text-right">{t('sal_rate', 'Rate')}</th>
                      <th className="p-2.5 text-right">{t('sal_taxed_amt', 'Taxed Portion')}</th>
                      <th className="p-2.5 text-right">{t('sal_tax_due', 'Tax')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryResult.bracketBreakdown.map(b => (
                      <tr key={b.label} className="border-b border-slate-800/50">
                        <td className="p-2.5 text-slate-300">{b.label}</td>
                        <td className="p-2.5 text-right text-indigo-300">{b.ratePct}%</td>
                        <td className="p-2.5 text-right text-slate-300">{formatCurrency(b.taxedAmount, currency)}</td>
                        <td className="p-2.5 text-right text-rose-300">{formatCurrency(b.tax, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
