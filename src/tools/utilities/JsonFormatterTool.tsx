import React, { useState, useId } from 'react';
import { Check, Copy, Download, AlertCircle, FileCode, Minimize2, Maximize2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveTextWithDialog } from '../../services/fileSystemService';

export const JsonFormatterTool: React.FC = () => {
  const { t } = useI18n();
  const [input, setInput] = useState<string>(
    JSON.stringify(
      {
        appName: 'OmniDesk',
        version: '2.0.0',
        environment: 'desktop-tauri',
        offlineReady: true,
        modules: [
          { id: 'files', active: true, count: 4 },
          { id: 'math', active: true, count: 6 },
          { id: 'science', active: true, count: 2 },
          { id: 'finance', active: true, count: 2 },
          { id: 'utilities', active: true, count: 8 },
        ],
        storage: {
          type: 'local-fs',
          configFile: 'omnidesk-config.json',
        },
      },
      null,
      2
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const jsonInputId = useId();

  const formatJson = (spaces: number = 2) => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, spaces));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('invalid_json_syntax', 'Neplatná syntaxe JSON'));
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('invalid_json_syntax', 'Neplatná syntaxe JSON'));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = async () => {
    await saveTextWithDialog(
      'formatted_omnidesk.json',
      input,
      [
        { name: 'JSON Soubor (*.json)', extensions: ['json'] },
        { name: 'Všechny soubory (*.*)', extensions: ['*'] }
      ],
      t('save_json_title', 'Uložit JSON soubor (Průzkumník)')
    );
  };

  // Stats
  let isValid = false;
  try {
    JSON.parse(input);
    isValid = true;
  } catch {
    isValid = false;
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">
          {t('tool_json_formatter_title', 'JSON Formátovač, Validátor & Minifikátor')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('json_formatter_desc', 'Blesková lokální validace datových struktur, formátování s odsazením a komprese bez rizika úniku dat.')}
        </p>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-900/60 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => formatJson(2)}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {t('format_2_spaces', 'Formátovat (2 mezery)')}
          </button>
          <button
            onClick={() => formatJson(4)}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {t('format_4_spaces', 'Formátovat (4 mezery)')}
          </button>
          <button
            onClick={minifyJson}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            {t('minify', 'Minifikovat')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('copied', 'Zkopírováno') : t('copy', 'Kopírovat')}
          </button>
          <button
            onClick={downloadJson}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {t('download_json', 'Stáhnout .json')}
          </button>
        </div>
      </div>

      {/* Editor & Validator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <label htmlFor={jsonInputId} className="flex items-center gap-2 font-mono">
            <span>{t('editor_json', 'Editor JSON')}</span>
            <span aria-hidden="true">·</span>
            <span className={isValid ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
              {isValid ? t('valid_json', 'Validní JSON') : t('invalid_syntax', 'Chybná syntaxe')}
            </span>
          </label>
          <span className="font-mono text-slate-500 tabular-nums">
            {input.length.toLocaleString()} {t('characters_count', 'znaků')} · {(new Blob([input]).size / 1024).toFixed(2)} KB
          </span>
        </div>

        <textarea
          id={jsonInputId}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            try {
              JSON.parse(e.target.value);
              setError(null);
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : t('invalid_syntax', 'Neplatná syntaxe'));
            }
          }}
          spellCheck={false}
          className="w-full h-80 px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl font-mono text-xs text-slate-200 leading-relaxed focus:outline-none resize-y"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
