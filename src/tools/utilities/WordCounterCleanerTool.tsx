import React, { useState, useMemo } from 'react';
import { FileText, Copy, Check, Eraser, Link2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
];

function cleanTrackingUrls(input: string): string {
  return input.replace(/https?:\/\/[^\s]+/g, rawUrl => {
    try {
      const url = new URL(rawUrl);
      TRACKING_PARAMS.forEach(p => url.searchParams.delete(p));
      return url.toString();
    } catch {
      return rawUrl;
    }
  });
}

export const WordCounterCleanerTool: React.FC = () => {
  const { t } = useI18n();
  const [text, setText] = useState(
    t(
      'wcc_sample_text',
      'Paste any article, essay, email draft, or messy URL list here to count words, check reading time, and clean formatting.'
    )
  );
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = trimmed ? trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0;
    const lines = text ? text.split('\n').length : 0;
    const readMin = Math.max(0, Math.ceil(words.length / 200));
    const speakMin = Math.max(0, Math.ceil(words.length / 130));

    const freq: Record<string, number> = {};
    for (const w of words) {
      const clean = w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (clean.length >= 3) {
        freq[clean] = (freq[clean] || 0) + 1;
      }
    }
    const topWords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return { words: words.length, chars, charsNoSpace, sentences, paragraphs, lines, readMin, speakMin, topWords };
  }, [text]);

  const applyTransform = (fn: (s: string) => string) => {
    setText(prev => fn(prev));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('wcc_title', 'Word Counter & Text Cleaner')}</h2>
              <p className="text-xs text-slate-400">
                {t('wcc_subtitle', 'Live word, character, and reading-time stats plus one-click text and tracking-URL cleanup.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
            </button>
            <button
              type="button"
              onClick={() => setText('')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>{t('clear', 'Clear')}</span>
            </button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t('stat_words', 'Words'), val: stats.words },
            { label: t('stat_chars', 'Characters'), val: stats.chars },
            { label: t('wcc_chars_no_space', 'No Spaces'), val: stats.charsNoSpace },
            { label: t('wcc_sentences', 'Sentences'), val: stats.sentences },
            { label: t('wcc_paragraphs', 'Paragraphs'), val: stats.paragraphs },
            { label: t('stat_read_time', 'Reading time'), val: `${stats.readMin}m` },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{item.label}</div>
              <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">{item.val}</div>
            </div>
          ))}
        </div>

        {/* Quick Clean Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyTransform(s => s.replace(/[ \t]+/g, ' ').replace(/^ +| +$/gm, '').trim())}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-indigo-500/40"
          >
            {t('wcc_clean_spaces', 'Collapse Extra Spaces')}
          </button>
          <button
            type="button"
            onClick={() => applyTransform(s => s.split('\n').filter(l => l.trim() !== '').join('\n'))}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-indigo-500/40"
          >
            {t('wcc_remove_blank', 'Remove Blank Lines')}
          </button>
          <button
            type="button"
            onClick={() => applyTransform(s => Array.from(new Set(s.split('\n'))).join('\n'))}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-indigo-500/40"
          >
            {t('wcc_dedupe_lines', 'Remove Duplicate Lines')}
          </button>
          <button
            type="button"
            onClick={() => applyTransform(s => s.replace(/<[^>]*>/g, ''))}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-indigo-500/40"
          >
            {t('wcc_strip_html', 'Strip HTML Tags')}
          </button>
          <button
            type="button"
            onClick={() => applyTransform(cleanTrackingUrls)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-emerald-300 hover:text-white hover:border-emerald-500/40 flex items-center gap-1"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{t('wcc_clean_urls', 'Clean Tracking URLs (utm/fbclid)')}</span>
          </button>
        </div>

        <textarea
          rows={10}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('editor_start_typing', 'Start writing or paste text...')}
          className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
        />

        {stats.topWords.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{t('wcc_top_words', 'Top words')}:</span>
            {stats.topWords.map(([word, count]) => (
              <span key={word} className="font-mono tabular-nums">
                {word} ({count})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
