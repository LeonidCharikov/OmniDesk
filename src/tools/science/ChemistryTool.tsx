import React, { useState, useId } from 'react';
import { Atom, FlaskConical, Search, Calculator, Info, Check, Copy } from 'lucide-react';

interface ElementInfo {
  number: number;
  symbol: string;
  name: string;
  mass: number;
  category: string;
  period: number;
  group: number;
  electronegativity?: number;
}

const PERIODIC_TABLE: Record<string, ElementInfo> = {
  H: { number: 1, symbol: 'H', name: 'Vodík (Hydrogen)', mass: 1.008, category: 'Nekovy', period: 1, group: 1, electronegativity: 2.2 },
  He: { number: 2, symbol: 'He', name: 'Helium', mass: 4.0026, category: 'Vzácné plyny', period: 1, group: 18 },
  Li: { number: 3, symbol: 'Li', name: 'Lithium', mass: 6.94, category: 'Alkalické kovy', period: 2, group: 1, electronegativity: 0.98 },
  Be: { number: 4, symbol: 'Be', name: 'Beryllium', mass: 9.0122, category: 'Kovy alkalických zemin', period: 2, group: 2, electronegativity: 1.57 },
  B: { number: 5, symbol: 'B', name: 'Bor', mass: 10.81, category: 'Polokovy', period: 2, group: 13, electronegativity: 2.04 },
  C: { number: 6, symbol: 'C', name: 'Uhlík (Carbon)', mass: 12.011, category: 'Nekovy', period: 2, group: 14, electronegativity: 2.55 },
  N: { number: 7, symbol: 'N', name: 'Dusík (Nitrogen)', mass: 14.007, category: 'Nekovy', period: 2, group: 15, electronegativity: 3.04 },
  O: { number: 8, symbol: 'O', name: 'Kyslík (Oxygen)', mass: 15.999, category: 'Nekovy', period: 2, group: 16, electronegativity: 3.44 },
  F: { number: 9, symbol: 'F', name: 'Fluor', mass: 18.998, category: 'Halogeny', period: 2, group: 17, electronegativity: 3.98 },
  Ne: { number: 10, symbol: 'Ne', name: 'Neon', mass: 20.18, category: 'Vzácné plyny', period: 2, group: 18 },
  Na: { number: 11, symbol: 'Na', name: 'Sodík (Sodium)', mass: 22.99, category: 'Alkalické kovy', period: 3, group: 1, electronegativity: 0.93 },
  Mg: { number: 12, symbol: 'Mg', name: 'Hořčík (Magnesium)', mass: 24.305, category: 'Kovy alkalických zemin', period: 3, group: 2, electronegativity: 1.31 },
  Al: { number: 13, symbol: 'Al', name: 'Hliník (Aluminium)', mass: 26.982, category: 'Kovy', period: 3, group: 13, electronegativity: 1.61 },
  Si: { number: 14, symbol: 'Si', name: 'Křemík (Silicon)', mass: 28.085, category: 'Polokovy', period: 3, group: 14, electronegativity: 1.9 },
  P: { number: 15, symbol: 'P', name: 'Fosfor', mass: 30.974, category: 'Nekovy', period: 3, group: 15, electronegativity: 2.19 },
  S: { number: 16, symbol: 'S', name: 'Síra (Sulfur)', mass: 32.06, category: 'Nekovy', period: 3, group: 16, electronegativity: 2.58 },
  Cl: { number: 17, symbol: 'Cl', name: 'Chlor', mass: 35.45, category: 'Halogeny', period: 3, group: 17, electronegativity: 3.16 },
  Ar: { number: 18, symbol: 'Ar', name: 'Argon', mass: 39.948, category: 'Vzácné plyny', period: 3, group: 18 },
  K: { number: 19, symbol: 'K', name: 'Draslík (Potassium)', mass: 39.098, category: 'Alkalické kovy', period: 4, group: 1, electronegativity: 0.82 },
  Ca: { number: 20, symbol: 'Ca', name: 'Vápník (Calcium)', mass: 40.078, category: 'Kovy alkalických zemin', period: 4, group: 2, electronegativity: 1.0 },
  Fe: { number: 26, symbol: 'Fe', name: 'Železo (Iron)', mass: 55.845, category: 'Přechodné kovy', period: 4, group: 8, electronegativity: 1.83 },
  Cu: { number: 29, symbol: 'Cu', name: 'Měď (Copper)', mass: 63.546, category: 'Přechodné kovy', period: 4, group: 11, electronegativity: 1.9 },
  Zn: { number: 30, symbol: 'Zn', name: 'Zinek (Zinc)', mass: 65.38, category: 'Přechodné kovy', period: 4, group: 12, electronegativity: 1.65 },
  Ag: { number: 47, symbol: 'Ag', name: 'Stříbro (Silver)', mass: 107.87, category: 'Přechodné kovy', period: 5, group: 11, electronegativity: 1.93 },
  Au: { number: 79, symbol: 'Au', name: 'Zlato (Gold)', mass: 196.97, category: 'Přechodné kovy', period: 6, group: 11, electronegativity: 2.54 },
  Pb: { number: 82, symbol: 'Pb', name: 'Olovo (Lead)', mass: 207.2, category: 'Kovy', period: 6, group: 14, electronegativity: 2.33 },
  U: { number: 92, symbol: 'U', name: 'Uran', mass: 238.03, category: 'Aktinoidy', period: 7, group: 3, electronegativity: 1.38 },
};

