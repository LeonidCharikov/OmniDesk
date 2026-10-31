import React, { useState, useId, useMemo } from 'react';
import {
  Atom,
  FlaskConical,
  Search,
  Calculator,
  Check,
  Copy,
  Info,
  X,
  ExternalLink,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useI18n, SupportedLanguage } from '../../i18n/context';
import {
  ALL_ELEMENTS,
  ELEMENTS_BY_SYMBOL,
  CATEGORY_CONFIG,
  ElementData,
  ElementCategory,
  StateOfMatter,
} from './periodicTableData';

export const ChemistryTool: React.FC = () => {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'molar' | 'table' | 'solutions'>('table');
  const [formula, setFormula] = useState<string>('C6H12O6');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ElementCategory | 'all'>('all');
  const [selectedState, setSelectedState] = useState<StateOfMatter | 'all'>('all');
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);
  const [copied, setCopied] = useState(false);

  // Solution calculator inputs
  const [solMass, setSolMass] = useState<number>(58.44); // g (e.g. NaCl)
  const [solVolume, setSolVolume] = useState<number>(1); // liters
  const [solMolarMass, setSolMolarMass] = useState<number>(58.44); // g/mol
  const [solPreset, setSolPreset] = useState<string>('NaCl');

  const formulaInputId = useId();
  const elementSearchId = useId();
  const solMassId = useId();
  const solVolumeId = useId();
  const solMolarMassId = useId();

  const getElementName = (el: ElementData): string => {
    return el.name[language] || el.name.en || el.symbol;
  };

  const getCategoryName = (cat: ElementCategory): string => {
    const cfg = CATEGORY_CONFIG[cat];
    return cfg ? cfg.name[language] || cfg.name.en : cat;
  };

  // Advanced formula parser supporting all 118 elements, parentheses & hydrates
  const parseFormula = (rawStr: string) => {
    try {
      const clean = rawStr.trim();
      if (!clean) {
        return { valid: false, error: t('chem_empty_formula', 'Zadejte chemický vzorec') };
      }

      // Handle hydrates: e.g. CuSO4*5H2O or CuSO4.5H2O
      const parts = clean.split(/[*·•]/);
      let totalMass = 0;
      let totalFound = 0;
      const combinedCounts: Record<string, number> = {};

      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        let part = parts[pIdx].trim();
        if (!part) continue;

        let multiplier = 1;
        const leadingNumMatch = part.match(/^(\d+)(.*)$/);
        if (leadingNumMatch && pIdx > 0) {
          multiplier = parseInt(leadingNumMatch[1], 10);
          part = leadingNumMatch[2];
        }

        // Expand nested parentheses: (NH4)2 -> N2H8
        let expanded = part;
        let hasParens = true;
        let loopLimit = 0;
        while (hasParens && loopLimit < 5) {
          loopLimit++;
          const prev = expanded;
          expanded = expanded.replace(/[\(\[]([A-Za-z0-9]+)[\)\]](\d+)?/g, (_, inner, countStr) => {
            const factor = countStr ? parseInt(countStr, 10) : 1;
            return inner.replace(/([A-Z][a-z]*)(\d*)/g, (__: string, sym: string, cStr: string) => {
              const c = (cStr ? parseInt(cStr, 10) : 1) * factor;
              return `${sym}${c}`;
            });
          });
          hasParens = expanded !== prev && /[\(\[]/.test(expanded);
        }

        // Parse individual elements
        const regex = /([A-Z][a-z]*)(\d*)/g;
        let match;
        let matchedSomething = false;

        while ((match = regex.exec(expanded)) !== null) {
          if (!match[1]) continue;
          matchedSomething = true;
          const sym = match[1];
          const count = (match[2] ? parseInt(match[2], 10) : 1) * multiplier;
          combinedCounts[sym] = (combinedCounts[sym] || 0) + count;
          totalFound += count;
        }

        if (!matchedSomething) {
          return { valid: false, error: `${t('chem_invalid_formula', 'Neplatný vzorec')}: "${part}"` };
        }
      }

      const breakdown: Array<{
        symbol: string;
        name: string;
        count: number;
        mass: number;
        pct: number;
        category: ElementCategory;
      }> = [];

      for (const [sym, count] of Object.entries(combinedCounts)) {
        const el = ELEMENTS_BY_SYMBOL[sym];
        if (!el) {
          return {
            valid: false,
            error: `${t('unknown_element', 'Neznámý prvek')}: "${sym}". Zkontrolujte velikost písmen (např. "Na" nikoliv "NA").`,
          };
        }
        const elemTotalMass = el.mass * count;
        totalMass += elemTotalMass;
        breakdown.push({
          symbol: sym,
          name: `${getElementName(el)} (${sym})`,
          count,
          mass: elemTotalMass,
          pct: 0,
          category: el.category,
        });
      }

      breakdown.forEach(b => {
        b.pct = totalMass > 0 ? (b.mass / totalMass) * 100 : 0;
      });

      return {
        valid: true,
        totalMass,
        breakdown: breakdown.sort((a, b) => b.mass - a.mass),
        totalAtoms: totalFound,
      };
    } catch {
      return { valid: false, error: t('chem_parse_error', 'Chyba při syntaktické analýze vzorce.') };
    }
  };

  const parsed = useMemo(() => parseFormula(formula), [formula, language]);

  // Quick preset loader for solutions
  const handleSelectPreset = (name: string, mMass: number, formulaStr: string) => {
    setSolPreset(name);
    setSolMolarMass(mMass);
    setFormula(formulaStr);
  };

  const moles = solMolarMass > 0 ? solMass / solMolarMass : 0;
  const molarity = solVolume > 0 ? moles / solVolume : 0;

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter elements for search and interactive tables
  const filteredElements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_ELEMENTS.filter(el => {
      if (selectedCategory !== 'all' && el.category !== selectedCategory) return false;
      if (selectedState !== 'all' && el.state !== selectedState) return false;
      if (!q) return true;

      const name = getElementName(el).toLowerCase();
      const cat = getCategoryName(el.category).toLowerCase();
      return (
        el.symbol.toLowerCase().includes(q) ||
        name.includes(q) ||
        el.number.toString() === q ||
        cat.includes(q)
      );
    });
  }, [searchQuery, selectedCategory, selectedState, language]);

  // Insert element directly into formula
  const handleInsertIntoFormula = (sym: string) => {
    setFormula(prev => prev + sym);
    setActiveTab('molar');
    setSelectedElement(null);
  };

  // Periodic table grid layout rendering helper
  // Grid: 18 columns, rows 1 through 7
  // Lanthanides & Actinides are placed in f-block rows
  const renderElementTile = (el: ElementData, isCompact = false) => {
    const cfg = CATEGORY_CONFIG[el.category] || CATEGORY_CONFIG['superheavy'];
    const isMatched = searchQuery
      ? el.symbol.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        getElementName(el).toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        el.number.toString() === searchQuery.trim()
      : selectedCategory === 'all' || el.category === selectedCategory;

    return (
      <button
        key={el.symbol}
        onClick={() => setSelectedElement(el)}
        style={{
          gridColumn: isCompact ? undefined : el.group,
          gridRow: isCompact ? undefined : el.period,
        }}
        className={`relative flex flex-col justify-between p-1 rounded-lg border transition-all text-left group select-none ${
          cfg.bgColor
        } ${cfg.borderColor} ${
          isMatched ? 'opacity-100 ring-1 ring-white/10' : 'opacity-25 hover:opacity-100'
        } hover:scale-105 hover:z-20 hover:shadow-lg`}
        title={`${el.number}. ${getElementName(el)} (${el.symbol}) - ${getCategoryName(el.category)}`}
      >
        <div className="flex items-center justify-between text-[9px] font-mono leading-none text-slate-400">
          <span className="font-semibold">{el.number}</span>
          <span className="hidden xl:inline text-[8px] text-slate-500 font-normal">
            {el.mass.toFixed(1)}
          </span>
        </div>
        <div className="text-center my-0.5">
          <span className={`text-base font-bold font-mono tracking-tight leading-none block ${cfg.textColor}`}>
            {el.symbol}
          </span>
          <span className="text-[9px] text-slate-300 truncate max-w-full block leading-none mt-0.5 font-sans">
            {getElementName(el)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 leading-none">
          <span className="truncate">{el.block}</span>
          <span className="text-[7px] uppercase text-slate-400">
            {el.state === 'gas' ? 'G' : el.state === 'liquid' ? 'L' : el.state === 'solid' ? 'S' : 'X'}
          </span>
        </div>
      </button>
    );
  };

  // Main table elements (excluding lanthanides 57-71 and actinides 89-103)
  const mainTableElements = ALL_ELEMENTS.filter(
    el => !(el.number >= 57 && el.number <= 71) && !(el.number >= 89 && el.number <= 103)
  );

  const lanthanides = ALL_ELEMENTS.filter(el => el.number >= 57 && el.number <= 71);
  const actinides = ALL_ELEMENTS.filter(el => el.number >= 89 && el.number <= 103);

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_chemistry_tool_title', 'Chemie, Periodická tabulka & Molární kalkulačka')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              118 prvků IUPAC
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'tool_chemistry_tool_desc',
              'Oficiální periodická soustava všech 118 prvků, přesný výpočet molární hmotnosti sloučenin s hydráty a příprava roztoků.'
            )}
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Atom className="w-3.5 h-3.5" />
          {t('chem_tab_table', 'Periodická tabulka (118 prvků)')}
        </button>
        <button
          onClick={() => setActiveTab('molar')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'molar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          {t('chem_tab_molar', 'Molární hmotnost & Složení vzorce')}
        </button>
        <button
          onClick={() => setActiveTab('solutions')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'solutions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          {t('chem_tab_solutions', 'Roztoky & Molarita (c = n/V)')}
        </button>
      </div>

      {/* TAB 1: PERIODIC TABLE */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          {/* Controls: Search, Category Filters, State of Matter */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <label htmlFor={elementSearchId} className="sr-only">
                  Hledat prvek
                </label>
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id={elementSearchId}
                  type="text"
                  placeholder={t(
                    'search_element_placeholder',
                    'Hledat podle značky (např. Fe, Au, C), názvu nebo protonového čísla...'
                  )}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* State of matter filter buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
                <span className="text-slate-500 px-2 flex items-center gap-1 font-mono text-[10px]">
                  <Filter className="w-3 h-3" />
                  {t('state_of_matter', 'Skupenství:')}
                </span>
                {(
                  [
                    { id: 'all', label: 'Vše' },
                    { id: 'solid', label: 'Pevné' },
                    { id: 'liquid', label: 'Kapalné' },
                    { id: 'gas', label: 'Plynné' },
                    { id: 'synthetic', label: 'Syntetické' },
                  ] as const
                ).map(st => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedState(st.id)}
                    className={`px-2 py-1 rounded transition-colors ${
                      selectedState === st.id ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Color Legend (interactive filters) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                {t('categories', 'Kategorie')}:
              </span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Všechny kategorie (118)
              </button>
              {(Object.keys(CATEGORY_CONFIG) as ElementCategory[]).map(catKey => {
                const cfg = CATEGORY_CONFIG[catKey];
                const isSelected = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(isSelected ? 'all' : catKey)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${cfg.badgeBg} font-semibold ring-1 ring-white/20`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${cfg.badgeBg.split(' ')[0]}`}
                    />
                    <span>{getCategoryName(catKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Authentic Standard Periodic Table 18-Columns Grid */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 overflow-x-auto">
            <div className="min-w-[1020px] space-y-3">
              {/* Main table: 18 columns x 7 periods */}
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: 'repeat(18, minmax(52px, 1fr))',
                  gridTemplateRows: 'repeat(7, minmax(62px, auto))',
                }}
              >
                {/* Elements 1 to 118 mapped by column/row */}
                {mainTableElements.map(el => renderElementTile(el))}

                {/* Lanthanides placeholder at Period 6, Group 3 */}
                <div
                  style={{ gridColumn: 3, gridRow: 6 }}
                  onClick={() => setSelectedCategory('lanthanide')}
                  className="flex flex-col items-center justify-center p-1 rounded-lg border border-indigo-700/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 cursor-pointer transition-colors text-center"
                  title="Lanthanoidy (prvky 57-71)"
                >
                  <span className="text-[10px] font-mono font-bold">57-71</span>
                  <span className="text-xs font-bold font-mono">La-Lu</span>
                  <span className="text-[8px] text-slate-400 truncate">{t('lanthanides', 'Lanthanoidy')}</span>
                </div>

                {/* Actinides placeholder at Period 7, Group 3 */}
                <div
                  style={{ gridColumn: 3, gridRow: 7 }}
                  onClick={() => setSelectedCategory('actinide')}
                  className="flex flex-col items-center justify-center p-1 rounded-lg border border-pink-700/50 bg-pink-950/40 text-pink-300 hover:bg-pink-900/60 cursor-pointer transition-colors text-center"
                  title="Aktinoidy (prvky 89-103)"
                >
                  <span className="text-[10px] font-mono font-bold">89-103</span>
                  <span className="text-xs font-bold font-mono">Ac-Lr</span>
                  <span className="text-[8px] text-slate-400 truncate">{t('actinides', 'Aktinoidy')}</span>
                </div>
              </div>

              {/* Separated F-block: Lanthanides and Actinides */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                {/* Lanthanide row (57-71) */}
                <div className="flex items-center gap-2">
                  <div className="w-24 shrink-0 text-right pr-2">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">
                      Lanthanoidy
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">4f řada</span>
                  </div>
                  <div
                    className="grid gap-1.5 flex-1"
                    style={{ gridTemplateColumns: 'repeat(15, minmax(52px, 1fr))' }}
                  >
                    {lanthanides.map(el => renderElementTile(el, true))}
                  </div>
                </div>

                {/* Actinide row (89-103) */}
                <div className="flex items-center gap-2">
                  <div className="w-24 shrink-0 text-right pr-2">
                    <span className="text-[10px] font-semibold text-pink-400 uppercase tracking-wider block">
                      Aktinoidy
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">5f řada</span>
                  </div>
                  <div
                    className="grid gap-1.5 flex-1"
                    style={{ gridTemplateColumns: 'repeat(15, minmax(52px, 1fr))' }}
                  >
                    {actinides.map(el => renderElementTile(el, true))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Result List Grid when searching (Quick view) */}
          {searchQuery && (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Nalezené prvky ({filteredElements.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {filteredElements.map(el => {
                  const cfg = CATEGORY_CONFIG[el.category] || CATEGORY_CONFIG['superheavy'];
                  return (
                    <div
                      key={el.symbol}
                      onClick={() => setSelectedElement(el)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${cfg.bgColor} ${cfg.borderColor}`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>#{el.number}</span>
                        <span>Gr {el.group}</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-white mt-1">{el.symbol}</div>
                      <div className="text-xs font-semibold text-slate-200 truncate">{getElementName(el)}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">{el.mass.toFixed(2)} u</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ELEMENT INSPECTION MODAL */}
      {selectedElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center ${
                    CATEGORY_CONFIG[selectedElement.category]?.bgColor || 'bg-slate-800'
                  } ${CATEGORY_CONFIG[selectedElement.category]?.borderColor || 'border-slate-700'}`}
                >
                  <span className="text-[9px] font-mono text-slate-400">#{selectedElement.number}</span>
                  <span className="text-2xl font-bold font-mono text-white leading-none">
                    {selectedElement.symbol}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {getElementName(selectedElement)}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        CATEGORY_CONFIG[selectedElement.category]?.badgeBg || ''
                      }`}
                    >
                      {getCategoryName(selectedElement.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedElement.name.en} • {selectedElement.name.cs} • {selectedElement.name.de} • {selectedElement.name.ru}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedElement(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Physical & Chemical Properties */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                    Relativní atomová hmotnost
                  </span>
                  <span className="text-sm font-mono font-bold text-white">
                    {selectedElement.mass} <span className="text-[10px] text-slate-400 font-normal">u</span>
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                    Elektronegativita (Pauling)
                  </span>
                  <span className="text-sm font-mono font-bold text-indigo-300">
                    {selectedElement.electronegativity ?? 'Neuvedeno'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                    Perioda / Skupina / Blok
                  </span>
                  <span className="text-sm font-mono font-bold text-white">
                    P{selectedElement.period} • G{selectedElement.group} • Blok {selectedElement.block}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                    Elektronová konfigurace
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {selectedElement.electronConfig}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                    Oxidační čísla
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {selectedElement.oxidationStates || '0'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                    Skupenství (při 20 °C)
                  </span>
                  <span className="text-xs font-medium text-slate-200 capitalize">
                    {selectedElement.state === 'gas'
                      ? 'Plynné (plyn)'
                      : selectedElement.state === 'liquid'
                      ? 'Kapalné (kapalina)'
                      : selectedElement.state === 'solid'
                      ? 'Pevné (pevná látka)'
                      : 'Syntetické (vyrobeno v laboratoři)'}
                  </span>
                </div>

                {selectedElement.meltingPoint !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                      Bod tání
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {selectedElement.meltingPoint} °C
                    </span>
                  </div>
                )}

                {selectedElement.boilingPoint !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                      Bod varu
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {selectedElement.boilingPoint} °C
                    </span>
                  </div>
                )}

                {selectedElement.density !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                      Hustota
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {selectedElement.density} g/cm³
                    </span>
                  </div>
                )}

                {selectedElement.yearDiscovered && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                      Rok objevu
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {selectedElement.yearDiscovered}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                IUPAC Standard Atomic Weights
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInsertIntoFormula(selectedElement.symbol)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('insert_into_formula', 'Vložit do vzorce ({symbol})', { symbol: selectedElement.symbol })}</span>
                </button>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Zavřít
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOLAR MASS CALCULATOR */}
      {activeTab === 'molar' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={formulaInputId}
                className="text-xs font-semibold text-slate-400 uppercase tracking-wider block"
              >
                {t('chem_formula_label', 'Zadejte chemický vzorec sloučeniny (včetně závorek a krystalické vody)')}
              </label>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span>{t('chem_examples', 'Ukázky:')}</span>
                <button onClick={() => setFormula('H2O')} className="text-indigo-400 hover:underline">H₂O</button>
                <span>·</span>
                <button onClick={() => setFormula('NaCl')} className="text-indigo-400 hover:underline">NaCl</button>
                <span>·</span>
                <button onClick={() => setFormula('C6H12O6')} className="text-indigo-400 hover:underline">C₆H₁₂O₆ (Glukóza)</button>
                <span>·</span>
                <button onClick={() => setFormula('CuSO4*5H2O')} className="text-indigo-400 hover:underline">CuSO₄·5H₂O</button>
                <span>·</span>
                <button onClick={() => setFormula('Ca(OH)2')} className="text-indigo-400 hover:underline">Ca(OH)₂</button>
                <span>·</span>
                <button onClick={() => setFormula('(NH4)2SO4')} className="text-indigo-400 hover:underline">(NH₄)₂SO₄</button>
                <span>·</span>
                <button onClick={() => setFormula('KMnO4')} className="text-indigo-400 hover:underline">KMnO₄</button>
              </div>
            </div>

            <div className="relative">
              <input
                id={formulaInputId}
                type="text"
                value={formula}
                onChange={e => setFormula(e.target.value)}
                placeholder="C6H12O6, CuSO4*5H2O, Ca(OH)2, KMnO4, BaSO4..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xl font-mono text-white focus:outline-none tracking-wide"
              />
            </div>

            {/* Quick Element Keyboard Insert Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1">{t('quick_element_insert', 'Rychlé vložení prvku:')}</span>
              {['H', 'C', 'N', 'O', 'Na', 'Cl', 'Fe', 'Cu', 'S', 'P', 'Ca', 'K', 'Mg', 'Al', 'Ag', 'Au', 'U'].map(sym => (
                <button
                  key={sym}
                  onClick={() => setFormula(prev => prev + sym)}
                  className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-indigo-300 hover:text-white transition-colors"
                >
                  {sym}
                </button>
              ))}
              <button
                onClick={() => setFormula(prev => prev + '2')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
              >
                ₂
              </button>
              <button
                onClick={() => setFormula(prev => prev + '3')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
              >
                ₃
              </button>
              <button
                onClick={() => setFormula(prev => prev + '4')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
              >
                ₄
              </button>
              <button
                onClick={() => setFormula(prev => prev + '(')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
              >
                (
              </button>
              <button
                onClick={() => setFormula(prev => prev + ')')}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
              >
                )
              </button>
              <button
                onClick={() => setFormula('')}
                className="ml-auto px-2 py-1 rounded text-[11px] text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                Vymazat
              </button>
            </div>
          </div>

          {parsed.valid && parsed.totalMass && parsed.breakdown ? (
            <div className="space-y-4">
              {/* Highlight Result */}
              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider block">
                    {t('chem_molar_mass_title', 'Celková molární hmotnost (M)')}
                  </span>
                  <div className="text-3xl font-mono font-bold text-white mt-1 tabular-nums">
                    {parsed.totalMass.toFixed(3)}{' '}
                    <span className="text-base font-normal text-slate-400">g/mol</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {t(
                      'chem_atoms_count',
                      `Obsahuje celkem ${parsed.totalAtoms} atomů v molekule`,
                      { count: parsed.totalAtoms }
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSolMolarMass(+parsed.totalMass!.toFixed(3));
                      setSolPreset(formula);
                      setActiveTab('solutions');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/40 rounded-lg transition-colors border border-emerald-500/30"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>{t('use_for_solution', 'Použít pro roztok')}</span>
                  </button>

                  <button
                    onClick={() => copyResult(`${parsed.totalMass?.toFixed(3)} g/mol`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-900/40 rounded-lg transition-colors border border-indigo-500/30"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? t('copied', 'Zkopírováno') : t('copy', 'Kopírovat')}
                  </button>
                </div>
              </div>

              {/* Elements Breakdown Table */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('chem_breakdown_title', 'Hmotnostní zastoupení jednotlivých prvků')}
                </span>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">{t('chem_col_element', 'Prvek')}</th>
                        <th className="py-2.5 px-3 text-center">{t('chem_col_atoms', 'Počet atomů')}</th>
                        <th className="py-2.5 px-3 text-right">{t('chem_col_mass', 'Dílčí hmotnost')}</th>
                        <th className="py-2.5 px-3 text-right">{t('chem_col_pct', 'Zastoupení (%)')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-mono tabular-nums">
                      {parsed.breakdown.map(el => {
                        const cfg = CATEGORY_CONFIG[el.category] || CATEGORY_CONFIG['superheavy'];
                        return (
                          <tr key={el.symbol} className="hover:bg-slate-900/40 text-slate-300">
                            <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold ${cfg.textColor} ${cfg.badgeBg}`}
                              >
                                {el.symbol}
                              </span>
                              <span>{el.name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">{el.count}×</td>
                            <td className="py-2.5 px-3 text-right text-slate-200">
                              {el.mass.toFixed(3)} g/mol
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                              {el.pct.toFixed(2)} %
                            </td>
                          </tr>
                        );
                      })}
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

      {/* TAB 3: SOLUTIONS & MOLARITY */}
      {activeTab === 'solutions' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {t('chem_sol_title', 'Příprava roztoku a výpočet látkové koncentrace: c = n / V = (m / M) / V')}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span>{t('presets', 'Předvolby:')}</span>
                <button
                  onClick={() => handleSelectPreset('NaCl (Chlorid sodný)', 58.44, 'NaCl')}
                  className="text-indigo-400 hover:underline"
                >
                  NaCl
                </button>
                <span>·</span>
                <button
                  onClick={() => handleSelectPreset('Glukóza', 180.156, 'C6H12O6')}
                  className="text-indigo-400 hover:underline"
                >
                  Glukóza
                </button>
                <span>·</span>
                <button
                  onClick={() => handleSelectPreset('Kyselina sírová', 98.078, 'H2SO4')}
                  className="text-indigo-400 hover:underline"
                >
                  H₂SO₄
                </button>
                <span>·</span>
                <button
                  onClick={() => handleSelectPreset('Hydroxid sodný', 39.997, 'NaOH')}
                  className="text-indigo-400 hover:underline"
                >
                  NaOH
                </button>
              </div>
            </div>

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
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {(molarity * 1000).toFixed(2)} mmol/l
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  {t('chem_sol_moles', 'Látkové množství (n)')}
                </span>
                <span className="text-2xl font-bold font-mono text-slate-200 tabular-nums mt-1 block">
                  {moles.toFixed(4)} <span className="text-base font-normal text-slate-400">mol</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {(moles * 6.022e23).toExponential(3)} molekul (Avogadrova konstanta)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
