/* ─────────────────────────────────────────────────────────────
   Pure, framework-free logic for new OmniDesk tools:
   1. CSV / Spreadsheet Grid Engine
   2. SVG Optimizer & React JSX Converter
   3. Deterministic Seeded Mock Data Generator
   4. Lorem Ipsum & Placeholder Text Generator
   5. Snippet Template Variable Substitution
   ───────────────────────────────────────────────────────────── */

// ── 1. CSV / SPREADSHEET GRID ENGINE ──────────────────────────
export interface CsvGridData {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

function parseDelimitedRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export function detectCsvDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/)[0] || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (tabs > commas && tabs > semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

export function parseCsvGrid(raw: string, explicitDelimiter?: string): CsvGridData {
  const delimiter = explicitDelimiter || detectCsvDelimiter(raw);
  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);

  if (!lines.length) {
    return { headers: ['Column 1', 'Column 2'], rows: [['', '']], delimiter };
  }

  const parsed = lines.map(l => parseDelimitedRow(l, delimiter));
  const colCount = Math.max(1, ...parsed.map(r => r.length));
  const headers = Array.from({ length: colCount }, (_, i) => parsed[0][i]?.trim() || `Column ${i + 1}`);
  const rows = parsed.slice(1).map(r => Array.from({ length: colCount }, (_, i) => r[i] ?? ''));
  return { headers, rows, delimiter };
}

export function serializeCsvGrid(headers: string[], rows: string[][], delimiter = ','): string {
  const esc = (cell: string): string => {
    if (cell.includes('"') || cell.includes('\n') || cell.includes('\r') || cell.includes(delimiter)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };
  return [headers.map(esc).join(delimiter), ...rows.map(r => r.map(esc).join(delimiter))].join('\n');
}

export function gridToJsonObjects(headers: string[], rows: string[][]): Record<string, unknown>[] {
  return rows.map(row => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      const raw = row[idx] ?? '';
      const trimmed = raw.trim();
      if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed) && Number.isFinite(Number(trimmed))) {
        obj[h] = Number(trimmed);
      } else if (trimmed === 'true') {
        obj[h] = true;
      } else if (trimmed === 'false') {
        obj[h] = false;
      } else {
        obj[h] = raw;
      }
    });
    return obj;
  });
}

