import React, { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, getCurrencySymbol, formatCurrency } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   INVESTMENT CALCULATOR
   ───────────────────────────────────────────────────────────── */
export const InvestmentCalculatorTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [initial, setInitial] = useState(50000);
  const [monthly, setMonthly] = useState(2500);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(15);

  const future = useMemo(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    return r === 0 ? initial + monthly * n : initial * (1 + r) ** n + monthly * (((1 + r) ** n - 1) / r);
  }, [initial, monthly, rate, years]);

  const totalInvested = initial + monthly * years * 12;
  const totalInterest = Math.max(0, future - totalInvested);

  const fields = [
    { label: `${t('initial_deposit', 'Počáteční vklad')} (${currSymbol})`, value: initial, setter: setInitial },
    { label: `${t('monthly_deposit', 'Měsíční vklad')} (${currSymbol})`, value: monthly, setter: setMonthly },
    { label: t('annual_return', 'Očekávaný roční výnos (%)'), value: rate, setter: setRate },
    { label: t('investment_years', 'Doba investice (roky)'), value: years, setter: setYears },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header
          title="Investment Calculator"
          desc={t('investment_calculator_desc', 'Estimate compound growth from an initial deposit, regular contributions, annual return, and time horizon.')}
        />
        <AppCurrencyBadge currency={currency} />
      </div>

      <div className={box + ' grid md:grid-cols-4 gap-3'}>
        {fields.map(item => (
          <label className="text-xs text-slate-400" key={item.label}>
            {item.label}
            <input className={input + ' mt-1'} type="number" value={item.value} onChange={e => item.setter(Number(e.target.value))} />
          </label>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className={box + ' text-center'}>
          <span className="text-xs text-slate-400 block">{t('total_invested_by_user', 'Celkem vámi vloženo')}</span>
          <span className="text-xl font-bold text-slate-200 mt-1 block">{formatCurrency(totalInvested, currency)}</span>
        </div>
        <div className={box + ' text-center'}>
          <span className="text-xs text-slate-400 block">{t('total_compound_interest', 'Získaný složený úrok')}</span>
          <span className="text-xl font-bold text-indigo-400 mt-1 block">+{formatCurrency(totalInterest, currency)}</span>
        </div>
        <div className={box + ' text-center bg-indigo-950/20 border-indigo-800/40'}>
          <span className="text-xs text-slate-400 block">{t('final_portfolio_value', 'Konečná hodnota portfolia')}</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">{formatCurrency(future, currency)}</span>
        </div>
      </div>
    </div>
  );
};
