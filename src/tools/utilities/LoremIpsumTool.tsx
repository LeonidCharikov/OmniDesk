import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, RefreshCw, Type } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import {
  generateLoremIpsum,
  LoremFormat,
  LoremStyle,
  LoremUnit,
} from '../../utils/newTools.logic';

const UNIT_LIMITS: Record<LoremUnit, { min: number; max: number; defaultCount: number }> = {
  paragraphs: { min: 1, max: 30, defaultCount: 3 },
  sentences: { min: 1, max: 50, defaultCount: 6 },
  words: { min: 5, max: 200, defaultCount: 50 },
  list: { min: 1, max: 40, defaultCount: 6 },
};

export const LoremIpsumTool: React.FC = () => {
  const { t } = useI18n();
  const [style, setStyle] = useState<LoremStyle>('classic');
  const [unit, setUnit] = useState<LoremUnit>('paragraphs');
  const [count, setCount] = useState<number>(3);
  const [format, setFormat] = useState<LoremFormat>('plain');
  const [startWithClassic, setStartWithClassic] = useState<boolean>(true);
  const [seed, setSeed] = useState<number>(1337);
  const [copied, setCopied] = useState(false);

  const limits = UNIT_LIMITS[unit];

  const handleUnitChange = (nextUnit: LoremUnit) => {
    setUnit(nextUnit);
    const nextLimits = UNIT_LIMITS[nextUnit];
    setCount(nextLimits.defaultCount);
  };

  const output = useMemo(
    () =>
      generateLoremIpsum({
        style,
        unit,
        count,
        startWithClassic,
        format,
        seed,
      }),
    [style, unit, count, startWithClassic, format, seed]
  );

  const stats = useMemo(() => {
    const plain = output.replace(/<[^>]+>/g, ' ').trim();
    const words = plain ? plain.split(/\s+/).length : 0;
    const chars = output.length;
    const bytes = new TextEncoder().encode(output).length;
    const readSec = Math.max(1, Math.round((words / 220) * 60));
    return { words, chars, bytes, readSec };
  }, [output]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = async () => {
    const ext = format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt';
    await saveTextWithDialog(
      `lorem-ipsum.${ext}`,
      output,
      [{ name: `${ext.toUpperCase()} (*.${ext})`, extensions: [ext] }],
      t('lorem_download_title', 'Save Placeholder Text')
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-indigo-400" />
            {t('lorem_ipsum_title', 'Lorem Ipsum & Placeholder Text Generator')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t(
              'lorem_ipsum_desc',
              'Generate classic Latin, tech, or business placeholder copy in plain text, HTML, or Markdown offline.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSeed(s => s + 17)}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('lorem_regenerate', 'Regenerate')}
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Style */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">{t('lorem_style_label', 'Tone / Vocabulary')}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(['classic', 'tech', 'business'] as LoremStyle[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setStyle(item)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  style === item
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(`lorem_style_${item}`, item === 'classic' ? 'Classic' : item === 'tech' ? 'Tech' : 'Business')}
              </button>
            ))}
          </div>
        </div>

        {/* Unit */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">{t('lorem_unit_label', 'Unit')}</span>
          <div className="grid grid-cols-2 gap-1.5">
            {(['paragraphs', 'sentences', 'words', 'list'] as LoremUnit[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => handleUnitChange(item)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  unit === item
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(
                  `lorem_unit_${item}`,
                  item === 'paragraphs'
                    ? 'Paragraphs'
                    : item === 'sentences'
                      ? 'Sentences'
                      : item === 'words'
                        ? 'Words'
                        : 'List'
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">{t('lorem_format_label', 'Output Format')}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(['plain', 'html', 'markdown'] as LoremFormat[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setFormat(item)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  format === item
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {item === 'plain' ? t('lorem_fmt_plain', 'Plain') : item === 'html' ? 'HTML' : 'MD'}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="lorem-count-range" className="text-xs font-medium text-slate-400">
              {t('lorem_count_label', 'Count')}
            </label>
            <input
              type="number"
              min={limits.min}
              max={limits.max}
              value={count}
              onChange={e => setCount(Math.max(limits.min, Math.min(limits.max, Number(e.target.value) || limits.min)))}
              className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 text-right outline-none focus:border-indigo-500"
            />
          </div>
          <input
            id="lorem-count-range"
            type="range"
            min={limits.min}
            max={limits.max}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          {style === 'classic' && unit !== 'list' && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={startWithClassic}
                onChange={e => setStartWithClassic(e.target.checked)}
                className="accent-indigo-500"
              />
              {t('lorem_start_classic', 'Start with "Lorem ipsum dolor sit amet..."')}
            </label>
          )}
        </div>
      </div>

      {/* Output Area */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
            <span>
              {t('lorem_stat_words', 'Words')}: <strong className="text-slate-200">{stats.words}</strong>
            </span>
            <span>
              {t('lorem_stat_chars', 'Chars')}: <strong className="text-slate-200">{stats.chars}</strong>
            </span>
            <span>
              {t('lorem_stat_bytes', 'Bytes')}: <strong className="text-slate-200">{stats.bytes}</strong>
            </span>
            <span>
              {t('lorem_stat_read', 'Read')}: <strong className="text-slate-200">~{stats.readSec}s</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {t('download', 'Download')}
            </button>
            <SendToToolButton getText={() => output} sourceToolId="lorem-ipsum" />
          </div>
        </div>

        <textarea
          readOnly
          rows={14}
          value={output}
          className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 leading-relaxed outline-none font-mono"
        />
      </div>
    </div>
  );
};