export function gridToMarkdownTable(headers: string[], rows: string[][]): string {
  const clean = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const headLine = `| ${headers.map(clean).join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map(r => `| ${headers.map((_, i) => clean(r[i] ?? '')).join(' | ')} |`);
  return [headLine, sepLine, ...bodyLines].join('\n');
}

export function deduplicateGridRows(rows: string[][]): { rows: string[][]; removedCount: number } {
  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const r of rows) {
    const key = JSON.stringify(r);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  return { rows: unique, removedCount: rows.length - unique.length };
}

export interface ColumnNumericStat {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

export function computeColumnNumericStat(rows: string[][], colIdx: number): ColumnNumericStat | null {
  const nums = rows
    .map(r => (r[colIdx] ?? '').trim())
    .filter(s => s !== '' && /^-?\d+(\.\d+)?$/.test(s))
    .map(Number)
    .filter(Number.isFinite);
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    count: nums.length,
    sum: Number(sum.toFixed(4)),
    avg: Number((sum / nums.length).toFixed(4)),
    min: Math.min(...nums),
    max: Math.max(...nums),
  };
}

// ── 2. SVG OPTIMIZER & REACT JSX CONVERTER ────────────────────
export interface SvgOptimizeOptions {
  precision: number;
  removeComments: boolean;
  removeMetadata: boolean;
  removeDimensions: boolean;
  overrideColor?: string;
}

export interface SvgStats {
  originalBytes: number;
  optimizedBytes: number;
  savedPercent: number;
  viewBox: string;
  width: string;
  height: string;
  elementCount: number;
}

export function optimizeSvgMarkup(rawSvg: string, options: SvgOptimizeOptions): { output: string; stats: SvgStats } {
  const originalBytes = new TextEncoder().encode(rawSvg).length;
  let out = rawSvg.trim();

  // Strip XML declaration & DOCTYPE
  out = out.replace(/<\?xml[\s\S]*?\?>/gi, '');
  out = out.replace(/<!DOCTYPE[\s\S]*?>/gi, '');

  if (options.removeComments) {
    out = out.replace(/<!--[\s\S]*?-->/g, '');
  }

  if (options.removeMetadata) {
    out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    out = out.replace(/<desc[\s\S]*?<\/desc>/gi, '');
    out = out.replace(/<sodipodi:namedview[\s\S]*?(?:\/>|<\/sodipodi:namedview>)/gi, '');
    out = out.replace(/\s+(?:xmlns:)?(?:inkscape|sodipodi|sketch|illustrator):?[a-zA-Z0-9_-]*="[^"]*"/g, '');
    out = out.replace(/\s+data-name="[^"]*"/g, '');
  }

  if (options.removeDimensions) {
    out = out.replace(/(<svg\b[^>]*?)\s+width="[^"]*"/i, '$1');
    out = out.replace(/(<svg\b[^>]*?)\s+height="[^"]*"/i, '$1');
  }

  // Round long floating-point numbers inside attributes
  const prec = Math.max(0, Math.min(4, Math.round(options.precision)));
  out = out.replace(/(\d+\.\d{3,})/g, match => {
    const n = Number(match);
    if (!Number.isFinite(n)) return match;
    return Number(n.toFixed(prec)).toString();
  });

  // Remove empty groups <g></g>
  out = out.replace(/<g\s*>\s*<\/g>/gi, '');

  // Optional recolor (replace explicit non-none fill/stroke values)
  if (options.overrideColor && options.overrideColor.trim()) {
    const col = options.overrideColor.trim();
    out = out.replace(/\b(fill|stroke)="(?!none|url\()([^"]+)"/gi, `$1="${col}"`);
  }

  // Collapse whitespace cleanly
  out = out.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();

  const optimizedBytes = new TextEncoder().encode(out).length;
  const savedPercent = originalBytes > 0 ? Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100) : 0;

  const viewBox = out.match(/viewBox="([^"]+)"/i)?.[1] || '—';
  const width = out.match(/<svg[^>]*\swidth="([^"]+)"/i)?.[1] || 'auto';
  const height = out.match(/<svg[^>]*\sheight="([^"]+)"/i)?.[1] || 'auto';
  const elementCount = (out.match(/<(path|circle|rect|line|polygon|polyline|ellipse|g|text)\b/gi) || []).length;

  return {
    output: out,
    stats: { originalBytes, optimizedBytes, savedPercent, viewBox, width, height, elementCount },
  };
}

export function svgToReactJsx(svgMarkup: string, componentName = 'CustomIcon'): string {
  const safeName = componentName.replace(/[^a-zA-Z0-9_]/g, '') || 'CustomIcon';
  const jsxBody = svgMarkup
    .replace(/\bclass=/g, 'className=')
    .replace(/\b([a-z]+)-([a-z])/g, (_, a: string, b: string) => `${a}${b.toUpperCase()}`)
    .replace(/<svg\b([^>]*)>/i, '<svg$1 {...props}>');

  return `import React from 'react';

export const ${safeName}: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  ${jsxBody}
);
`;
}

// ── 3. DETERMINISTIC MOCK DATA GENERATOR ──────────────────────
export type MockFieldKind =
  | 'uuid'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'company'
  | 'city'
  | 'country'
  | 'date'
  | 'price'
  | 'integer'
  | 'boolean'
  | 'status';

export interface MockFieldSpec {
  id: string;
  name: string;
  kind: MockFieldKind;
}

const FIRST_NAMES = ['Alice', 'Bob', 'Clara', 'David', 'Eva', 'Filip', 'Grace', 'Hana', 'Ivan', 'Jana', 'Karel', 'Lucie', 'Marek', 'Nina', 'Ondrej', 'Petra', 'Roman', 'Sofia', 'Tomas', 'Vera'];
const LAST_NAMES = ['Novak', 'Svoboda', 'Dvorak', 'Cerny', 'Prochazka', 'Kucera', 'Vesely', 'Horak', 'Benes', 'Marek', 'Miller', 'Smith', 'Weber', 'Keller', 'Garcia', 'Rossi'];
const COMPANIES = ['Nordic Labs', 'Vertex Systems', 'Helios Cloud', 'Cobalt Works', 'Apex Digital', 'Atlas Robotics', 'Vanguard Data', 'Pulse Studio', 'Solstice Tech', 'Prism Foundry'];
const CITIES = ['Prague', 'Brno', 'Berlin', 'Vienna', 'Munich', 'London', 'Paris', 'Amsterdam', 'Zurich', 'Toronto', 'Austin', 'Tokyo'];
const COUNTRIES = ['Czechia', 'Germany', 'Austria', 'United Kingdom', 'France', 'Netherlands', 'Switzerland', 'Canada', 'United States', 'Japan'];
const STATUSES = ['active', 'pending', 'completed', 'archived', 'draft'];

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMockDataset(
  fields: MockFieldSpec[],
  rowCount: number,
  seed = 42
): Record<string, unknown>[] {
  const rng = createMulberry32(seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const count = Math.max(1, Math.min(1000, Math.round(rowCount || 10)));
  const hexBlock = (len: number) =>
    Array.from({ length: len }, () => Math.floor(rng() * 16).toString(16)).join('');

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const row: Record<string, unknown> = {};

    for (const f of fields) {
      const colName = f.name.trim() || f.kind;
      switch (f.kind) {
        case 'uuid':
          row[colName] = `${hexBlock(8)}-${hexBlock(4)}-4${hexBlock(3)}-${['8', '9', 'a', 'b'][Math.floor(rng() * 4)]}${hexBlock(3)}-${hexBlock(12)}`;
          break;
        case 'fullName':
          row[colName] = `${first} ${last}`;
          break;
        case 'email':
          row[colName] = `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(rng() * 90 + 10)}@example.com`;
          break;
        case 'phone':
          row[colName] = `+420 ${Math.floor(rng() * 800 + 100)} ${Math.floor(rng() * 800 + 100)} ${Math.floor(rng() * 800 + 100)}`;
          break;
        case 'company':
          row[colName] = pick(COMPANIES);
          break;
        case 'city':
          row[colName] = pick(CITIES);
          break;
        case 'country':
          row[colName] = pick(COUNTRIES);
          break;
        case 'date': {
          const start = Date.UTC(2022, 0, 1);
          const span = 1000 * 60 * 60 * 24 * 1200;
          row[colName] = new Date(start + Math.floor(rng() * span)).toISOString().slice(0, 10);
          break;
        }
        case 'price':
          row[colName] = Number((rng() * 980 + 10).toFixed(2));
          break;
        case 'integer':
          row[colName] = Math.floor(rng() * 10000);
          break;
        case 'boolean':
          row[colName] = rng() >= 0.5;
          break;
        case 'status':
          row[colName] = pick(STATUSES);
          break;
      }
    }
    rows.push(row);
  }
  return rows;
}

export function formatMockAsSqlInserts(tableName: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '') || 'mock_data';
  const cols = Object.keys(rows[0]);
  const sqlVal = (v: unknown): string => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return `'${String(v).replace(/'/g, "''")}'`;
  };
  return rows
    .map(r => `INSERT INTO ${safeTable} (${cols.join(', ')}) VALUES (${cols.map(c => sqlVal(r[c])).join(', ')});`)
    .join('\n');
}

