import React, { useEffect, useMemo, useState } from 'react';
import { Download, Play, Copy, Table, Code, AlertCircle } from 'lucide-react';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import {
  executeSqlQuery,
  formatRowsAsCsv,
  parseDatasetInput,
  type SqlRow,
} from '../../utils/sqlPlaygroundEngine';
import { button, secondary, input, panel, ToolHeader, FilePicker } from './shared';

/* ─────────────────────────────────────────────────────────────
   SQL PLAYGROUND (JSON/CSV/TSV input, WHERE AND/OR/IN/LIKE/BETWEEN,
   GROUP BY, HAVING, COUNT/SUM/AVG/MIN/MAX, DISTINCT, ORDER BY, LIMIT/OFFSET)
   ───────────────────────────────────────────────────────────── */
const SQL_DATASETS = {
  employees: [
    { id: 1, name: 'Alice Novak', department: 'Development', role: 'Senior Developer', city: 'Prague', salary: 85000 },
    { id: 2, name: 'Bob Cerny', department: 'Design', role: 'UI/UX Designer', city: 'Brno', salary: 65000 },
    { id: 3, name: 'Cecilia Dvorak', department: 'Management', role: 'Product Manager', city: 'Prague', salary: 95000 },
    { id: 4, name: 'David Kucera', department: 'Development', role: 'Backend Engineer', city: 'Ostrava', salary: 78000 },
    { id: 5, name: 'Eva Horak', department: 'Marketing', role: 'Content Specialist', city: 'Brno', salary: 52000 },
    { id: 6, name: 'Filip Kral', department: 'Development', role: 'QA Engineer', city: 'Prague', salary: 68000 },
  ],
  orders: [
    { orderId: 101, customer: 'Petr Svoboda', item: 'Mechanical Keyboard', category: 'Peripherals', price: 2990, status: 'Delivered' },
    { orderId: 102, customer: 'Jana Vesela', item: 'Gaming Monitor 27"', category: 'Displays', price: 8490, status: 'Shipped' },
    { orderId: 103, customer: 'Karel Prochazka', item: 'Wireless Mouse', category: 'Peripherals', price: 1290, status: 'Processing' },
    { orderId: 104, customer: 'Lucie Benes', item: 'USB-C Dock 100W', category: 'Accessories', price: 2490, status: 'Delivered' },
    { orderId: 105, customer: 'Tomas Marek', item: '4K Webcam', category: 'Peripherals', price: 3190, status: 'Delivered' },
  ],
  csvSample: `product,region,units,revenue
Laptop,EU,14,21000
Monitor,US,28,11200
Keyboard,EU,65,6500
Laptop,US,19,28500
Monitor,EU,22,8800`,
};

