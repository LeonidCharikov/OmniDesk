import React, { useEffect, useState } from 'react';
import { Download, Play, Copy, Table, Code } from 'lucide-react';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { button, secondary, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   7. SQL PLAYGROUND (Presets, WHERE operators, ORDER BY, LIMIT, Table & JSON view, CSV export)
   ───────────────────────────────────────────────────────────── */
const SQL_DATASETS = {
  employees: [
    { id: 1, name: 'Alice Novak', department: 'Development', role: 'Senior Developer', city: 'Prague', salary: 85000 },
    { id: 2, name: 'Bob Cerny', department: 'Design', role: 'UI/UX Designer', city: 'Brno', salary: 65000 },
    { id: 3, name: 'Cecilia Dvorak', department: 'Management', role: 'Product Manager', city: 'Prague', salary: 95000 },
    { id: 4, name: 'David Kucera', department: 'Development', role: 'Backend Engineer', city: 'Ostrava', salary: 78000 },
    { id: 5, name: 'Eva Horak', department: 'Marketing', role: 'Content Specialist', city: 'Brno', salary: 52000 },
  ],
  orders: [
    { orderId: 101, customer: 'Petr Svoboda', item: 'Mechanical Keyboard', price: 2990, status: 'Delivered' },
    { orderId: 102, customer: 'Jana Vesela', item: 'Gaming Monitor 27"', price: 8490, status: 'Shipped' },
    { orderId: 103, customer: 'Karel Prochazka', item: 'Wireless Mouse', price: 1290, status: 'Processing' },
    { orderId: 104, customer: 'Lucie Benes', item: 'USB-C Dock 100W', price: 2490, status: 'Delivered' },
  ],
};

export const SqlPlaygroundTool: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState(JSON.stringify(SQL_DATASETS.employees, null, 2));
  const [query, setQuery] = useState("SELECT name, role, salary FROM data WHERE city = 'Prague' ORDER BY salary DESC");
  const [rowsResult, setRowsResult] = useState<Record<string, unknown>[]>([]);
  const [rawOutput, setRawOutput] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const executeSql = () => {
    try {
      const rows = JSON.parse(data) as Record<string, unknown>[];
      if (!Array.isArray(rows)) throw new Error(t('data_must_be_array', 'Input data must be an array of JSON objects.'));

      // Parse SQL statement: SELECT [fields] FROM data [WHERE ...] [ORDER BY ...] [LIMIT ...]
      const regex = /select\s+(.+?)\s+from\s+data(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+(.+?)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\d+))?$/i;
      const match = query.trim().match(regex);
      if (!match) {
        throw new Error(
          t('supported_sql_syntax', 'Supported syntax: SELECT col1, col2 FROM data [WHERE col = val] [ORDER BY col [ASC|DESC]] [LIMIT n]')
        );
      }

      const selectClause = match[1].trim();
      const whereClause = match[2]?.trim();
      const orderByField = match[3]?.trim();
      const orderDir = (match[4] || 'asc').toLowerCase();
      const limitVal = match[5] ? parseInt(match[5], 10) : undefined;

      // 1. Filter
      let filtered = rows.filter(row => {
        if (!whereClause) return true;

        // LIKE '%term%'
        const likeMatch = whereClause.match(/(\w+)\s+like\s+['"]%?([^%]+)%?['"]/i);
        if (likeMatch) {
          const val = String(row[likeMatch[1]] || '').toLowerCase();
          return val.includes(likeMatch[2].toLowerCase());
        }

        // Comparison operators: >=, <=, !=, <>, >, <, =
        const compMatch = whereClause.match(/(\w+)\s*(>=|<=|!=|<>|>|<|=)\s*['"]?([^'"]+)['"]?/);
        if (compMatch) {
          const key = compMatch[1];
          const op = compMatch[2];
          const targetStr = compMatch[3];
          const rowVal = row[key];

          const isNum = !isNaN(Number(targetStr)) && typeof rowVal === 'number';
          const rVal = isNum ? Number(rowVal) : String(rowVal ?? '');
          const tVal = isNum ? Number(targetStr) : targetStr;

          if (op === '=' || op === '==') return rVal === tVal;
          if (op === '!=' || op === '<>') return rVal !== tVal;
          if (op === '>') return rVal > tVal;
          if (op === '<') return rVal < tVal;
          if (op === '>=') return rVal >= tVal;
          if (op === '<=') return rVal <= tVal;
        }

        return true;
      });

      // 2. Order by
      if (orderByField) {
        filtered.sort((a, b) => {
          const va = a[orderByField];
          const vb = b[orderByField];
          if (typeof va === 'number' && typeof vb === 'number') {
            return orderDir === 'desc' ? vb - va : va - vb;
          }
          const sa = String(va ?? '');
          const sb = String(vb ?? '');
          return orderDir === 'desc' ? sb.localeCompare(sa) : sa.localeCompare(sb);
        });
      }

      // 3. Limit
      if (typeof limitVal === 'number') {
        filtered = filtered.slice(0, limitVal);
      }

      // 4. Projection
      const fields = selectClause === '*' ? null : selectClause.split(',').map(f => f.trim());
      const projected = fields
        ? filtered.map(row => Object.fromEntries(fields.filter(f => f in row).map(f => [f, row[f]])))
        : filtered;

      setRowsResult(projected);
      setRawOutput(JSON.stringify(projected, null, 2));
    } catch (e) {
      setRowsResult([]);
      setRawOutput(e instanceof Error ? e.message : t('err_sql_exec', 'Error executing query.'));
    }
  };

  useEffect(() => {
    const piped = consumePendingToolPipe('sql-playground');
    if (piped) {
      if (piped.kind === 'text' && typeof piped.text === 'string') {
        setData(piped.text);
        setQuery('SELECT * FROM data LIMIT 20');
      } else if (piped.kind === 'file' && piped.file) {
        piped.file.text().then(txt => {
          setData(txt);
          setQuery('SELECT * FROM data LIMIT 20');
        });
      }
    }
    executeSql();
  }, []);

  const exportCsv = () => {
    if (!rowsResult.length) return;
    const headers = Object.keys(rowsResult[0]);
    const csvLines = [headers.join(';')];
    rowsResult.forEach(row => {
      csvLines.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(';'));
    });
    void saveTextWithDialog('query-result.csv', csvLines.join('\n'), [{ name: 'CSV (*.csv)', extensions: ['csv'] }], t('save_csv', 'Save CSV'));
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="SQL Playground" description={t('sql_playground_desc', 'Query JSON data locally with SELECT ... FROM data syntax and table view.')} />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300 font-medium block">
              {t('json_data_source', 'Input JSON Table (data):')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 font-medium"
                onClick={() => {
                  setData(JSON.stringify(SQL_DATASETS.employees, null, 2));
                  setQuery("SELECT name, role, salary FROM data WHERE city = 'Prague' ORDER BY salary DESC");
                }}
              >
                {t('load_sample_btn', 'Load Sample')}
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                onClick={() => {
                  setData(JSON.stringify(SQL_DATASETS.employees, null, 2));
                  setQuery("SELECT name, role, salary FROM data WHERE salary > 60000 ORDER BY salary DESC");
                }}
              >
                {t('table_employees', 'Employees')}
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                onClick={() => {
                  setData(JSON.stringify(SQL_DATASETS.orders, null, 2));
                  setQuery("SELECT orderId, customer, price, status FROM data WHERE price > 2000");
                }}
              >
                {t('table_orders', 'Orders')}
              </button>
            </div>
          </div>
          <textarea className={input + ' min-h-72 font-mono text-xs'} value={data} onChange={e => setData(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              {t('sql_query', 'SQL Query:')}
            </label>
            <div className="flex gap-2">
              <input className={input + ' font-mono text-xs'} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && executeSql()} />
              <button className={button} onClick={executeSql}>
                <Play className="inline w-3.5 h-3.5 mr-1" /> {t('run_query', 'Run')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
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
                <div className="flex gap-2">
                  <button className={secondary} onClick={() => navigator.clipboard.writeText(rawOutput)}>
                    <Copy className="inline w-3.5 h-3.5 mr-1" />
                    {t('copy', 'Copy')}
                  </button>
                  <button className={secondary} onClick={exportCsv}>
                    <Download className="inline w-3.5 h-3.5 mr-1" />
                    CSV
                  </button>
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
                              {String(val ?? '')}
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
