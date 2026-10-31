import React, { useState, useId } from 'react';
import { DollarSign, PieChart, Download, Calendar } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveTextWithDialog } from '../../services/fileSystemService';

export const LoanCalcTool: React.FC = () => {
  const { t, language } = useI18n();
  const [principal, setPrincipal] = useState<number>(3000000);
  const [interestRate, setInterestRate] = useState<number>(4.9);
  const [years, setYears] = useState<number>(25);

  const principalId = useId();
  const interestId = useId();
  const yearsId = useId();

  // Monthly interest rate
  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = years * 12;

  // Monthly annuity payment formula: M = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
  const monthlyPayment =
    monthlyRate > 0
      ? (principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : principal / totalMonths;

  const totalPayment = monthlyPayment * totalMonths;
  const totalInterest = totalPayment - principal;

  // Generate first 36 months amortization schedule
  const schedule: Array<{
    month: number;
    payment: number;
    principalPart: number;
    interestPart: number;
    balance: number;
  }> = [];

  let currentBalance = principal;
  for (let m = 1; m <= Math.min(totalMonths, 36); m++) {
    const interestPart = currentBalance * monthlyRate;
    const principalPart = monthlyPayment - interestPart;
    currentBalance = Math.max(0, currentBalance - principalPart);
    schedule.push({
      month: m,
      payment: monthlyPayment,
      principalPart,
      interestPart,
      balance: currentBalance,
    });
  }

  const exportScheduleCsv = async () => {
    let csv = `${t('month', 'Měsíc')},${t('payment', 'Splátka')},${t('principal_part', 'Úmor (Jistina)')},${t('interest_part', 'Úrok')},${t('remaining_balance', 'Zbývající dluh')}\n`;
    let bal = principal;
    for (let m = 1; m <= totalMonths; m++) {
      const iPart = bal * monthlyRate;
      const pPart = monthlyPayment - iPart;
      bal = Math.max(0, bal - pPart);
      csv += `${m},${monthlyPayment.toFixed(2)},${pPart.toFixed(2)},${iPart.toFixed(2)},${bal.toFixed(2)}\n`;
    }

    await saveTextWithDialog(
      `amortization_schedule_${principal}_${years}y.csv`,
      csv,
      [
        { name: 'CSV Tabulka (*.csv)', extensions: ['csv'] },
        { name: 'Všechny soubory (*.*)', extensions: ['*'] }
      ],
      t('save_csv_title', 'Uložit splátkový kalendář CSV (Průzkumník)')
    );
  };

  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'cs-CZ';

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">
          {t('tool_loan_calc_title', 'Hypoteční & Úvěrová Kalkulačka')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('loan_calc_desc', 'Přesný výpočet anuitních splátek, celkového přeplatku na úrocích a amortizačního kalendáře.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <label htmlFor={principalId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('loan_amount', 'Výše úvěru (Kč)')}
          </label>
          <input
            id={principalId}
            type="number"
            step="50000"
            value={principal}
            onChange={e => setPrincipal(Math.max(1, parseFloat(e.target.value) || 0))}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-lg font-mono text-white focus:outline-none focus:border-indigo-500 tabular-nums"
          />
          <span className="text-xs text-slate-500 font-mono">
            {principal.toLocaleString(locale)} Kč
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <label htmlFor={interestId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('interest_rate_pa', 'Úroková sazba (% p.a.)')}
          </label>
          <input
            id={interestId}
            type="number"
            step="0.1"
            min="0.1"
            max="30"
            value={interestRate}
            onChange={e => setInterestRate(Math.max(0.01, parseFloat(e.target.value) || 0))}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-lg font-mono text-white focus:outline-none focus:border-indigo-500 tabular-nums"
          />
          <span className="text-xs text-slate-500">
            {t('monthly_rate', 'Měsíční sazba')}: {(interestRate / 12).toFixed(3)} %
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <label htmlFor={yearsId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('loan_term_years', 'Doba splácení (roky)')}
          </label>
          <input
            id={yearsId}
            type="number"
            step="1"
            min="1"
            max="40"
            value={years}
            onChange={e => setYears(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-lg font-mono text-white focus:outline-none focus:border-indigo-500 tabular-nums"
          />
          <span className="text-xs text-slate-500 font-mono">
            {totalMonths} {t('monthly_payments_count', 'měsíčních splátek')}
          </span>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
          <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider block">
            {t('monthly_payment', 'Měsíční splátka')}
          </span>
          <span className="text-2xl font-bold font-mono text-white tabular-nums mt-1 block">
            {Math.round(monthlyPayment).toLocaleString(locale)} Kč
          </span>
          <span className="text-xs text-indigo-300/80 mt-1 block">
            {t('fixed_annuity_payment', 'Fixní anuitní platba')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
            {t('total_interest', 'Přeplatek na úrocích')}
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums mt-1 block">
            {Math.round(totalInterest).toLocaleString(locale)} Kč
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {((totalInterest / principal) * 100).toFixed(1)} % {t('of_original_principal', 'původní jistiny')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
            {t('total_payment_sum', 'Celkem zaplatíte')}
          </span>
          <span className="text-2xl font-bold font-mono text-slate-200 tabular-nums mt-1 block">
            {Math.round(totalPayment).toLocaleString(locale)} Kč
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {t('including_principal_interest', 'Včetně celé jistiny a úroků')}
          </span>
        </div>
      </div>

      {/* Visual Amortization Breakdown Bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />
            {t('principal', 'Jistina')} ({((principal / totalPayment) * 100).toFixed(1)} %)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
            {t('interest', 'Úroky')} ({((totalInterest / totalPayment) * 100).toFixed(1)} %)
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            style={{ width: `${(principal / totalPayment) * 100}%` }}
            className="h-full bg-indigo-500 transition-all duration-300"
          />
          <div
            style={{ width: `${(totalInterest / totalPayment) * 100}%` }}
            className="h-full bg-amber-500 transition-all duration-300"
          />
        </div>
      </div>

      {/* Amortization Table Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            {t('amortization_preview_title', 'Amortizační rozpis (Ukázka prvních 36 měsíců)')}
          </span>
          <button
            onClick={exportScheduleCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            {t('export_full_csv', 'Exportovat celý splátkový kalendář (.CSV)')}
          </button>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">{t('month', 'Měsíc')}</th>
                  <th className="py-2.5 px-3 text-right">{t('payment', 'Splátka')}</th>
                  <th className="py-2.5 px-3 text-right">{t('principal_part', 'Úmor (Jistina)')}</th>
                  <th className="py-2.5 px-3 text-right">{t('interest_part', 'Úrok')}</th>
                  <th className="py-2.5 px-3 text-right">{t('remaining_balance', 'Zůstatek jistiny')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono tabular-nums">
                {schedule.map(row => (
                  <tr key={row.month} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="py-2 px-3 text-slate-400">{row.month}. {t('month_short', 'měsíc')}</td>
                    <td className="py-2 px-3 text-right">{Math.round(row.payment).toLocaleString(locale)} Kč</td>
                    <td className="py-2 px-3 text-right text-indigo-300">{Math.round(row.principalPart).toLocaleString(locale)} Kč</td>
                    <td className="py-2 px-3 text-right text-amber-300">{Math.round(row.interestPart).toLocaleString(locale)} Kč</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-200">{Math.round(row.balance).toLocaleString(locale)} Kč</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
