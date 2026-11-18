import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { loadToolJson, saveToolJson } from '../../services/idbStorage';
import { useAppCurrency, getCurrencySymbol, formatCurrency } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { btn, secondary, input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   EXPENSES & BUDGET
   ───────────────────────────────────────────────────────────── */
type Expense = { id: number; label: string; amount: number; category: string; date: string };
const EXPENSE_STORAGE = 'omnidesk_budget_expenses_v2';

export const BudgetTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [items, setItems] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(EXPENSE_STORAGE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 1, label: t('budget_item_groceries', 'Nákup potravin'), amount: 850, category: 'food', date: new Date().toISOString().slice(0, 10) },
      { id: 2, label: t('budget_item_transport', 'Měsíční jízdenka MHD'), amount: 550, category: 'transport', date: new Date().toISOString().slice(0, 10) },
      { id: 3, label: t('budget_item_internet', 'Internet a telefon'), amount: 690, category: 'utilities', date: new Date().toISOString().slice(0, 10) },
    ];
  });
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const hydratedRef = useRef(false);
  const modifiedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadToolJson<Expense[]>(EXPENSE_STORAGE).then(stored => {
      if (!active) return;
      if (!modifiedRef.current && Array.isArray(stored) && stored.length > 0) {
        setItems(stored);
      }
      hydratedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current && !modifiedRef.current) return;
    void saveToolJson(EXPENSE_STORAGE, items);
  }, [items]);

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
    if (confirm(t('confirm_clear_expenses', 'Opravdu si přejete smazat všechny položky rozpočtu?'))) {
      modifiedRef.current = true;
      setItems([]);
    }
  };

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const categoryTotals = useMemo(() => {
    const res: Record<string, number> = {};
    items.forEach(item => {
      res[item.category] = (res[item.category] || 0) + item.amount;
    });
    return res;
  }, [items]);

  const categoryLabels: Record<string, string> = {
    food: t('cat_food', 'Jídlo & Potraviny'),
    housing: t('cat_housing', 'Bydlení & Nájem'),
    transport: t('cat_transport', 'Doprava'),
    utilities: t('cat_utilities', 'Energie & Služby'),
    entertainment: t('cat_entertainment', 'Zábava & Volný čas'),
    other: t('cat_other', 'Ostatní'),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header title="Expense Tracker & Budget" desc={t('expenses_budget_desc', 'Record expense descriptions and amounts and track the running budget total.')} />
        <AppCurrencyBadge currency={currency} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className={input + ' flex-1 min-w-[180px]'}
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={t('expense_description', 'Popis výdaje (např. Oběd)')}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <input
          className={input + ' w-28'}
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={`${t('amount', 'Částka')} (${currSymbol})`}
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
          {t('add', 'Přidat')}
        </button>
        {items.length > 0 && (
          <button className={secondary} onClick={clearAll}>
            {t('clear_all', 'Vymazat vše')}
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className={box + ' text-white flex flex-col justify-center'}>
          <span className="text-xs text-slate-400">{t('total_expenses', 'Celkové výdaje')}</span>
          <span className="text-3xl font-bold mt-1 text-emerald-400">{formatCurrency(total, currency)}</span>
          <span className="text-xs text-slate-500 mt-1">{items.length} {t('records_count', 'položek')}</span>
        </div>
        <div className={box + ' space-y-1.5'}>
          <span className="text-xs text-slate-400 block mb-1">{t('by_category', 'Podle kategorií:')}</span>
          {Object.entries(categoryTotals).map(([cat, sum]) => (
            <div key={cat} className="flex justify-between text-xs text-slate-300">
              <span>{categoryLabels[cat] || cat}:</span>
              <span className="font-mono">{formatCurrency(sum, currency)} ({total > 0 ? Math.round((sum / total) * 100) : 0}%)</span>
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
              <button className="text-slate-500 hover:text-rose-400 p-1" onClick={() => remove(item.id)} title={t('delete', 'Smazat')}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
