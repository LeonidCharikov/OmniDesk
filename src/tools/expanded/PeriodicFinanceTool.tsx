import React, { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, getCurrencySymbol, formatCurrency } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   PERIODIC FINANCE CALCULATOR
   ───────────────────────────────────────────────────────────── */
export const PeriodicFinanceTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [principal, setPrincipal] = useState(100000);
  const [addition, setAddition] = useState(2000);
  const [rate, setRate] = useState(6.5);
  const [frequency, setFrequency] = useState<number>(12);
  const [years, setYears] = useState(10);

  const totalPeriods = frequency * years;
  const ratePerPeriod = rate / 100 / frequency;

  const total = useMemo(() => {
    if (ratePerPeriod === 0) {
      return principal + addition * totalPeriods;
    }
    const principalGrow = principal * Math.pow(1 + ratePerPeriod, totalPeriods);
    const additionsGrow = addition * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
    return principalGrow + additionsGrow;
  }, [principal, addition, ratePerPeriod, totalPeriods]);

  const totalDeposited = principal + addition * totalPeriods;
  const totalInterest = Math.max(0, total - totalDeposited);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Header
          title="Periodic Finance Calculator"
          desc={t(
            'periodic_finance_desc',
            'Calculate compound interest from an initial deposit, regular contributions, and selected compounding frequency.'
          )}
        />
        <div className="self-start sm:self-auto">
          <AppCurrencyBadge currency={currency} />
        </div>
      </div>
      <div className={box + ' space-y-4'}>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            {t('initial_lump_sum', 'Počáteční jednorázový vklad')} ({currSymbol})
            <input className={input + ' mt-1'} type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('regular_addition', 'Pravidelný vklad za periodu')} ({currSymbol})
            <input className={input + ' mt-1'} type="number" value={addition} onChange={e => setAddition(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('annual_rate_percent', 'Roční úroková sazba (%)')}
            <input className={input + ' mt-1'} type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))} />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {t('compounding_frequency', 'Periodicita připisování')}
            <select
              className={input + ' mt-1'}
              value={frequency}
              onChange={e => setFrequency(Number(e.target.value))}
            >
              <option value="12">{t('freq_monthly', 'Měsíčně (12× ročně)')}</option>
              <option value="4">{t('freq_quarterly', 'Čtvrtletně (4× ročně)')}</option>
              <option value="2">{t('freq_semiannually', 'Pololetně (2× ročně)')}</option>
              <option value="1">{t('freq_annually', 'Ročně (1× ročně)')}</option>
              <option value="365">{t('freq_daily', 'Denně (365× ročně)')}</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('duration_years', 'Doba trvání (v letech)')}
            <input className={input + ' mt-1'} type="number" min="1" max="50" value={years} onChange={e => setYears(Number(e.target.value))} />
          </label>
        </div>

        <div className="grid md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">{t('total_principal_invested', 'Celkem vámi vloženo')}</span>
            <span className="text-lg font-bold text-slate-200 mt-1 block">
              {formatCurrency(totalDeposited, currency)}
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">{t('total_interest_earned', 'Získaný úrok celkem')}</span>
            <span className="text-lg font-bold text-indigo-400 mt-1 block">
              +{formatCurrency(totalInterest, currency)}
            </span>
          </div>
          <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-800/40 text-center">
            <span className="text-xs text-slate-400 block">{t('future_total_value', 'Budoucí konečná hodnota')}</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
