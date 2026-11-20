import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowUpDown, Download, Copy, Sparkles, FileUp, Table2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import {
  computeColumnNumericStat,
  deduplicateGridRows,
  gridToJsonObjects,
  gridToMarkdownTable,
  parseCsvGrid,
  serializeCsvGrid,
} from '../../utils/newTools.logic';

const SAMPLE_CSV = `Item,Category,Quantity,UnitPrice
Mechanical Keyboard,Peripherals,4,129.99
27" 4K Monitor,Displays,2,449.50
USB-C Hub,Accessories,6,45.00
Desk Mat XL,Accessories,5,24.99
Ergonomic Mouse,Peripherals,4,79.00`;

export const CsvGridEditorTool: React.FC = () => {
  const { t } = useI18n();
  const initial = useMemo(() => parseCsvGrid(SAMPLE_CSV), []);
  const [headers, setHeaders] = useState<string[]>(initial.headers);
  const [rows, setRows] = useState<string[][]>(initial.rows);
  const [delimiter, setDelimiter] = useState<string>(',');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    const piped = consumePendingToolPipe('csv-editor');
    if (!piped) return;
    const applyRaw = (txt: string) => {
      const parsed = parseCsvGrid(txt);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setDelimiter(parsed.delimiter);
      setSortCol(null);
    };
    if (piped.kind === 'text' && typeof piped.text === 'string') {
      applyRaw(piped.text);
    } else if (piped.kind === 'file' && piped.file) {
      void piped.file.text().then(applyRaw);
    }
  }, []);

  const visibleRowIndices = useMemo(() => {
    const q = search.trim().toLowerCase();
    const indices = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => (!q ? true : r.some(cell => cell.toLowerCase().includes(q))));

    if (sortCol !== null) {
      indices.sort((a, b) => {
        const va = a.r[sortCol] ?? '';
        const vb = b.r[sortCol] ?? '';
        const na = Number(va);
        const nb = Number(vb);
        const cmp =
          va.trim() !== '' && vb.trim() !== '' && Number.isFinite(na) && Number.isFinite(nb)
            ? na - nb
            : va.localeCompare(vb, undefined, { numeric: true });
        return sortAsc ? cmp : -cmp;
      });
    }
    return indices.map(x => x.i);
  }, [rows, search, sortCol, sortAsc]);

  const colStats = useMemo(
    () => headers.map((_, idx) => computeColumnNumericStat(rows, idx)),
    [headers, rows]
  );

  const updateCell = (rowIdx: number, colIdx: number, val: string) => {
    setRows(prev => prev.map((r, ri) => (ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? val : c)) : r)));
  };

  const updateHeader = (colIdx: number, val: string) => {
    setHeaders(prev => prev.map((h, i) => (i === colIdx ? val : h)));
  };

  const addRow = () => setRows(prev => [...prev, headers.map(() => '')]);

  const removeRow = (rowIdx: number) => setRows(prev => prev.filter((_, i) => i !== rowIdx));

  const addColumn = () => {
    setHeaders(prev => [...prev, `Column ${prev.length + 1}`]);
    setRows(prev => prev.map(r => [...r, '']));
  };

  const removeColumn = (colIdx: number) => {
    if (headers.length <= 1) return;
    setHeaders(prev => prev.filter((_, i) => i !== colIdx));
    setRows(prev => prev.map(r => r.filter((_, i) => i !== colIdx)));
    if (sortCol === colIdx) setSortCol(null);
  };

  const toggleSort = (colIdx: number) => {
    if (sortCol === colIdx) setSortAsc(a => !a);
    else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };

  const handleDedupe = () => {
    const res = deduplicateGridRows(rows);
    setRows(res.rows);
    setStatusMsg(t('csv_deduped_msg', 'Removed {count} duplicate row(s).', { count: res.removedCount }));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then(txt => {
      const parsed = parseCsvGrid(txt);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setDelimiter(parsed.delimiter);
      setSortCol(null);
      setStatusMsg(t('csv_loaded_msg', 'Loaded {rows} rows × {cols} columns.', { rows: parsed.rows.length, cols: parsed.headers.length }));
    });
  };

  const csvOutput = useMemo(() => serializeCsvGrid(headers, rows, delimiter), [headers, rows, delimiter]);

  const copyAs = (type: 'csv' | 'json' | 'md') => {
    const content =
      type === 'csv'
        ? csvOutput
        : type === 'json'
          ? JSON.stringify(gridToJsonObjects(headers, rows), null, 2)
          : gridToMarkdownTable(headers, rows);
    void navigator.clipboard.writeText(content);
    setCopiedType(type);
    window.setTimeout(() => setCopiedType(null), 1500);
  };

  const exportFile = (ext: 'csv' | 'json' | 'md') => {
    const content =
      ext === 'csv'
        ? csvOutput
        : ext === 'json'
          ? JSON.stringify(gridToJsonObjects(headers, rows), null, 2)
          : gridToMarkdownTable(headers, rows);
    void saveTextWithDialog(`table-export.${ext}`, content, [{ name: `${ext.toUpperCase()} (*.${ext})`, extensions: [ext] }], t('export_csv', 'Export Table'));
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Table2 className="w-5 h-5 text-indigo-400" />
            {t('tool_csv_editor_title', 'CSV & Spreadsheet Grid Editor')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_csv_editor_desc', 'Edit CSV/TSV tables inline, sort, filter, deduplicate rows, inspect column totals, and export to CSV, JSON, or Markdown.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <FileUp className="w-3.5 h-3.5" />
            {t('csv_import_btn', 'Import CSV/TSV')}
            <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={handleImportFile} />
          </label>
          <SendToToolButton sourceToolId="csv-editor" kind="text" getText={() => csvOutput} />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={addRow} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> {t('csv_add_row', 'Add Row')}
            </button>
            <button type="button" onClick={addColumn} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> {t('csv_add_col', 'Add Column')}
            </button>
            <button type="button" onClick={handleDedupe} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {t('csv_dedupe', 'Remove Duplicates')}
            </button>
            <select
              value={delimiter}
              onChange={e => setDelimiter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
              aria-label={t('csv_delimiter', 'Delimiter')}
            >
              <option value=",">{t('csv_delim_comma', 'Comma (,)')}</option>
              <option value=";">{t('csv_delim_semi', 'Semicolon (;)')}</option>
              <option value={'\t'}>{t('csv_delim_tab', 'Tab (TSV)')}</option>
            </select>
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('csv_filter_placeholder', 'Filter rows…')}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 w-52 outline-none focus:border-indigo-500"
          />
        </div>

        {statusMsg && (
          <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2">
            {statusMsg}
          </div>
        )}

        {/* Editable Spreadsheet Table */}
        <div className="overflow-auto max-h-[440px] rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
                <th className="p-2 text-center text-slate-500 w-10 font-mono">#</th>
                {headers.map((h, ci) => (
                  <th key={ci} className="p-1.5 border-l border-slate-800 min-w-[140px]">
                    <div className="flex items-center gap-1">
                      <input
                        value={h}
                        onChange={e => updateHeader(ci, e.target.value)}
                        className="w-full bg-transparent font-semibold text-slate-200 px-1.5 py-1 rounded hover:bg-slate-800/60 focus:bg-slate-950 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSort(ci)}
                        className={`p-1 rounded hover:bg-slate-800 ${sortCol === ci ? 'text-indigo-400' : 'text-slate-500'}`}
                        title={t('csv_sort_col', 'Sort column')}
                      >
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                      {headers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(ci)}
                          className="p-1 rounded text-slate-600 hover:text-rose-400"
                          title={t('csv_remove_col', 'Delete column')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-9" />
              </tr>
            </thead>
            <tbody>
              {visibleRowIndices.map(ri => (
                <tr key={ri} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                  <td className="p-1.5 text-center text-slate-600 font-mono">{ri + 1}</td>
                  {headers.map((_, ci) => (
                    <td key={ci} className="p-1 border-l border-slate-800/60">
                      <input
                        value={rows[ri][ci] ?? ''}
                        onChange={e => updateCell(ri, ci, e.target.value)}
                        className="w-full bg-transparent text-slate-200 font-mono px-1.5 py-1 rounded focus:bg-slate-900 outline-none"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      className="p-1 text-slate-600 hover:text-rose-400"
                      title={t('remove', 'Remove')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900/80 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                <td className="p-2 text-center">Σ</td>
                {colStats.map((st, idx) => (
                  <td key={idx} className="p-2 border-l border-slate-800">
                    {st ? `Σ ${st.sum} · μ ${st.avg}` : `${rows.length} ${t('sql_rows', 'rows')}`}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Copy & Export Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-mono">
            {visibleRowIndices.length} / {rows.length} {t('sql_rows', 'rows')} × {headers.length} {t('csv_cols', 'cols')}
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copyAs('csv')} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">
              <Copy className="w-3.5 h-3.5 inline mr-1" />
              {copiedType === 'csv' ? t('copied', 'Copied!') : 'CSV'}
            </button>
            <button type="button" onClick={() => copyAs('json')} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">
              <Copy className="w-3.5 h-3.5 inline mr-1" />
              {copiedType === 'json' ? t('copied', 'Copied!') : 'JSON'}
            </button>
            <button type="button" onClick={() => copyAs('md')} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">
              <Copy className="w-3.5 h-3.5 inline mr-1" />
              {copiedType === 'md' ? t('copied', 'Copied!') : 'Markdown'}
            </button>
            <button type="button" onClick={() => exportFile('csv')} className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
              <Download className="w-3.5 h-3.5 inline mr-1" />
              .csv
            </button>
            <button type="button" onClick={() => exportFile('json')} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">
              <Download className="w-3.5 h-3.5 inline mr-1" />
              .json
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
