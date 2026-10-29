import React, { useState, useId } from 'react';
import { Atom, FlaskConical, Search, Calculator, Check, Copy } from 'lucide-react';
import { useI18n, SupportedLanguage } from '../../i18n/context';

interface ElementInfo {
  number: number;
  symbol: string;
  names: Record<SupportedLanguage, string>;
  mass: number;
  categoryKeys: Record<SupportedLanguage, string>;
  period: number;
  group: number;
  electronegativity?: number;
}

const PERIODIC_TABLE: Record<string, ElementInfo> = {
  H: {
    number: 1,
    symbol: 'H',
    names: { cs: 'Vodík', en: 'Hydrogen', ru: 'Водород', de: 'Wasserstoff', es: 'Hidrógeno' },
    mass: 1.008,
    categoryKeys: { cs: 'Nekovy', en: 'Nonmetals', ru: 'Неметаллы', de: 'Nichtmetalle', es: 'No metales' },
    period: 1,
    group: 1,
    electronegativity: 2.2,
  },
  He: {
    number: 2,
    symbol: 'He',
    names: { cs: 'Helium', en: 'Helium', ru: 'Гелий', de: 'Helium', es: 'Helio' },
    mass: 4.0026,
    categoryKeys: { cs: 'Vzácné plyny', en: 'Noble gases', ru: 'Благородные газы', de: 'Edelgase', es: 'Gases nobles' },
    period: 1,
    group: 18,
  },
  Li: {
    number: 3,
    symbol: 'Li',
    names: { cs: 'Lithium', en: 'Lithium', ru: 'Литий', de: 'Lithium', es: 'Litio' },
    mass: 6.94,
    categoryKeys: { cs: 'Alkalické kovy', en: 'Alkali metals', ru: 'Щелочные металлы', de: 'Alkalimetalle', es: 'Metales alcalinos' },
    period: 2,
    group: 1,
    electronegativity: 0.98,
  },
  Be: {
    number: 4,
    symbol: 'Be',
    names: { cs: 'Beryllium', en: 'Beryllium', ru: 'Бериллий', de: 'Beryllium', es: 'Berilio' },
    mass: 9.0122,
    categoryKeys: { cs: 'Kovy alkalických zemin', en: 'Alkaline earth', ru: 'Щелочноземельные', de: 'Erdalkalimetalle', es: 'Alcalinotérreos' },
    period: 2,
    group: 2,
    electronegativity: 1.57,
  },
  B: {
    number: 5,
    symbol: 'B',
    names: { cs: 'Bor', en: 'Boron', ru: 'Бор', de: 'Bor', es: 'Boro' },
    mass: 10.81,
    categoryKeys: { cs: 'Polokovy', en: 'Metalloids', ru: 'Полуметаллы', de: 'Halbmetalle', es: 'Metaloides' },
    period: 2,
    group: 13,
    electronegativity: 2.04,
  },
  C: {
    number: 6,
    symbol: 'C',
    names: { cs: 'Uhlík', en: 'Carbon', ru: 'Углерод', de: 'Kohlenstoff', es: 'Carbono' },
    mass: 12.011,
    categoryKeys: { cs: 'Nekovy', en: 'Nonmetals', ru: 'Неметаллы', de: 'Nichtmetalle', es: 'No metales' },
    period: 2,
    group: 14,
    electronegativity: 2.55,
  },
  N: {
    number: 7,
    symbol: 'N',
    names: { cs: 'Dusík', en: 'Nitrogen', ru: 'Азот', de: 'Stickstoff', es: 'Nitrógeno' },
    mass: 14.007,
    categoryKeys: { cs: 'Nekovy', en: 'Nonmetals', ru: 'Неметаллы', de: 'Nichtmetalle', es: 'No metales' },
    period: 2,
    group: 15,
    electronegativity: 3.04,
  },
  O: {
    number: 8,
    symbol: 'O',
    names: { cs: 'Kyslík', en: 'Oxygen', ru: 'Кислород', de: 'Sauerstoff', es: 'Oxígeno' },
    mass: 15.999,
    categoryKeys: { cs: 'Nekovy', en: 'Nonmetals', ru: 'Неметаллы', de: 'Nichtmetalle', es: 'No metales' },
    period: 2,
    group: 16,
    electronegativity: 3.44,
  },
  F: {
    number: 9,
    symbol: 'F',
    names: { cs: 'Fluor', en: 'Fluorine', ru: 'Фтор', de: 'Fluor', es: 'Flúor' },
    mass: 18.998,
    categoryKeys: { cs: 'Halogeny', en: 'Halogens', ru: 'Галогены', de: 'Halogene', es: 'Halógenos' },
    period: 2,
    group: 17,
    electronegativity: 3.98,
  },
  Ne: {
    number: 10,
    symbol: 'Ne',
    names: { cs: 'Neon', en: 'Neon', ru: 'Неон', de: 'Neon', es: 'Neón' },
    mass: 20.18,
    categoryKeys: { cs: 'Vzácné plyny', en: 'Noble gases', ru: 'Благородные газы', de: 'Edelgase', es: 'Gases nobles' },
    period: 2,
    group: 18,
  },
  Na: {
    number: 11,
    symbol: 'Na',
    names: { cs: 'Sodík', en: 'Sodium', ru: 'Натрий', de: 'Natrium', es: 'Sodio' },
    mass: 22.99,
    categoryKeys: { cs: 'Alkalické kovy', en: 'Alkali metals', ru: 'Щелочные металлы', de: 'Alkalimetalle', es: 'Metales alcalinos' },
    period: 3,
    group: 1,
    electronegativity: 0.93,
  },
  Mg: {
    number: 12,
    symbol: 'Mg',
    names: { cs: 'Hořčík', en: 'Magnesium', ru: 'Магний', de: 'Magnesium', es: 'Magnesio' },
    mass: 24.305,
    categoryKeys: { cs: 'Kovy alkalických zemin', en: 'Alkaline earth', ru: 'Щелочноземельные', de: 'Erdalkalimetalle', es: 'Alcalinotérreos' },
    period: 3,
    group: 2,
    electronegativity: 1.31,
  },
  Al: {
    number: 13,
    symbol: 'Al',
    names: { cs: 'Hliník', en: 'Aluminium', ru: 'Алюминий', de: 'Aluminium', es: 'Aluminio' },
    mass: 26.982,
    categoryKeys: { cs: 'Kovy', en: 'Metals', ru: 'Металлы', de: 'Metalle', es: 'Metales' },
    period: 3,
    group: 13,
    electronegativity: 1.61,
  },
  Si: {
    number: 14,
    symbol: 'Si',
    names: { cs: 'Křemík', en: 'Silicon', ru: 'Кремний', de: 'Silizium', es: 'Silicio' },
    mass: 28.085,
    categoryKeys: { cs: 'Polokovy', en: 'Metalloids', ru: 'Полуметаллы', de: 'Halbmetalle', es: 'Metaloides' },
    period: 3,
    group: 14,
    electronegativity: 1.9,
  },
  P: {
    number: 15,
    symbol: 'P',
    names: { cs: 'Fosfor', en: 'Phosphorus', ru: 'Фосфор', de: 'Phosphor', es: 'Fósforo' },
    mass: 30.974,
    categoryKeys: { cs: 'Nekovy', en: 'Nonmetals', ru: 'Неметаллы', de: 'Nichtmetalle', es: 'No metales' },
    period: 3,
    group: 15,
    electronegativity: 2.19,
  },
  S: {
    number: 16,
    symbol: 'S',
    names: { cs: 'Síra', en: 'Sulfur', ru: 'Сера', de: 'Schwefel', es: 'Azufre' },
    mass: 32.06,
    categoryKeys: { cs: 'Nekovy', en: 'Nonmetals', ru: 'Неметаллы', de: 'Nichtmetalle', es: 'No metales' },
    period: 3,
    group: 16,
    electronegativity: 2.58,
  },
  Cl: {
    number: 17,
    symbol: 'Cl',
    names: { cs: 'Chlor', en: 'Chlorine', ru: 'Хлор', de: 'Chlor', es: 'Cloro' },
    mass: 35.45,
    categoryKeys: { cs: 'Halogeny', en: 'Halogens', ru: 'Галогены', de: 'Halogene', es: 'Halógenos' },
    period: 3,
    group: 17,
    electronegativity: 3.16,
  },
  Ar: {
    number: 18,
    symbol: 'Ar',
    names: { cs: 'Argon', en: 'Argon', ru: 'Аргон', de: 'Argon', es: 'Argón' },
    mass: 39.948,
    categoryKeys: { cs: 'Vzácné plyny', en: 'Noble gases', ru: 'Благородные газы', de: 'Edelgase', es: 'Gases nobles' },
    period: 3,
    group: 18,
  },
  K: {
    number: 19,
    symbol: 'K',
    names: { cs: 'Draslík', en: 'Potassium', ru: 'Калий', de: 'Kalium', es: 'Potasio' },
    mass: 39.098,
    categoryKeys: { cs: 'Alkalické kovy', en: 'Alkali metals', ru: 'Щелочные металлы', de: 'Alkalimetalle', es: 'Metales alcalinos' },
    period: 4,
    group: 1,
    electronegativity: 0.82,
  },
  Ca: {
    number: 20,
    symbol: 'Ca',
    names: { cs: 'Vápník', en: 'Calcium', ru: 'Кальций', de: 'Calcium', es: 'Calcio' },
    mass: 40.078,
    categoryKeys: { cs: 'Kovy alkalických zemin', en: 'Alkaline earth', ru: 'Щелочноземельные', de: 'Erdalkalimetalle', es: 'Alcalinotérreos' },
    period: 4,
    group: 2,
    electronegativity: 1.0,
  },
  Fe: {
    number: 26,
    symbol: 'Fe',
    names: { cs: 'Železo', en: 'Iron', ru: 'Железо', de: 'Eisen', es: 'Hierro' },
    mass: 55.845,
    categoryKeys: { cs: 'Přechodné kovy', en: 'Transition metals', ru: 'Переходные металлы', de: 'Übergangsmetalle', es: 'Metales de transición' },
    period: 4,
    group: 8,
    electronegativity: 1.83,
  },
  Cu: {
    number: 29,
    symbol: 'Cu',
    names: { cs: 'Měď', en: 'Copper', ru: 'Медь', de: 'Kupfer', es: 'Cobre' },
    mass: 63.546,
    categoryKeys: { cs: 'Přechodné kovy', en: 'Transition metals', ru: 'Переходные металлы', de: 'Übergangsmetalle', es: 'Metales de transición' },
    period: 4,
    group: 11,
    electronegativity: 1.9,
  },
  Zn: {
    number: 30,
    symbol: 'Zn',
    names: { cs: 'Zinek', en: 'Zinc', ru: 'Цинк', de: 'Zink', es: 'Zinc' },
    mass: 65.38,
    categoryKeys: { cs: 'Přechodné kovy', en: 'Transition metals', ru: 'Переходные металлы', de: 'Übergangsmetalle', es: 'Metales de transición' },
    period: 4,
    group: 12,
    electronegativity: 1.65,
  },
  Ag: {
    number: 47,
    symbol: 'Ag',
    names: { cs: 'Stříbro', en: 'Silver', ru: 'Серебро', de: 'Silber', es: 'Plata' },
    mass: 107.87,
    categoryKeys: { cs: 'Přechodné kovy', en: 'Transition metals', ru: 'Переходные металлы', de: 'Übergangsmetalle', es: 'Metales de transición' },
    period: 5,
    group: 11,
    electronegativity: 1.93,
  },
  Au: {
    number: 79,
    symbol: 'Au',
    names: { cs: 'Zlato', en: 'Gold', ru: 'Золото', de: 'Gold', es: 'Oro' },
    mass: 196.97,
    categoryKeys: { cs: 'Přechodné kovy', en: 'Transition metals', ru: 'Переходные металлы', de: 'Übergangsmetalle', es: 'Metales de transición' },
    period: 6,
    group: 11,
    electronegativity: 2.54,
  },
  Pb: {
    number: 82,
    symbol: 'Pb',
    names: { cs: 'Olovo', en: 'Lead', ru: 'Свинец', de: 'Blei', es: 'Plomo' },
    mass: 207.2,
    categoryKeys: { cs: 'Kovy', en: 'Metals', ru: 'Металлы', de: 'Metalle', es: 'Metales' },
    period: 6,
    group: 14,
    electronegativity: 2.33,
  },
  U: {
    number: 92,
    symbol: 'U',
    names: { cs: 'Uran', en: 'Uranium', ru: 'Уран', de: 'Uran', es: 'Uranio' },
    mass: 238.03,
    categoryKeys: { cs: 'Aktinoidy', en: 'Actinides', ru: 'Актиноиды', de: 'Actinoide', es: 'Actínidos' },
    period: 7,
    group: 3,
    electronegativity: 1.38,
  },
};

