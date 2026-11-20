import React, { useMemo, useState } from 'react';
import { Database, Plus, Trash2, Copy, Download, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { formatRowsAsCsv } from '../../utils/sqlPlaygroundEngine';
import {
  formatMockAsSqlInserts,
  generateMockDataset,
  type MockFieldKind,
  type MockFieldSpec,
} from '../../utils/newTools.logic';

const FIELD_KINDS: Array<{ kind: MockFieldKind; label: string }> = [
  { kind: 'uuid', label: 'UUID v4' },
  { kind: 'fullName', label: 'Full Name' },
  { kind: 'email', label: 'Email' },
  { kind: 'phone', label: 'Phone' },
  { kind: 'company', label: 'Company' },
  { kind: 'city', label: 'City' },
  { kind: 'country', label: 'Country' },
  { kind: 'date', label: 'ISO Date' },
  { kind: 'price', label: 'Price (decimal)' },
  { kind: 'integer', label: 'Integer' },
  { kind: 'boolean', label: 'Boolean' },
  { kind: 'status', label: 'Status' },
];

export const MockDataGeneratorTool: React.FC = () => {
  const { t } = useI18n();
  const [fields, setFields] = useState<MockFieldSpec[]>([
    { id: '1', name: 'id', kind: 'uuid' },
    { id: '2', name: 'full_name', kind: 'fullName' },
    { id: '3', name: 'email', kind: 'email' },
    { id: '4', name: 'city', kind: 'city' },
    { id: '5', name: 'amount', kind: 'price' },
    { id: '6', name: 'status', kind: 'status' },
  ]);
  const [rowCount, setRowCount] = useState(15);
  const [seed, setSeed] = useState(2026);
  const [format, setFormat] = useState<'json' | 'csv' | 'sql'>('json');
  const [tableName, setTableName] = useState('users');
  const [copied, setCopied] = useState(false);

  const dataset = useMemo(() => generateMockDataset(fields, rowCount, seed), [fields, rowCount, seed]);

  const output = useMemo(() => {
    if (format === 'json') return JSON.stringify(dataset, null, 2);
    if (format === 'csv') return formatRowsAsCsv(dataset);
    return formatMockAsSqlInserts(tableName, dataset);
  }, [dataset, format, tableName]);

  const addField = () => {
    setFields(prev => [...prev, { id: String(Date.now()), name: `field_${prev.length + 1}`, kind: 'company' }]);
  };

  const updateField = (id: string, patch: Partial<MockFieldSpec>) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) return;
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const copyOut = () => {
    void navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const downloadOut = () => {
    void saveTextWithDialog(
      `${tableName || 'mock-data'}.${format}`,
      output,
      [{ name: format.toUpperCase(), extensions: [format] }],
      t('download_result', 'Save output')
    );
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          {t('tool_mock_data_title', 'Mock Data & Test Dataset Generator')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_mock_data_desc', 'Generate deterministic offline test datasets with custom schemas and export to JSON, CSV, or SQL INSERT statements.')}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('mock_schema_fields', 'Schema Columns')} ({fields.length})
            </span>
            <button type="button" onClick={addField} className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> {t('mock_add_field', 'Add Field')}
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {fields.map(f => (
              <div key={f.id} className="flex items-center gap-2">
                <input
                  value={f.name}
                  onChange={e => updateField(f.id, { name: e.target.value })}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
                />
                <select
                  value={f.kind}
                  onChange={e => updateField(f.id, { kind: e.target.value as MockFieldKind })}
                  className="w-36 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  {FIELD_KINDS.map(k => (
                    <option key={k.kind} value={k.kind}>{k.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeField(f.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400"
                  title={t('remove', 'Remove')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs text-slate-400">
            <label>
              {t('mock_rows_label', 'Rows (1–1000)')}
              <input
                type="number"
                min={1}
                max={1000}
                value={rowCount}
                onChange={e => setRowCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
              />
            </label>
            <label>
              {t('mock_seed_label', 'Seed')}
              <div className="flex gap-1 mt-1">
                <input
                  type="number"
                  value={seed}
                  onChange={e => setSeed(Number(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                  className="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title={t('mock_randomize_seed', 'New random seed')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </label>
            {format === 'sql' && (
              <label>
                {t('mock_table_name', 'SQL Table')}
                <input
                  value={tableName}
                  onChange={e => setTableName(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                />
              </label>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              {(['json', 'csv', 'sql'] as const).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`px-2.5 py-1 rounded uppercase font-semibold ${
                    format === fmt ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyOut} className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium">
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {copied ? t('copied', 'Copied!') : t('copy', 'Copy')}
              </button>
              <button type="button" onClick={downloadOut} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs">
                <Download className="w-3.5 h-3.5 inline mr-1" /> .{format}
              </button>
              <SendToToolButton sourceToolId="mock-data-generator" kind="text" getText={() => output} />
            </div>
          </div>

          <textarea
            readOnly
            value={output}
            className="w-full min-h-80 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};
