import React, { useState, useMemo } from 'react';
import { Target } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol, SUPPORTED_FIAT_CURRENCIES } from '../../services/currencyService';

export const BreakevenMarginTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [fixedCosts, setFixedCosts] = useState('50000');
  const [variableCost, setVariableCost] = useState('120');
  const [sellingPrice, setSellingPrice] = useState('250');
  const [targetProfit, setTargetProfit] = useState('30000');

  // Margin <-> Markup quick converter
  const [convCost, setConvCost] = useState('100');
  const [convPrice, setConvPrice] = useState('160');

  // SaaS LTV/CAC
  const [arpu, setArpu] = useState('49');
  const [saasMarginPct, setSaasMarginPct] = useState('80');
  const [churnPct, setChurnPct] = useState('3');
  const [cac, setCac] = useState('350');

  const be = useMemo(() => {
    const fc = Math.max(0, Number(fixedCosts) || 0);
    const vc = Math.max(0, Number(variableCost) || 0);
    const sp = Math.max(0, Number(sellingPrice) || 0);
    const tp = Math.max(0, Number(targetProfit) || 0);

    const contrib = sp - vc;
    const marginPct = sp > 0 ? (contrib / sp) * 100 : 0;
    const markupPct = vc > 0 ? (contrib / vc) * 100 : 0;

    if (contrib <= 0) {
      return { valid: false as const, contrib, marginPct, markupPct };
    }

    const beUnits = fc / contrib;
    const beRevenue = beUnits * sp;
    const targetUnits = (fc + tp) / contrib;

    return {
      valid: true as const,
      contrib,
      marginPct,
      markupPct,
      beUnits,
      beRevenue,
      targetUnits,
    };
  }, [fixedCosts, variableCost, sellingPrice, targetProfit]);

  const marginMarkup = useMemo(() => {
    const c = Number(convCost) || 0;
    const p = Number(convPrice) || 0;
    const profit = p - c;
    const grossMargin = p > 0 ? (profit / p) * 100 : 0;
    const markup = c > 0 ? (profit / c) * 100 : 0;
    return { profit, grossMargin, markup };
  }, [convCost, convPrice]);

  const saas = useMemo(() => {
    const a = Math.max(0, Number(arpu) || 0);
    const gm = Math.max(0, Math.min(100, Number(saasMarginPct) || 0)) / 100;
    const ch = Math.max(0.01, Number(churnPct) || 0.01) / 100;
    const acq = Math.max(0, Number(cac) || 0);

    const ltv = (a * gm) / ch;
    const ltvCacRatio = acq > 0 ? ltv / acq : 0;
    const cacPaybackMonths = a * gm > 0 ? acq / (a * gm) : 0;
    return { ltv, ltvCacRatio, cacPaybackMonths };
  }, [arpu, saasMarginPct, churnPct, cac]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('be_title', 'Break-Even, Margin vs. Markup & Pricing')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'be_subtitle',
                  'Calculate break-even volume, contribution margin, markup conversion, and SaaS LTV/CAC unit economics.'
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('be_fixed_costs', 'Fixed Costs')} ({currSymbol})
              </label>
              <input
                type="number"
                value={fixedCosts}
                onChange={e => setFixedCosts(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('be_var_cost', 'Variable Cost / Unit')} ({currSymbol})
              </label>
              <input
                type="number"
                value={variableCost}
                onChange={e => setVariableCost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('be_selling_price', 'Selling Price / Unit')} ({currSymbol})
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('be_target_profit', 'Target Profit')} ({currSymbol})
              </label>
              <input
                type="number"
                value={targetProfit}
                onChange={e => setTargetProfit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_units_label', 'Break-Even Units')}</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {be.valid ? Math.ceil(be.beUnits).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_revenue_label', 'Break-Even Revenue')}</div>
              <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                {be.valid ? formatCurrency(be.beRevenue, currency) : 'N/A'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_contrib_unit', 'Contribution / Unit')}</div>
              <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                {formatCurrency(be.contrib, currency)} ({be.marginPct.toFixed(1)}%)
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_target_units', 'Units for Target Profit')}</div>
              <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                {be.valid ? Math.ceil(be.targetUnits).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Margin vs Markup */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            {t('be_margin_markup_title', 'Gross Margin vs. Markup Converter')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('be_cost_label', 'Cost')} ({currSymbol})
              </label>
              <input
                type="number"
                value={convCost}
                onChange={e => setConvCost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('be_price_label', 'Sale Price')} ({currSymbol})
              </label>
              <input
                type="number"
                value={convPrice}
                onChange={e => setConvPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_profit_label', 'Profit')}</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {formatCurrency(marginMarkup.profit, currency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_margin_pct', 'Gross Margin')}</div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {marginMarkup.grossMargin.toFixed(2)}%
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_markup_pct', 'Markup')}</div>
              <div className="text-sm font-bold font-mono text-indigo-300">
                {marginMarkup.markup.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* SaaS LTV / CAC */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            {t('be_saas_title', 'SaaS Unit Economics (LTV / CAC)')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">ARPU / mo ({currSymbol})</label>
              <input
                type="number"
                value={arpu}
                onChange={e => setArpu(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{t('be_gm_pct', 'Margin %')}</label>
              <input
                type="number"
                value={saasMarginPct}
                onChange={e => setSaasMarginPct(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{t('be_churn_pct', 'Churn %/mo')}</label>
              <input
                type="number"
                step="0.5"
                value={churnPct}
                onChange={e => setChurnPct(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">CAC ({currSymbol})</label>
              <input
                type="number"
                value={cac}
                onChange={e => setCac(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">LTV</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {formatCurrency(saas.ltv, currency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">LTV : CAC</div>
              <div
                className={`text-sm font-bold font-mono ${
                  saas.ltvCacRatio >= 3 ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {saas.ltvCacRatio.toFixed(2)}x
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('be_cac_payback', 'CAC Payback')}</div>
              <div className="text-sm font-bold font-mono text-indigo-300">
                {saas.cacPaybackMonths.toFixed(1)} {t('be_months_short', 'mo')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
