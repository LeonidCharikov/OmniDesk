import React, { useState, useMemo, useId } from 'react';
import { Braces, Copy, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type InputFormat = 'json' | 'yaml' | 'toml' | 'csv';
type OutputFormat = 'json' | 'yaml' | 'toml' | 'csv' | 'typescript' | 'json-schema';

function parseScalar(raw: string): unknown {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null' || t === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  if (t.startsWith('[') && t.endsWith(']')) {
    try {
      return JSON.parse(t);
    } catch {
      return t.slice(1, -1).split(',').map(x => parseScalar(x)).filter(x => x !== '');
    }
  }
  return t;
}

function parseSimpleYaml(src: string): unknown {
  const lines = src.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
  if (!lines.length) return {};

  interface Frame {
    indent: number;
    container: Record<string, unknown> | unknown[];
  }
  const rootIsArray = lines[0].trim().startsWith('- ');
  const root: Record<string, unknown> | unknown[] = rootIsArray ? [] : {};
  const stack: Frame[] = [{ indent: -1, container: root }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].container;

    if (trimmed.startsWith('- ')) {
      const rest = trimmed.slice(2).trim();
      if (Array.isArray(parent)) {
        if (rest.includes(':')) {
          const colonIdx = rest.indexOf(':');
          const k = rest.slice(0, colonIdx).trim();
          const v = rest.slice(colonIdx + 1).trim();
          const obj: Record<string, unknown> = {};
          obj[k] = v ? parseScalar(v) : {};
          parent.push(obj);
          stack.push({ indent, container: obj });
        } else {
          parent.push(parseScalar(rest));
        }
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) throw new Error('YAML_SYNTAX');
    const key = trimmed.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
    const valRaw = trimmed.slice(colonIdx + 1).trim();

    if (!Array.isArray(parent)) {
      if (valRaw === '') {
        const nextLine = lines[i + 1];
        const nextIsArray = nextLine && nextLine.trim().startsWith('- ');
        const child: Record<string, unknown> | unknown[] = nextIsArray ? [] : {};
        parent[key] = child;
        stack.push({ indent, container: child });
      } else {
        parent[key] = parseScalar(valRaw);
      }
    }
  }
  return root;
}

