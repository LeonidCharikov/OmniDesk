import React, { useState, useEffect } from 'react';
import { Luggage, Plus, RotateCcw, CheckSquare, Square, Trash2, Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface PackingItem {
  id: string;
  label: string;
  done: boolean;
}

type TemplateId = 'weekend' | 'flight' | 'camping' | 'beach' | 'emergency';

const STORAGE_KEY = 'omnidesk_packing_checklist_v1';

const TEMPLATE_KEYS: Record<TemplateId, { nameKey: string; defaultName: string; items: Array<{ key: string; fallback: string }> }> = {
  weekend: {
    nameKey: 'pack_tpl_weekend',
    defaultName: 'Weekend Trip',
    items: [
      { key: 'pack_item_id', fallback: 'ID / Passport & Wallet' },
      { key: 'pack_item_charger', fallback: 'Phone Charger & Power Bank' },
      { key: 'pack_item_clothes_2d', fallback: 'Outfits for 2–3 Days' },
      { key: 'pack_item_toiletries', fallback: 'Toothbrush & Toiletries' },
      { key: 'pack_item_headphones', fallback: 'Headphones' },
      { key: 'pack_item_jacket', fallback: 'Light Rain Jacket' },
    ],
  },
  flight: {
    nameKey: 'pack_tpl_flight',
    defaultName: 'Flight Carry-On',
    items: [
      { key: 'pack_item_boarding', fallback: 'Passport & Boarding Pass' },
      { key: 'pack_item_liquids', fallback: '100ml Liquids Bag' },
      { key: 'pack_item_meds', fallback: 'Essential Medications' },
      { key: 'pack_item_pillow', fallback: 'Neck Pillow & Earplugs' },
      { key: 'pack_item_bottle', fallback: 'Empty Water Bottle' },
      { key: 'pack_item_adapter', fallback: 'Travel Power Adapter' },
    ],
  },
  camping: {
    nameKey: 'pack_tpl_camping',
    defaultName: 'Camping & Outdoor',
    items: [
      { key: 'pack_item_tent', fallback: 'Tent & Sleeping Bag' },
      { key: 'pack_item_headlamp', fallback: 'Headlamp / Flashlight' },
      { key: 'pack_item_firstaid', fallback: 'First Aid Kit & Insect Repellent' },
      { key: 'pack_item_lighter', fallback: 'Matches / Lighter' },
      { key: 'pack_item_thermos', fallback: 'Water & Thermos' },
      { key: 'pack_item_boots', fallback: 'Hiking Boots & Warm Socks' },
    ],
  },
  beach: {
    nameKey: 'pack_tpl_beach',
    defaultName: 'Beach Holiday',
    items: [
      { key: 'pack_item_sunscreen', fallback: 'Sunscreen SPF 30+' },
      { key: 'pack_item_sunglasses', fallback: 'Sunglasses & Hat' },
      { key: 'pack_item_swimwear', fallback: 'Swimwear & Beach Towel' },
      { key: 'pack_item_flipflops', fallback: 'Flip-Flops / Sandals' },
      { key: 'pack_item_aftersun', fallback: 'After-Sun Lotion' },
    ],
  },
  emergency: {
    nameKey: 'pack_tpl_emergency',
    defaultName: 'Home Emergency Kit',
    items: [
      { key: 'pack_item_water3d', fallback: 'Drinking Water (3-Day Supply)' },
      { key: 'pack_item_batteries', fallback: 'Flashlight & Spare Batteries' },
      { key: 'pack_item_firstaid', fallback: 'First Aid Kit & Bandages' },
      { key: 'pack_item_cash', fallback: 'Small Cash Bills & Document Copies' },
      { key: 'pack_item_canned', fallback: 'Non-Perishable Food' },
    ],
  },
};

export const PackingChecklistTool: React.FC = () => {
  const { t } = useI18n();
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('weekend');
  const [lists, setLists] = useState<Record<TemplateId, PackingItem[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const initial = {} as Record<TemplateId, PackingItem[]>;
    (Object.keys(TEMPLATE_KEYS) as TemplateId[]).forEach(tpl => {
      initial[tpl] = TEMPLATE_KEYS[tpl].items.map((item, idx) => ({
        id: `${tpl}-${idx}`,
        label: item.key,
        done: false,
      }));
    });
    return initial;
  });

  const [newItemText, setNewItemText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch {
      // ignore
    }
  }, [lists]);

  const currentItems = lists[activeTemplate] || [];
  const doneCount = currentItems.filter(i => i.done).length;
  const pct = currentItems.length > 0 ? Math.round((doneCount / currentItems.length) * 100) : 0;

  const resolveLabel = (label: string) => {
    for (const tpl of Object.values(TEMPLATE_KEYS)) {
      const found = tpl.items.find(i => i.key === label);
      if (found) return t(found.key, found.fallback);
    }
    return label;
  };

  const toggleItem = (id: string) => {
    setLists(prev => ({
      ...prev,
      [activeTemplate]: prev[activeTemplate].map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    }));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    setLists(prev => ({
      ...prev,
      [activeTemplate]: [
        ...prev[activeTemplate],
        { id: Date.now().toString(), label: newItemText.trim(), done: false },
      ],
    }));
    setNewItemText('');
  };

  const deleteItem = (id: string) => {
    setLists(prev => ({
      ...prev,
      [activeTemplate]: prev[activeTemplate].filter(i => i.id !== id),
    }));
  };

  const uncheckAll = () => {
    setLists(prev => ({
      ...prev,
      [activeTemplate]: prev[activeTemplate].map(i => ({ ...i, done: false })),
    }));
  };

  const copyChecklist = () => {
    const lines = currentItems.map(i => `${i.done ? '[x]' : '[ ]'} ${resolveLabel(i.label)}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Luggage className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('pack_title', 'Packing & Travel Checklist Templates')}</h2>
              <p className="text-xs text-slate-400">
                {t('pack_subtitle', 'Reusable checklists for trips, flights, outdoor gear, and emergency prep.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyChecklist}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
            </button>
            <button
              type="button"
              onClick={uncheckAll}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('pack_reset_checks', 'Uncheck All')}</span>
            </button>
          </div>
        </div>

        {/* Template selector */}
        <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
          {(Object.keys(TEMPLATE_KEYS) as TemplateId[]).map(tpl => (
            <button
              key={tpl}
              type="button"
              onClick={() => setActiveTemplate(tpl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTemplate === tpl ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t(TEMPLATE_KEYS[tpl].nameKey, TEMPLATE_KEYS[tpl].defaultName)}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400 font-mono tabular-nums">
            <span>{t('pack_progress', 'Packed')}</span>
            <span>{doneCount} / {currentItems.length} ({pct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <form onSubmit={addItem} className="flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={e => setNewItemText(e.target.value)}
            placeholder={t('pack_add_placeholder', 'Add custom item to this checklist...')}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('add_item', 'Add item')}</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {currentItems.map(item => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                item.done
                  ? 'bg-slate-950/60 border-slate-800/60 text-slate-500'
                  : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={`text-sm truncate ${item.done ? 'line-through' : ''}`}>
                  {resolveLabel(item.label)}
                </span>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  deleteItem(item.id);
                }}
                aria-label={t('delete_item', 'Delete item')}
                className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