export const ChemistryTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'molar' | 'table' | 'solutions'>('molar');
  const [formula, setFormula] = useState<string>('C6H12O6');
  const [searchElement, setSearchElement] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Solution calculator inputs
  const [solMass, setSolMass] = useState<number>(58.44); // g (e.g. NaCl)
  const [solVolume, setSolVolume] = useState<number>(1); // litry
  const [solMolarMass, setSolMolarMass] = useState<number>(58.44); // g/mol

  const formulaInputId = useId();
  const elementSearchId = useId();
  const solMassId = useId();
  const solVolumeId = useId();
  const solMolarMassId = useId();

  // Parse chemical formula like H2O, C6H12O6, Ca(OH)2, NaCl
  const parseFormula = (str: string) => {
    try {
      // Expand brackets like (OH)2 to O2H2
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
        return { valid: false, error: 'Zadejte platný chemický vzorec' };
      }

      let totalMass = 0;
      const breakdown: Array<{ symbol: string; name: string; count: number; mass: number; pct: number }> = [];

      for (const [sym, count] of Object.entries(counts)) {
        const el = PERIODIC_TABLE[sym];
        if (!el) {
          return { valid: false, error: `Neznámý chemický prvek: "${sym}". Zkontrolujte velikost písmen (např. Ca, Cl, Na).` };
        }
        const elemTotalMass = el.mass * count;
        totalMass += elemTotalMass;
        breakdown.push({
          symbol: sym,
          name: el.name,
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
      return { valid: false, error: 'Chyba při syntaktické analýze vzorce.' };
    }
  };

  const parsed = parseFormula(formula);

  const filteredElements = Object.values(PERIODIC_TABLE).filter(el => {
    const q = searchElement.toLowerCase().trim();
    if (!q) return true;
    return (
      el.symbol.toLowerCase().includes(q) ||
      el.name.toLowerCase().includes(q) ||
      el.number.toString() === q ||
      el.category.toLowerCase().includes(q)
    );
  });

  // Solution concentration c = n / V = (m / M) / V
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
            <h2 className="text-lg font-semibold text-white">Chemie & Molární Kalkulačka</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              Localized WASM Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Lokální výpočet molární hmotnosti sloučenin, procentuálního složení prvků, periodická tabulka a koncentrace roztoků.
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
          Molární hmotnost & Složení
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Atom className="w-3.5 h-3.5" />
          Periodická tabulka & Prvky
        </button>
        <button
          onClick={() => setActiveTab('solutions')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'solutions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Roztoky & Koncentrace (Molarita)
        </button>
      </div>

      {/* Tab 1: Molar Mass */}
      {activeTab === 'molar' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={formulaInputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Zadejte chemický vzorec sloučeniny
              </label>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Ukázky:</span>
                <button onClick={() => setFormula('H2O')} className="text-indigo-400 hover:underline">H₂O</button>
                <span aria-hidden="true">·</span>
                <button onClick={() => setFormula('NaCl')} className="text-indigo-400 hover:underline">NaCl</button>
                <span aria-hidden="true">·</span>
                <button onClick={() => setFormula('H2SO4')} className="text-indigo-400 hover:underline">H₂SO₄</button>
                <span aria-hidden="true">·</span>
                <button onClick={() => setFormula('C6H12O6')} className="text-indigo-400 hover:underline">C₆H₁₂O₆ (Glukóza)</button>
              </div>
            </div>

            <div className="relative">
              <input
                id={formulaInputId}
                type="text"
                value={formula}
                onChange={e => setFormula(e.target.value)}
                placeholder="např. C6H12O6, H2SO4, Ca(OH)2..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xl font-mono text-white focus:outline-none tracking-wide"
              />
            </div>
          </div>

          {parsed.valid && parsed.totalMass && parsed.breakdown ? (
            <div className="space-y-4">
              {/* Highlight Result */}
              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider block">Celková molární hmotnost (M)</span>
                  <div className="text-3xl font-mono font-bold text-white mt-1 tabular-nums">
                    {parsed.totalMass.toFixed(3)}{' '}
                    <span className="text-base font-normal text-slate-400">g/mol</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Obsahuje celkem {parsed.totalAtoms} atomů v molekule
                  </span>
                </div>

                <button
                  onClick={() => copyResult(`${parsed.totalMass?.toFixed(3)} g/mol`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-900/40 rounded-lg transition-colors border border-indigo-500/30"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Zkopírováno' : 'Kopírovat'}
                </button>
              </div>

              {/* Elements Breakdown Table */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Hmotnostní zastoupení jednotlivých prvků
                </span>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Prvek</th>
                        <th className="py-2.5 px-3 text-center">Počet atomů</th>
                        <th className="py-2.5 px-3 text-right">Dílčí hmotnost</th>
                        <th className="py-2.5 px-3 text-right">Zastoupení (%)</th>
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
              placeholder="Hledat prvek podle značky (např. Fe, Au, C), názvu nebo čísla..."
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
                    {el.name.split(' ')[0]}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                  <div>{el.mass.toFixed(2)} u</div>
                  <div className="text-slate-500 truncate">{el.category}</div>
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
              Výpočet látkové koncentrace (Molarity) roztoku: c = n / V = (m / M) / V
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor={solMassId} className="text-xs text-slate-400">Hmotnost rozpuštěné látky (m v gramech):</label>
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
                <label htmlFor={solMolarMassId} className="text-xs text-slate-400">Molární hmotnost látky (M v g/mol):</label>
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
                <label htmlFor={solVolumeId} className="text-xs text-slate-400">Objem roztoku (V v litrech):</label>
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
                  Látková koncentrace (Molarita c)
                </span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums mt-1 block">
                  {molarity.toFixed(4)} <span className="text-base font-normal text-slate-400">mol/l (M)</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Látkové množství (n)
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
