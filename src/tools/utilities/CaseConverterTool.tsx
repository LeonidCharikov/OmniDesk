import React, { useState, useMemo, useId } from 'react';
import { Type, Check, Copy, ArrowDownUp, Trash2, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/context';

function tokenizeWords(line: string): string[] {
  const spaced = line
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-./\\]+/g, ' ');
  return spaced
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function stripDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function transformLines(text: string, fn: (line: string) => string): string {
  return text.split('\n').map(fn).join('\n');
}

export const CaseConverterTool: React.FC = () => {
  const { t } = useI18n();
  const [input, setInput] = useState('omniDesk_onlineTools Example-Text 2026');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputId = useId();

  const stats = useMemo(() => {
    const chars = input.length;
    const charsNoSpaces = input.replace(/\s/g, '').length;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    const lines = input ? input.split('\n').length : 0;
    const bytes = new TextEncoder().encode(input).length;
    return { chars, charsNoSpaces, words, lines, bytes };
  }, [input]);

  const variants = useMemo(() => {
    const capFirst = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '');

    return [
      {
        id: 'lower',
        label: 'lowercase',
        value: input.toLowerCase(),
      },
      {
        id: 'upper',
        label: 'UPPERCASE',
        value: input.toUpperCase(),
      },
      {
        id: 'lowerCamel',
        label: 'lowerCamelCase',
        value: transformLines(input, line => {
          const words = tokenizeWords(line);
          if (!words.length) return '';
          return words[0].toLowerCase() + words.slice(1).map(capFirst).join('');
        }),
      },
      {
        id: 'upperCamel',
        label: 'UpperCamelCase',
        value: transformLines(input, line => tokenizeWords(line).map(capFirst).join('')),
      },
      {
        id: 'snake',
        label: 'snake_case',
        value: transformLines(input, line => tokenizeWords(line).map(w => w.toLowerCase()).join('_')),
      },
      {
        id: 'constant',
        label: 'CONSTANT_CASE',
        value: transformLines(input, line => tokenizeWords(line).map(w => w.toUpperCase()).join('_')),
      },
      {
        id: 'kebab',
        label: 'kebab-case',
        value: transformLines(input, line => tokenizeWords(line).map(w => w.toLowerCase()).join('-')),
      },
      {
        id: 'cobol',
        label: 'COBOL-CASE',
        value: transformLines(input, line => tokenizeWords(line).map(w => w.toUpperCase()).join('-')),
      },
      {
        id: 'dot',
        label: 'dot.case',
        value: transformLines(input, line => tokenizeWords(line).map(w => w.toLowerCase()).join('.')),
      },
      {
        id: 'path',
        label: 'path/case',
        value: transformLines(input, line => tokenizeWords(line).map(w => w.toLowerCase()).join('/')),
      },
      {
        id: 'capitalized',
        label: 'Capitalized Case',
        value: transformLines(input, line => tokenizeWords(line).map(capFirst).join(' ')),
      },
      {
        id: 'sentence',
        label: 'Sentence case',
        value: input
          .toLowerCase()
          .replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, m => m.toUpperCase()),
      },
      {
        id: 'toggle',
        label: 'tOGGLE cASE',
        value: Array.from(input)
          .map(ch => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()))
          .join(''),
      },
      {
        id: 'slug',
        label: 'url-slug',
        value: transformLines(input, line =>
          stripDiacritics(line)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        ),
      },
    ];
  }, [input]);

  const copyText = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1800);
  };

  const applyLineAction = (action: 'sort-asc' | 'sort-desc' | 'dedupe' | 'remove-empty' | 'trim' | 'reverse' | 'number') => {
    const lines = input.split('\n');
    if (action === 'sort-asc') setInput([...lines].sort((a, b) => a.localeCompare(b)).join('\n'));
    else if (action === 'sort-desc') setInput([...lines].sort((a, b) => b.localeCompare(a)).join('\n'));
    else if (action === 'dedupe') setInput(Array.from(new Set(lines)).join('\n'));
    else if (action === 'remove-empty') setInput(lines.filter(l => l.trim().length > 0).join('\n'));
    else if (action === 'trim') setInput(lines.map(l => l.trim()).join('\n'));
    else if (action === 'reverse') setInput(Array.from(input).reverse().join(''));
    else if (action === 'number') setInput(lines.map((l, i) => `${i + 1}. ${l}`).join('\n'));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-indigo-400" />
            {t('tool_case_converter_title', 'Case Converter & Text Utilities')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_case_converter_desc', 'Convert between camelCase, snake_case, kebab-case, CONSTANT_CASE, slugs, and transform text lines.')}
          </p>
        </div>

        <button
          onClick={() => setInput('')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('clear', 'Clear')}
        </button>
      </div>

      {/* Input & Line Actions */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('input', 'Input')}
          </label>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>{stats.chars} {t('case_stat_chars', 'chars')}</span>
            <span>·</span>
            <span>{stats.charsNoSpaces} {t('case_stat_no_space', 'no spaces')}</span>
            <span>·</span>
            <span>{stats.words} {t('case_stat_words', 'words')}</span>
            <span>·</span>
            <span>{stats.lines} {t('case_stat_lines', 'lines')}</span>
            <span>·</span>
            <span>{stats.bytes} B</span>
          </div>
        </div>

        <textarea
          id={inputId}
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder={t('case_input_placeholder', 'Enter or paste text to convert case or transform lines...')}
          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-slate-200 focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
            <ArrowDownUp className="w-3.5 h-3.5" />
            {t('case_line_tools', 'Line Tools')}:
          </span>
          {[
            { id: 'sort-asc' as const, label: t('case_sort_az', 'Sort A–Z') },
            { id: 'sort-desc' as const, label: t('case_sort_za', 'Sort Z–A') },
            { id: 'dedupe' as const, label: t('case_dedupe', 'Deduplicate') },
            { id: 'remove-empty' as const, label: t('case_remove_empty', 'Remove Empty') },
            { id: 'trim' as const, label: t('case_trim', 'Trim Lines') },
            { id: 'number' as const, label: t('case_number_lines', 'Number Lines') },
            { id: 'reverse' as const, label: t('case_reverse', 'Reverse') },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => applyLineAction(btn.id)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-300 hover:text-white transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Case Variants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {variants.map(v => (
          <div key={v.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-indigo-300">{v.label}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setInput(v.value)}
                  className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  title={t('case_apply_input', 'Use as input')}
                >
                  <Sparkles className="w-3 h-3" />
                  {t('case_apply', 'Apply')}
                </button>
                <button
                  onClick={() => copyText(v.id, v.value)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 flex items-center gap-1"
                >
                  {copiedId === v.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedId === v.id ? t('copied', 'Copied') : t('copy', 'Copy')}
                </button>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all max-h-24 overflow-y-auto select-all">
              {v.value || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
