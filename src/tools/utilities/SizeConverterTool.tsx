import React, { useState, useId } from 'react';
import {
  Ruler,
  Footprints,
  Shirt,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Table,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface ShoeSizeRow {
  eu: number;
  us: number;
  uk: number;
  cm: number;
  inch: number;
}

interface ClothesSizeRow {
  intl: string;
  eu: number;
  us: number;
  uk: number;
  chestCm: string;
  waistCm: string;
}

// Men's shoes dataset
const MEN_SHOES: ShoeSizeRow[] = [
  { eu: 39, us: 6.5, uk: 5.5, cm: 24.5, inch: 9.6 },
  { eu: 40, us: 7.0, uk: 6.0, cm: 25.0, inch: 9.8 },
  { eu: 40.5, us: 7.5, uk: 6.5, cm: 25.5, inch: 10.0 },
  { eu: 41, us: 8.0, uk: 7.0, cm: 26.0, inch: 10.2 },
  { eu: 42, us: 8.5, uk: 7.5, cm: 26.5, inch: 10.4 },
  { eu: 42.5, us: 9.0, uk: 8.0, cm: 27.0, inch: 10.6 },
  { eu: 43, us: 9.5, uk: 8.5, cm: 27.5, inch: 10.8 },
  { eu: 44, us: 10.0, uk: 9.0, cm: 28.0, inch: 11.0 },
  { eu: 44.5, us: 10.5, uk: 9.5, cm: 28.5, inch: 11.2 },
  { eu: 45, us: 11.0, uk: 10.0, cm: 29.0, inch: 11.4 },
  { eu: 46, us: 12.0, uk: 11.0, cm: 30.0, inch: 11.8 },
  { eu: 47, us: 13.0, uk: 12.0, cm: 31.0, inch: 12.2 },
];

// Women's shoes dataset
const WOMEN_SHOES: ShoeSizeRow[] = [
  { eu: 35, us: 4.5, uk: 2.5, cm: 22.0, inch: 8.7 },
  { eu: 36, us: 5.5, uk: 3.5, cm: 22.5, inch: 8.9 },
  { eu: 37, us: 6.0, uk: 4.0, cm: 23.5, inch: 9.3 },
  { eu: 37.5, us: 6.5, uk: 4.5, cm: 24.0, inch: 9.4 },
  { eu: 38, us: 7.0, uk: 5.0, cm: 24.5, inch: 9.6 },
  { eu: 38.5, us: 7.5, uk: 5.5, cm: 25.0, inch: 9.8 },
  { eu: 39, us: 8.0, uk: 6.0, cm: 25.5, inch: 10.0 },
  { eu: 40, us: 8.5, uk: 6.5, cm: 26.0, inch: 10.2 },
  { eu: 41, us: 9.5, uk: 7.5, cm: 26.5, inch: 10.4 },
  { eu: 42, us: 10.0, uk: 8.0, cm: 27.0, inch: 10.6 },
];

// Men's clothing dataset
const MEN_CLOTHES: ClothesSizeRow[] = [
  { intl: 'XS', eu: 44, us: 34, uk: 34, chestCm: '86-90', waistCm: '74-78' },
  { intl: 'S', eu: 46, us: 36, uk: 36, chestCm: '90-94', waistCm: '78-82' },
  { intl: 'M', eu: 48, us: 38, uk: 38, chestCm: '94-98', waistCm: '82-86' },
  { intl: 'L', eu: 50, us: 40, uk: 40, chestCm: '98-102', waistCm: '86-90' },
  { intl: 'XL', eu: 52, us: 42, uk: 42, chestCm: '102-106', waistCm: '90-95' },
  { intl: 'XXL', eu: 54, us: 44, uk: 44, chestCm: '106-110', waistCm: '95-100' },
  { intl: '3XL', eu: 56, us: 46, uk: 46, chestCm: '110-116', waistCm: '100-106' },
];

// Women's clothing dataset
const WOMEN_CLOTHES: ClothesSizeRow[] = [
  { intl: 'XS', eu: 34, us: 2, uk: 6, chestCm: '78-82', waistCm: '60-64' },
  { intl: 'S', eu: 36, us: 4, uk: 8, chestCm: '82-86', waistCm: '64-68' },
  { intl: 'M', eu: 38, us: 6, uk: 10, chestCm: '86-90', waistCm: '68-72' },
  { intl: 'L', eu: 40, us: 8, uk: 12, chestCm: '90-94', waistCm: '72-76' },
  { intl: 'XL', eu: 42, us: 10, uk: 14, chestCm: '94-98', waistCm: '76-80' },
  { intl: 'XXL', eu: 44, us: 12, uk: 16, chestCm: '98-104', waistCm: '80-86' },
];

export const SizeConverterTool: React.FC = () => {
  const { t } = useI18n();

  // Mode: 'shoes_men' | 'shoes_women' | 'clothes_men' | 'clothes_women'
  const [activeCategory, setActiveCategory] = useState<'shoes_men' | 'shoes_women' | 'clothes_men' | 'clothes_women'>('shoes_men');

  // Shoe foot length input
  const [footCmInput, setFootCmInput] = useState<string>('27.0');

  // Selected row index
  const [selectedShoeIndex, setSelectedShoeIndex] = useState<number>(5); // default EU 42.5
  const [selectedClothesIndex, setSelectedClothesIndex] = useState<number>(2); // default M

  const [copied, setCopied] = useState(false);
  const footInputId = useId();

  // Handle foot length change to find closest shoe size
  const handleFootLengthChange = (val: string) => {
    setFootCmInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const dataset = activeCategory === 'shoes_men' ? MEN_SHOES : WOMEN_SHOES;
      let closestIdx = 0;
      let minDiff = 999;
      dataset.forEach((row, idx) => {
        const diff = Math.abs(row.cm - num);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setSelectedShoeIndex(closestIdx);
    }
  };

  const currentShoeDataset = activeCategory === 'shoes_men' ? MEN_SHOES : WOMEN_SHOES;
  const currentClothesDataset = activeCategory === 'clothes_men' ? MEN_CLOTHES : WOMEN_CLOTHES;

  const currentShoe = currentShoeDataset[selectedShoeIndex] || currentShoeDataset[0];
  const currentClothes = currentClothesDataset[selectedClothesIndex] || currentClothesDataset[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_size_converter_title', 'Převodník velikostí oblečení a obuvi')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              EU • US • UK • CM • INCH
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'tool_size_converter_desc',
              'Mezinárodní převod velikostí pánských i dámských bot a konfekčního oblečení. Obsahuje kalkulaci podle délky chodidla v cm i přehlednou tabulku.'
            )}
          </p>
        </div>

        {/* Category Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => {
              setActiveCategory('shoes_men');
              setSelectedShoeIndex(5);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeCategory === 'shoes_men' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{t('shoes_men_tab', 'Pánská obuv')}</span>
          </button>
          <button
            onClick={() => {
              setActiveCategory('shoes_women');
              setSelectedShoeIndex(4);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeCategory === 'shoes_women' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{t('shoes_women_tab', 'Dámská obuv')}</span>
          </button>
          <button
            onClick={() => setActiveCategory('clothes_men')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeCategory === 'clothes_men' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>{t('clothes_men_tab', 'Pánské oděvy')}</span>
          </button>
          <button
            onClick={() => setActiveCategory('clothes_women')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeCategory === 'clothes_women' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>{t('clothes_women_tab', 'Dámské oděvy')}</span>
          </button>
        </div>
      </div>

      {/* SHOE SIZES MODE */}
      {(activeCategory === 'shoes_men' || activeCategory === 'shoes_women') && (
        <div className="space-y-6">
          {/* Top Converter Card */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {activeCategory === 'shoes_men' ? t('shoes_men_title', 'Velikosti Pánských Bot') : t('shoes_women_title', 'Velikosti Dámských Bot')}
              </span>

              {/* Foot Length Input */}
              <div className="flex items-center gap-2">
                <label htmlFor={footInputId} className="text-xs text-slate-300">
                  {t('foot_length_label', 'Délka chodidla:')}
                </label>
                <div className="relative w-28">
                  <input
                    id={footInputId}
                    type="number"
                    step="0.5"
                    min="20"
                    max="35"
                    value={footCmInput}
                    onChange={e => handleFootLengthChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-slate-500">cm</span>
                </div>
              </div>
            </div>

            {/* Big Counterparts Display */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  EU (Evropa)
                </span>
                <div className="text-3xl font-extrabold text-white font-mono">{currentShoe.eu}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  US (Amerika)
                </span>
                <div className="text-3xl font-extrabold text-slate-200 font-mono">{currentShoe.us}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  UK (Británie)
                </span>
                <div className="text-3xl font-extrabold text-slate-200 font-mono">{currentShoe.uk}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  CM / Stélka
                </span>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {currentShoe.cm} <span className="text-sm font-normal text-slate-400">cm</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-mono">
                {t('shoe_length_inches', 'Délka v palcích:')} {currentShoe.inch}"
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    `Boty: EU ${currentShoe.eu} | US ${currentShoe.us} | UK ${currentShoe.uk} | ${currentShoe.cm} cm`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied_to_clipboard', 'Zkopírováno') : t('copy_shoe_size', 'Kopírovat velikost')}</span>
              </button>
            </div>
          </div>

          {/* Full Interactive Shoes Table */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {t('shoe_size_table_heading', 'Přehledná tabulka všech velikostí obuvi')}
            </span>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">EU</th>
                    <th className="px-4 py-3">US</th>
                    <th className="px-4 py-3">UK</th>
                    <th className="px-4 py-3">CM</th>
                    <th className="px-4 py-3">Palce (Inch)</th>
                    <th className="px-4 py-3 text-right">{t('action', 'Akce')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {currentShoeDataset.map((row, idx) => {
                    const isSelected = selectedShoeIndex === idx;
                    return (
                      <tr
                        key={row.eu}
                        onClick={() => setSelectedShoeIndex(idx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/40 text-indigo-300 font-bold'
                            : 'hover:bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-bold text-white">{row.eu}</td>
                        <td className="px-4 py-2.5">{row.us}</td>
                        <td className="px-4 py-2.5">{row.uk}</td>
                        <td className="px-4 py-2.5 text-emerald-400">{row.cm} cm</td>
                        <td className="px-4 py-2.5 text-slate-400">{row.inch}"</td>
                        <td className="px-4 py-2.5 text-right">
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-sans">
                              {t('selected', 'Vybráno')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CLOTHING SIZES MODE */}
      {(activeCategory === 'clothes_men' || activeCategory === 'clothes_women') && (
        <div className="space-y-6">
          {/* Top Clothing Card */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {activeCategory === 'clothes_men'
                ? t('clothes_men_title', 'Velikosti Pánského Oblečení')
                : t('clothes_women_title', 'Velikosti Dámského Oblečení')}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Mezinárodní
                </span>
                <div className="text-3xl font-extrabold text-white font-mono">{currentClothes.intl}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  EU (Evropa)
                </span>
                <div className="text-3xl font-extrabold text-slate-200 font-mono">{currentClothes.eu}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  US / UK
                </span>
                <div className="text-3xl font-extrabold text-slate-200 font-mono">
                  {currentClothes.us} / {currentClothes.uk}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('chest_circumference', 'Hrudník (cm)')}
                </span>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                  {currentClothes.chestCm}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                {t('waist_circumference', 'Obvod pasu:')} <strong className="text-white font-mono">{currentClothes.waistCm} cm</strong>
              </span>

              <button
                onClick={() =>
                  handleCopy(
                    `Oblečení: ${currentClothes.intl} (EU ${currentClothes.eu}, US ${currentClothes.us}, hrudník ${currentClothes.chestCm} cm)`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied_to_clipboard', 'Zkopírováno') : t('copy_clothes_size', 'Kopírovat velikost')}</span>
              </button>
            </div>
          </div>

          {/* Full Interactive Clothes Table */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {t('clothes_size_table_heading', 'Přehledná tabulka všech velikostí oblečení')}
            </span>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{t('size_intl', 'Mezinárodní')}</th>
                    <th className="px-4 py-3">EU</th>
                    <th className="px-4 py-3">US</th>
                    <th className="px-4 py-3">UK</th>
                    <th className="px-4 py-3">{t('chest_cm', 'Hrudník (cm)')}</th>
                    <th className="px-4 py-3">{t('waist_cm', 'Pas (cm)')}</th>
                    <th className="px-4 py-3 text-right">{t('action', 'Akce')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {currentClothesDataset.map((row, idx) => {
                    const isSelected = selectedClothesIndex === idx;
                    return (
                      <tr
                        key={row.intl}
                        onClick={() => setSelectedClothesIndex(idx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/40 text-indigo-300 font-bold'
                            : 'hover:bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-bold text-white">{row.intl}</td>
                        <td className="px-4 py-2.5">{row.eu}</td>
                        <td className="px-4 py-2.5">{row.us}</td>
                        <td className="px-4 py-2.5">{row.uk}</td>
                        <td className="px-4 py-2.5 text-emerald-400">{row.chestCm}</td>
                        <td className="px-4 py-2.5 text-slate-400">{row.waistCm}</td>
                        <td className="px-4 py-2.5 text-right">
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-sans">
                              {t('selected', 'Vybráno')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