// ── 4. LOREM IPSUM & PLACEHOLDER TEXT GENERATOR ───────────────
export type LoremStyle = 'classic' | 'tech' | 'business';
export type LoremUnit = 'paragraphs' | 'sentences' | 'words' | 'list';
export type LoremFormat = 'plain' | 'html' | 'markdown';

const CLASSIC_OPENING =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const WORD_BANKS: Record<LoremStyle, string[]> = {
  classic: [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor',
    'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis',
    'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis',
    'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur',
    'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt',
    'mollit', 'anim', 'id', 'est', 'laborum', 'vitae', 'semper', 'quis', 'lectus', 'nulla', 'at', 'volutpat',
  ],
  tech: [
    'offline', 'runtime', 'worker', 'protocol', 'module', 'component', 'layout', 'pipeline', 'vector', 'cache',
    'shader', 'index', 'schema', 'kernel', 'memory', 'buffer', 'stream', 'client', 'crypto', 'sandbox', 'bundle',
    'engine', 'parser', 'syntax', 'metric', 'canvas', 'socket', 'signal', 'snapshot', 'archive', 'query', 'token',
    'storage', 'adapter', 'manifest', 'thread', 'latency', 'payload', 'compiler', 'registry', 'viewport', 'reactive',
  ],
  business: [
    'strategy', 'roadmap', 'quarterly', 'milestone', 'revenue', 'deliverable', 'workflow', 'stakeholder', 'forecast',
    'alignment', 'benchmark', 'efficiency', 'retention', 'onboarding', 'initiative', 'portfolio', 'pipeline', 'margin',
    'operations', 'governance', 'scalability', 'partnership', 'analytics', 'capacity', 'insight', 'objective', 'outcome',
    'velocity', 'adoption', 'enterprise', 'compliance', 'priority', 'value', 'momentum', 'growth', 'execution',
  ],
};

