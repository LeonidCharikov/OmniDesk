import { ToolDefinition } from '../types/tool';
import { DocxToPdfTool } from './files/DocxToPdfTool';
import { MultiFormatConverterTool } from './files/MultiFormatConverterTool';
import { FileInspectorTool } from './files/FileInspectorTool';
import { TextDiffTool } from './files/TextDiffTool';
import { ScientificCalculatorTool } from './math/ScientificCalculatorTool';
import { MatrixCalculatorTool } from './math/MatrixCalculatorTool';
import { StatisticsTool } from './math/StatisticsTool';
import { CombinatoricsTool } from './math/CombinatoricsTool';
import { LatexVisualizerTool } from './math/LatexVisualizerTool';
import { FunctionGrapherTool } from './math/FunctionGrapherTool';
import { UnitConverterTool } from './science/UnitConverterTool';
import { ChemistryTool } from './science/ChemistryTool';
import { LoanCalcTool } from './finance/LoanCalcTool';
import { CurrencyCryptoTool } from './finance/CurrencyCryptoTool';
import { JsonFormatterTool } from './utilities/JsonFormatterTool';
import { PasswordGeneratorTool } from './utilities/PasswordGeneratorTool';
import { QrCodeGeneratorTool } from './utilities/QrCodeGeneratorTool';
import { RegexEncoderTool } from './utilities/RegexEncoderTool';
import { PomodoroTimerTool } from './utilities/PomodoroTimerTool';
import { WorldTimezonesTool } from './utilities/WorldTimezonesTool';
import { OnlineTranslatorTool } from './utilities/OnlineTranslatorTool';
import { ColorPaletteWcagTool } from './utilities/ColorPaletteWcagTool';
import { SystemMonitorTool } from './utilities/SystemMonitorTool';
import { WcagContrastValidatorTool } from './utilities/WcagContrastValidatorTool';

