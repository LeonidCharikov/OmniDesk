import React, { useState, useId } from 'react';
import { ArrowLeftRight, Copy, Check } from 'lucide-react';
import { useI18n, SupportedLanguage } from '../../i18n/context';

interface UnitDefinition {
  names: Record<SupportedLanguage, string>;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

interface UnitCategory {
  names: Record<SupportedLanguage, string>;
  units: Record<string, UnitDefinition>;
}

const CATEGORIES: Record<string, UnitCategory> = {
  length: {
    names: { cs: 'Délka & Vzdálenost', en: 'Length & Distance', ru: 'Длина и Расстояние', de: 'Länge & Distanz', es: 'Longitud y Distancia' },
    units: {
      m: { names: { cs: 'Metr (m)', en: 'Meter (m)', ru: 'Метр (м)', de: 'Meter (m)', es: 'Metro (m)' }, toBase: v => v, fromBase: v => v },
      km: { names: { cs: 'Kilometr (km)', en: 'Kilometer (km)', ru: 'Километр (км)', de: 'Kilometer (km)', es: 'Kilómetro (km)' }, toBase: v => v * 1000, fromBase: v => v / 1000 },
      cm: { names: { cs: 'Centimetr (cm)', en: 'Centimeter (cm)', ru: 'Сантиметр (см)', de: 'Zentimeter (cm)', es: 'Centímetro (cm)' }, toBase: v => v * 0.01, fromBase: v => v * 100 },
      mm: { names: { cs: 'Milimetr (mm)', en: 'Millimeter (mm)', ru: 'Миллиметр (мм)', de: 'Millimeter (mm)', es: 'Milímetro (mm)' }, toBase: v => v * 0.001, fromBase: v => v * 1000 },
      in: { names: { cs: 'Palec (in)', en: 'Inch (in)', ru: 'Дюйм (дюйм)', de: 'Zoll (in)', es: 'Pulgada (in)' }, toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      ft: { names: { cs: 'Stopa (ft)', en: 'Foot (ft)', ru: 'Фут (фут)', de: 'Fuß (ft)', es: 'Pie (ft)' }, toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      yd: { names: { cs: 'Yard (yd)', en: 'Yard (yd)', ru: 'Ярд (ярд)', de: 'Yard (yd)', es: 'Yarda (yd)' }, toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
      mi: { names: { cs: 'Míle (mi)', en: 'Mile (mi)', ru: 'Миля (миля)', de: 'Meile (mi)', es: 'Milla (mi)' }, toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
      nmi: { names: { cs: 'Námořní míle', en: 'Nautical mile', ru: 'Морская миля', de: 'Seemeile', es: 'Milla náutica' }, toBase: v => v * 1852, fromBase: v => v / 1852 },
    },
  },
  mass: {
    names: { cs: 'Hmotnost', en: 'Mass & Weight', ru: 'Масса и Вес', de: 'Masse & Gewicht', es: 'Masa y Peso' },
    units: {
      kg: { names: { cs: 'Kilogram (kg)', en: 'Kilogram (kg)', ru: 'Килограмм (кг)', de: 'Kilogramm (kg)', es: 'Kilogramo (kg)' }, toBase: v => v, fromBase: v => v },
      g: { names: { cs: 'Gram (g)', en: 'Gram (g)', ru: 'Грамм (г)', de: 'Gramm (g)', es: 'Gramo (g)' }, toBase: v => v * 0.001, fromBase: v => v * 1000 },
      mg: { names: { cs: 'Miligram (mg)', en: 'Milligram (mg)', ru: 'Миллиграмм (мг)', de: 'Milligramm (mg)', es: 'Miligramo (mg)' }, toBase: v => v * 0.000001, fromBase: v => v * 1000000 },
      t: { names: { cs: 'Tuna (t)', en: 'Tonne (t)', ru: 'Тонна (т)', de: 'Tonne (t)', es: 'Tonelada (t)' }, toBase: v => v * 1000, fromBase: v => v / 1000 },
      lb: { names: { cs: 'Libra (lb)', en: 'Pound (lb)', ru: 'Фунт (lb)', de: 'Pfund (lb)', es: 'Libra (lb)' }, toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
      oz: { names: { cs: 'Unce (oz)', en: 'Ounce (oz)', ru: 'Унция (oz)', de: 'Unze (oz)', es: 'Onza (oz)' }, toBase: v => v * 0.0283495231, fromBase: v => v / 0.0283495231 },
    },
  },
  temperature: {
    names: { cs: 'Teplota', en: 'Temperature', ru: 'Температура', de: 'Temperatur', es: 'Temperatura' },
    units: {
      c: { names: { cs: 'Celsia (°C)', en: 'Celsius (°C)', ru: 'Цельсий (°C)', de: 'Celsius (°C)', es: 'Celsius (°C)' }, toBase: v => v, fromBase: v => v },
      f: { names: { cs: 'Fahrenheit (°F)', en: 'Fahrenheit (°F)', ru: 'Фаренгейт (°F)', de: 'Fahrenheit (°F)', es: 'Fahrenheit (°F)' }, toBase: v => (v - 32) * (5 / 9), fromBase: v => v * (9 / 5) + 32 },
      k: { names: { cs: 'Kelvin (K)', en: 'Kelvin (K)', ru: 'Кельвин (K)', de: 'Kelvin (K)', es: 'Kelvin (K)' }, toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    },
  },
  pressure: {
    names: { cs: 'Tlak', en: 'Pressure', ru: 'Давление', de: 'Druck', es: 'Presión' },
    units: {
      bar: { names: { cs: 'Bar (bar)', en: 'Bar (bar)', ru: 'Бар (bar)', de: 'Bar (bar)', es: 'Bar (bar)' }, toBase: v => v, fromBase: v => v },
      kpa: { names: { cs: 'Kilopascal (kPa)', en: 'Kilopascal (kPa)', ru: 'Килопаскаль (кПа)', de: 'Kilopascal (kPa)', es: 'Kilopascal (kPa)' }, toBase: v => v * 0.01, fromBase: v => v * 100 },
      psi: { names: { cs: 'PSI (lb/sq in)', en: 'PSI (lb/sq in)', ru: 'PSI (фунт/кв.дюйм)', de: 'PSI', es: 'PSI' }, toBase: v => v * 0.0689476, fromBase: v => v / 0.0689476 },
      atm: { names: { cs: 'Atmosféra (atm)', en: 'Atmosphere (atm)', ru: 'Атмосфера (atm)', de: 'Atmosphäre (atm)', es: 'Atmósfera (atm)' }, toBase: v => v * 1.01325, fromBase: v => v / 1.01325 },
      mmhg: { names: { cs: 'Torr / mmHg', en: 'Torr / mmHg', ru: 'Торр / мм рт. ст.', de: 'Torr / mmHg', es: 'Torr / mmHg' }, toBase: v => v * 0.00133322, fromBase: v => v / 0.00133322 },
    },
  },
  digital: {
    names: { cs: 'Digitální data', en: 'Digital Storage', ru: 'Цифровые данные', de: 'Digitaler Speicher', es: 'Almacenamiento Digital' },
    units: {
      mb: { names: { cs: 'Megabyte (MB)', en: 'Megabyte (MB)', ru: 'Мегабайт (МБ)', de: 'Megabyte (MB)', es: 'Megabyte (MB)' }, toBase: v => v, fromBase: v => v },
      gb: { names: { cs: 'Gigabyte (GB)', en: 'Gigabyte (GB)', ru: 'Гигабайт (ГБ)', de: 'Gigabyte (GB)', es: 'Gigabyte (GB)' }, toBase: v => v * 1000, fromBase: v => v / 1000 },
      tb: { names: { cs: 'Terabyte (TB)', en: 'Terabyte (TB)', ru: 'Терабайт (ТБ)', de: 'Terabyte (TB)', es: 'Terabyte (TB)' }, toBase: v => v * 1000000, fromBase: v => v / 1000000 },
      gib: { names: { cs: 'Gibibyte (GiB)', en: 'Gibibyte (GiB)', ru: 'Гибибайт (ГиБ)', de: 'Gibibyte (GiB)', es: 'Gibibyte (GiB)' }, toBase: v => v * 1073.741824 / 1000, fromBase: v => (v * 1000) / 1073.741824 },
      kb: { names: { cs: 'Kilobyte (KB)', en: 'Kilobyte (KB)', ru: 'Килобайт (КБ)', de: 'Kilobyte (KB)', es: 'Kilobyte (KB)' }, toBase: v => v * 0.001, fromBase: v => v * 1000 },
    },
  },
};

export const UnitConverterTool: React.FC = () => {
  const { t, language } = useI18n();
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

  const getCategoryName = (cat: UnitCategory) => cat.names[language] || cat.names.en;
  const getUnitName = (u: UnitDefinition) => u.names[language] || u.names.en;

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
        <h2 className="text-lg font-semibold text-white">{t('tool_unit_converter_title', 'Vědecký Převodník Jednotek')}</h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_unit_converter_desc', 'SI jednotky, imperiální míry, tlak, teplota, energie a digitální data.')}
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
            {getCategoryName(cat)}
          </button>
        ))}
      </div>

      {/* Conversion Interface */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4 p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
        {/* From */}
        <div className="space-y-3">
          <label htmlFor={fromSelectId} className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            {t('unit_from_label', 'Z jednotky')}
          </label>
          <select
            id={fromSelectId}
            value={fromUnit}
            onChange={e => setFromUnit(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {Object.entries(currentCategory.units).map(([key, u]) => (
              <option key={key} value={key}>{getUnitName(u)}</option>
            ))}
          </select>
          <label htmlFor={inputId} className="sr-only">{t('input_value', 'Vstupní hodnota')}</label>
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
            title={t('swap_units', 'Prohodit jednotky')}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>

        {/* To */}
        <div className="space-y-3">
          <label htmlFor={toSelectId} className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            {t('unit_to_label', 'Do jednotky')}
          </label>
          <select
            id={toSelectId}
            value={toUnit}
            onChange={e => setToUnit(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {Object.entries(currentCategory.units).map(([key, u]) => (
              <option key={key} value={key}>{getUnitName(u)}</option>
            ))}
          </select>
          <div className="relative flex items-center">
            <div className="w-full px-4 py-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-xl font-mono text-indigo-300 tabular-nums truncate">
              {formattedResult}
            </div>
            <button
              onClick={copyResult}
              className="absolute right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={t('copy_result', 'Kopírovat výsledek')}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick reference table of all units in this category */}
      <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
          {t('comparison_table_for', 'Srovnávací tabulka pro {value} {unit}', {
            value: inputValue,
            unit: getUnitName(fromDef),
          })}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(currentCategory.units).map(([key, u]) => {
            const val = u.fromBase(baseValue);
            const strVal = Number.isInteger(val) ? val.toString() : val.toFixed(4).replace(/\.?0+$/, '');
            return (
              <div key={key} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 truncate mr-2">{getUnitName(u)}</span>
                <span className="text-xs font-mono font-medium text-slate-200 tabular-nums">{strVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
