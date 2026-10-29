import React, { useState, useId } from 'react';
import { ArrowLeftRight, Copy, Check, Info } from 'lucide-react';

interface UnitCategory {
  name: string;
  units: { [key: string]: { name: string; toBase: (v: number) => number; fromBase: (v: number) => number } };
}

const CATEGORIES: Record<string, UnitCategory> = {
  length: {
    name: 'Délka & Vzdálenost',
    units: {
      m: { name: 'Metr (m)', toBase: v => v, fromBase: v => v },
      km: { name: 'Kilometr (km)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      cm: { name: 'Centimetr (cm)', toBase: v => v * 0.01, fromBase: v => v * 100 },
      mm: { name: 'Milimetr (mm)', toBase: v => v * 0.001, fromBase: v => v * 1000 },
      in: { name: 'Palec (inch)', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      ft: { name: 'Stopa (foot)', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      yd: { name: 'Yard', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
      mi: { name: 'Míle (mile)', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
      nmi: { name: 'Námořní míle', toBase: v => v * 1852, fromBase: v => v / 1852 },
    },
  },
  mass: {
    name: 'Hmotnost',
    units: {
      kg: { name: 'Kilogram (kg)', toBase: v => v, fromBase: v => v },
      g: { name: 'Gram (g)', toBase: v => v * 0.001, fromBase: v => v * 1000 },
      mg: { name: 'Miligram (mg)', toBase: v => v * 0.000001, fromBase: v => v * 1000000 },
      t: { name: 'Tuna (t)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      lb: { name: 'Libra (lb)', toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
      oz: { name: 'Unce (oz)', toBase: v => v * 0.0283495231, fromBase: v => v / 0.0283495231 },
    },
  },
  temperature: {
    name: 'Teplota',
    units: {
      c: { name: 'Celsia (°C)', toBase: v => v, fromBase: v => v },
      f: { name: 'Fahrenheit (°F)', toBase: v => (v - 32) * (5 / 9), fromBase: v => v * (9 / 5) + 32 },
      k: { name: 'Kelvin (K)', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    },
  },
  pressure: {
    name: 'Tlak',
    units: {
      bar: { name: 'Bar (bar)', toBase: v => v, fromBase: v => v },
      kpa: { name: 'Kilopascal (kPa)', toBase: v => v * 0.01, fromBase: v => v * 100 },
      psi: { name: 'PSI (lb/sq in)', toBase: v => v * 0.0689476, fromBase: v => v / 0.0689476 },
      atm: { name: 'Atmosféra (atm)', toBase: v => v * 1.01325, fromBase: v => v / 1.01325 },
      mmhg: { name: 'Torr / mmHg', toBase: v => v * 0.00133322, fromBase: v => v / 0.00133322 },
    },
  },
  digital: {
    name: 'Digitální data',
    units: {
      mb: { name: 'Megabyte (MB)', toBase: v => v, fromBase: v => v },
      gb: { name: 'Gigabyte (GB)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      tb: { name: 'Terabyte (TB)', toBase: v => v * 1000000, fromBase: v => v / 1000000 },
      gib: { name: 'Gibibyte (GiB)', toBase: v => v * 1073.741824 / 1000, fromBase: v => (v * 1000) / 1073.741824 },
      kb: { name: 'Kilobyte (KB)', toBase: v => v * 0.001, fromBase: v => v * 1000 },
    },
  },
};

export const UnitConverterTool: React.FC = () => {
  const [categoryKey, setCategoryKey] = useState<string>('length');
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [toUnit, setToUnit] = useState<string>('ft');
  const [inputValue, setInputValue] = useState<number>(10);
  const [copied, setCopied] = useState(false);

  const inputId = useId();
  const fromSelectId = useId();
  const toSelectId = useId();

  const currentCategory = CATEGORIES[categoryKey];
  const fromDef = currentCategory.units[fromUnit] || Object.values(currentCategory.units)[0];
  const toDef = currentCategory.units[toUnit] || Object.values(currentCategory.units)[1];

  const handleCategoryChange = (key: string) => {
    setCategoryKey(key);
    const unitKeys = Object.keys(CATEGORIES[key].units);
    setFromUnit(unitKeys[0]);
    setToUnit(unitKeys[1] || unitKeys[0]);
  };

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  // Convert
  const baseValue = fromDef.toBase(inputValue);
  const resultValue = toDef.fromBase(baseValue);
  const formattedResult = Number.isInteger(resultValue) ? resultValue.toString() : resultValue.toFixed(6).replace(/\.?0+$/, '');

  const copyResult = () => {
    navigator.clipboard.writeText(formattedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">Vědecký & Technický Převodník Jednotek</h2>
        <p className="text-sm text-slate-400 mt-1">
          Přesné konverze SI jednotek, imperiálních měr a fyzikálních veličin s vysokou numerickou přesností.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => handleCategoryChange(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              categoryKey === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Conversion Interface */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4 p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
        {/* From */}
        <div className="space-y-3">
          <label htmlFor={fromSelectId} className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Z jednotky</label>
          <select
            id={fromSelectId}
            value={fromUnit}
            onChange={e => setFromUnit(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {Object.entries(currentCategory.units).map(([key, u]) => (
              <option key={key} value={key}>{u.name}</option>
            ))}
          </select>
          <label htmlFor={inputId} className="sr-only">Vstupní hodnota</label>
          <input
            id={inputId}
            type="number"
            value={inputValue}
            onChange={e => setInputValue(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xl font-mono text-white focus:outline-none focus:border-indigo-500 tabular-nums"
          />
        </div>

        {/* Swap button */}
        <div className="flex justify-center pt-6">
          <button
            onClick={swapUnits}
            title="Prohodit jednotky"
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>

        {/* To */}
        <div className="space-y-3">
          <label htmlFor={toSelectId} className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Do jednotky</label>
          <select
            id={toSelectId}
            value={toUnit}
            onChange={e => setToUnit(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {Object.entries(currentCategory.units).map(([key, u]) => (
              <option key={key} value={key}>{u.name}</option>
            ))}
          </select>
          <div className="relative flex items-center">
            <div className="w-full px-4 py-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-xl font-mono text-indigo-300 tabular-nums truncate">
              {formattedResult}
            </div>
            <button
              onClick={copyResult}
              className="absolute right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Kopírovat výsledek"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick reference table of all units in this category */}
      <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
          Srovnávací tabulka pro {inputValue} {fromDef.name}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(currentCategory.units).map(([key, u]) => {
            const val = u.fromBase(baseValue);
            const strVal = Number.isInteger(val) ? val.toString() : val.toFixed(4).replace(/\.?0+$/, '');
            return (
              <div key={key} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 truncate mr-2">{u.name}</span>
                <span className="text-xs font-mono font-medium text-slate-200 tabular-nums">{strVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
