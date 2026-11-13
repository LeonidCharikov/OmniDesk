import React, { useState, useMemo } from 'react';
import { Utensils, Plus, Trash2, Flame } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

const DENSITY_G_PER_ML: Record<string, { key: string; fallback: string; density: number }> = {
  water: { key: 'rc_ing_water', fallback: 'Water / Milk', density: 1.0 },
  flour: { key: 'rc_ing_flour', fallback: 'All-Purpose Flour', density: 0.53 },
  sugar: { key: 'rc_ing_sugar', fallback: 'Granulated Sugar', density: 0.85 },
  brown_sugar: { key: 'rc_ing_brown_sugar', fallback: 'Brown Sugar (packed)', density: 0.93 },
  butter: { key: 'rc_ing_butter', fallback: 'Butter', density: 0.96 },
  oil: { key: 'rc_ing_oil', fallback: 'Cooking Oil', density: 0.92 },
  honey: { key: 'rc_ing_honey', fallback: 'Honey / Syrup', density: 1.42 },
  oats: { key: 'rc_ing_oats', fallback: 'Rolled Oats', density: 0.38 },
  rice: { key: 'rc_ing_rice', fallback: 'Uncooked Rice', density: 0.85 },
};

const KITCHEN_UNITS: Record<string, { type: 'vol' | 'mass'; factorToBase: number; label: string }> = {
  ml: { type: 'vol', factorToBase: 1, label: 'ml' },
  l: { type: 'vol', factorToBase: 1000, label: 'L' },
  tsp: { type: 'vol', factorToBase: 4.92892, label: 'tsp' },
  tbsp: { type: 'vol', factorToBase: 14.7868, label: 'tbsp' },
  fl_oz: { type: 'vol', factorToBase: 29.5735, label: 'fl oz' },
  cup: { type: 'vol', factorToBase: 236.588, label: 'cup (US)' },
  g: { type: 'mass', factorToBase: 1, label: 'g' },
  kg: { type: 'mass', factorToBase: 1000, label: 'kg' },
  oz: { type: 'mass', factorToBase: 28.3495, label: 'oz' },
  lb: { type: 'mass', factorToBase: 453.592, label: 'lb' },
};

function formatScaled(num: number): string {
  if (!isFinite(num) || num === 0) return '0';
  if (num >= 100) return String(Math.round(num));
  if (num >= 10) return String(Number(num.toFixed(1)));
  return String(Number(num.toFixed(2)));
}

