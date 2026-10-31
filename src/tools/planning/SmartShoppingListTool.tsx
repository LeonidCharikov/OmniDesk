import React, { useState, useEffect, useId } from 'react';
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  CheckSquare,
  Square,
  Copy,
  Download,
  Tag,
  Apple,
  Sparkles,
  ShoppingBag,
  Home,
  Tv,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price?: number;
  category: 'groceries' | 'drugstore' | 'household' | 'electronics' | 'other';
  done: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'omnidesk_shopping_list_v2';

export const SmartShoppingListTool: React.FC = () => {
  const { t } = useI18n();

  // Currency from user config
  const [currency] = useState(() => {
    try {
      const saved = localStorage.getItem('omnidesk_user_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultCurrency) return parsed.defaultCurrency;
      }
    } catch {
      // ignore
    }
    return 'CZK';
  });

  const [items, setItems] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: '1', name: 'Čerstvé mléko 1L', quantity: '2 ks', price: 24.9, category: 'groceries', done: false, createdAt: Date.now() - 3600000 },
      { id: '2', name: 'Kvásový chléb', quantity: '1 ks', price: 49.0, category: 'groceries', done: true, createdAt: Date.now() - 3000000 },
      { id: '3', name: 'Vejce podestýlková M', quantity: '10 ks', price: 58.0, category: 'groceries', done: false, createdAt: Date.now() - 2500000 },
      { id: '4', name: 'Zrnková káva 500g', quantity: '1 bal.', price: 189.0, category: 'groceries', done: false, createdAt: Date.now() - 2000000 },
      { id: '5', name: 'Prací gel na bílé prádlo', quantity: '1 ks', price: 219.0, category: 'drugstore', done: false, createdAt: Date.now() - 1500000 },
    ];
  });

  // New item input state
  const [nameInput, setNameInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1 ks');
  const [priceInput, setPriceInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<ShoppingItem['category']>('groceries');

  // Filter state: 'all' | 'pending' | 'completed' | category
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const nameInputId = useId();

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameInput.trim()) return;

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: nameInput.trim(),
      quantity: qtyInput.trim() || '1 ks',
      price: priceInput ? parseFloat(priceInput) || undefined : undefined,
      category: categoryInput,
      done: false,
      createdAt: Date.now(),
    };

    setItems(prev => [newItem, ...prev]);
    setNameInput('');
    setPriceInput('');
  };

  const handleQuickAdd = (presetName: string, presetCat: ShoppingItem['category']) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: presetName,
      quantity: '1 ks',
      category: presetCat,
      done: false,
      createdAt: Date.now(),
    };
    setItems(prev => [newItem, ...prev]);
  };

  const toggleDone = (id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCompleted = () => {
    setItems(prev => prev.filter(item => !item.done));
  };

  const clearAll = () => {
    if (window.confirm(t('confirm_clear_shopping', 'Opravdu chcete vymazat celý nákupní seznam?'))) {
      setItems([]);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return !item.done;
    if (activeFilter === 'completed') return item.done;
    return item.category === activeFilter;
  });

  // Calculate statistics
  const totalCount = items.length;
  const pendingCount = items.filter(i => !i.done).length;
  const completedCount = items.filter(i => i.done).length;

  const totalEstimatedPrice = items.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const completedPrice = items.filter(i => i.done).reduce((acc, curr) => acc + (curr.price || 0), 0);

  // Copy as formatted checklist
  const handleCopyList = () => {
    const lines = [
      `🛒 ${t('tool_shopping_list_title', 'Nákupní seznam')} (${new Date().toLocaleDateString()})`,
      '------------------------------',
      ...items.map(
        i =>
          `${i.done ? '[X]' : '[ ]'} ${i.name} (${i.quantity})${
            i.price ? ` - ${i.price.toFixed(2)} ${currency}` : ''
          }`
      ),
      '------------------------------',
      `${t('total_price_label', 'Celkem')}: ${totalEstimatedPrice.toFixed(2)} ${currency}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (cat: ShoppingItem['category']) => {
    switch (cat) {
      case 'groceries':
        return { label: t('cat_groceries', 'Potraviny'), color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' };
      case 'drugstore':
        return { label: t('cat_drugstore', 'Drogerie'), color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60' };
      case 'household':
        return { label: t('cat_household', 'Domácnost'), color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' };
      case 'electronics':
        return { label: t('cat_electronics', 'Elektro'), color: 'text-blue-400 bg-blue-950/60 border-blue-800/60' };
      default:
        return { label: t('cat_other', 'Ostatní'), color: 'text-slate-400 bg-slate-900 border-slate-800' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_shopping_list_title', 'Chytrý nákupní lístek & Checklist')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              {pendingCount} {t('items_remaining', 'zbývá')}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'tool_shopping_list_desc',
              'Jednoduchý a spolehlivý nákupní lístek s kategoriemi, odhadem cen a odškrtáváním. Vše se automaticky ukládá přímo do vašeho zařízení.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyList}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            title={t('copy_list_tooltip', 'Zkopírovat celý seznam do schránky')}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('copied_to_clipboard', 'Zkopírováno') : t('copy_list_btn', 'Kopírovat seznam')}</span>
          </button>

          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-amber-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('clear_completed_btn', 'Smazat zakoupené')} ({completedCount})</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              title={t('clear_all_items', 'Vymazat celý seznam')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Add Item & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Add item form & quick presets */}
        <div className="lg:col-span-5 space-y-5">
          {/* Add Item Form */}
          <form
            onSubmit={handleAddItem}
            className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('add_item_heading', 'Přidat položku na lístek')}</span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={nameInputId} className="text-xs text-slate-300">
                {t('item_name_label', 'Název položky / zboží')}
              </label>
              <input
                id={nameInputId}
                type="text"
                required
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder={t('item_name_placeholder', 'např. Máslo, Jablka, Prací prášek...')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">{t('item_qty_label', 'Množství')}</label>
                <input
                  type="text"
                  value={qtyInput}
                  onChange={e => setQtyInput(e.target.value)}
                  placeholder="např. 2 ks, 1 kg"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">{t('item_price_label', 'Cena (odhad)')}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[11px] font-mono text-slate-500">
                    {currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">{t('item_category_label', 'Kategorie')}</label>
              <select
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value as ShoppingItem['category'])}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="groceries">{t('cat_groceries', 'Potraviny')}</option>
                <option value="drugstore">{t('cat_drugstore', 'Drogerie & Péče')}</option>
                <option value="household">{t('cat_household', 'Domácnost & Úklid')}</option>
                <option value="electronics">{t('cat_electronics', 'Elektro & Baterie')}</option>
                <option value="other">{t('cat_other', 'Ostatní')}</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('add_item_btn', 'Přidat na seznam')}</span>
            </button>
          </form>

          {/* Quick Presets */}
          <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{t('quick_presets_heading', 'Rychlé přidání častého zboží')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: t('preset_milk', 'Mléko'), cat: 'groceries' as const },
                { name: t('preset_bread', 'Pečivo'), cat: 'groceries' as const },
                { name: t('preset_eggs', 'Vejce'), cat: 'groceries' as const },
                { name: t('preset_butter', 'Máslo'), cat: 'groceries' as const },
                { name: t('preset_coffee', 'Káva'), cat: 'groceries' as const },
                { name: t('preset_fruit', 'Ovoce'), cat: 'groceries' as const },
                { name: t('preset_water', 'Minerální voda'), cat: 'groceries' as const },
                { name: t('preset_cheese', 'Sýr'), cat: 'groceries' as const },
                { name: t('preset_tp', 'Toaletní papír'), cat: 'drugstore' as const },
                { name: t('preset_soap', 'Mýdlo'), cat: 'drugstore' as const },
              ].map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleQuickAdd(preset.name, preset.cat)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-indigo-400" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cost Overview Card */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>{t('estimated_total_cost', 'Odhad celkové útraty:')}</span>
              <span className="font-mono text-sm font-bold text-white">
                {totalEstimatedPrice.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>{t('purchased_items_cost', 'Již zakoupeno v košíku:')}</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {completedPrice.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Active Shopping List */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('filter_all', 'Vše')} ({totalCount})
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('filter_pending', 'K nákupu')} ({pendingCount})
              </button>
              <button
                onClick={() => setActiveFilter('completed')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === 'completed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('filter_completed', 'V košíku')} ({completedCount})
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              {completedCount} / {totalCount} {t('done_fraction', 'splněno')}
            </div>
          </div>

          {/* List Items */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/20 border border-slate-800/60 space-y-3">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-medium text-slate-400">
                {activeFilter === 'pending'
                  ? t('all_items_bought', 'Všechny položky jsou zakoupeny!')
                  : t('shopping_list_empty', 'Váš nákupní lístek je prázdný')}
              </div>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                {t('add_items_using_form', 'Přidejte položky pomocí formuláře vlevo nebo klikněte na rychlé předvolby.')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => {
                const badge = getCategoryBadge(item.category);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleDone(item.id)}
                    className={`p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group ${
                      item.done
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-100 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleDone(item.id);
                        }}
                        className="text-slate-400 hover:text-indigo-400 transition-colors shrink-0"
                      >
                        {item.done ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium truncate ${
                              item.done ? 'line-through text-slate-500' : 'text-slate-100'
                            }`}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.quantity}
                          {item.price ? ` • ${item.price.toFixed(2)} ${currency}` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors opacity-0 group-hover:opacity-100"
                      title={t('delete_item', 'Smazat položku')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
