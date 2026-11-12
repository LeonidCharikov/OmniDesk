import React, { useState, useMemo, useId } from 'react';
import { Search, Copy, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';

function evaluateFilter(item: unknown, expr: string): boolean {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  const m = expr.trim().match(/^@\.([a-zA-Z0-9_]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!m) return false;
  const [, field, op, rawRight] = m;
  const left = obj[field];
  let right: unknown = rawRight.trim();
  if ((right as string).startsWith("'") && (right as string).endsWith("'")) {
    right = (right as string).slice(1, -1);
  } else if ((right as string).startsWith('"') && (right as string).endsWith('"')) {
    right = (right as string).slice(1, -1);
  } else if (right === 'true') right = true;
  else if (right === 'false') right = false;
  else if (right === 'null') right = null;
  else if (!Number.isNaN(Number(right))) right = Number(right);

  if (op === '==') return left === right;
  if (op === '!=') return left !== right;
  if (typeof left === 'number' && typeof right === 'number') {
    if (op === '>') return left > right;
    if (op === '<') return left < right;
    if (op === '>=') return left >= right;
    if (op === '<=') return left <= right;
  }
  return false;
}

function collectRecursive(node: unknown, key: string, acc: unknown[]) {
  if (Array.isArray(node)) {
    for (const item of node) collectRecursive(item, key, acc);
  } else if (typeof node === 'object' && node !== null) {
    const obj = node as Record<string, unknown>;
    if (key === '*') {
      for (const v of Object.values(obj)) acc.push(v);
    } else if (key in obj) {
      acc.push(obj[key]);
    }
    for (const v of Object.values(obj)) {
      if (typeof v === 'object' && v !== null) collectRecursive(v, key, acc);
    }
  }
}

function queryJsonPath(root: unknown, path: string): unknown[] {
  const clean = path.trim();
  if (!clean.startsWith('$')) throw new Error('PATH_START');
  if (clean === '$') return [root];

  const tokens: Array<{ type: 'prop' | 'rec' | 'wild' | 'idx' | 'slice' | 'filter'; value: string }> = [];
  let i = 1;
  while (i < clean.length) {
    if (clean[i] === '.' && clean[i + 1] === '.') {
      i += 2;
      let name = '';
      while (i < clean.length && clean[i] !== '.' && clean[i] !== '[') name += clean[i++];
      if (name) tokens.push({ type: 'rec', value: name });
    } else if (clean[i] === '.') {
      i++;
      let name = '';
      while (i < clean.length && clean[i] !== '.' && clean[i] !== '[') name += clean[i++];
      if (name === '*') tokens.push({ type: 'wild', value: '*' });
      else if (name) tokens.push({ type: 'prop', value: name });
    } else if (clean[i] === '[') {
      const end = clean.indexOf(']', i);
      if (end === -1) throw new Error('BRACKET_UNCLOSED');
      const inner = clean.slice(i + 1, end).trim();
      if (inner === '*') tokens.push({ type: 'wild', value: '*' });
      else if (inner.startsWith('?(') && inner.endsWith(')')) tokens.push({ type: 'filter', value: inner.slice(2, -1) });
      else if (inner.includes(':')) tokens.push({ type: 'slice', value: inner });
      else if ((inner.startsWith("'") && inner.endsWith("'")) || (inner.startsWith('"') && inner.endsWith('"'))) {
        tokens.push({ type: 'prop', value: inner.slice(1, -1) });
      } else {
        tokens.push({ type: 'idx', value: inner });
      }
      i = end + 1;
    } else {
      throw new Error('PATH_SYNTAX');
    }
  }

  let current: unknown[] = [root];
  for (const tok of tokens) {
    const next: unknown[] = [];
    for (const item of current) {
      if (tok.type === 'prop') {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const obj = item as Record<string, unknown>;
          if (tok.value in obj) next.push(obj[tok.value]);
        }
      } else if (tok.type === 'wild') {
        if (Array.isArray(item)) next.push(...item);
        else if (typeof item === 'object' && item !== null) next.push(...Object.values(item));
      } else if (tok.type === 'idx') {
        const idx = Number(tok.value);
        if (Array.isArray(item) && Number.isInteger(idx)) {
          const resolved = idx < 0 ? item.length + idx : idx;
          if (resolved >= 0 && resolved < item.length) next.push(item[resolved]);
        }
      } else if (tok.type === 'slice') {
        if (Array.isArray(item)) {
          const [s, e] = tok.value.split(':');
          const start = s ? Number(s) : 0;
          const end = e ? Number(e) : item.length;
          next.push(...item.slice(start, end));
        }
      } else if (tok.type === 'filter') {
        if (Array.isArray(item)) {
          for (const el of item) {
            if (evaluateFilter(el, tok.value)) next.push(el);
          }
        }
      } else if (tok.type === 'rec') {
        collectRecursive(item, tok.value, next);
      }
    }
    current = next;
  }
  return current;
}

const SAMPLE_JSON = JSON.stringify(
  {
    store: {
      name: 'OmniDesk Supply',
      items: [
        { id: 1, name: 'Mechanical Keyboard', price: 120, inStock: true },
        { id: 2, name: 'USB-C Dock', price: 65, inStock: true },
        { id: 3, name: 'Desk Lamp', price: 35, inStock: false },
        { id: 4, name: '4K Monitor', price: 420, inStock: true },
      ],
    },
  },
  null,
  2
);

export const JsonPathExplorerTool: React.FC = () => {
  const { t } = useI18n();
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [pathExpr, setPathExpr] = useState('$.store.items[?(@.price < 150)].name');
  const [copied, setCopied] = useState(false);

  const pathId = useId();
  const jsonId = useId();

  const { matches, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const res = queryJsonPath(parsed, pathExpr);
      return { matches: res, error: null };
    } catch (e: unknown) {
      return {
        matches: [],
        error: e instanceof Error ? e.message : t('jp_invalid', 'Invalid JSON or JSONPath expression.'),
      };
    }
  }, [jsonText, pathExpr, t]);

  const resultStr = useMemo(() => JSON.stringify(matches, null, 2), [matches]);

  const copyResult = () => {
    navigator.clipboard.writeText(resultStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-400" />
          {t('tool_jsonpath_explorer_title', 'JSONPath Query Explorer')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_jsonpath_explorer_desc', 'Filter and extract nested values from JSON using JSONPath (wildcards, slices, recursive descent, filters).')}
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={pathId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('jp_expression', 'JSONPath Expression')}
          </label>
          <span className="text-xs font-mono text-emerald-400">
            {t('jp_match_count', '{count} matches', { count: matches.length })}
          </span>
        </div>
        <input
          id={pathId}
          type="text"
          value={pathExpr}
          onChange={e => setPathExpr(e.target.value)}
          placeholder="$.store.items[*].name"
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-indigo-300 focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {[
            '$.store.items[*].name',
            '$.store.items[?(@.inStock == true)]',
            '$.store.items[0:2]',
            '$..price',
          ].map(ex => (
            <button
              key={ex}
              onClick={() => setPathExpr(ex)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] font-mono text-slate-300"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor={jsonId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('jp_source_json', 'Source JSON')}
          </label>
          <textarea
            id={jsonId}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            rows={13}
            spellCheck={false}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('result', 'Result')}</span>
            <button onClick={copyResult} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
            </button>
          </div>
          <textarea
            readOnly
            value={resultStr}
            rows={13}
            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 select-all focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