export const ChemistryTool: React.FC = () => {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'molar' | 'table' | 'solutions'>('molar');
  const [formula, setFormula] = useState<string>('C6H12O6');
  const [searchElement, setSearchElement] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Solution calculator inputs
  const [solMass, setSolMass] = useState<number>(58.44); // g (e.g. NaCl)
  const [solVolume, setSolVolume] = useState<number>(1); // liters
  const [solMolarMass, setSolMolarMass] = useState<number>(58.44); // g/mol

  const formulaInputId = useId();
  const elementSearchId = useId();
  const solMassId = useId();
  const solVolumeId = useId();
  const solMolarMassId = useId();

  const getElementName = (el: ElementInfo) => {
    return el.names[language] || el.names.en || el.symbol;
  };

  const getElementCategory = (el: ElementInfo) => {
    return el.categoryKeys[language] || el.categoryKeys.en;
  };

  // Parse chemical formula like H2O, C6H12O6, Ca(OH)2, NaCl
  const parseFormula = (str: string) => {
    try {
      let expanded = str;
      const bracketRegex = /\(([^)]+)\)(\d+)/g;
      expanded = expanded.replace(bracketRegex, (_, inner, mult) => {
        const factor = parseInt(mult);
        return inner.replace(/([A-Z][a-z]*)(\d*)/g, (__: string, elem: string, count: string) => {
          const c = count ? parseInt(count) * factor : factor;
          return `${elem}${c}`;
        });
      });

      const elementRegex = /([A-Z][a-z]*)(\d*)/g;
      const counts: Record<string, number> = {};
      let match;
      let totalFound = 0;

      while ((match = elementRegex.exec(expanded)) !== null) {
        if (!match[1]) continue;
        const elem = match[1];
        const count = match[2] ? parseInt(match[2]) : 1;
        counts[elem] = (counts[elem] || 0) + count;
        totalFound += count;
      }

      if (Object.keys(counts).length === 0) {
        return { valid: false, error: t('chem_invalid_formula', 'Zadejte platný chemický vzorec') };
      }

      let totalMass = 0;
      const breakdown: Array<{ symbol: string; name: string; count: number; mass: number; pct: number }> = [];

      for (const [sym, count] of Object.entries(counts)) {
        const el = PERIODIC_TABLE[sym];
        if (!el) {
          return { valid: false, error: `${t('unknown_element', 'Neznámý prvek')}: "${sym}".` };
        }
        const elemTotalMass = el.mass * count;
        totalMass += elemTotalMass;
        breakdown.push({
          symbol: sym,
          name: `${getElementName(el)} (${sym})`,
          count,
          mass: elemTotalMass,
          pct: 0,
        });
      }

      breakdown.forEach(b => {
        b.pct = (b.mass / totalMass) * 100;
      });

      return { valid: true, totalMass, breakdown, totalAtoms: totalFound };
    } catch {
      return { valid: false, error: t('chem_parse_error', 'Chyba při syntaktické analýze vzorce.') };
    }
  };

  const parsed = parseFormula(formula);

  const filteredElements = Object.values(PERIODIC_TABLE).filter(el => {
    const q = searchElement.toLowerCase().trim();
    if (!q) return true;
    const name = getElementName(el).toLowerCase();
    const cat = getElementCategory(el).toLowerCase();
    return (
      el.symbol.toLowerCase().includes(q) ||
      name.includes(q) ||
      el.number.toString() === q ||
      cat.includes(q)
    );
  });

  const moles = solMolarMass > 0 ? solMass / solMolarMass : 0;
  const molarity = solVolume > 0 ? moles / solVolume : 0;

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{t('tool_chemistry_tool_title', 'Chemie & Molární Kalkulačka')}</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              Localized WASM Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_chemistry_tool_desc', 'Molární hmotnost sloučenin, procentuální složení prvků, periodická tabulka a koncentrace roztoků.')}
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('molar')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'molar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          {t('chem_tab_molar', 'Molární hmotnost & Složení')}
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Atom className="w-3.5 h-3.5" />
          {t('chem_tab_table', 'Periodická tabulka & Prvky')}
        </button>
        <button
          onClick={() => setActiveTab('solutions')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'solutions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          {t('chem_tab_solutions', 'Roztoky & Koncentrace (Molarita)')}
        </button>
      </div>

      {/* Tab 1: Molar Mass */}
      {activeTab === 'molar' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={formulaInputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {t('chem_formula_label', 'Zadejte chemický vzorec sloučeniny')}
              </label>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>{t('chem_examples', 'Ukázky:')}</span>
                <button onClick={() => setFormula('H2O')} className="text-indigo-400 hover:underline">H₂O</button>
                <span aria-hidden="true">·</span>
                <button onClick={() => setFormula('NaCl')} className="text-indigo-400 hover:underline">NaCl</button>
                <span aria-hidden="true">·</span>
                <button onClick={() => setFormula('H2SO4')} className="text-indigo-400 hover:underline">H₂SO₄</button>
                <span aria-hidden="true">·</span>
                <button onClick={() => setFormula('C6H12O6')} className="text-indigo-400 hover:underline">C₆H₁₂O₆</button>
              </div>
            </div>

            <div className="relative">
              <input
                id={formulaInputId}
                type="text"
                value={formula}
                onChange={e => setFormula(e.target.value)}
                placeholder="C6H12O6, H2SO4, Ca(OH)2, NaCl..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xl font-mono text-white focus:outline-none tracking-wide"
              />
            </div>
          </div>

          {parsed.valid && parsed.totalMass && parsed.breakdown ? (
            <div className="space-y-4">
              {/* Highlight Result */}
              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider block">
                    {t('chem_molar_mass_title', 'Celková molární hmotnost (M)')}
                  </span>
                  <div className="text-3xl font-mono font-bold text-white mt-1 tabular-nums">
                    {parsed.totalMass.toFixed(3)}{' '}
                    <span className="text-base font-normal text-slate-400">g/mol</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {t('chem_atoms_count', `Obsahuje celkem ${parsed.totalAtoms} atomů v molekule`, { count: parsed.totalAtoms })}
                  </span>
                </div>

                <button
                  onClick={() => copyResult(`${parsed.totalMass?.toFixed(3)} g/mol`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-900/40 rounded-lg transition-colors border border-indigo-500/30"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('copied', 'Zkopírováno') : t('copy', 'Kopírovat')}
                </button>
              </div>

              {/* Elements Breakdown Table */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('chem_breakdown_title', 'Hmotnostní zastoupení jednotlivých prvků')}
                </span>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">{t('chem_col_element', 'Prvek')}</th>
                        <th className="py-2.5 px-3 text-center">{t('chem_col_atoms', 'Počet atomů')}</th>
                        <th className="py-2.5 px-3 text-right">{t('chem_col_mass', 'Dílčí hmotnost')}</th>
                        <th className="py-2.5 px-3 text-right">{t('chem_col_pct', 'Zastoupení (%)')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-mono tabular-nums">
                      {parsed.breakdown.map(el => (
                        <tr key={el.symbol} className="hover:bg-slate-900/40 text-slate-300">
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs text-indigo-300">
                              {el.symbol}
                            </span>
                            <span>{el.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">{el.count}×</td>
                          <td className="py-2.5 px-3 text-right text-slate-200">{el.mass.toFixed(3)} g/mol</td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                            {el.pct.toFixed(2)} %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              {parsed.error}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Periodic Table Search */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          <div className="relative">
            <label htmlFor={elementSearchId} className="sr-only">Hledat prvek</label>
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              id={elementSearchId}
              type="text"
              placeholder={t('search_element_placeholder', 'Hledat prvek podle značky (např. Fe, Au, C), názvu nebo čísla...')}
              value={searchElement}
              onChange={e => setSearchElement(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredElements.map(el => (
              <div
                key={el.symbol}
                className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{el.number}</span>
                    <span>Gr {el.group}</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-indigo-300 group-hover:text-white mt-1">
                    {el.symbol}
                  </div>
                  <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                    {getElementName(el)}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                  <div>{el.mass.toFixed(2)} u</div>
                  <div className="text-slate-500 truncate">{getElementCategory(el)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Solutions and Concentration */}
      {activeTab === 'solutions' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {t('chem_sol_title', 'Příprava roztoku a výpočet látkové koncentrace: c = n / V = (m / M) / V')}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor={solMassId} className="text-xs text-slate-400">
                  {t('chem_sol_mass', 'Hmotnost rozpuštěné látky (g):')}
                </label>
                <input
                  id={solMassId}
                  type="number"
                  step="any"
                  value={solMass}
                  onChange={e => setSolMass(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={solMolarMassId} className="text-xs text-slate-400">
                  {t('chem_sol_molar_mass', 'Molární hmotnost látky M (g/mol):')}
                </label>
                <input
                  id={solMolarMassId}
                  type="number"
                  step="any"
                  value={solMolarMass}
                  onChange={e => setSolMolarMass(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={solVolumeId} className="text-xs text-slate-400">
                  {t('chem_sol_vol', 'Objem roztoku (litry):')}
                </label>
                <input
                  id={solVolumeId}
                  type="number"
                  step="any"
                  value={solVolume}
                  onChange={e => setSolVolume(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white"
                />
              </div>
            </div>

            {/* Concentration Results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider block">
                  {t('chem_sol_result', 'Látková koncentrace (Molarita c)')}
                </span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums mt-1 block">
                  {molarity.toFixed(4)} <span className="text-base font-normal text-slate-400">mol/l (M)</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  {t('chem_sol_moles', 'Látkové množství (n)')}
                </span>
                <span className="text-2xl font-bold font-mono text-slate-200 tabular-nums mt-1 block">
                  {moles.toFixed(4)} <span className="text-base font-normal text-slate-400">mol</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