function toYaml(val: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    if (/[:#\n]|^\s|\s$/.test(val) || val === '') return JSON.stringify(val);
    return val;
  }
  if (Array.isArray(val)) {
    if (!val.length) return '[]';
    return val
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          const nested = toYaml(item, indent + 1);
          const firstLineBreak = nested.indexOf('\n');
          if (firstLineBreak === -1) return `${pad}- ${nested.trimStart()}`;
          return `${pad}- ${nested.trimStart()}`;
        }
        return `${pad}- ${toYaml(item, indent + 1)}`;
      })
      .join('\n');
  }
  const entries = Object.entries(val as Record<string, unknown>);
  if (!entries.length) return '{}';
  return entries
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null && ((Array.isArray(v) && v.length > 0) || (!Array.isArray(v) && Object.keys(v).length > 0))) {
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${toYaml(v, indent)}`;
    })
    .join('\n');
}

function parseSimpleToml(src: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let current: Record<string, unknown> = root;
  const lines = src.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      const section = line.slice(1, -1).trim().replace(/^\[|\]$/g, '');
      const parts = section.split('.').map(s => s.trim());
      let target: Record<string, unknown> = root;
      for (const p of parts) {
        if (typeof target[p] !== 'object' || target[p] === null || Array.isArray(target[p])) {
          target[p] = {};
        }
        target = target[p] as Record<string, unknown>;
      }
      current = target;
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) throw new Error('TOML_SYNTAX');
    const key = line.slice(0, eqIdx).trim().replace(/^['"]|['"]$/g, '');
    const val = line.slice(eqIdx + 1).trim();
    current[key] = parseScalar(val);
  }
  return root;
}

function toToml(val: unknown): string {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    return toToml({ data: val });
  }
  const topLines: string[] = [];
  const sectionLines: string[] = [];

  const emitSection = (prefix: string, obj: Record<string, unknown>, target: string[]) => {
    const nested: Array<[string, Record<string, unknown>]> = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        nested.push([prefix ? `${prefix}.${k}` : k, v as Record<string, unknown>]);
      } else if (Array.isArray(v) && v.every(item => typeof item !== 'object' || item === null)) {
        target.push(`${k} = ${JSON.stringify(v)}`);
      } else if (Array.isArray(v)) {
        target.push(`${k} = ${JSON.stringify(v)}`);
      } else {
        target.push(`${k} = ${typeof v === 'string' ? JSON.stringify(v) : String(v)}`);
      }
    }
    for (const [secName, secObj] of nested) {
      sectionLines.push(`\n[${secName}]`);
      emitSection(secName, secObj, sectionLines);
    }
  };

  emitSection('', val as Record<string, unknown>, topLines);
  return [...topLines, ...sectionLines].join('\n').trim();
}

function parseCsv(src: string): Array<Record<string, unknown>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some(c => c !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h || `col_${idx + 1}`] = parseScalar(r[idx] ?? '');
    });
    return obj;
  });
}

function toCsv(val: unknown): string {
  const list = Array.isArray(val) ? val : [val];
  const rows = list.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x));
  if (!rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
}

function toTypeScript(val: unknown, rootName = 'Root'): string {
  const interfaces: string[] = [];
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).replace(/[^a-zA-Z0-9]/g, '') : 'Item');

  const infer = (v: unknown, name: string): string => {
    if (v === null) return 'null';
    if (Array.isArray(v)) {
      if (!v.length) return 'unknown[]';
      const elemTypes = Array.from(new Set(v.map(el => infer(el, `${name}Item`))));
      return elemTypes.length === 1 ? `${elemTypes[0]}[]` : `(${elemTypes.join(' | ')})[]`;
    }
    if (typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>);
      const ifaceName = cap(name);
      const body = entries.map(([k, child]) => {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        return `  ${safeKey}: ${infer(child, `${ifaceName}${cap(k)}`)};`;
      });
      interfaces.push(`export interface ${ifaceName} {\n${body.join('\n')}\n}`);
      return ifaceName;
    }
    return typeof v;
  };

  const rootType = infer(val, rootName);
  if (!interfaces.length || Array.isArray(val)) {
    return `${interfaces.join('\n\n')}${interfaces.length ? '\n\n' : ''}export type ${rootName} = ${rootType};`;
  }
  return interfaces.join('\n\n');
}

function toJsonSchema(val: unknown): string {
  const build = (v: unknown): Record<string, unknown> => {
    if (v === null) return { type: 'null' };
    if (Array.isArray(v)) {
      return {
        type: 'array',
        items: v.length > 0 ? build(v[0]) : {},
      };
    }
    if (typeof v === 'object') {
      const props: Record<string, unknown> = {};
      const keys = Object.keys(v as Record<string, unknown>);
      for (const k of keys) {
        props[k] = build((v as Record<string, unknown>)[k]);
      }
      return {
        type: 'object',
        properties: props,
        required: keys,
      };
    }
    if (typeof v === 'number') return { type: Number.isInteger(v) ? 'integer' : 'number' };
    return { type: typeof v };
  };

  return JSON.stringify(
    {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      ...build(val),
    },
    null,
    2
  );
}

export const DataConverterTool: React.FC = () => {
  const { t } = useI18n();
  const [inFormat, setInFormat] = useState<InputFormat>('json');
  const [outFormat, setOutFormat] = useState<OutputFormat>('typescript');
  const [input, setInput] = useState(
    JSON.stringify(
      {
        service: 'omnidesk-api',
        port: 3000,
        tls: true,
        tags: ['offline', 'desktop', 'tauri'],
        maintainer: { name: 'Alex', role: 'admin' },
      },
      null,
      2
    )
  );
  const [copied, setCopied] = useState(false);
  const inputId = useId();

  const { output, error } = useMemo(() => {
    try {
      let parsed: unknown;
      if (inFormat === 'json') parsed = JSON.parse(input);
      else if (inFormat === 'yaml') parsed = parseSimpleYaml(input);
      else if (inFormat === 'toml') parsed = parseSimpleToml(input);
      else parsed = parseCsv(input);

      let out = '';
      if (outFormat === 'json') out = JSON.stringify(parsed, null, 2);
      else if (outFormat === 'yaml') out = toYaml(parsed);
      else if (outFormat === 'toml') out = toToml(parsed);
      else if (outFormat === 'csv') out = toCsv(parsed);
      else if (outFormat === 'typescript') out = toTypeScript(parsed);
      else out = toJsonSchema(parsed);

      return { output: out, error: null };
    } catch (e: unknown) {
      return {
        output: '',
        error: e instanceof Error ? e.message : t('data_conv_parse_error', 'Unable to parse input format.'),
      };
    }
  }, [input, inFormat, outFormat, t]);

  const copyOut = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Braces className="w-5 h-5 text-indigo-400" />
            {t('tool_data_converter_title', 'Structured Data & TypeScript Generator')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_data_converter_desc', 'Convert between JSON, YAML, TOML, and CSV, or generate TypeScript interfaces and JSON Schema.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={inFormat}
            onChange={e => setInFormat(e.target.value as InputFormat)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-slate-200"
          >
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="toml">TOML</option>
            <option value="csv">CSV</option>
          </select>
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <select
            value={outFormat}
            onChange={e => setOutFormat(e.target.value as OutputFormat)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-indigo-300"
          >
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="toml">TOML</option>
            <option value="csv">CSV</option>
            <option value="typescript">TypeScript Interface</option>
            <option value="json-schema">JSON Schema</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('input', 'Input')} ({inFormat.toUpperCase()})
          </label>
          <textarea
            id={inputId}
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={14}
            spellCheck={false}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-slate-200 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('result', 'Result')} ({outFormat.toUpperCase()})
            </span>
            <button
              onClick={copyOut}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
            </button>
          </div>
          <textarea
            readOnly
            value={output}
            rows={14}
            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 select-all focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
