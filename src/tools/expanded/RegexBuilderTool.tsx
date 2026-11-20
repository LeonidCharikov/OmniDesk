import React, { useMemo, useState } from 'react';
import { AlertCircle, Copy, Wand2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { escapeRegexLiteral, runRegexAnalysis } from '../../utils/toolUpgrades.logic';
import { input, box, secondary, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   REGEX BUILDER & TESTER
   (Inline Highlighting, Capture & Named Groups, Live Replace, Literal Escaper)
   ───────────────────────────────────────────────────────────── */
const REGEX_PRESETS = [
  { key: 'preset_email', name: 'Email Address', pattern: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})', flags: 'gi' },
  { key: 'preset_url', name: 'Web URL', pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', flags: 'gi' },
  { key: 'preset_ipv4', name: 'IPv4 Address', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g' },
  { key: 'preset_date_ymd', name: 'Date (YYYY-MM-DD)', pattern: '(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12][0-9]|3[01])', flags: 'g' },
  { key: 'preset_hex_color', name: 'HEX Color', pattern: '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\\b', flags: 'gi' },
  { key: 'preset_uuid_v4', name: 'UUID v4', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', flags: 'gi' },
];

const FLAG_OPTIONS = [
  { flag: 'g', label: 'g (global)' },
  { flag: 'i', label: 'i (ignore case)' },
  { flag: 'm', label: 'm (multiline)' },
  { flag: 's', label: 's (dotAll)' },
  { flag: 'u', label: 'u (unicode)' },
];

export const RegexBuilderTool: React.FC = () => {
  const { t } = useI18n();
  const [pattern, setPattern] = useState('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})');
  const [flags, setFlags] = useState('g');
  const [testText, setTestText] = useState(() =>
    t('regex_sample_test_text', 'Hello, contact us at info@omnidesk.app or support@company.com for more details.\nInvalid email: user@domain')
  );
  const [replaceTemplate, setReplaceTemplate] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [literalInput, setLiteralInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const analysis = useMemo(
    () => runRegexAnalysis(pattern, flags, testText, showReplace ? replaceTemplate : undefined),
    [pattern, flags, testText, showReplace, replaceTemplate]
  );

  const toggleFlag = (f: string) => {
    setFlags(prev => (prev.includes(f) ? prev.replace(f, '') : prev + f));
  };

  const insertToken = (token: string) => {
    setPattern(prev => prev + token);
  };

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-5">
      <Header
        title="Regex Builder"
        desc={t('regex_builder_desc', 'Build, highlight, inspect capture groups, test replacements, and escape literal strings locally.')}
      />
      <div className={box + ' space-y-4'}>
        {/* Presets */}
        <div>
          <span className="text-xs text-slate-400 block mb-1.5">{t('preset_patterns_library', 'Pattern Presets:')}</span>
          <div className="flex flex-wrap gap-1.5">
            {REGEX_PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                onClick={() => {
                  setPattern(p.pattern);
                  setFlags(p.flags);
                }}
              >
                {t(p.key, p.name)}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern & Flag toggles */}
        <div className="space-y-2">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <label className="text-xs text-slate-400">
              {t('regex_pattern_label', 'Regular Expression (Pattern):')}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 mt-1">
                <span className="text-slate-500 font-mono text-sm">/</span>
                <input
                  className="w-full bg-transparent outline-none font-mono text-sm text-indigo-300 py-1.5"
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                />
                <span className="text-slate-500 font-mono text-sm">/{flags}</span>
              </div>
            </label>
            <button
              type="button"
              className={secondary + ' h-[34px]'}
              onClick={() => copyText('regex', `/${pattern}/${flags}`)}
            >
              <Copy className="w-3.5 h-3.5 inline mr-1" />
              {copiedKey === 'regex' ? t('copied', 'Copied!') : t('copy', 'Copy')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">{t('regex_flags_label', 'Flags:')}</span>
            {FLAG_OPTIONS.map(opt => {
              const active = flags.includes(opt.flag);
              return (
                <button
                  key={opt.flag}
                  type="button"
                  onClick={() => toggleFlag(opt.flag)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    active
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick token chips + literal escaper */}
        <div className="flex flex-wrap gap-1 items-center text-xs text-slate-400">
          <span className="text-[11px] mr-1">{t('quick_symbols', 'Quick Tokens:')}</span>
          {[
            { label: `${t('regex_sym_digits', 'Digits')} (\\d+)`, val: '\\d+' },
            { label: `${t('regex_sym_words', 'Word chars')} (\\w+)`, val: '\\w+' },
            { label: `${t('regex_sym_spaces', 'Whitespace')} (\\s)`, val: '\\s' },
            { label: `${t('regex_sym_start', 'Start')} (^)`, val: '^' },
            { label: `${t('regex_sym_end', 'End')} ($)`, val: '$' },
            { label: `${t('regex_sym_boundary', 'Boundary')} (\\b)`, val: '\\b' },
            { label: `${t('regex_sym_group', 'Group')} (...)`, val: '()' },
            { label: 'Named (?<name>)', val: '(?<name>)' },
          ].map(token => (
            <button
              key={token.val}
              type="button"
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300"
              onClick={() => insertToken(token.val)}
            >
              {token.label}
            </button>
          ))}
        </div>

        {/* Literal Escaper Helper */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            className={input + ' flex-1 min-w-48 text-xs font-mono'}
            value={literalInput}
            onChange={e => setLiteralInput(e.target.value)}
            placeholder={t('regex_escape_placeholder', 'Paste literal text to escape safely into regex (e.g. price: $19.99 [USD])…')}
          />
          <button
            type="button"
            className={secondary}
            disabled={!literalInput}
            onClick={() => {
              setPattern(escapeRegexLiteral(literalInput));
              setLiteralInput('');
            }}
          >
            <Wand2 className="w-3.5 h-3.5 inline mr-1" />
            {t('regex_escape_btn', 'Escape to pattern')}
          </button>
        </div>

        {analysis.error && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{analysis.error}</span>
          </div>
        )}

        {/* Test Text & Highlighted Preview */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">{t('test_text_verify_matches', 'Test text:')}</span>
              <span className="text-emerald-400 font-mono font-semibold">
                {t('matches_found', 'Found {count} matches', { count: analysis.matches.length })}
              </span>
            </div>
            <textarea
              className={input + ' min-h-36 font-mono text-xs leading-relaxed'}
              value={testText}
              onChange={e => setTestText(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-300 font-medium block">
              {t('regex_highlighted_preview', 'Highlighted Match Preview:')}
            </span>
            <div className="min-h-36 max-h-56 overflow-auto p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-slate-300">
              {analysis.segments.map((seg, i) =>
                seg.isMatch ? (
                  <mark
                    key={i}
                    className="bg-indigo-500/35 text-indigo-100 border-b border-indigo-400 rounded px-0.5"
                    title={`Match #${(seg.matchIndex ?? 0) + 1}`}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <React.Fragment key={i}>{seg.text}</React.Fragment>
                )
              )}
            </div>
          </div>
        </div>

        {/* Optional Live Replace */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showReplace}
              onChange={e => setShowReplace(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700"
            />
            {t('regex_enable_replace', 'Enable Live Replace ($1, $2, $&, $<name>)')}
          </label>
          {showReplace && (
            <div className="space-y-2">
              <input
                className={input + ' font-mono text-xs'}
                value={replaceTemplate}
                onChange={e => setReplaceTemplate(e.target.value)}
                placeholder={t('regex_replace_placeholder', 'Replacement template, e.g. [$1 at $2]…')}
              />
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap max-h-40 overflow-auto">
                {analysis.replacedText}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondary} onClick={() => copyText('replaced', analysis.replacedText)}>
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  {copiedKey === 'replaced' ? t('copied', 'Copied!') : t('copy_result', 'Copy result')}
                </button>
                <SendToToolButton sourceToolId="regex-builder" kind="text" getText={() => analysis.replacedText} />
              </div>
            </div>
          )}
        </div>

        {/* Captured Matches + Groups */}
        {analysis.matches.length > 0 && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">{t('captured_matches_list', 'Captured Matches & Groups:')}</span>
            <div className="space-y-1.5 max-h-56 overflow-auto">
              {analysis.matches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-indigo-950/35 border border-indigo-800/40 font-mono text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-indigo-200">
                    <span>
                      #{idx + 1}: &ldquo;{m.text}&rdquo;
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t('position_label', 'index')} {m.index}–{m.end}
                    </span>
                  </div>
                  {m.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {m.groups.map((g, gIdx) => (
                        <span key={gIdx} className="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 border border-slate-800">
                          ${gIdx + 1}: {g || '∅'}
                        </span>
                      ))}
                    </div>
                  )}
                  {Object.keys(m.namedGroups).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {Object.entries(m.namedGroups).map(([name, val]) => (
                        <span key={name} className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                          {name}: {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
