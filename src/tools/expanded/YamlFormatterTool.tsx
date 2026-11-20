import React, { useEffect, useState } from 'react';
import * as yaml from 'js-yaml';
import { Copy, AlertCircle, CheckCircle2, Download, ArrowLeftRight } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { btn, secondary, input, box, Header, innerPanel as panel, FilePicker, downloadText } from './shared';

/* ─────────────────────────────────────────────────────────────
   YAML FORMATTER & VALIDATOR (Powered by js-yaml: Format, Validate, YAML <-> JSON)
   ───────────────────────────────────────────────────────────── */
const SAMPLE_YAML = `app:
  name: OmniDesk
  version: 2.4
  production: true
server:
  host: 0.0.0.0
  port: 3000
  cors:
    - http://localhost:3000
    - https://omnidesk.app
features:
  encryption: true
  offlineFirst: true
notes: |
  Multi-line YAML blocks, lists,
  and nested objects are preserved accurately.
`;

function formatYamlError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'mark' in err) {
    const yamlErr = err as { reason?: string; message?: string; mark?: { line?: number; column?: number } };
    const line = typeof yamlErr.mark?.line === 'number' ? yamlErr.mark.line + 1 : undefined;
    const col = typeof yamlErr.mark?.column === 'number' ? yamlErr.mark.column + 1 : undefined;
    const loc = line !== undefined ? ` (line ${line}${col !== undefined ? `, col ${col}` : ''})` : '';
    return `${yamlErr.reason || yamlErr.message || fallback}${loc}`;
  }
  return err instanceof Error ? err.message : fallback;
}

export const YamlFormatterTool: React.FC = () => {
  const { t } = useI18n();
  const [value, setValue] = useState(SAMPLE_YAML);
  const [result, setResult] = useState('');
  const [resultFormat, setResultFormat] = useState<'yaml' | 'json'>('yaml');
  const [errorMsg, setErrorMsg] = useState('');
  const [validMsg, setValidMsg] = useState('');
  const [indent, setIndent] = useState<2 | 4>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const piped = consumePendingToolPipe('yaml-formatter');
    if (!piped) return;
    if (piped.kind === 'text' && typeof piped.text === 'string') {
      setValue(piped.text);
    } else if (piped.kind === 'file' && piped.file) {
      void piped.file.text().then(txt => setValue(txt));
    }
  }, []);

  const parseAllDocuments = (src: string): unknown[] => {
    const docs: unknown[] = [];
    yaml.loadAll(src, doc => {
      docs.push(doc);
    });
    return docs;
  };

  const formatYaml = () => {
    setErrorMsg('');
    setValidMsg('');
    try {
      const docs = parseAllDocuments(value);
      const formatted = docs
        .map(doc =>
          yaml.dump(doc, {
            indent,
            sortKeys,
            lineWidth: 100,
            noRefs: true,
          })
        )
        .join('---\n')
        .trim();
      setResult(formatted);
      setResultFormat('yaml');
      setValidMsg(
        docs.length > 1
          ? t('yaml_valid_multi', 'Valid YAML ({count} documents)', { count: docs.length })
          : t('yaml_valid_ok', 'Valid YAML syntax')
      );
    } catch (e) {
      setErrorMsg(formatYamlError(e, t('invalid_yaml', 'Invalid YAML.')));
    }
  };

  const convertToJson = () => {
    setErrorMsg('');
    setValidMsg('');
    try {
      const docs = parseAllDocuments(value);
      const payload = docs.length <= 1 ? docs[0] ?? null : docs;
      setResult(JSON.stringify(payload, null, indent));
      setResultFormat('json');
      setValidMsg(t('yaml_converted_json', 'Converted YAML to JSON'));
    } catch (e) {
      setErrorMsg(formatYamlError(e, t('err_json_convert', 'Conversion to JSON failed.')));
    }
  };

  const convertJsonToYaml = () => {
    setErrorMsg('');
    setValidMsg('');
    try {
      const parsed: unknown = JSON.parse(value);
      const out = yaml.dump(parsed, {
        indent,
        sortKeys,
        lineWidth: 100,
        noRefs: true,
      });
      setResult(out.trim());
      setResultFormat('yaml');
      setValidMsg(t('json_converted_yaml', 'Converted JSON to YAML'));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('err_invalid_json', 'Error: Invalid JSON.'));
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then(txt => {
      setValue(txt);
      setErrorMsg('');
      setValidMsg('');
    });
  };

  const handleCopy = () => {
    if (!result) return;
    void navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = () => {
    if (!result) return;
    const ext = resultFormat === 'json' ? 'json' : 'yaml';
    void downloadText(`formatted.${ext}`, result, ext, t('download_result', 'Save output'));
  };

  return (
    <div className="space-y-5">
      <Header
        title="YAML Formatter & Validator"
        desc={t('yaml_formatter_desc', 'Validate, format, and convert YAML (including arrays, multiline blocks, and multi-doc) ↔ JSON locally.')}
      />
      <div className={box + ' space-y-4'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btn} onClick={formatYaml}>
              {t('normalize_yaml', 'Format & Validate YAML')}
            </button>
            <button type="button" className={secondary} onClick={convertToJson}>
              <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" />
              {t('yaml_to_json', 'YAML → JSON')}
            </button>
            <button type="button" className={secondary} onClick={convertJsonToYaml}>
              {t('json_to_yaml', 'JSON → YAML')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <label className="flex items-center gap-1.5">
              <span className="text-slate-400">{t('indent_spaces', 'Indent:')}</span>
              <select
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
                value={indent}
                onChange={e => setIndent(Number(e.target.value) as 2 | 4)}
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={e => setSortKeys(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700"
              />
              <span>{t('sort_keys', 'Sort keys')}</span>
            </label>
          </div>
        </div>

        <FilePicker
          id="yaml-file-upload"
          label={t('load_yaml_json_file', 'Load .yaml / .yml / .json file')}
          accept=".yaml,.yml,.json,text/yaml,application/json,text/plain"
          onChange={handleFile}
        />

        {validMsg && !errorMsg && (
          <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{validMsg}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            className={input + ' min-h-72 font-mono text-xs leading-relaxed'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t('insert_yaml_placeholder', 'Paste YAML or JSON here…')}
          />
          <div className="space-y-2">
            {errorMsg ? (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-mono break-words">{errorMsg}</span>
              </div>
            ) : (
              <pre className={panel + ' min-h-72 max-h-96 overflow-auto font-mono text-xs text-slate-200 whitespace-pre'}>
                {result || t('result_placeholder', 'Output will appear here…')}
              </pre>
            )}
            {result && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondary} onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  {copied ? t('copied', 'Copied!') : t('copy_result', 'Copy result')}
                </button>
                <button type="button" className={secondary} onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  {t('download', 'Download')} .{resultFormat}
                </button>
                <SendToToolButton
                  sourceToolId="yaml-formatter"
                  kind="text"
                  getText={() => result}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