export const TOOLS_REGISTRY: ToolDefinition[] = [
  // 1. Files & Documents
  {
    id: 'multi-converter',
    title: 'Multi-Formátový Konvertor',
    shortDesc: 'Univerzální převod dokumentů (DOCX, MD, TXT -> PDF), dat (CSV <-> JSON) a obrázků (WebP, PNG, JPG).',
    category: 'files',
    icon: 'Layers',
    requiresOnline: false,
    component: MultiFormatConverterTool,
    tags: ['konverze', 'obrazky', 'csv', 'json', 'markdown', 'pdf', 'webp'],
  },
  {
    id: 'docx-to-pdf',
    title: 'DOCX do PDF Konvertor',
    shortDesc: '100% offline převod Word dokumentů do PDF přímo v paměti zařízení.',
    category: 'files',
    icon: 'FileText',
    requiresOnline: false,
    component: DocxToPdfTool,
    tags: ['word', 'docx', 'pdf', 'konverze', 'dokumenty', 'tisk'],
  },
  {
    id: 'text-diff',
    title: 'Text & Souborový Diff Porovnávač',
    shortDesc: 'Vizuální porovnání dvou textů nebo konfiguračních souborů řádek po řádce s detekcí změn.',
    category: 'files',
    icon: 'GitCompare',
    requiresOnline: false,
    component: TextDiffTool,
    tags: ['diff', 'porovnani', 'text', 'soubory', 'git', 'zmeny'],
  },
  {
    id: 'file-inspector',
    title: 'Inspektor Souborů & Hash',
    shortDesc: 'Kryptografické SHA-256 kontrolní součty, MIME detekce a binární hex dump.',
    category: 'files',
    icon: 'Binary',
    requiresOnline: false,
    component: FileInspectorTool,
    tags: ['hash', 'sha256', 'hex', 'binarni', 'inspektor', 'bezpecnost'],
  },

  // 2. Matematika
  {
    id: 'scientific-calc',
    title: 'Klasická & Vědecká Kalkulačka',
    shortDesc: 'Standardní i vědecký režim, goniometrie, mocniny, paměť (M+/MR) a historie výpočtů.',
    category: 'math',
    icon: 'Calculator',
    requiresOnline: false,
    component: ScientificCalculatorTool,
    tags: ['kalkulacka', 'vedecka', 'sinus', 'cosinus', 'logaritmus', 'matematika'],
  },
  {
    id: 'matrix-calc',
    title: 'Maticová Kalkulačka (Vlastní rozměry)',
    shortDesc: 'Determinanty, inverzní matice, maticové násobení (A × B a B × A), transpozice a stopy pro rozměry 1x1 až 6x6.',
    category: 'math',
    icon: 'Grid',
    requiresOnline: false,
    component: MatrixCalculatorTool,
    tags: ['matice', 'determinant', 'inverze', 'algebra', 'vektory', 'nasobeni'],
  },
  {
    id: 'function-grapher',
    title: 'Generátor Grafů Funkcí 2D',
    shortDesc: 'Interaktivní vykreslování funkcí f(x), g(x), h(x), posun tažením, zoom, tečna a export grafu do PNG.',
    category: 'math',
    icon: 'LineChart',
    requiresOnline: false,
    component: FunctionGrapherTool,
    tags: ['grafy', 'funkce', 'plotter', 'sinus', 'derivace', 'kalkulus', 'matematika'],
  },
  {
    id: 'latex-visualizer',
    title: 'LaTeX Matematický Vizualizátor',
    shortDesc: 'Živý náhled matematických vzorců, rychlé vkládání symbolů, export do SVG/MathML a knihovna rovnic.',
    category: 'math',
    icon: 'Code2',
    requiresOnline: false,
    component: LatexVisualizerTool,
    tags: ['latex', 'vzorce', 'matematika', 'fyzika', 'svg', 'mathml', 'rovnice'],
  },
  {
    id: 'statistics-tool',
    title: 'Statistika & Analýza Dat',
    shortDesc: 'Aritmetický průměr, medián, modus, výběrový rozptyl, směrodatná odchylka, kvartily a histogram.',
    category: 'math',
    icon: 'BarChart3',
    requiresOnline: false,
    component: StatisticsTool,
    tags: ['statistika', 'prumer', 'median', 'odchylka', 'rozptyl', 'histogram', 'kvartily'],
  },
  {
    id: 'combinatorics-tool',
    title: 'Kombinatorika & Teorie Čísel',
    shortDesc: 'Permutace, kombinace, variace, Eukleidův algoritmus (NSD a NSN) a prvočíselný rozklad.',
    category: 'math',
    icon: 'Hash',
    requiresOnline: false,
    component: CombinatoricsTool,
    tags: ['kombinatorika', 'permutace', 'variace', 'nsd', 'nsn', 'prvocisla'],
  },

  // 3. Věda & Technika
  {
    id: 'chemistry-tool',
    title: 'Chemie & Molární Kalkulačka',
    shortDesc: 'Molární hmotnost sloučenin, procentuální složení prvků, periodická tabulka a koncentrace roztoků.',
    category: 'science',
    icon: 'FlaskConical',
    requiresOnline: false,
    component: ChemistryTool,
    tags: ['chemie', 'molarni', 'prvky', 'periodicka', 'hmotnost', 'vzorec', 'roztoky'],
  },
  {
    id: 'unit-converter',
    title: 'Vědecký Převodník Jednotek',
    shortDesc: 'SI jednotky, imperiální míry, tlak, teplota, energie a digitální data.',
    category: 'science',
    icon: 'Compass',
    requiresOnline: false,
    component: UnitConverterTool,
    tags: ['jednotky', 'fyzika', 'metry', 'stopy', 'celsius', 'kelvin', 'si'],
  },

  // 4. Finance
  {
    id: 'currency-crypto',
    title: 'Měny & Sledování Krypto',
    shortDesc: 'Konvertor fiat měn (CZK, EUR, USD, GBP...) a live/offline kalkulátor cen kryptoměn (BTC, ETH, SOL...).',
    category: 'finance',
    icon: 'TrendingUp',
    requiresOnline: false,
    component: CurrencyCryptoTool as unknown as React.ComponentType,
    tags: ['meny', 'krypto', 'bitcoin', 'kurzy', 'usd', 'eur', 'czk', 'finance'],
  },
  {
    id: 'loan-calc',
    title: 'Hypotéky & Úvěrová Kalkulačka',
    shortDesc: 'Anuitní splátky, úrokové přirážky, poměr jistina/úrok a CSV splátkový kalendář.',
    category: 'finance',
    icon: 'Coins',
    requiresOnline: false,
    component: LoanCalcTool,
    tags: ['uver', 'hypoteka', 'finance', 'splatky', 'urok', 'amortizace'],
  },

  // 5. Utility & Systém
  {
    id: 'system-monitor',
    title: 'System Monitor',
    shortDesc: 'Nativní telemetrie CPU jader, využití RAM a disků přes Tauri @tauri-apps/plugin-os a Rust sysinfo.',
    category: 'utilities',
    icon: 'Activity',
    requiresOnline: false,
    component: SystemMonitorTool,
    tags: ['hardware', 'cpu', 'ram', 'system', 'tauri', 'monitor', 'rust', 'os', 'disk'],
  },
  {
    id: 'wcag-validator',
    title: 'WCAG Contrast Validator',
    shortDesc: 'Ověření kontrastu barev podle WCAG 2.1 (AA/AAA), poměr L1/L2, simulace zrakových vad a automatické ladění.',
    category: 'utilities',
    icon: 'Eye',
    requiresOnline: false,
    component: WcagContrastValidatorTool,
    tags: ['wcag', 'kontrast', 'pristupnost', 'barvy', 'aa', 'aaa', 'simulace', 'design'],
  },
  {
    id: 'color-palette-wcag',
    title: 'Paletka Barev & Generátor',
    shortDesc: 'Generování harmonických palet barev, převody formátů HEX/RGB/HSL a pravidla barevných schémat.',
    category: 'utilities',
    icon: 'Palette',
    requiresOnline: false,
    component: ColorPaletteWcagTool,
    tags: ['barvy', 'wcag', 'kontrast', 'paleta', 'design', 'hex', 'rgb'],
  },
  {
    id: 'password-gen',
    title: 'Generátor Bezpečných Hesel',
    shortDesc: 'Kryptografická hesla a zapamatovatelné víceslovné fráze (Passphrase) s výpočtem entropie.',
    category: 'utilities',
    icon: 'KeyRound',
    requiresOnline: false,
    component: PasswordGeneratorTool,
    tags: ['heslo', 'bezpecnost', 'passphrase', 'entropie', 'generator'],
  },
  {
    id: 'qr-code',
    title: 'Generátor QR Kódů',
    shortDesc: 'Okamžitá offline tvorba QR kódů pro webové adresy, Wi-Fi sítě a texty s exportem do PNG.',
    category: 'utilities',
    icon: 'QrCode',
    requiresOnline: false,
    component: QrCodeGeneratorTool,
    tags: ['qr', 'qrcode', 'wifi', 'odkaz', 'kod', 'generator'],
  },
  {
    id: 'regex-encoder',
    title: 'RegEx Tester & Base64 / URL',
    shortDesc: 'Testování regulárních výrazů se skupinami a obousměrné kódování Base64 i URL.',
    category: 'utilities',
    icon: 'Code2',
    requiresOnline: false,
    component: RegexEncoderTool,
    tags: ['regex', 'regularni', 'base64', 'url', 'dekodovani', 'vyvoj'],
  },
  {
    id: 'pomodoro-timer',
    title: 'Pomodoro, Stopky & Časovač',
    shortDesc: 'Produktivní technika Pomodoro se zvukovými signály, přesný odpočítávací časovač a stopky s mezičasy kol.',
    category: 'utilities',
    icon: 'Flame',
    requiresOnline: false,
    component: PomodoroTimerTool,
    tags: ['cas', 'pomodoro', 'stopky', 'timer', 'produktivita', 'odpocet', 'kola'],
  },
  {
    id: 'world-timezones',
    title: 'Světový Čas & Časová Pásma',
    shortDesc: 'Světové hodiny pro globální města, posuvník pro plánování mezinárodních schůzek a indikátor dne/noci.',
    category: 'utilities',
    icon: 'Globe',
    requiresOnline: false,
    component: WorldTimezonesTool,
    tags: ['cas', 'hodiny', 'pasma', 'svet', 'mesta', 'schuzky', 'timezone'],
  },
  {
    id: 'json-formatter',
    title: 'JSON Formátovač & Validátor',
    shortDesc: 'Odsazení, minifikace a okamžitá syntaktická kontrola struktur.',
    category: 'utilities',
    icon: 'FileCode',
    requiresOnline: false,
    component: JsonFormatterTool,
    tags: ['json', 'formatovani', 'lint', 'data', 'vyvoj'],
  },
  {
    id: 'online-translator',
    title: 'Hybridní Překladač',
    shortDesc: 'Ukázka online modulu s automatickou detekcí síťového připojení.',
    category: 'utilities',
    icon: 'Globe',
    requiresOnline: true,
    component: OnlineTranslatorTool as unknown as React.ComponentType,
    tags: ['preklad', 'jazyky', 'online', 'slovnik'],
  },
];
