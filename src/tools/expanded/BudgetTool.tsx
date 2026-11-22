import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Repeat, Wallet } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { loadToolJson, saveToolJson } from '../../services/idbStorage';
import { useAppCurrency, getCurrencySymbol, formatCurrency } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { btn, secondary, danger, input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   EXPENSES, BUDGET & SUBSCRIPTIONS TRACKER
   ───────────────────────────────────────────────────────────── */
type Expense = { id: number; label: string; amount: number; category: string; date: string };
type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type Subscription = {
  id: number;
  name: string;
  cost: number;
  cycle: BillingCycle;
  category: string;
  renewalDay: number;
};

const EXPENSE_STORAGE = 'omnidesk_budget_expenses_v2';
const SUBS_STORAGE = 'omnidesk_budget_subscriptions_v1';

function monthlyEquivalent(cost: number, cycle: BillingCycle): number {
  if (cycle === 'weekly') return (cost * 52) / 12;
  if (cycle === 'quarterly') return cost / 3;
  if (cycle === 'yearly') return cost / 12;
  return cost;
}

export const BudgetTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [tab, setTab] = useState<'expenses' | 'subscriptions'>('expenses');

  // Expenses state
  const [items, setItems] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(EXPENSE_STORAGE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 1, label: t('budget_item_groceries', 'Groceries'), amount: 850, category: 'food', date: new Date().toISOString().slice(0, 10) },
      { id: 2, label: t('budget_item_transport', 'Monthly Transit Pass'), amount: 550, category: 'transport', date: new Date().toISOString().slice(0, 10) },
      { id: 3, label: t('budget_item_internet', 'Internet & Phone'), amount: 690, category: 'utilities', date: new Date().toISOString().slice(0, 10) },
    ];
  });
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [confirmClear, setConfirmClear] = useState(false);
  const hydratedRef = useRef(false);
  const modifiedRef = useRef(false);

  // Subscriptions state
  const [subs, setSubs] = useState<Subscription[]>([
    { id: 101, name: 'Cloud Storage 2TB', cost: 249, cycle: 'monthly', category: 'utilities', renewalDay: 5 },
    { id: 102, name: 'Music Streaming', cost: 169, cycle: 'monthly', category: 'entertainment', renewalDay: 14 },
    { id: 103, name: 'Domain & Hosting', cost: 1440, cycle: 'yearly', category: 'utilities', renewalDay: 22 },
  ]);
  const [subName, setSubName] = useState('');
  const [subCost, setSubCost] = useState('');
  const [subCycle, setSubCycle] = useState<BillingCycle>('monthly');
  const [subCategory, setSubCategory] = useState('entertainment');
  const [subDay, setSubDay] = useState('1');
  const subsHydratedRef = useRef(false);
  const subsModifiedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadToolJson<Expense[]>(EXPENSE_STORAGE).then(stored => {
      if (!active) return;
      if (!modifiedRef.current && Array.isArray(stored) && stored.length > 0) {
        setItems(stored);
      }
      hydratedRef.current = true;
    });
    void loadToolJson<Subscription[]>(SUBS_STORAGE).then(stored => {
      if (!active) return;
      if (!subsModifiedRef.current && Array.isArray(stored) && stored.length > 0) {
        setSubs(stored);
      }
      subsHydratedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current && !modifiedRef.current) return;
    void saveToolJson(EXPENSE_STORAGE, items);
  }, [items]);

  useEffect(() => {
    if (!subsHydratedRef.current && !subsModifiedRef.current) return;
    void saveToolJson(SUBS_STORAGE, subs);
  }, [subs]);

  const add = () => {
    const value = Number(amount);
    if (label.trim() && value > 0) {
      modifiedRef.current = true;
      setItems([
        { id: Date.now(), label: label.trim(), amount: value, category, date: new Date().toISOString().slice(0, 10) },
        ...items,
      ]);
      setLabel('');
      setAmount('');
    }
  };

  const remove = (id: number) => {
    modifiedRef.current = true;
    setItems(items.filter(x => x.id !== id));
  };

  const clearAll = () => {
    modifiedRef.current = true;
    setItems([]);
    setConfirmClear(false);
  };

  const addSub = () => {
    const val = Number(subCost);
    if (!subName.trim() || !(val > 0)) return;
    subsModifiedRef.current = true;
    setSubs(prev => [
      {
        id: Date.now(),
        name: subName.trim(),
        cost: val,
        cycle: subCycle,
        category: subCategory,
        renewalDay: Math.max(1, Math.min(31, Math.round(Number(subDay) || 1))),
      },
      ...prev,
    ]);
    setSubName('');
    setSubCost('');
  };

  const removeSub = (id: number) => {
    subsModifiedRef.current = true;
    setSubs(prev => prev.filter(s => s.id !== id));
  };

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const categoryTotals = useMemo(() => {
    const res: Record<string, number> = {};
    items.forEach(item => {
      res[item.category] = (res[item.category] || 0) + item.amount;
    });
    return res;
  }, [items]);

  const subMetrics = useMemo(() => {
    const monthly = subs.reduce((s, item) => s + monthlyEquivalent(item.cost, item.cycle), 0);
    return {
      monthly,
      annual: monthly * 12,
      daily: (monthly * 12) / 365,
    };
  }, [subs]);

  const categoryLabels: Record<string, string> = {
    food: t('cat_food', 'Food & Groceries'),
    housing: t('cat_housing', 'Housing & Rent'),
    transport: t('cat_transport', 'Transport'),
    utilities: t('cat_utilities', 'Utilities & Services'),
    entertainment: t('cat_entertainment', 'Entertainment'),
    other: t('cat_other', 'Other'),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header
          title="Expense Tracker & Budget"
          desc={t('expenses_budget_desc', 'Track everyday expenses and recurring subscriptions with normalized monthly & annual burn rates.')}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('expenses')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 ${
                tab === 'expenses' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              {t('budget_tab_expenses', 'Expenses')}
            </button>
            <button
              type="button"
              onClick={() => setTab('subscriptions')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 ${
                tab === 'subscriptions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              {t('budget_tab_subs', 'Subscriptions')} ({subs.length})
            </button>
          </div>
          <AppCurrencyBadge currency={currency} />
        </div>
      </div>

      {tab === 'expenses' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className={input + ' flex-1 min-w-[180px]'}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={t('expense_description', 'Expense description (e.g. Lunch)')}
              onKeyDown={e => e.key === 'Enter' && add()}
            />
            <input
              className={input + ' w-28'}
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`${t('amount', 'Amount')} (${currSymbol})`}
              onKeyDown={e => e.key === 'Enter' && add()}
            />
            <select className={input + ' w-40'} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="food">{categoryLabels.food}</option>
              <option value="housing">{categoryLabels.housing}</option>
              <option value="transport">{categoryLabels.transport}</option>
              <option value="utilities">{categoryLabels.utilities}</option>
              <option value="entertainment">{categoryLabels.entertainment}</option>
              <option value="other">{categoryLabels.other}</option>
            </select>
            <button className={btn} onClick={add}>
              <Plus className="inline w-4 h-4 mr-1" />
              {t('add', 'Add')}
            </button>
            {items.length > 0 &&
              (confirmClear ? (
                <div className="inline-flex items-center gap-1.5">
                  <button type="button" className={danger} onClick={clearAll}>
                    {t('confirm_delete_btn', 'Confirm clear')}
                  </button>
                  <button type="button" className={secondary} onClick={() => setConfirmClear(false)}>
                    {t('cancel', 'Cancel')}
                  </button>
                </div>
              ) : (
                <button type="button" className={secondary} onClick={() => setConfirmClear(true)}>
                  {t('clear_all', 'Clear All')}
                </button>
              ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className={box + ' text-white flex flex-col justify-center'}>
              <span className="text-xs text-slate-400">{t('total_expenses', 'Total Expenses')}</span>
              <span className="text-3xl font-bold mt-1 text-emerald-400">{formatCurrency(total, currency)}</span>
              <span className="text-xs text-slate-500 mt-1">
                {items.length} {t('records_count', 'items')}
              </span>
            </div>
            <div className={box + ' space-y-1.5'}>
              <span className="text-xs text-slate-400 block mb-1">{t('by_category', 'By Category:')}</span>
              {Object.entries(categoryTotals).map(([cat, sum]) => (
                <div key={cat} className="flex justify-between text-xs text-slate-300">
                  <span>{categoryLabels[cat] || cat}:</span>
                  <span className="font-mono">
                    {formatCurrency(sum, currency)} ({total > 0 ? Math.round((sum / total) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <div className={box + ' flex items-center justify-between py-2.5'} key={item.id}>
                <div>
                  <strong className="text-white text-sm block">{item.label}</strong>
                  <div className="text-[11px] text-slate-400 flex gap-2">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {categoryLabels[item.category] || item.category}
                    </span>
                    <span>{item.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-slate-100">{formatCurrency(item.amount, currency)}</span>
                  <button className="text-slate-500 hover:text-rose-400 p-1" onClick={() => remove(item.id)} title={t('delete', 'Delete')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'subscriptions' && (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className={box}>
              <span className="text-xs text-slate-400 block">{t('sub_monthly_burn', 'Normalized Monthly Burn')}</span>
              <span className="text-2xl font-bold font-mono text-indigo-300 mt-1 block">
                {formatCurrency(subMetrics.monthly, currency)}
              </span>
            </div>
            <div className={box}>
              <span className="text-xs text-slate-400 block">{t('sub_annual_burn', 'Annual Recurring Cost')}</span>
              <span className="text-2xl font-bold font-mono text-amber-300 mt-1 block">
                {formatCurrency(subMetrics.annual, currency)}
              </span>
            </div>
            <div className={box}>
              <span className="text-xs text-slate-400 block">{t('sub_daily_burn', 'Daily Equivalent')}</span>
              <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">
                {formatCurrency(subMetrics.daily, currency)}/d
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              className={input + ' flex-1 min-w-[160px]'}
              value={subName}
              onChange={e => setSubName(e.target.value)}
              placeholder={t('sub_name_ph', 'Service name (e.g. Spotify, VPS)')}
              onKeyDown={e => e.key === 'Enter' && addSub()}
            />
            <input
              className={input + ' w-28'}
              type="number"
              value={subCost}
              onChange={e => setSubCost(e.target.value)}
              placeholder={`${t('amount', 'Cost')} (${currSymbol})`}
              onKeyDown={e => e.key === 'Enter' && addSub()}
            />
            <select className={input + ' w-32'} value={subCycle} onChange={e => setSubCycle(e.target.value as BillingCycle)}>
              <option value="monthly">{t('sub_cycle_monthly', 'Monthly')}</option>
              <option value="yearly">{t('sub_cycle_yearly', 'Yearly')}</option>
              <option value="quarterly">{t('sub_cycle_quarterly', 'Quarterly')}</option>
              <option value="weekly">{t('sub_cycle_weekly', 'Weekly')}</option>
            </select>
            <select className={input + ' w-36'} value={subCategory} onChange={e => setSubCategory(e.target.value)}>
              <option value="entertainment">{categoryLabels.entertainment}</option>
              <option value="utilities">{categoryLabels.utilities}</option>
              <option value="housing">{categoryLabels.housing}</option>
              <option value="transport">{categoryLabels.transport}</option>
              <option value="other">{categoryLabels.other}</option>
            </select>
            <input
              className={input + ' w-24'}
              type="number"
              min={1}
              max={31}
              value={subDay}
              onChange={e => setSubDay(e.target.value)}
              placeholder={t('sub_day_ph', 'Day')}
              title={t('sub_renewal_day', 'Billing day of month')}
            />
            <button className={btn} onClick={addSub}>
              <Plus className="inline w-4 h-4 mr-1" />
              {t('add', 'Add')}
            </button>
          </div>

          <div className="space-y-2">
            {subs.map(s => {
              const normMo = monthlyEquivalent(s.cost, s.cycle);
              return (
                <div className={box + ' flex flex-wrap items-center justify-between gap-2 py-2.5'} key={s.id}>
                  <div>
                    <strong className="text-white text-sm block">{s.name}</strong>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 mt-0.5">
                      <span className="px-1.5 rounded bg-slate-800 text-slate-300">{categoryLabels[s.category] || s.category}</span>
                      <span className="uppercase font-mono text-indigo-300">{s.cycle}</span>
                      <span>
                        {t('sub_renews_day', 'Day')} #{s.renewalDay}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="text-sm font-semibold text-white">{formatCurrency(s.cost, currency)}</div>
                      <div className="text-[11px] text-slate-400">
                        ≈ {formatCurrency(normMo, currency)}/{t('sub_mo_short', 'mo')}
                      </div>
                    </div>
                    <button className="text-slate-500 hover:text-rose-400 p-1" onClick={() => removeSub(s.id)} title={t('delete', 'Delete')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