export const SqlPlaygroundTool: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState(() => JSON.stringify(SQL_DATASETS.employees, null, 2));
  const [query, setQuery] = useState(
    "SELECT department, COUNT(*) AS headcount, AVG(salary) AS avg_salary FROM data GROUP BY department ORDER BY avg_salary DESC"
  );
  const [rowsResult, setRowsResult] = useState<SqlRow[]>([]);
  const [rawOutput, setRawOutput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [copied, setCopied] = useState(false);

  const datasetMeta = useMemo(() => {
    try {
      const parsed = parseDatasetInput(data);
      return { columns: parsed.columns, format: parsed.format, totalRows: parsed.rows.length, parseError: '' };
    } catch (e) {
      return {
        columns: [] as string[],
        format: 'json' as const,
        totalRows: 0,
        parseError: e instanceof Error ? e.message : '',
      };
    }
  }, [data]);

  const runQueryWith = (sourceData: string, sourceQuery: string) => {
    setErrorMsg('');
    try {
      const parsed = parseDatasetInput(sourceData);
      const res = executeSqlQuery(parsed.rows, sourceQuery);
      setRowsResult(res.rows);
      setRawOutput(JSON.stringify(res.rows, null, 2));
      setElapsedMs(res.elapsedMs);
    } catch (e) {
      setRowsResult([]);
      setElapsedMs(null);
      const msg = e instanceof Error ? e.message : t('err_sql_exec', 'Error executing query.');
      setErrorMsg(msg);
      setRawOutput(msg);
    }
  };

  const executeSql = () => {
    runQueryWith(data, query);
  };

  useEffect(() => {
    const piped = consumePendingToolPipe('sql-playground');
    if (piped) {
      if (piped.kind === 'text' && typeof piped.text === 'string') {
        const nextQuery = 'SELECT * FROM data LIMIT 50';
        setData(piped.text);
        setQuery(nextQuery);
        runQueryWith(piped.text, nextQuery);
        return;
      }
      if (piped.kind === 'file' && piped.file) {
        void piped.file.text().then(txt => {
          const nextQuery = 'SELECT * FROM data LIMIT 50';
          setData(txt);
          setQuery(nextQuery);
          runQueryWith(txt, nextQuery);
        });
        return;
      }
    }
    runQueryWith(data, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreset = (nextData: string, nextQuery: string) => {
    setData(nextData);
    setQuery(nextQuery);
    runQueryWith(nextData, nextQuery);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then(txt => {
      const nextQuery = 'SELECT * FROM data LIMIT 50';
      setData(txt);
      setQuery(nextQuery);
      runQueryWith(txt, nextQuery);
    });
  };

  const exportCsv = () => {
    if (!rowsResult.length) return;
    const csv = formatRowsAsCsv(rowsResult);
    void saveTextWithDialog('query-result.csv', csv, [{ name: 'CSV (*.csv)', extensions: ['csv'] }], t('save_csv', 'Save CSV'));
  };

  const handleCopy = () => {
    if (!rawOutput) return;
    void navigator.clipboard.writeText(rawOutput);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5">
      <ToolHeader
        title="SQL Playground"
        description={t('sql_playground_desc', 'Query JSON or CSV/TSV tables locally with WHERE (AND/OR/IN/LIKE/BETWEEN), GROUP BY, HAVING, aggregates, ORDER BY, and LIMIT/OFFSET.')}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs text-slate-300 font-medium">
              {t('json_data_source', 'Input Table (JSON / CSV / TSV):')}{' '}
              <span className="text-slate-500 font-mono">
                ({datasetMeta.format.toUpperCase()} · {datasetMeta.totalRows} {t('sql_rows', 'rows')})
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 font-medium"
                onClick={() =>
                  loadPreset(
                    JSON.stringify(SQL_DATASETS.employees, null, 2),
                    "SELECT department, COUNT(*) AS headcount, AVG(salary) AS avg_salary FROM data GROUP BY department ORDER BY avg_salary DESC"
                  )
                }
              >
                {t('sql_preset_group_by', 'GROUP BY Sample')}
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                onClick={() =>
                  loadPreset(
                    JSON.stringify(SQL_DATASETS.employees, null, 2),
                    "SELECT name, role, salary FROM data WHERE city IN ('Prague', 'Brno') AND salary >= 65000 ORDER BY salary DESC"
                  )
                }
              >
                {t('table_employees', 'Employees')}
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                onClick={() =>
                  loadPreset(
                    JSON.stringify(SQL_DATASETS.orders, null, 2),
                    "SELECT category, COUNT(*) AS orders, SUM(price) AS total_sales FROM data WHERE status != 'Processing' GROUP BY category ORDER BY total_sales DESC"
                  )
                }
              >
                {t('table_orders', 'Orders')}
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400"
                onClick={() =>
                  loadPreset(
                    SQL_DATASETS.csvSample,
                    "SELECT region, SUM(units) AS total_units, SUM(revenue) AS total_revenue FROM data GROUP BY region ORDER BY total_revenue DESC"
                  )
                }
              >
                CSV
              </button>
            </div>
          </div>

          <textarea
            className={input + ' min-h-72 font-mono text-xs leading-relaxed'}
            value={data}
            onChange={e => setData(e.target.value)}
            placeholder={t('sql_data_placeholder', 'Paste a JSON array of objects, CSV, or TSV…')}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilePicker
              id="sql-dataset-upload"
              label={t('sql_import_file', 'Import .json / .csv')}
              accept=".json,.csv,.tsv,text/csv,application/json,text/plain"
              onChange={handleFileUpload}
            />
          </div>

          {datasetMeta.columns.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-slate-500 mr-1">{t('sql_columns', 'Columns:')}</span>
              {datasetMeta.columns.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setQuery(q => `${q} ${col}`)}
                  className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-indigo-500 text-slate-300 font-mono"
                  title={t('sql_click_insert_col', 'Click to append column to query')}
                >
                  {col}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-300 font-medium">{t('sql_query', 'SQL Query:')}</label>
              {elapsedMs !== null && (
                <span className="text-[11px] font-mono text-emerald-400">
                  {rowsResult.length} {t('sql_rows', 'rows')} · {elapsedMs} ms
                </span>
              )}
            </div>
            <div className="space-y-2">
              <textarea
                className={input + ' min-h-20 font-mono text-xs leading-relaxed'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    executeSql();
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {t('sql_syntax_hint', 'Supports SELECT [DISTINCT], AS, COUNT/SUM/AVG/MIN/MAX, WHERE (AND/OR/IN/LIKE/BETWEEN), GROUP BY, HAVING, ORDER BY, LIMIT, OFFSET')}
                </span>
                <button type="button" className={button} onClick={executeSql}>
                  <Play className="inline w-3.5 h-3.5 mr-1" /> {t('run_query', 'Run')}
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-mono break-words">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  onClick={() => setViewMode('table')}
                >
                  <Table className="w-3.5 h-3.5 inline mr-1" />
                  {t('table_view', 'Table')} ({rowsResult.length})
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  onClick={() => setViewMode('json')}
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" />
                  JSON
                </button>
              </div>

              {rowsResult.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondary} onClick={handleCopy}>
                    <Copy className="inline w-3.5 h-3.5 mr-1" />
                    {copied ? t('copied', 'Copied!') : t('copy', 'Copy')}
                  </button>
                  <button type="button" className={secondary} onClick={exportCsv}>
                    <Download className="inline w-3.5 h-3.5 mr-1" />
                    CSV
                  </button>
                  <SendToToolButton
                    sourceToolId="sql-playground"
                    kind="text"
                    getText={() => rawOutput}
                  />
                </div>
              )}
            </div>

            {viewMode === 'table' ? (
              <div className={panel + ' min-h-56 max-h-80 overflow-auto p-0'}>
                {rowsResult.length > 0 ? (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 sticky top-0">
                        {Object.keys(rowsResult[0]).map(key => (
                          <th key={key} className="p-2.5 text-left font-semibold text-slate-300">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsResult.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                          {Object.values(row).map((val, cidx) => (
                            <td key={cidx} className="p-2.5 text-slate-300 font-mono">
                              {val === null || val === undefined ? 'NULL' : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-xs text-slate-500 font-mono">{rawOutput || t('no_results', 'No results')}</p>
                )}
              </div>
            ) : (
              <pre className={panel + ' min-h-56 max-h-80 overflow-auto font-mono text-xs text-slate-200'}>
                {rawOutput}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
