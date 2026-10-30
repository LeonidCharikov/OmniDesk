import React, { useState, useId } from 'react';
import { GitCompare, Plus, Minus, Equal } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNumA?: number;
  lineNumB?: number;
}

export const TextDiffTool: React.FC = () => {
  const { t } = useI18n();
  const [textA, setTextA] = useState<string>(
`// Původní verze konfigurace
{
  "appName": "OmniDesk",
  "version": "1.0.0",
  "offlineOnly": true,
  "theme": "dark"
}`);

  const [textB, setTextB] = useState<string>(
`// Aktualizovaná verze konfigurace
{
  "appName": "OmniDesk Tauri Platform",
  "version": "2.0.0",
  "offlineOnly": false,
  "theme": "dark",
  "language": "cs"
}`);

  const textAId = useId();
  const textBId = useId();

  // Simple line-by-line diff algorithm
  const computeDiff = (): { lines: DiffLine[]; added: number; removed: number; unchanged: number } => {
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');
    const result: DiffLine[] = [];

    let i = 0;
    let j = 0;
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    while (i < linesA.length || j < linesB.length) {
      if (i < linesA.length && j < linesB.length && linesA[i] === linesB[j]) {
        result.push({
          type: 'unchanged',
          text: linesA[i],
          lineNumA: i + 1,
          lineNumB: j + 1,
        });
        unchanged++;
        i++;
        j++;
      } else if (j < linesB.length && (i >= linesA.length || !linesA.includes(linesB[j]))) {
        result.push({
          type: 'added',
          text: linesB[j],
          lineNumB: j + 1,
        });
        added++;
        j++;
      } else if (i < linesA.length) {
        result.push({
          type: 'removed',
          text: linesA[i],
          lineNumA: i + 1,
        });
        removed++;
        i++;
      } else {
        j++;
      }
    }

    return { lines: result, added, removed, unchanged };
  };

  const diffData = computeDiff();

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">
          {t('tool_text_diff_title', 'Text & Souborový Diff Porovnávač')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('text_diff_desc', 'Vizuální porovnání dvou textů nebo konfiguračních souborů řádek po řádce s detekcí změn.')}
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor={textAId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('original_text_a', 'Původní text (Verze A)')}
          </label>
          <textarea
            id={textAId}
            value={textA}
            onChange={e => setTextA(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={textBId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('modified_text_b', 'Upravený text (Verze B)')}
          </label>
          <textarea
            id={textBId}
            value={textB}
            onChange={e => setTextB(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
          />
        </div>
      </div>

      {/* Diff Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-center gap-3">
          <Plus className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[11px] text-slate-400 block">{t('added_lines', 'Přidáno')}</span>
            <span className="text-base font-bold font-mono text-emerald-400">+{diffData.added} {t('lines_short', 'řádků')}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-red-950/20 border border-red-800/40 flex items-center gap-3">
          <Minus className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <span className="text-[11px] text-slate-400 block">{t('removed_lines', 'Odebráno')}</span>
            <span className="text-base font-bold font-mono text-red-400">-{diffData.removed} {t('lines_short', 'řádků')}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <Equal className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <span className="text-[11px] text-slate-400 block">{t('unchanged_lines', 'Beze změny')}</span>
            <span className="text-base font-bold font-mono text-slate-200">{diffData.unchanged} {t('lines_short', 'řádků')}</span>
          </div>
        </div>
      </div>

      {/* Visual Diff View */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          {t('line_by_line_diff', 'Výsledné porovnání řádek po řádce')}
        </span>
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto">
          {diffData.lines.map((line, idx) => (
            <div
              key={idx}
              className={`flex items-start px-3 py-1 border-b border-slate-900/40 ${
                line.type === 'added'
                  ? 'bg-emerald-950/30 text-emerald-200'
                  : line.type === 'removed'
                  ? 'bg-red-950/30 text-red-200'
                  : 'text-slate-400 hover:bg-slate-900/40'
              }`}
            >
              <span className="w-8 text-right text-slate-600 select-none mr-3">
                {line.lineNumA || ''}
              </span>
              <span className="w-8 text-right text-slate-600 select-none mr-3">
                {line.lineNumB || ''}
              </span>
              <span className="w-4 select-none font-bold mr-2">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              <span className="flex-1 whitespace-pre-wrap break-all">{line.text || ' '}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