export const RecipeScalerTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<'scale' | 'units' | 'oven'>('scale');

  // Recipe scaler
  const [origServings, setOrigServings] = useState('4');
  const [targetServings, setTargetServings] = useState('6');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: '1', name: t('rc_sample_flour', 'Flour'), amount: '250', unit: 'g' },
    { id: '2', name: t('rc_sample_milk', 'Milk'), amount: '300', unit: 'ml' },
    { id: '3', name: t('rc_sample_eggs', 'Eggs'), amount: '2', unit: 'pcs' },
    { id: '4', name: t('rc_sample_butter', 'Butter'), amount: '50', unit: 'g' },
  ]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('g');

  // Kitchen units
  const [unitVal, setUnitVal] = useState('1');
  const [fromUnit, setFromUnit] = useState('cup');
  const [toUnit, setToUnit] = useState('g');
  const [ingType, setIngType] = useState('flour');

  // Oven temp
  const [tempC, setTempC] = useState('180');

  const scaleFactor = useMemo(() => {
    const o = Math.max(0.1, Number(origServings) || 1);
    const tg = Math.max(0.1, Number(targetServings) || 1);
    return tg / o;
  }, [origServings, targetServings]);

  const convertedUnitValue = useMemo(() => {
    const val = Number(unitVal) || 0;
    const uFrom = KITCHEN_UNITS[fromUnit];
    const uTo = KITCHEN_UNITS[toUnit];
    const density = DENSITY_G_PER_ML[ingType]?.density || 1;
    if (!uFrom || !uTo) return 0;

    // Convert to ml first (using density if mass)
    const inMl =
      uFrom.type === 'vol'
        ? val * uFrom.factorToBase
        : (val * uFrom.factorToBase) / density;

    return uTo.type === 'vol'
      ? inMl / uTo.factorToBase
      : (inMl * density) / uTo.factorToBase;
  }, [unitVal, fromUnit, toUnit, ingType]);

  const ovenRes = useMemo(() => {
    const c = Number(tempC) || 0;
    const f = c * (9 / 5) + 32;
    const fanC = c - 20;
    const gasMark = Math.max(0.25, (f - 250) / 25);
    return { c, f, fanC, gasMark };
  }, [tempC]);

  const addIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAmount) return;
    setIngredients(prev => [
      ...prev,
      { id: Date.now().toString(), name: newName.trim(), amount: newAmount, unit: newUnit },
    ]);
    setNewName('');
    setNewAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('rc_title', 'Cooking & Recipe Scaler')}</h2>
              <p className="text-xs text-slate-400">
                {t('rc_subtitle', 'Scale recipe servings, convert cups/tbsp to grams by ingredient, and convert oven temperatures.')}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {([
              { id: 'scale', label: t('rc_tab_scale', 'Scale Recipe') },
              { id: 'units', label: t('rc_tab_units', 'Kitchen Units') },
              { id: 'oven', label: t('rc_tab_oven', 'Oven Temp') },
            ] as const).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'scale' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('rc_orig_servings', 'Original Servings')}</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={origServings}
                  onChange={e => setOrigServings(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('rc_target_servings', 'Target Servings')}</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={targetServings}
                  onChange={e => setTargetServings(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('rc_multiplier', 'Multiplier')}</span>
                <span className="text-lg font-bold font-mono tabular-nums text-indigo-300">
                  ×{Number(scaleFactor.toFixed(2))}
                </span>
              </div>
            </div>

            <form onSubmit={addIngredient} className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t('rc_ing_name', 'Ingredient...')}
                className="col-span-6 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
              <input
                type="number"
                step="any"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                placeholder={t('rc_amount', 'Amount')}
                className="col-span-3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
              />
              <input
                type="text"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                placeholder="g / ml / cup"
                className="col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
              />
              <button
                type="submit"
                aria-label={t('add_item', 'Add item')}
                className="col-span-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
              {ingredients.map(ing => {
                const scaled = (Number(ing.amount) || 0) * scaleFactor;
                return (
                  <div key={ing.id} className="p-3 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-200">{ing.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {ing.amount} {ing.unit}
                      </span>
                      <span className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                        → {formatScaled(scaled)} {ing.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIngredients(prev => prev.filter(i => i.id !== ing.id))}
                        aria-label={t('delete_item', 'Delete item')}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'units' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('rc_ingredient_type', 'Ingredient (Density)')}</label>
                <select
                  value={ingType}
                  onChange={e => setIngType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                >
                  {Object.entries(DENSITY_G_PER_ML).map(([k, v]) => (
                    <option key={k} value={k}>
                      {t(v.key, v.fallback)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('rc_amount', 'Amount')}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={unitVal}
                  onChange={e => setUnitVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('unit_from_label', 'From unit')}</label>
                <select
                  value={fromUnit}
                  onChange={e => setFromUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                >
                  {Object.entries(KITCHEN_UNITS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('unit_to_label', 'To unit')}</label>
                <select
                  value={toUnit}
                  onChange={e => setToUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                >
                  {Object.entries(KITCHEN_UNITS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('result', 'Result')}</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                {formatScaled(convertedUnitValue)} {KITCHEN_UNITS[toUnit]?.label}
              </span>
            </div>
          </div>
        )}

        {tab === 'oven' && (
          <div className="space-y-5">
            <div className="max-w-xs">
              <label className="block text-xs text-slate-400 mb-1">{t('rc_oven_c', 'Conventional Oven (°C)')}</label>
              <input
                type="number"
                value={tempC}
                onChange={e => setTempC(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('rc_fan_oven', 'Fan / Convection (°C)')}</span>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-indigo-300 mt-1">
                  {Math.round(ovenRes.fanC)} °C
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('rc_fahrenheit', 'Fahrenheit (°F)')}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                  {Math.round(ovenRes.f)} °F
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('rc_gas_mark', 'UK Gas Mark')}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                  {ovenRes.gasMark.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
