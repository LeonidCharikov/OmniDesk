import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   REGEX BUILDER & TESTER (Interactive Tester, Presets, Token chips)
   ───────────────────────────────────────────────────────────── */
const REGEX_PRESETS = [
  { key: 'preset_email', name: 'Email Address', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', flags: 'i' },
  { key: 'preset_url', name: 'Web URL', pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', flags: 'gi' },
  { key: 'preset_ipv4', name: 'IPv4 Address', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g' },
  { key: 'preset_date_ymd', name: 'Date (YYYY-MM-DD)', pattern: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])\\b', flags: 'g' },
  { key: 'preset_hex_color', name: 'HEX Color (#FFF / #FFFFFF)', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', flags: 'i' },
  { key: 'preset_uuid_v4', name: 'UUID v4', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', flags: 'gi' },
];

export const RegexBuilderTool: React.FC = () => {
  const { t } = useI18n();
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState('g');
  const [testText, setTestText] = useState(() =>
    t('regex_sample_test_text', 'Hello, contact us at info@omnidesk.app or support@company.com for more details.\nInvalid email: user@domain')
  );

  const testResults = useMemo(() => {
    try {
      const reg = new RegExp(pattern, flags);
      const matches: { text: string; index: number }[] = [];
      let m: RegExpExecArray | null;

      if (!flags.includes('g')) {
        m = reg.exec(testText);
        if (m) matches.push({ text: m[0], index: m.index });
      } else {
        while ((m = reg.exec(testText)) !== null) {
          matches.push({ text: m[0], index: m.index });
          if (!m[0]) reg.lastIndex++;
        }
      }
      return { matches, error: null };
    } catch (e) {
      return { matches: [], error: e instanceof Error ? e.message : t('err_regex', 'Regular expression syntax error.') };
    }
  }, [pattern, flags, testText, t]);

  const insertToken = (token: string) => {
    setPattern(prev => prev + token);
  };

  return (
    <div className="space-y-5">
      <Header
        title="Regex Builder"
        desc={t('regex_builder_desc', 'Interactive regular expression builder and tester with live match inspection.')}
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

        {/* Pattern & Flags */}
        <div className="grid sm:grid-cols-[1fr_120px] gap-2 items-end">
          <label className="text-xs text-slate-400">
            {t('regex_pattern_label', 'Regular Expression (Pattern):')}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 mt-1">
              <span className="text-slate-500 font-mono text-sm">/</span>
              <input
                className="w-full bg-transparent outline-none font-mono text-sm text-indigo-300 py-1.5"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
              />
              <span className="text-slate-500 font-mono text-sm">/</span>
            </div>
          </label>
          <label className="text-xs text-slate-400">
            {t('regex_flags_label', 'Flags:')}
            <input
              className={input + ' mt-1 font-mono text-sm'}
              value={flags}
              onChange={e => setFlags(e.target.value)}
              placeholder="gi"
            />
          </label>
        </div>

        {/* Quick token chips */}
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

        {testResults.error && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{testResults.error}</span>
          </div>
        )}

        {/* Test Text */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">{t('test_text_verify_matches', 'Test text to match against:')}</span>
            <span className="text-emerald-400 font-mono font-semibold">
              {t('matches_found', 'Found {count} matches', { count: testResults.matches.length })}
            </span>
          </div>
          <textarea
            className={input + ' min-h-32 font-mono text-xs leading-relaxed'}
            value={testText}
            onChange={e => setTestText(e.target.value)}
          />
        </div>

        {/* Matches list */}
        {testResults.matches.length > 0 && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-xs text-slate-400 block font-medium">{t('captured_matches_list', 'Captured Matches:')}</span>
            <div className="flex flex-wrap gap-2">
              {testResults.matches.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded bg-indigo-950/50 border border-indigo-700/50 text-indigo-200 font-mono text-xs"
                >
                  #{idx + 1}: &ldquo;{m.text}&rdquo; ({t('position_label', 'index')} {m.index})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
