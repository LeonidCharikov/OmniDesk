import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Copy, Table as TableIcon } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { btn, secondary, input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   MARKDOWN TABLE GENERATOR (Interactive Grid Editor & Delimited Text Converter)
   ───────────────────────────────────────────────────────────── */
export const MarkdownTableTool: React.FC = () => {
  const { t } = useI18n();
  const [headers, setHeaders] = useState<string[]>(() => [
    t('table_col_name', 'Name'),
    t('table_col_category', 'Category'),
    t('table_col_price', 'Price'),
    t('table_col_stock', 'In Stock'),
  ]);
  const [alignments, setAlignments] = useState<('left' | 'center' | 'right')[]>(['left', 'left', 'right', 'center']);
  const [rows, setRows] = useState<string[][]>(() => [
    [t('table_item_kb', 'Mechanical Keyboard'), 'Hardware', '129', t('yes', 'Yes')],
    [t('table_item_mouse', 'Wireless Mouse'), t('table_cat_acc', 'Accessories'), '49', t('yes', 'Yes')],
    [t('table_item_pad', 'XXL Desk Mat'), t('table_cat_acc', 'Accessories'), '25', t('no', 'No')],
  ]);
  const [delimitText, setDelimitText] = useState('');
  const [mode, setMode] = useState<'grid' | 'paste'>('grid');

  const addColumn = () => {
    setHeaders([...headers, `${t('column_label', 'Column')} ${headers.length + 1}`]);
    setAlignments([...alignments, 'left']);
    setRows(rows.map(r => [...r, '']));
  };

  const removeColumn = (cidx: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== cidx));
    setAlignments(alignments.filter((_, i) => i !== cidx));
    setRows(rows.map(r => r.filter((_, i) => i !== cidx)));
  };

  const addRow = () => {
    setRows([...rows, Array(headers.length).fill('')]);
  };

  const removeRow = (ridx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== ridx));
  };

  const parseDelimited = () => {
    if (!delimitText.trim()) return;
    const lines = delimitText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    // Detect delimiter: semicolon, tab, or comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

    const parsedHeaders = lines[0].split(delimiter).map(h => h.trim());
    const parsedRows = lines.slice(1).map(l => l.split(delimiter).map(c => c.trim()));

    setHeaders(parsedHeaders);
    setAlignments(Array(parsedHeaders.length).fill('left'));
    setRows(parsedRows.length ? parsedRows : [Array(parsedHeaders.length).fill('')]);
    setMode('grid');
  };

  const markdownOutput = useMemo(() => {
    const headLine = `| ${headers.map(h => h || ' ').join(' | ')} |`;
    const sepLine = `| ${alignments
      .map(a => (a === 'center' ? ':---:' : a === 'right' ? '---:' : ':---'))
      .join(' | ')} |`;
    const bodyLines = rows.map(r => `| ${r.map(c => c || ' ').join(' | ')} |`);
    return [headLine, sepLine, ...bodyLines].join('\n');
  }, [headers, alignments, rows]);

  return (
    <div className="space-y-5">
      <Header
        title="Markdown Table Generator"
        desc={t('markdown_table_desc', 'Visual table editor and CSV/TSV converter for clean Markdown tables.')}
      />
      <div className={box + ' space-y-4'}>
        <div className="flex gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            className={mode === 'grid' ? btn : secondary}
            onClick={() => setMode('grid')}
          >
            <TableIcon className="w-3.5 h-3.5 inline mr-1" />
            {t('visual_table', 'Visual Table')}
          </button>
          <button
            type="button"
            className={mode === 'paste' ? btn : secondary}
            onClick={() => setMode('paste')}
          >
            {t('paste_csv_tsv', 'Paste CSV / TSV Text')}
          </button>
        </div>

        {mode === 'paste' ? (
          <div className="space-y-3">
            <textarea
              className={input + ' min-h-40 font-mono text-xs'}
              value={delimitText}
              onChange={e => setDelimitText(e.target.value)}
              placeholder={t('csv_paste_placeholder', 'Paste rows separated by semicolons (;), commas (,), or tabs:\nName;Role;City\nAlice;Admin;Prague\nBob;Developer;Brno')}
            />
            <button className={btn} onClick={parseDelimited}>
              {t('load_create_table', 'Parse & Create Table')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={addRow}>
                <Plus className="w-3.5 h-3.5 inline mr-1" /> {t('add_row', 'Add row')}
              </button>
              <button className={secondary} onClick={addColumn}>
                <Plus className="w-3.5 h-3.5 inline mr-1" /> {t('add_column', 'Add column')}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    {headers.map((h, cidx) => (
                      <th key={cidx} className="p-1 min-w-[120px]">
                        <div className="flex items-center gap-1">
                          <input
                            className={input + ' py-1 px-1.5 font-bold text-white text-xs'}
                            value={h}
                            onChange={e => {
                              const next = [...headers];
                              next[cidx] = e.target.value;
                              setHeaders(next);
                            }}
                          />
                          <select
                            className="bg-slate-900 text-slate-300 text-[10px] rounded p-1 border border-slate-800"
                            value={alignments[cidx]}
                            onChange={e => {
                              const next = [...alignments];
                              next[cidx] = e.target.value as typeof alignments[0];
                              setAlignments(next);
                            }}
                          >
                            <option value="left">&lt;</option>
                            <option value="center">=</option>
                            <option value="right">&gt;</option>
                          </select>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                            onClick={() => removeColumn(cidx)}
                            title={t('delete_column', 'Delete column')}
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ridx) => (
                    <tr key={ridx} className="border-b border-slate-800/40">
                      {row.map((cell, cidx) => (
                        <td key={cidx} className="p-1">
                          <input
                            className={input + ' py-1 px-1.5 text-xs'}
                            value={cell}
                            onChange={e => {
                              const nextRows = rows.map((r, i) =>
                                i === ridx ? r.map((c, j) => (j === cidx ? e.target.value : c)) : r
                              );
                              setRows(nextRows);
                            }}
                          />
                        </td>
                      ))}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          className="text-slate-500 hover:text-rose-400 p-1"
                          onClick={() => removeRow(ridx)}
                          title={t('delete_row', 'Delete row')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">{t('generated_markdown_code', 'Generated Markdown Output:')}</span>
            <div className="flex gap-2">
              <button className={btn} onClick={() => navigator.clipboard.writeText(markdownOutput)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {t('copy_markdown', 'Copy Markdown')}
              </button>
            </div>
          </div>
          <pre className={box + ' whitespace-pre-wrap font-mono text-xs overflow-auto text-indigo-300'}>
            {markdownOutput}
          </pre>
        </div>
      </div>
    </div>
  );
};
