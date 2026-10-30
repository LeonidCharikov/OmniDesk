export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'
  | 'superheavy';

export type StateOfMatter = 'solid' | 'liquid' | 'gas' | 'synthetic';

export interface ElementData {
  number: number;
  symbol: string;
  name: {
    cs: string;
    en: string;
    de: string;
    ru: string;
    es: string;
  };
  mass: number;
  period: number;
  group: number; // 1-18
  category: ElementCategory;
  state: StateOfMatter;
  block: 's' | 'p' | 'd' | 'f';
  electronegativity?: number;
  electronConfig: string;
  oxidationStates?: string;
  meltingPoint?: number; // °C
  boilingPoint?: number; // °C
  density?: number; // g/cm³
  yearDiscovered?: number | string;
}

export const CATEGORY_CONFIG: Record<
  ElementCategory,
  {
    name: { cs: string; en: string; de: string; ru: string; es: string };
    bgColor: string;
    borderColor: string;
    textColor: string;
    badgeBg: string;
  }
> = {
  'nonmetal': {
    name: { cs: 'Reaktivní nekovy', en: 'Reactive nonmetals', de: 'Reaktive Nichtmetalle', ru: 'Реактивные неметаллы', es: 'No metales reactivos' },
    bgColor: 'bg-emerald-950/40 hover:bg-emerald-900/60',
    borderColor: 'border-emerald-600/40 hover:border-emerald-500',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  'noble-gas': {
    name: { cs: 'Vzácné plyny', en: 'Noble gases', de: 'Edelgase', ru: 'Благородные газы', es: 'Gases nobles' },
    bgColor: 'bg-purple-950/40 hover:bg-purple-900/60',
    borderColor: 'border-purple-600/40 hover:border-purple-500',
    textColor: 'text-purple-300',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  'alkali-metal': {
    name: { cs: 'Alkalické kovy', en: 'Alkali metals', de: 'Alkalimetalle', ru: 'Щелочные металлы', es: 'Metales alcalinos' },
    bgColor: 'bg-red-950/40 hover:bg-red-900/60',
    borderColor: 'border-red-600/40 hover:border-red-500',
    textColor: 'text-red-300',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  'alkaline-earth': {
    name: { cs: 'Kovy alkalických zemin', en: 'Alkaline earth metals', de: 'Erdalkalimetalle', ru: 'Щелочноземельные металлы', es: 'Alcalinotérreos' },
    bgColor: 'bg-orange-950/40 hover:bg-orange-900/60',
    borderColor: 'border-orange-600/40 hover:border-orange-500',
    textColor: 'text-orange-300',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  },
  'metalloid': {
    name: { cs: 'Polokovy', en: 'Metalloids', de: 'Halbmetalle', ru: 'Полуметаллы', es: 'Metaloides' },
    bgColor: 'bg-amber-950/40 hover:bg-amber-900/60',
    borderColor: 'border-amber-600/40 hover:border-amber-500',
    textColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  'halogen': {
    name: { cs: 'Halogeny', en: 'Halogens', de: 'Halogene', ru: 'Галогены', es: 'Halógenos' },
    bgColor: 'bg-teal-950/40 hover:bg-teal-900/60',
    borderColor: 'border-teal-600/40 hover:border-teal-500',
    textColor: 'text-teal-300',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  },
  'transition-metal': {
    name: { cs: 'Přechodné kovy', en: 'Transition metals', de: 'Übergangsmetalle', ru: 'Переходные металлы', es: 'Metales de transición' },
    bgColor: 'bg-blue-950/40 hover:bg-blue-900/60',
    borderColor: 'border-blue-600/40 hover:border-blue-500',
    textColor: 'text-blue-300',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  'post-transition': {
    name: { cs: 'Post-přechodné kovy', en: 'Post-transition metals', de: 'Metalle nach dem Übergang', ru: 'Постпереходные металлы', es: 'Metales post-transición' },
    bgColor: 'bg-cyan-950/40 hover:bg-cyan-900/60',
    borderColor: 'border-cyan-600/40 hover:border-cyan-500',
    textColor: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  'lanthanide': {
    name: { cs: 'Lanthanoidy', en: 'Lanthanides', de: 'Lanthanoide', ru: 'Лантаноиды', es: 'Lantánidos' },
    bgColor: 'bg-indigo-950/40 hover:bg-indigo-900/60',
    borderColor: 'border-indigo-600/40 hover:border-indigo-500',
    textColor: 'text-indigo-300',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  'actinide': {
    name: { cs: 'Aktinoidy', en: 'Actinides', de: 'Actinoide', ru: 'Актиноиды', es: 'Actínidos' },
    bgColor: 'bg-pink-950/40 hover:bg-pink-900/60',
    borderColor: 'border-pink-600/40 hover:border-pink-500',
    textColor: 'text-pink-300',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  'superheavy': {
    name: { cs: 'Neznámé / Supertěžké', en: 'Unknown / Superheavy', de: 'Unbekannt / Superschwer', ru: 'Сверхтяжёлые / Неизвестно', es: 'Superpesados / Desconocido' },
    bgColor: 'bg-slate-900/60 hover:bg-slate-800/80',
    borderColor: 'border-slate-700 hover:border-slate-500',
    textColor: 'text-slate-300',
    badgeBg: 'bg-slate-700/30 text-slate-300 border-slate-600',
  },
};

export const ALL_ELEMENTS: ElementData[] = [
  // Period 1
  {
    number: 1, symbol: 'H', mass: 1.008, period: 1, group: 1, category: 'nonmetal', state: 'gas', block: 's', electronegativity: 2.20,
    electronConfig: '1s¹', oxidationStates: '-1, +1', meltingPoint: -259.16, boilingPoint: -252.87, density: 0.00008988, yearDiscovered: 1766,
    name: { cs: 'Vodík', en: 'Hydrogen', de: 'Wasserstoff', ru: 'Водород', es: 'Hidrógeno' }
  },
  {
    number: 2, symbol: 'He', mass: 4.0026, period: 1, group: 18, category: 'noble-gas', state: 'gas', block: 's',
    electronConfig: '1s²', oxidationStates: '0', meltingPoint: -272.2, boilingPoint: -268.93, density: 0.0001785, yearDiscovered: 1868,
    name: { cs: 'Helium', en: 'Helium', de: 'Helium', ru: 'Гелий', es: 'Helio' }
  },

  // Period 2
  {
    number: 3, symbol: 'Li', mass: 6.94, period: 2, group: 1, category: 'alkali-metal', state: 'solid', block: 's', electronegativity: 0.98,
    electronConfig: '[He] 2s¹', oxidationStates: '+1', meltingPoint: 180.54, boilingPoint: 1342, density: 0.534, yearDiscovered: 1817,
    name: { cs: 'Lithium', en: 'Lithium', de: 'Lithium', ru: 'Литий', es: 'Litio' }
  },
  {
    number: 4, symbol: 'Be', mass: 9.0122, period: 2, group: 2, category: 'alkaline-earth', state: 'solid', block: 's', electronegativity: 1.57,
    electronConfig: '[He] 2s²', oxidationStates: '+2', meltingPoint: 1287, boilingPoint: 2470, density: 1.85, yearDiscovered: 1798,
    name: { cs: 'Beryllium', en: 'Beryllium', de: 'Beryllium', ru: 'Бериллий', es: 'Berilio' }
  },
  {
    number: 5, symbol: 'B', mass: 10.81, period: 2, group: 13, category: 'metalloid', state: 'solid', block: 'p', electronegativity: 2.04,
    electronConfig: '[He] 2s² 2p¹', oxidationStates: '+3', meltingPoint: 2076, boilingPoint: 3927, density: 2.34, yearDiscovered: 1808,
    name: { cs: 'Bor', en: 'Boron', de: 'Bor', ru: 'Бор', es: 'Boro' }
  },
  {
    number: 6, symbol: 'C', mass: 12.011, period: 2, group: 14, category: 'nonmetal', state: 'solid', block: 'p', electronegativity: 2.55,
    electronConfig: '[He] 2s² 2p²', oxidationStates: '-4, -2, +2, +4', meltingPoint: 3550, boilingPoint: 4827, density: 2.267, yearDiscovered: 'Starověk',
    name: { cs: 'Uhlík', en: 'Carbon', de: 'Kohlenstoff', ru: 'Углерод', es: 'Carbono' }
  },
  {
    number: 7, symbol: 'N', mass: 14.007, period: 2, group: 15, category: 'nonmetal', state: 'gas', block: 'p', electronegativity: 3.04,
    electronConfig: '[He] 2s² 2p³', oxidationStates: '-3, -2, -1, +1, +2, +3, +4, +5', meltingPoint: -210.0, boilingPoint: -195.79, density: 0.0012506, yearDiscovered: 1772,
    name: { cs: 'Dusík', en: 'Nitrogen', de: 'Stickstoff', ru: 'Азот', es: 'Nitrógeno' }
  },
  {
    number: 8, symbol: 'O', mass: 15.999, period: 2, group: 16, category: 'nonmetal', state: 'gas', block: 'p', electronegativity: 3.44,
    electronConfig: '[He] 2s² 2p⁴', oxidationStates: '-2, -1, +2', meltingPoint: -218.79, boilingPoint: -182.96, density: 0.001429, yearDiscovered: 1774,
    name: { cs: 'Kyslík', en: 'Oxygen', de: 'Sauerstoff', ru: 'Кислород', es: 'Oxígeno' }
  },
  {
    number: 9, symbol: 'F', mass: 18.998, period: 2, group: 17, category: 'halogen', state: 'gas', block: 'p', electronegativity: 3.98,
    electronConfig: '[He] 2s² 2p⁵', oxidationStates: '-1', meltingPoint: -219.67, boilingPoint: -188.11, density: 0.001696, yearDiscovered: 1886,
    name: { cs: 'Fluor', en: 'Fluorine', de: 'Fluor', ru: 'Фтор', es: 'Flúor' }
  },
  {
    number: 10, symbol: 'Ne', mass: 20.180, period: 2, group: 18, category: 'noble-gas', state: 'gas', block: 'p',
    electronConfig: '[He] 2s² 2p⁶', oxidationStates: '0', meltingPoint: -248.59, boilingPoint: -246.08, density: 0.0009002, yearDiscovered: 1898,
    name: { cs: 'Neon', en: 'Neon', de: 'Neon', ru: 'Неон', es: 'Neón' }
  },

  // Period 3
  {
    number: 11, symbol: 'Na', mass: 22.990, period: 3, group: 1, category: 'alkali-metal', state: 'solid', block: 's', electronegativity: 0.93,
    electronConfig: '[Ne] 3s¹', oxidationStates: '+1', meltingPoint: 97.79, boilingPoint: 883, density: 0.968, yearDiscovered: 1807,
    name: { cs: 'Sodík', en: 'Sodium', de: 'Natrium', ru: 'Натрий', es: 'Sodio' }
  },
  {
    number: 12, symbol: 'Mg', mass: 24.305, period: 3, group: 2, category: 'alkaline-earth', state: 'solid', block: 's', electronegativity: 1.31,
    electronConfig: '[Ne] 3s²', oxidationStates: '+2', meltingPoint: 650, boilingPoint: 1090, density: 1.738, yearDiscovered: 1755,
    name: { cs: 'Hořčík', en: 'Magnesium', de: 'Magnesium', ru: 'Магний', es: 'Magnesio' }
  },
  {
    number: 13, symbol: 'Al', mass: 26.982, period: 3, group: 13, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 1.61,
    electronConfig: '[Ne] 3s² 3p¹', oxidationStates: '+3', meltingPoint: 660.32, boilingPoint: 2519, density: 2.70, yearDiscovered: 1825,
    name: { cs: 'Hliník', en: 'Aluminium', de: 'Aluminium', ru: 'Алюминий', es: 'Aluminio' }
  },
  {
    number: 14, symbol: 'Si', mass: 28.085, period: 3, group: 14, category: 'metalloid', state: 'solid', block: 'p', electronegativity: 1.90,
    electronConfig: '[Ne] 3s² 3p²', oxidationStates: '-4, +2, +4', meltingPoint: 1414, boilingPoint: 3265, density: 2.329, yearDiscovered: 1824,
    name: { cs: 'Křemík', en: 'Silicon', de: 'Silizium', ru: 'Кремний', es: 'Silicio' }
  },
  {
    number: 15, symbol: 'P', mass: 30.974, period: 3, group: 15, category: 'nonmetal', state: 'solid', block: 'p', electronegativity: 2.19,
    electronConfig: '[Ne] 3s² 3p³', oxidationStates: '-3, +3, +5', meltingPoint: 44.15, boilingPoint: 280.5, density: 1.823, yearDiscovered: 1669,
    name: { cs: 'Fosfor', en: 'Phosphorus', de: 'Phosphor', ru: 'Фосфор', es: 'Fósforo' }
  },
  {
    number: 16, symbol: 'S', mass: 32.06, period: 3, group: 16, category: 'nonmetal', state: 'solid', block: 'p', electronegativity: 2.58,
    electronConfig: '[Ne] 3s² 3p⁴', oxidationStates: '-2, +2, +4, +6', meltingPoint: 115.21, boilingPoint: 444.6, density: 2.07, yearDiscovered: 'Starověk',
    name: { cs: 'Síra', en: 'Sulfur', de: 'Schwefel', ru: 'Сера', es: 'Azufre' }
  },
  {
    number: 17, symbol: 'Cl', mass: 35.45, period: 3, group: 17, category: 'halogen', state: 'gas', block: 'p', electronegativity: 3.16,
    electronConfig: '[Ne] 3s² 3p⁵', oxidationStates: '-1, +1, +3, +5, +7', meltingPoint: -101.5, boilingPoint: -34.04, density: 0.003214, yearDiscovered: 1774,
    name: { cs: 'Chlor', en: 'Chlorine', de: 'Chlor', ru: 'Хлор', es: 'Cloro' }
  },
  {
    number: 18, symbol: 'Ar', mass: 39.948, period: 3, group: 18, category: 'noble-gas', state: 'gas', block: 'p',
    electronConfig: '[Ne] 3s² 3p⁶', oxidationStates: '0', meltingPoint: -189.34, boilingPoint: -185.85, density: 0.001784, yearDiscovered: 1894,
    name: { cs: 'Argon', en: 'Argon', de: 'Argon', ru: 'Аргон', es: 'Argón' }
  },

  // Period 4
  {
    number: 19, symbol: 'K', mass: 39.098, period: 4, group: 1, category: 'alkali-metal', state: 'solid', block: 's', electronegativity: 0.82,
    electronConfig: '[Ar] 4s¹', oxidationStates: '+1', meltingPoint: 63.38, boilingPoint: 759, density: 0.862, yearDiscovered: 1807,
    name: { cs: 'Draslík', en: 'Potassium', de: 'Kalium', ru: 'Калий', es: 'Potasio' }
  },
  {
    number: 20, symbol: 'Ca', mass: 40.078, period: 4, group: 2, category: 'alkaline-earth', state: 'solid', block: 's', electronegativity: 1.00,
    electronConfig: '[Ar] 4s²', oxidationStates: '+2', meltingPoint: 842, boilingPoint: 1484, density: 1.55, yearDiscovered: 1808,
    name: { cs: 'Vápník', en: 'Calcium', de: 'Calcium', ru: 'Кальций', es: 'Calcio' }
  },
  {
    number: 21, symbol: 'Sc', mass: 44.956, period: 4, group: 3, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.36,
    electronConfig: '[Ar] 3d¹ 4s²', oxidationStates: '+3', meltingPoint: 1541, boilingPoint: 2836, density: 2.985, yearDiscovered: 1879,
    name: { cs: 'Skandium', en: 'Scandium', de: 'Scandium', ru: 'Скандий', es: 'Escandio' }
  },
  {
    number: 22, symbol: 'Ti', mass: 47.867, period: 4, group: 4, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.54,
    electronConfig: '[Ar] 3d² 4s²', oxidationStates: '+2, +3, +4', meltingPoint: 1668, boilingPoint: 3287, density: 4.506, yearDiscovered: 1791,
    name: { cs: 'Titan', en: 'Titanium', de: 'Titan', ru: 'Титан', es: 'Titanio' }
  },
  {
    number: 23, symbol: 'V', mass: 50.942, period: 4, group: 5, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.63,
    electronConfig: '[Ar] 3d³ 4s²', oxidationStates: '+2, +3, +4, +5', meltingPoint: 1910, boilingPoint: 3407, density: 6.11, yearDiscovered: 1801,
    name: { cs: 'Vanad', en: 'Vanadium', de: 'Vanadium', ru: 'Ванадий', es: 'Vanadio' }
  },
  {
    number: 24, symbol: 'Cr', mass: 51.996, period: 4, group: 6, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.66,
    electronConfig: '[Ar] 3d⁵ 4s¹', oxidationStates: '+2, +3, +6', meltingPoint: 1907, boilingPoint: 2671, density: 7.19, yearDiscovered: 1797,
    name: { cs: 'Chrom', en: 'Chromium', de: 'Chrom', ru: 'Хром', es: 'Cromo' }
  },
  {
    number: 25, symbol: 'Mn', mass: 54.938, period: 4, group: 7, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.55,
    electronConfig: '[Ar] 3d⁵ 4s²', oxidationStates: '+2, +3, +4, +6, +7', meltingPoint: 1246, boilingPoint: 2061, density: 7.21, yearDiscovered: 1774,
    name: { cs: 'Mangan', en: 'Manganese', de: 'Mangan', ru: 'Марганец', es: 'Manganeso' }
  },
  {
    number: 26, symbol: 'Fe', mass: 55.845, period: 4, group: 8, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.83,
    electronConfig: '[Ar] 3d⁶ 4s²', oxidationStates: '+2, +3', meltingPoint: 1538, boilingPoint: 2862, density: 7.874, yearDiscovered: 'Starověk',
    name: { cs: 'Železo', en: 'Iron', de: 'Eisen', ru: 'Железо', es: 'Hierro' }
  },
  {
    number: 27, symbol: 'Co', mass: 58.933, period: 4, group: 9, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.88,
    electronConfig: '[Ar] 3d⁷ 4s²', oxidationStates: '+2, +3', meltingPoint: 1495, boilingPoint: 2927, density: 8.90, yearDiscovered: 1735,
    name: { cs: 'Kobalt', en: 'Cobalt', de: 'Kobalt', ru: 'Кобальт', es: 'Cobalto' }
  },
  {
    number: 28, symbol: 'Ni', mass: 58.693, period: 4, group: 10, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.91,
    electronConfig: '[Ar] 3d⁸ 4s²', oxidationStates: '+2, +3', meltingPoint: 1455, boilingPoint: 2913, density: 8.908, yearDiscovered: 1751,
    name: { cs: 'Nikl', en: 'Nickel', de: 'Nickel', ru: 'Никель', es: 'Níquel' }
  },
  {
    number: 29, symbol: 'Cu', mass: 63.546, period: 4, group: 11, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.90,
    electronConfig: '[Ar] 3d¹⁰ 4s¹', oxidationStates: '+1, +2', meltingPoint: 1084.62, boilingPoint: 2562, density: 8.96, yearDiscovered: 'Starověk',
    name: { cs: 'Měď', en: 'Copper', de: 'Kupfer', ru: 'Медь', es: 'Cobre' }
  },
  {
    number: 30, symbol: 'Zn', mass: 65.38, period: 4, group: 12, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.65,
    electronConfig: '[Ar] 3d¹⁰ 4s²', oxidationStates: '+2', meltingPoint: 419.53, boilingPoint: 907, density: 7.14, yearDiscovered: 'Starověk',
    name: { cs: 'Zinek', en: 'Zinc', de: 'Zink', ru: 'Цинк', es: 'Zinc' }
  },
  {
    number: 31, symbol: 'Ga', mass: 69.723, period: 4, group: 13, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 1.81,
    electronConfig: '[Ar] 3d¹⁰ 4s² 4p¹', oxidationStates: '+3', meltingPoint: 29.76, boilingPoint: 2204, density: 5.91, yearDiscovered: 1875,
    name: { cs: 'Gallium', en: 'Gallium', de: 'Gallium', ru: 'Галлий', es: 'Galio' }
  },
  {
    number: 32, symbol: 'Ge', mass: 72.630, period: 4, group: 14, category: 'metalloid', state: 'solid', block: 'p', electronegativity: 2.01,
    electronConfig: '[Ar] 3d¹⁰ 4s² 4p²', oxidationStates: '+2, +4', meltingPoint: 938.25, boilingPoint: 2833, density: 5.323, yearDiscovered: 1886,
    name: { cs: 'Germanium', en: 'Germanium', de: 'Germanium', ru: 'Германий', es: 'Germanio' }
  },
  {
    number: 33, symbol: 'As', mass: 74.922, period: 4, group: 15, category: 'metalloid', state: 'solid', block: 'p', electronegativity: 2.18,
    electronConfig: '[Ar] 3d¹⁰ 4s² 4p³', oxidationStates: '-3, +3, +5', meltingPoint: 817, boilingPoint: 614, density: 5.727, yearDiscovered: 1250,
    name: { cs: 'Arsen', en: 'Arsenic', de: 'Arsen', ru: 'Мышьяк', es: 'Arsénico' }
  },
  {
    number: 34, symbol: 'Se', mass: 78.971, period: 4, group: 16, category: 'nonmetal', state: 'solid', block: 'p', electronegativity: 2.55,
    electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁴', oxidationStates: '-2, +4, +6', meltingPoint: 221, boilingPoint: 685, density: 4.81, yearDiscovered: 1817,
    name: { cs: 'Selen', en: 'Selenium', de: 'Selen', ru: 'Селен', es: 'Selenio' }
  },
  {
    number: 35, symbol: 'Br', mass: 79.904, period: 4, group: 17, category: 'halogen', state: 'liquid', block: 'p', electronegativity: 2.96,
    electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵', oxidationStates: '-1, +1, +3, +5', meltingPoint: -7.2, boilingPoint: 58.8, density: 3.1028, yearDiscovered: 1826,
    name: { cs: 'Brom', en: 'Bromine', de: 'Brom', ru: 'Бром', es: 'Bromo' }
  },
  {
    number: 36, symbol: 'Kr', mass: 83.798, period: 4, group: 18, category: 'noble-gas', state: 'gas', block: 'p', electronegativity: 3.00,
    electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶', oxidationStates: '+2', meltingPoint: -157.36, boilingPoint: -153.22, density: 0.003749, yearDiscovered: 1898,
    name: { cs: 'Krypton', en: 'Krypton', de: 'Krypton', ru: 'Криптон', es: 'Kriptón' }
  },

  // Period 5
  {
    number: 37, symbol: 'Rb', mass: 85.468, period: 5, group: 1, category: 'alkali-metal', state: 'solid', block: 's', electronegativity: 0.82,
    electronConfig: '[Kr] 5s¹', oxidationStates: '+1', meltingPoint: 39.31, boilingPoint: 688, density: 1.532, yearDiscovered: 1861,
    name: { cs: 'Rubidium', en: 'Rubidium', de: 'Rubidium', ru: 'Рубидий', es: 'Rubidio' }
  },
  {
    number: 38, symbol: 'Sr', mass: 87.62, period: 5, group: 2, category: 'alkaline-earth', state: 'solid', block: 's', electronegativity: 0.95,
    electronConfig: '[Kr] 5s²', oxidationStates: '+2', meltingPoint: 777, boilingPoint: 1382, density: 2.64, yearDiscovered: 1790,
    name: { cs: 'Stroncium', en: 'Strontium', de: 'Strontium', ru: 'Стронций', es: 'Estroncio' }
  },
  {
    number: 39, symbol: 'Y', mass: 88.906, period: 5, group: 3, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.22,
    electronConfig: '[Kr] 4d¹ 5s²', oxidationStates: '+3', meltingPoint: 1526, boilingPoint: 3345, density: 4.472, yearDiscovered: 1794,
    name: { cs: 'Yttrium', en: 'Yttrium', de: 'Yttrium', ru: 'Иттрий', es: 'Itrio' }
  },
  {
    number: 40, symbol: 'Zr', mass: 91.224, period: 5, group: 4, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.33,
    electronConfig: '[Kr] 4d² 5s²', oxidationStates: '+4', meltingPoint: 1855, boilingPoint: 4409, density: 6.52, yearDiscovered: 1789,
    name: { cs: 'Zirkonium', en: 'Zirconium', de: 'Zirconium', ru: 'Цирконий', es: 'Circonio' }
  },
  {
    number: 41, symbol: 'Nb', mass: 92.906, period: 5, group: 5, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.60,
    electronConfig: '[Kr] 4d⁴ 5s¹', oxidationStates: '+3, +5', meltingPoint: 2477, boilingPoint: 4744, density: 8.57, yearDiscovered: 1801,
    name: { cs: 'Niob', en: 'Niobium', de: 'Niob', ru: 'Ниобий', es: 'Niobio' }
  },
  {
    number: 42, symbol: 'Mo', mass: 95.95, period: 5, group: 6, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.16,
    electronConfig: '[Kr] 4d⁵ 5s¹', oxidationStates: '+2, +3, +4, +5, +6', meltingPoint: 2623, boilingPoint: 4639, density: 10.28, yearDiscovered: 1778,
    name: { cs: 'Molybden', en: 'Molybdenum', de: 'Molybdän', ru: 'Молибден', es: 'Molibdeno' }
  },
  {
    number: 43, symbol: 'Tc', mass: 98, period: 5, group: 7, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.90,
    electronConfig: '[Kr] 4d⁵ 5s²', oxidationStates: '+4, +7', meltingPoint: 2157, boilingPoint: 4265, density: 11.5, yearDiscovered: 1937,
    name: { cs: 'Technecium', en: 'Technetium', de: 'Technetium', ru: 'Технеций', es: 'Tecnecio' }
  },
  {
    number: 44, symbol: 'Ru', mass: 101.07, period: 5, group: 8, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.20,
    electronConfig: '[Kr] 4d⁷ 5s¹', oxidationStates: '+2, +3, +4, +6, +8', meltingPoint: 2334, boilingPoint: 4150, density: 12.45, yearDiscovered: 1844,
    name: { cs: 'Ruthenium', en: 'Ruthenium', de: 'Ruthenium', ru: 'Рутений', es: 'Rutenio' }
  },
  {
    number: 45, symbol: 'Rh', mass: 102.91, period: 5, group: 9, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.28,
    electronConfig: '[Kr] 4d⁸ 5s¹', oxidationStates: '+2, +3, +4', meltingPoint: 1964, boilingPoint: 3695, density: 12.41, yearDiscovered: 1803,
    name: { cs: 'Rhodium', en: 'Rhodium', de: 'Rhodium', ru: 'Родий', es: 'Rodio' }
  },
  {
    number: 46, symbol: 'Pd', mass: 106.42, period: 5, group: 10, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.20,
    electronConfig: '[Kr] 4d¹⁰', oxidationStates: '+2, +4', meltingPoint: 1554.9, boilingPoint: 2963, density: 12.023, yearDiscovered: 1803,
    name: { cs: 'Palladium', en: 'Palladium', de: 'Palladium', ru: 'Палладий', es: 'Paladio' }
  },
  {
    number: 47, symbol: 'Ag', mass: 107.87, period: 5, group: 11, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.93,
    electronConfig: '[Kr] 4d¹⁰ 5s¹', oxidationStates: '+1', meltingPoint: 961.78, boilingPoint: 2162, density: 10.49, yearDiscovered: 'Starověk',
    name: { cs: 'Stříbro', en: 'Silver', de: 'Silber', ru: 'Серебро', es: 'Plata' }
  },
  {
    number: 48, symbol: 'Cd', mass: 112.41, period: 5, group: 12, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.69,
    electronConfig: '[Kr] 4d¹⁰ 5s²', oxidationStates: '+2', meltingPoint: 321.07, boilingPoint: 767, density: 8.65, yearDiscovered: 1817,
    name: { cs: 'Kadmium', en: 'Cadmium', de: 'Cadmium', ru: 'Кадмий', es: 'Cadmio' }
  },
  {
    number: 49, symbol: 'In', mass: 114.82, period: 5, group: 13, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 1.78,
    electronConfig: '[Kr] 4d¹⁰ 5s² 5p¹', oxidationStates: '+3', meltingPoint: 156.6, boilingPoint: 2072, density: 7.31, yearDiscovered: 1863,
    name: { cs: 'Indium', en: 'Indium', de: 'Indium', ru: 'Индий', es: 'Indio' }
  },
  {
    number: 50, symbol: 'Sn', mass: 118.71, period: 5, group: 14, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 1.96,
    electronConfig: '[Kr] 4d¹⁰ 5s² 5p²', oxidationStates: '+2, +4', meltingPoint: 231.93, boilingPoint: 2602, density: 7.31, yearDiscovered: 'Starověk',
    name: { cs: 'Cín', en: 'Tin', de: 'Zinn', ru: 'Олово', es: 'Estaño' }
  },
  {
    number: 51, symbol: 'Sb', mass: 121.76, period: 5, group: 15, category: 'metalloid', state: 'solid', block: 'p', electronegativity: 2.05,
    electronConfig: '[Kr] 4d¹⁰ 5s² 5p³', oxidationStates: '-3, +3, +5', meltingPoint: 630.63, boilingPoint: 1587, density: 6.697, yearDiscovered: 'Starověk',
    name: { cs: 'Antimon', en: 'Antimony', de: 'Antimon', ru: 'Сурьма', es: 'Antimonio' }
  },
  {
    number: 52, symbol: 'Te', mass: 127.60, period: 5, group: 16, category: 'metalloid', state: 'solid', block: 'p', electronegativity: 2.10,
    electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁴', oxidationStates: '-2, +4, +6', meltingPoint: 449.51, boilingPoint: 988, density: 6.24, yearDiscovered: 1782,
    name: { cs: 'Tellur', en: 'Tellurium', de: 'Tellur', ru: 'Теллур', es: 'Teluro' }
  },
  {
    number: 53, symbol: 'I', mass: 126.90, period: 5, group: 17, category: 'halogen', state: 'solid', block: 'p', electronegativity: 2.66,
    electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵', oxidationStates: '-1, +1, +5, +7', meltingPoint: 113.7, boilingPoint: 184.3, density: 4.933, yearDiscovered: 1811,
    name: { cs: 'Jod', en: 'Iodine', de: 'Iod', ru: 'Иод', es: 'Yodo' }
  },
  {
    number: 54, symbol: 'Xe', mass: 131.29, period: 5, group: 18, category: 'noble-gas', state: 'gas', block: 'p', electronegativity: 2.60,
    electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶', oxidationStates: '+2, +4, +6, +8', meltingPoint: -111.7, boilingPoint: -108.12, density: 0.005894, yearDiscovered: 1898,
    name: { cs: 'Xenon', en: 'Xenon', de: 'Xenon', ru: 'Ксенон', es: 'Xenón' }
  },

  // Period 6
  {
    number: 55, symbol: 'Cs', mass: 132.91, period: 6, group: 1, category: 'alkali-metal', state: 'solid', block: 's', electronegativity: 0.79,
    electronConfig: '[Xe] 6s¹', oxidationStates: '+1', meltingPoint: 28.5, boilingPoint: 671, density: 1.93, yearDiscovered: 1860,
    name: { cs: 'Cesium', en: 'Caesium', de: 'Caesium', ru: 'Цезий', es: 'Cesio' }
  },
  {
    number: 56, symbol: 'Ba', mass: 137.33, period: 6, group: 2, category: 'alkaline-earth', state: 'solid', block: 's', electronegativity: 0.89,
    electronConfig: '[Xe] 6s²', oxidationStates: '+2', meltingPoint: 727, boilingPoint: 1897, density: 3.51, yearDiscovered: 1808,
    name: { cs: 'Baryum', en: 'Barium', de: 'Barium', ru: 'Барий', es: 'Bario' }
  },

  // Lanthanides (57-71)
  {
    number: 57, symbol: 'La', mass: 138.91, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.10,
    electronConfig: '[Xe] 5d¹ 6s²', oxidationStates: '+3', meltingPoint: 920, boilingPoint: 3464, density: 6.162, yearDiscovered: 1839,
    name: { cs: 'Lanthan', en: 'Lanthanum', de: 'Lanthan', ru: 'Лантан', es: 'Lantano' }
  },
  {
    number: 58, symbol: 'Ce', mass: 140.12, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.12,
    electronConfig: '[Xe] 4f¹ 5d¹ 6s²', oxidationStates: '+3, +4', meltingPoint: 798, boilingPoint: 3443, density: 6.77, yearDiscovered: 1803,
    name: { cs: 'Cer', en: 'Cerium', de: 'Cer', ru: 'Церий', es: 'Cerio' }
  },
  {
    number: 59, symbol: 'Pr', mass: 140.91, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.13,
    electronConfig: '[Xe] 4f³ 6s²', oxidationStates: '+3, +4', meltingPoint: 931, boilingPoint: 3520, density: 6.77, yearDiscovered: 1885,
    name: { cs: 'Praseodym', en: 'Praseodymium', de: 'Praseodym', ru: 'Празеодим', es: 'Praseodimio' }
  },
  {
    number: 60, symbol: 'Nd', mass: 144.24, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.14,
    electronConfig: '[Xe] 4f⁴ 6s²', oxidationStates: '+3', meltingPoint: 1021, boilingPoint: 3074, density: 7.01, yearDiscovered: 1885,
    name: { cs: 'Neodym', en: 'Neodymium', de: 'Neodym', ru: 'Неодим', es: 'Neodimio' }
  },
  {
    number: 61, symbol: 'Pm', mass: 145, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.13,
    electronConfig: '[Xe] 4f⁵ 6s²', oxidationStates: '+3', meltingPoint: 1042, boilingPoint: 3000, density: 7.26, yearDiscovered: 1945,
    name: { cs: 'Promethium', en: 'Promethium', de: 'Promethium', ru: 'Прометий', es: 'Prometio' }
  },
  {
    number: 62, symbol: 'Sm', mass: 150.36, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.17,
    electronConfig: '[Xe] 4f⁶ 6s²', oxidationStates: '+2, +3', meltingPoint: 1072, boilingPoint: 1794, density: 7.52, yearDiscovered: 1879,
    name: { cs: 'Samarium', en: 'Samarium', de: 'Samarium', ru: 'Самарий', es: 'Samario' }
  },
  {
    number: 63, symbol: 'Eu', mass: 151.96, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.20,
    electronConfig: '[Xe] 4f⁷ 6s²', oxidationStates: '+2, +3', meltingPoint: 822, boilingPoint: 1529, density: 5.244, yearDiscovered: 1901,
    name: { cs: 'Europium', en: 'Europium', de: 'Europium', ru: 'Европий', es: 'Europio' }
  },
  {
    number: 64, symbol: 'Gd', mass: 157.25, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.20,
    electronConfig: '[Xe] 4f⁷ 5d¹ 6s²', oxidationStates: '+3', meltingPoint: 1312, boilingPoint: 3273, density: 7.90, yearDiscovered: 1880,
    name: { cs: 'Gadolinium', en: 'Gadolinium', de: 'Gadolinium', ru: 'Гадолиний', es: 'Gadolinio' }
  },
  {
    number: 65, symbol: 'Tb', mass: 158.93, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.20,
    electronConfig: '[Xe] 4f⁹ 6s²', oxidationStates: '+3, +4', meltingPoint: 1356, boilingPoint: 3230, density: 8.23, yearDiscovered: 1843,
    name: { cs: 'Terbium', en: 'Terbium', de: 'Terbium', ru: 'Тербий', es: 'Terbio' }
  },
  {
    number: 66, symbol: 'Dy', mass: 162.50, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.22,
    electronConfig: '[Xe] 4f¹⁰ 6s²', oxidationStates: '+3', meltingPoint: 1412, boilingPoint: 2567, density: 8.54, yearDiscovered: 1886,
    name: { cs: 'Dysprosium', en: 'Dysprosium', de: 'Dysprosium', ru: 'Диспрозий', es: 'Disprosio' }
  },
  {
    number: 67, symbol: 'Ho', mass: 164.93, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.23,
    electronConfig: '[Xe] 4f¹¹ 6s²', oxidationStates: '+3', meltingPoint: 1474, boilingPoint: 2700, density: 8.79, yearDiscovered: 1878,
    name: { cs: 'Holmium', en: 'Holmium', de: 'Holmium', ru: 'Гольмий', es: 'Holmio' }
  },
  {
    number: 68, symbol: 'Er', mass: 167.26, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.24,
    electronConfig: '[Xe] 4f¹² 6s²', oxidationStates: '+3', meltingPoint: 1529, boilingPoint: 2868, density: 9.066, yearDiscovered: 1842,
    name: { cs: 'Erbium', en: 'Erbium', de: 'Erbium', ru: 'Эрбий', es: 'Erbio' }
  },
  {
    number: 69, symbol: 'Tm', mass: 168.93, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.25,
    electronConfig: '[Xe] 4f¹³ 6s²', oxidationStates: '+2, +3', meltingPoint: 1545, boilingPoint: 1950, density: 9.32, yearDiscovered: 1879,
    name: { cs: 'Thulium', en: 'Thulium', de: 'Thulium', ru: 'Тулий', es: 'Tulio' }
  },
  {
    number: 70, symbol: 'Yb', mass: 173.05, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'f', electronegativity: 1.10,
    electronConfig: '[Xe] 4f¹⁴ 6s²', oxidationStates: '+2, +3', meltingPoint: 824, boilingPoint: 1196, density: 6.90, yearDiscovered: 1878,
    name: { cs: 'Ytterbium', en: 'Ytterbium', de: 'Ytterbium', ru: 'Иттербий', es: 'Iterbio' }
  },
  {
    number: 71, symbol: 'Lu', mass: 174.97, period: 6, group: 3, category: 'lanthanide', state: 'solid', block: 'd', electronegativity: 1.27,
    electronConfig: '[Xe] 4f¹⁴ 5d¹ 6s²', oxidationStates: '+3', meltingPoint: 1663, boilingPoint: 3402, density: 9.841, yearDiscovered: 1907,
    name: { cs: 'Lutecium', en: 'Lutetium', de: 'Lutetium', ru: 'Лютеций', es: 'Lutecio' }
  },

  // Main Period 6 Continues (72-86)
  {
    number: 72, symbol: 'Hf', mass: 178.49, period: 6, group: 4, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.30,
    electronConfig: '[Xe] 4f¹⁴ 5d² 6s²', oxidationStates: '+4', meltingPoint: 2233, boilingPoint: 4603, density: 13.31, yearDiscovered: 1923,
    name: { cs: 'Hafnium', en: 'Hafnium', de: 'Hafnium', ru: 'Гафний', es: 'Hafnio' }
  },
  {
    number: 73, symbol: 'Ta', mass: 180.95, period: 6, group: 5, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.50,
    electronConfig: '[Xe] 4f¹⁴ 5d³ 6s²', oxidationStates: '+5', meltingPoint: 3017, boilingPoint: 5458, density: 16.69, yearDiscovered: 1802,
    name: { cs: 'Tantal', en: 'Tantalum', de: 'Tantal', ru: 'Тантал', es: 'Tántalo' }
  },
  {
    number: 74, symbol: 'W', mass: 183.84, period: 6, group: 6, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.36,
    electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²', oxidationStates: '+2, +4, +6', meltingPoint: 3422, boilingPoint: 5930, density: 19.25, yearDiscovered: 1783,
    name: { cs: 'Wolfram', en: 'Tungsten', de: 'Wolfram', ru: 'Вольфрам', es: 'Wolframio' }
  },
  {
    number: 75, symbol: 'Re', mass: 186.21, period: 6, group: 7, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 1.90,
    electronConfig: '[Xe] 4f¹⁴ 5d⁵ 6s²', oxidationStates: '+4, +7', meltingPoint: 3186, boilingPoint: 5596, density: 21.02, yearDiscovered: 1925,
    name: { cs: 'Rhenium', en: 'Rhenium', de: 'Rhenium', ru: 'Рений', es: 'Renio' }
  },
  {
    number: 76, symbol: 'Os', mass: 190.23, period: 6, group: 8, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.20,
    electronConfig: '[Xe] 4f¹⁴ 5d⁶ 6s²', oxidationStates: '+4, +8', meltingPoint: 3033, boilingPoint: 5012, density: 22.59, yearDiscovered: 1803,
    name: { cs: 'Osmium', en: 'Osmium', de: 'Osmium', ru: 'Осмий', es: 'Osmio' }
  },
  {
    number: 77, symbol: 'Ir', mass: 192.22, period: 6, group: 9, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.20,
    electronConfig: '[Xe] 4f¹⁴ 5d⁷ 6s²', oxidationStates: '+3, +4', meltingPoint: 2446, boilingPoint: 4428, density: 22.56, yearDiscovered: 1803,
    name: { cs: 'Iridium', en: 'Iridium', de: 'Iridium', ru: 'Иридий', es: 'Iridio' }
  },
  {
    number: 78, symbol: 'Pt', mass: 195.08, period: 6, group: 10, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.28,
    electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹', oxidationStates: '+2, +4', meltingPoint: 1768.3, boilingPoint: 3825, density: 21.45, yearDiscovered: 1735,
    name: { cs: 'Platina', en: 'Platinum', de: 'Platin', ru: 'Платина', es: 'Platino' }
  },
  {
    number: 79, symbol: 'Au', mass: 196.97, period: 6, group: 11, category: 'transition-metal', state: 'solid', block: 'd', electronegativity: 2.54,
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', oxidationStates: '+1, +3', meltingPoint: 1064.18, boilingPoint: 2970, density: 19.3, yearDiscovered: 'Starověk',
    name: { cs: 'Zlato', en: 'Gold', de: 'Gold', ru: 'Золото', es: 'Oro' }
  },
  {
    number: 80, symbol: 'Hg', mass: 200.59, period: 6, group: 12, category: 'transition-metal', state: 'liquid', block: 'd', electronegativity: 2.00,
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', oxidationStates: '+1, +2', meltingPoint: -38.83, boilingPoint: 356.73, density: 13.534, yearDiscovered: 'Starověk',
    name: { cs: 'Rtuť', en: 'Mercury', de: 'Quecksilber', ru: 'Ртуть', es: 'Mercurio' }
  },
  {
    number: 81, symbol: 'Tl', mass: 204.38, period: 6, group: 13, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 1.62,
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹', oxidationStates: '+1, +3', meltingPoint: 304, boilingPoint: 1473, density: 11.85, yearDiscovered: 1861,
    name: { cs: 'Thallium', en: 'Thallium', de: 'Thallium', ru: 'Таллий', es: 'Talio' }
  },
  {
    number: 82, symbol: 'Pb', mass: 207.2, period: 6, group: 14, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 2.33,
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', oxidationStates: '+2, +4', meltingPoint: 327.46, boilingPoint: 1749, density: 11.34, yearDiscovered: 'Starověk',
    name: { cs: 'Olovo', en: 'Lead', de: 'Blei', ru: 'Свинец', es: 'Plomo' }
  },
  {
    number: 83, symbol: 'Bi', mass: 208.98, period: 6, group: 15, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 2.02,
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³', oxidationStates: '+3, +5', meltingPoint: 271.4, boilingPoint: 1564, density: 9.78, yearDiscovered: 1753,
    name: { cs: 'Bismut', en: 'Bismuth', de: 'Wismut', ru: 'Висмут', es: 'Bismuto' }
  },
  {
    number: 84, symbol: 'Po', mass: 209, period: 6, group: 16, category: 'post-transition', state: 'solid', block: 'p', electronegativity: 2.00,
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴', oxidationStates: '+2, +4', meltingPoint: 254, boilingPoint: 962, density: 9.196, yearDiscovered: 1898,
    name: { cs: 'Polonium', en: 'Polonium', de: 'Polonium', ru: 'Полоний', es: 'Polonio' }
  },
  {
    number: 85, symbol: 'At', mass: 210, period: 6, group: 17, category: 'halogen', state: 'solid', block: 'p', electronegativity: 2.20,
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵', oxidationStates: '-1, +1, +3, +5', meltingPoint: 302, boilingPoint: 337, density: 7.0, yearDiscovered: 1940,
    name: { cs: 'Astat', en: 'Astatine', de: 'Astat', ru: 'Астат', es: 'Ástato' }
  },
  {
    number: 86, symbol: 'Rn', mass: 222, period: 6, group: 18, category: 'noble-gas', state: 'gas', block: 'p',
    electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', oxidationStates: '+2', meltingPoint: -71, boilingPoint: -61.7, density: 0.00973, yearDiscovered: 1900,
    name: { cs: 'Radon', en: 'Radon', de: 'Radon', ru: 'Радон', es: 'Radón' }
  },

  // Period 7
  {
    number: 87, symbol: 'Fr', mass: 223, period: 7, group: 1, category: 'alkali-metal', state: 'solid', block: 's', electronegativity: 0.70,
    electronConfig: '[Rn] 7s¹', oxidationStates: '+1', meltingPoint: 27, boilingPoint: 677, density: 2.48, yearDiscovered: 1939,
    name: { cs: 'Francium', en: 'Francium', de: 'Francium', ru: 'Франций', es: 'Francio' }
  },
  {
    number: 88, symbol: 'Ra', mass: 226, period: 7, group: 2, category: 'alkaline-earth', state: 'solid', block: 's', electronegativity: 0.90,
    electronConfig: '[Rn] 7s²', oxidationStates: '+2', meltingPoint: 700, boilingPoint: 1737, density: 5.5, yearDiscovered: 1898,
    name: { cs: 'Radium', en: 'Radium', de: 'Radium', ru: 'Радий', es: 'Radio' }
  },

  // Actinides (89-103)
  {
    number: 89, symbol: 'Ac', mass: 227, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.10,
    electronConfig: '[Rn] 6d¹ 7s²', oxidationStates: '+3', meltingPoint: 1050, boilingPoint: 3200, density: 10.07, yearDiscovered: 1899,
    name: { cs: 'Aktinium', en: 'Actinium', de: 'Actinium', ru: 'Актиний', es: 'Actinio' }
  },
  {
    number: 90, symbol: 'Th', mass: 232.04, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.30,
    electronConfig: '[Rn] 6d² 7s²', oxidationStates: '+4', meltingPoint: 1750, boilingPoint: 4788, density: 11.724, yearDiscovered: 1829,
    name: { cs: 'Thorium', en: 'Thorium', de: 'Thorium', ru: 'Торий', es: 'Torio' }
  },
  {
    number: 91, symbol: 'Pa', mass: 231.04, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.50,
    electronConfig: '[Rn] 5f² 6d¹ 7s²', oxidationStates: '+4, +5', meltingPoint: 1568, boilingPoint: 4027, density: 15.37, yearDiscovered: 1913,
    name: { cs: 'Protaktinium', en: 'Protactinium', de: 'Protactinium', ru: 'Протактиний', es: 'Protactinio' }
  },
  {
    number: 92, symbol: 'U', mass: 238.03, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.38,
    electronConfig: '[Rn] 5f³ 6d¹ 7s²', oxidationStates: '+3, +4, +5, +6', meltingPoint: 1132.2, boilingPoint: 4131, density: 19.1, yearDiscovered: 1789,
    name: { cs: 'Uran', en: 'Uranium', de: 'Uran', ru: 'Уран', es: 'Uranio' }
  },
  {
    number: 93, symbol: 'Np', mass: 237, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.36,
    electronConfig: '[Rn] 5f⁴ 6d¹ 7s²', oxidationStates: '+3, +4, +5, +6', meltingPoint: 644, boilingPoint: 3902, density: 20.45, yearDiscovered: 1940,
    name: { cs: 'Neptunium', en: 'Neptunium', de: 'Neptunium', ru: 'Нептуний', es: 'Neptunio' }
  },
  {
    number: 94, symbol: 'Pu', mass: 244, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.28,
    electronConfig: '[Rn] 5f⁶ 7s²', oxidationStates: '+3, +4, +5, +6', meltingPoint: 640, boilingPoint: 3228, density: 19.816, yearDiscovered: 1940,
    name: { cs: 'Plutonium', en: 'Plutonium', de: 'Plutonium', ru: 'Плутоний', es: 'Plutonio' }
  },
  {
    number: 95, symbol: 'Am', mass: 243, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.13,
    electronConfig: '[Rn] 5f⁷ 7s²', oxidationStates: '+3, +4, +5, +6', meltingPoint: 1176, boilingPoint: 2607, density: 12, yearDiscovered: 1944,
    name: { cs: 'Americium', en: 'Americium', de: 'Americium', ru: 'Америций', es: 'Americio' }
  },
  {
    number: 96, symbol: 'Cm', mass: 247, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.28,
    electronConfig: '[Rn] 5f⁷ 6d¹ 7s²', oxidationStates: '+3, +4', meltingPoint: 1345, boilingPoint: 3110, density: 13.51, yearDiscovered: 1944,
    name: { cs: 'Curium', en: 'Curium', de: 'Curium', ru: 'Кюрий', es: 'Curio' }
  },
  {
    number: 97, symbol: 'Bk', mass: 247, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.30,
    electronConfig: '[Rn] 5f⁹ 7s²', oxidationStates: '+3, +4', meltingPoint: 1050, boilingPoint: 2627, density: 14.78, yearDiscovered: 1949,
    name: { cs: 'Berkelium', en: 'Berkelium', de: 'Berkelium', ru: 'Берклий', es: 'Berkelio' }
  },
  {
    number: 98, symbol: 'Cf', mass: 251, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.30,
    electronConfig: '[Rn] 5f¹⁰ 7s²', oxidationStates: '+3', meltingPoint: 900, boilingPoint: 1472, density: 15.1, yearDiscovered: 1950,
    name: { cs: 'Kalifornium', en: 'Californium', de: 'Californium', ru: 'Калифорний', es: 'Californio' }
  },
  {
    number: 99, symbol: 'Es', mass: 252, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.30,
    electronConfig: '[Rn] 5f¹¹ 7s²', oxidationStates: '+3', meltingPoint: 860, boilingPoint: 996, density: 8.84, yearDiscovered: 1952,
    name: { cs: 'Einsteinium', en: 'Einsteinium', de: 'Einsteinium', ru: 'Эйнштейний', es: 'Einstenio' }
  },
  {
    number: 100, symbol: 'Fm', mass: 257, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.30,
    electronConfig: '[Rn] 5f¹² 7s²', oxidationStates: '+3', meltingPoint: 1527, density: 9.7, yearDiscovered: 1952,
    name: { cs: 'Fermium', en: 'Fermium', de: 'Fermium', ru: 'Фермий', es: 'Fermio' }
  },
  {
    number: 101, symbol: 'Md', mass: 258, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.30,
    electronConfig: '[Rn] 5f¹³ 7s²', oxidationStates: '+2, +3', meltingPoint: 827, density: 10.3, yearDiscovered: 1955,
    name: { cs: 'Mendelevium', en: 'Mendelevium', de: 'Mendelevium', ru: 'Менделевий', es: 'Mendelevio' }
  },
  {
    number: 102, symbol: 'No', mass: 259, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'f', electronegativity: 1.30,
    electronConfig: '[Rn] 5f¹⁴ 7s²', oxidationStates: '+2, +3', meltingPoint: 827, density: 9.9, yearDiscovered: 1958,
    name: { cs: 'Nobelium', en: 'Nobelium', de: 'Nobelium', ru: 'Нобелий', es: 'Nobelio' }
  },
  {
    number: 103, symbol: 'Lr', mass: 266, period: 7, group: 3, category: 'actinide', state: 'solid', block: 'd', electronegativity: 1.30,
    electronConfig: '[Rn] 5f¹⁴ 7s² 7p¹', oxidationStates: '+3', meltingPoint: 1627, density: 15.6, yearDiscovered: 1961,
    name: { cs: 'Lawrencium', en: 'Lawrencium', de: 'Lawrencium', ru: 'Лоуренсий', es: 'Laurencio' }
  },

  // Main Period 7 Continues (Transactinides 104-118)
  {
    number: 104, symbol: 'Rf', mass: 267, period: 7, group: 4, category: 'transition-metal', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d² 7s²', oxidationStates: '+4', density: 23.2, yearDiscovered: 1969,
    name: { cs: 'Rutherfordium', en: 'Rutherfordium', de: 'Rutherfordium', ru: 'Резерфордий', es: 'Rutherfordio' }
  },
  {
    number: 105, symbol: 'Db', mass: 268, period: 7, group: 5, category: 'transition-metal', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d³ 7s²', oxidationStates: '+5', density: 29.3, yearDiscovered: 1970,
    name: { cs: 'Dubnium', en: 'Dubnium', de: 'Dubnium', ru: 'Дубний', es: 'Dubnio' }
  },
  {
    number: 106, symbol: 'Sg', mass: 269, period: 7, group: 6, category: 'transition-metal', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d⁴ 7s²', oxidationStates: '+6', density: 35.0, yearDiscovered: 1974,
    name: { cs: 'Seaborgium', en: 'Seaborgium', de: 'Seaborgium', ru: 'Сиборгий', es: 'Seaborgio' }
  },
  {
    number: 107, symbol: 'Bh', mass: 270, period: 7, group: 7, category: 'transition-metal', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d⁵ 7s²', oxidationStates: '+7', density: 37.1, yearDiscovered: 1981,
    name: { cs: 'Bohrium', en: 'Bohrium', de: 'Bohrium', ru: 'Борий', es: 'Bohrio' }
  },
  {
    number: 108, symbol: 'Hs', mass: 277, period: 7, group: 8, category: 'transition-metal', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d⁶ 7s²', oxidationStates: '+8', density: 40.7, yearDiscovered: 1984,
    name: { cs: 'Hassium', en: 'Hassium', de: 'Hassium', ru: 'Хассий', es: 'Hassio' }
  },
  {
    number: 109, symbol: 'Mt', mass: 278, period: 7, group: 9, category: 'superheavy', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d⁷ 7s²', density: 37.4, yearDiscovered: 1982,
    name: { cs: 'Meitnerium', en: 'Meitnerium', de: 'Meitnerium', ru: 'Мейтнерий', es: 'Meitnerio' }
  },
  {
    number: 110, symbol: 'Ds', mass: 281, period: 7, group: 10, category: 'superheavy', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d⁸ 7s²', density: 34.8, yearDiscovered: 1994,
    name: { cs: 'Darmstadtium', en: 'Darmstadtium', de: 'Darmstadtium', ru: 'Дармштадтий', es: 'Darmstatio' }
  },
  {
    number: 111, symbol: 'Rg', mass: 282, period: 7, group: 11, category: 'superheavy', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d⁹ 7s²', density: 28.7, yearDiscovered: 1994,
    name: { cs: 'Roentgenium', en: 'Roentgenium', de: 'Roentgenium', ru: 'Рентгений', es: 'Roentgenio' }
  },
  {
    number: 112, symbol: 'Cn', mass: 285, period: 7, group: 12, category: 'post-transition', state: 'synthetic', block: 'd',
    electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s²', density: 23.7, yearDiscovered: 1996,
    name: { cs: 'Kopernicium', en: 'Copernicium', de: 'Copernicium', ru: 'Коперниций', es: 'Copernicio' }
  },
  {
    number: 113, symbol: 'Nh', mass: 286, period: 7, group: 13, category: 'superheavy', state: 'synthetic', block: 'p',
    electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹', density: 16, yearDiscovered: 2004,
    name: { cs: 'Nihonium', en: 'Nihonium', de: 'Nihonium', ru: 'Нихоний', es: 'Nihonio' }
  },
  {
    number: 114, symbol: 'Fl', mass: 289, period: 7, group: 14, category: 'post-transition', state: 'synthetic', block: 'p',
    electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²', density: 14, yearDiscovered: 1998,
    name: { cs: 'Flerovium', en: 'Flerovium', de: 'Flerovium', ru: 'Флеровий', es: 'Flerovio' }
  },
  {
    number: 115, symbol: 'Mc', mass: 290, period: 7, group: 15, category: 'superheavy', state: 'synthetic', block: 'p',
    electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³', density: 13.5, yearDiscovered: 2003,
    name: { cs: 'Moscovium', en: 'Moscovium', de: 'Moscovium', ru: 'Московий', es: 'Moscovio' }
  },
  {
    number: 116, symbol: 'Lv', mass: 293, period: 7, group: 16, category: 'superheavy', state: 'synthetic', block: 'p',
    electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴', density: 12.9, yearDiscovered: 2000,
    name: { cs: 'Livermorium', en: 'Livermorium', de: 'Livermorium', ru: 'Ливерморий', es: 'Livermorio' }
  },
  {
    number: 117, symbol: 'Ts', mass: 294, period: 7, group: 17, category: 'superheavy', state: 'synthetic', block: 'p',
    electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵', density: 7.2, yearDiscovered: 2010,
    name: { cs: 'Tennessin', en: 'Tennessine', de: 'Tenness', ru: 'Теннессин', es: 'Teneso' }
  },
  {
    number: 118, symbol: 'Og', mass: 294, period: 7, group: 18, category: 'superheavy', state: 'synthetic', block: 'p',
    electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶', density: 5.0, yearDiscovered: 2002,
    name: { cs: 'Oganesson', en: 'Oganesson', de: 'Oganesson', ru: 'Оганесон', es: 'Oganesón' }
  },
];

// Fast O(1) map by symbol for formula calculations and searches
export const ELEMENTS_BY_SYMBOL: Record<string, ElementData> = ALL_ELEMENTS.reduce(
  (acc, el) => {
    acc[el.symbol] = el;
    return acc;
  },
  {} as Record<string, ElementData>
);

// Map by atomic number
export const ELEMENTS_BY_NUMBER: Record<number, ElementData> = ALL_ELEMENTS.reduce(
  (acc, el) => {
    acc[el.number] = el;
    return acc;
  },
  {} as Record<number, ElementData>
);