export interface LoremOptions {
  style: LoremStyle;
  unit: LoremUnit;
  count: number;
  startWithClassic: boolean;
  format: LoremFormat;
  seed?: number;
}

export function generateLoremIpsum(opts: LoremOptions): string {
  const bank = WORD_BANKS[opts.style];
  const rng = createMulberry32(opts.seed ?? 1337);
  const count = Math.max(1, Math.min(200, Math.round(opts.count || 3)));

  const nextWord = () => bank[Math.floor(rng() * bank.length)];

  const makeSentence = (minWords = 8, maxWords = 16): string => {
    const len = minWords + Math.floor(rng() * (maxWords - minWords + 1));
    const words: string[] = [];
    for (let i = 0; i < len; i++) {
      let w = nextWord();
      if (i > 0 && w === words[i - 1]) w = nextWord();
      words.push(w);
    }
    if (len > 10 && rng() > 0.5) {
      const commaIdx = 3 + Math.floor(rng() * (len - 6));
      words[commaIdx] = `${words[commaIdx]},`;
    }
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    return `${words.join(' ')}.`;
  };

  if (opts.unit === 'words') {
    const words: string[] = [];
    if (opts.startWithClassic && opts.style === 'classic') {
      const openingWords = CLASSIC_OPENING.replace(/[.,]/g, '').split(' ');
      for (let i = 0; i < Math.min(count, openingWords.length); i++) {
        words.push(openingWords[i]);
      }
    }
    while (words.length < count) words.push(nextWord());
    const text = words.slice(0, count).join(' ');
    if (opts.format === 'html') return `<p>${text}</p>`;
    return text;
  }

  if (opts.unit === 'sentences') {
    const sentences: string[] = [];
    if (opts.startWithClassic && opts.style === 'classic') {
      sentences.push(CLASSIC_OPENING);
    }
    while (sentences.length < count) sentences.push(makeSentence());
    const text = sentences.join(' ');
    if (opts.format === 'html') return `<p>${text}</p>`;
    return text;
  }

  if (opts.unit === 'list') {
    const items: string[] = [];
    for (let i = 0; i < count; i++) {
      items.push(makeSentence(5, 10));
    }
    if (opts.format === 'html') {
      return `<ul>\n${items.map(item => `  <li>${item}</li>`).join('\n')}\n</ul>`;
    }
    if (opts.format === 'markdown') {
      return items.map(item => `- ${item}`).join('\n');
    }
    return items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
  }

  // paragraphs
  const paragraphs: string[] = [];
  for (let p = 0; p < count; p++) {
    const sentCount = 3 + Math.floor(rng() * 3);
    const sentences: string[] = [];
    if (p === 0 && opts.startWithClassic && opts.style === 'classic') {
      sentences.push(CLASSIC_OPENING);
    }
    while (sentences.length < sentCount) sentences.push(makeSentence());
    paragraphs.push(sentences.join(' '));
  }

  if (opts.format === 'html') {
    return paragraphs.map(p => `<p>${p}</p>`).join('\n\n');
  }
  return paragraphs.join('\n\n');
}

// ── 5. SNIPPET TEMPLATE VARIABLES ─────────────────────────────
export function extractSnippetVariables(code: string): string[] {
  const vars = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(code)) !== null) {
    vars.add(m[1]);
  }
  return [...vars];
}

export function renderSnippetTemplate(code: string, values: Record<string, string>): string {
  return code.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key: string) => {
    const replacement = values[key];
    return replacement !== undefined && replacement !== '' ? replacement : match;
  });
}
