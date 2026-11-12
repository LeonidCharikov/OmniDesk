import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol, SUPPORTED_FIAT_CURRENCIES } from '../../services/currencyService';

function computeNpv(cashflows: number[], ratePct: number): number {
  const r = ratePct / 100;
  return cashflows.reduce((sum, cf, idx) => sum + cf / Math.pow(1 + r, idx), 0);
}

function computeIrr(cashflows: number[]): number | null {
  if (cashflows.length < 2) return null;
  const hasPos = cashflows.some(v => v > 0);
  const hasNeg = cashflows.some(v => v < 0);
  if (!hasPos || !hasNeg) return null;

  // Newton-Raphson first
  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      if (!isFinite(denom) || denom === 0) break;
      f += cashflows[t] / denom;
      if (t > 0) {
        df -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
      }
    }
    if (Math.abs(f) < 1e-7) return rate * 100;
    if (Math.abs(df) < 1e-10) break;
    const next = rate - f / df;
    if (!isFinite(next) || next <= -0.999) break;
    rate = next;
  }

  // Bisection fallback on [-0.99, 10.0]
  let lo = -0.99;
  let hi = 10.0;
  const fAt = (r: number) => cashflows.reduce((s, cf, i) => s + cf / Math.pow(1 + r, i), 0);
  let fLo = fAt(lo);
  const fHi = fAt(hi);
  if (fLo * fHi > 0) return null;

  for (let iter = 0; iter < 120; iter++) {
    const mid = (lo + hi) / 2;
    const fMid = fAt(mid);
    if (Math.abs(fMid) < 1e-7) return mid * 100;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return ((lo + hi) / 2) * 100;
}

export const NpvIrrCalcTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [discountRate, setDiscountRate] = useState('8');
  const [cashflows, setCashflows] = useState<string[]>(['-100000', '28000', '35000', '42000', '48000']);

  // CAGR section
  const [cagrStart, setCagrStart] = useState('10000');
  const [cagrEnd, setCagrEnd] = useState('21500');
  const [cagrYears, setCagrYears] = useState('5');

  const results = useMemo(() => {
    const nums = cashflows.map(v => Number(v) || 0);
    const rate = Number(discountRate) || 0;
    const npv = computeNpv(nums, rate);
    const irr = computeIrr(nums);

    const pvInflows = nums
      .slice(1)
      .reduce((acc, cf, i) => acc + (cf > 0 ? cf / Math.pow(1 + rate / 100, i + 1) : 0), 0);
    const initialOutflow = nums[0] < 0 ? Math.abs(nums[0]) : 0;
    const pi = initialOutflow > 0 ? pvInflows / initialOutflow : null;

    // Payback period (undiscounted & discounted)
    let cum = 0;
    let payback: number | null = null;
    for (let i = 0; i < nums.length; i++) {
      const prev = cum;
      cum += nums[i];
      if (i > 0 && prev < 0 && cum >= 0 && nums[i] > 0) {
        payback = i - 1 + Math.abs(prev) / nums[i];
        break;
      }
    }

    const totalNet = nums.reduce((a, b) => a + b, 0);

    return { nums, npv, irr, pi, payback, totalNet };
  }, [cashflows, discountRate]);

  const cagrResult = useMemo(() => {
    const s = Number(cagrStart);
    const e = Number(cagrEnd);
    const y = Number(cagrYears);
    if (s <= 0 || e <= 0 || y <= 0) return null;
    const cagr = (Math.pow(e / s, 1 / y) - 1) * 100;
    const totalReturnPct = ((e - s) / s) * 100;
    const doublingYears = cagr > 0 ? 72 / cagr : null;
    return { cagr, totalReturnPct, doublingYears };
  }, [cagrStart, cagrEnd, cagrYears]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('npv_title', 'NPV, IRR & CAGR Cashflow Analyzer')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'npv_subtitle',
                  'Discounted cashflow valuation (NPV, IRR, Profitability Index, Payback) and CAGR calculator.'
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">
                  {t('npv_discount_rate', 'Discount Rate / WACC (%)')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={discountRate}
                  onChange={e => setDiscountRate(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
              <button
                type="button"
                onClick={() => setCashflows(prev => [...prev, '0'])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('npv_add_period', 'Add Period')}
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {cashflows.map((val, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-mono text-slate-400">
                    {idx === 0
                      ? t('npv_year_zero', 'Year 0 (Init)')
                      : `${t('npv_year', 'Year')} ${idx}`}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={val}
                      onChange={e =>
                        setCashflows(prev => prev.map((v, i) => (i === idx ? e.target.value : v)))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                      {currSymbol}
                    </span>
                  </div>
                  {cashflows.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setCashflows(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 bg-slate-950 border border-slate-800"
                      title={t('delete', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">{t('npv_result_label', 'Net Present Value (NPV)')}</div>
              <div
                className={`text-2xl font-bold font-mono mt-1 ${
                  results.npv >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(results.npv, currency)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('npv_irr_label', 'Internal Rate (IRR)')}</div>
                <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                  {results.irr !== null ? `${results.irr.toFixed(2)}%` : 'N/A'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('npv_pi_label', 'Profitability Index')}</div>
                <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                  {results.pi !== null ? `${results.pi.toFixed(2)}x` : 'N/A'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('npv_payback', 'Payback Period')}</div>
                <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                  {results.payback !== null
                    ? `${results.payback.toFixed(2)} ${t('npv_yrs_short', 'yrs')}`
                    : 'N/A'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('npv_total_net', 'Undiscounted Net')}</div>
                <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                  {formatCurrency(results.totalNet, currency)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CAGR Calculator */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">
          {t('npv_cagr_title', 'Compound Annual Growth Rate (CAGR)')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('npv_cagr_start', 'Starting Value')} ({currSymbol})
            </label>
            <input
              type="number"
              value={cagrStart}
              onChange={e => setCagrStart(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('npv_cagr_end', 'Ending Value')} ({currSymbol})
            </label>
            <input
              type="number"
              value={cagrEnd}
              onChange={e => setCagrEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('npv_cagr_years', 'Periods (Years)')}
            </label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={cagrYears}
              onChange={e => setCagrYears(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">CAGR</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {cagrResult ? `${cagrResult.cagr.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            {cagrResult && cagrResult.doublingYears !== null && (
              <div className="text-right">
                <div className="text-[11px] text-slate-400">{t('npv_rule72', 'Rule of 72')}</div>
                <div className="text-xs font-mono text-indigo-300">
                  ~{cagrResult.doublingYears.toFixed(1)} {t('npv_yrs_short', 'yrs')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
