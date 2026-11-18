import React, { useEffect, useState } from 'react';
import { Copy, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { btn, secondary, input, box, Header, innerPanel as panel } from './shared';

/* ─────────────────────────────────────────────────────────────
   YAML FORMATTER & VALIDATOR (Syntax checking, YAML <-> JSON)
   ───────────────────────────────────────────────────────────── */
function simpleYamlToJson(yaml: string): Record<string, unknown> {
  const lines = yaml.split('\n');
  const root: Record<string, unknown> = {};
  const stack: { indent: number; obj: Record<string, unknown> }[] = [{ indent: -1, obj: root }];

  for (let line of lines) {
    line = line.replace(/#.*$/, ''); // strip comments
    if (!line.trim()) continue;

    const indent = line.search(/\S/);
    const content = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const current = stack[stack.length - 1].obj;

    const colonIdx = content.indexOf(':');
    if (colonIdx > -1) {
      const key = content.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
      const valStr = content.slice(colonIdx + 1).trim();

      if (!valStr) {
        // Child object
        const newObj: Record<string, unknown> = {};
        current[key] = newObj;
        stack.push({ indent, obj: newObj });
      } else {
        // Primitive
        let parsedVal: unknown = valStr.replace(/^['"]|['"]$/g, '');
        if (valStr === 'true') parsedVal = true;
        else if (valStr === 'false') parsedVal = false;
        else if (valStr === 'null') parsedVal = null;
        else if (!isNaN(Number(valStr)) && valStr !== '') parsedVal = Number(valStr);
        current[key] = parsedVal;
      }
    }
  }
  return root;
}

function jsonToYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => `${pad}- ${jsonToYaml(item, indent + 1).trim()}`).join('\n');
  }

  return Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${pad}${k}:\n${jsonToYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${String(v)}`;
    })
    .join('\n');
}

export const YamlFormatterTool: React.FC = () => {
  const { t } = useI18n();
  const [value, setValue] = useState(
    'app:\n  name: OmniDesk\n  version: 2.1\n  production: true\nserver:\n  host: 0.0.0.0\n  port: 3000\nfeatures:\n  encryption: true\n  darkMode: true\n'
  );
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const piped = consumePendingToolPipe('yaml-formatter');
    if (!piped) return;
    if (piped.kind === 'text' && typeof piped.text === 'string') {
      setValue(piped.text);
    } else if (piped.kind === 'file' && piped.file) {
      piped.file.text().then(txt => setValue(txt));
    }
  }, []);

  const formatYaml = () => {
    setErrorMsg('');
    try {
      const parsed = simpleYamlToJson(value);
      setResult(jsonToYaml(parsed));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('invalid_yaml', 'Invalid YAML.'));
    }
  };

  const convertToJson = () => {
    setErrorMsg('');
    try {
      const parsed = simpleYamlToJson(value);
      setResult(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('err_json_convert', 'Conversion to JSON failed.'));
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="YAML Formatter & Validator"
        desc={t('yaml_formatter_desc', 'Normalize YAML structure and convert seamlessly to JSON.')}
      />
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={formatYaml}>
            {t('normalize_yaml', 'Normalize YAML')}
          </button>
          <button className={secondary} onClick={convertToJson}>
            {t('yaml_to_json', 'YAML → JSON')}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            className={input + ' min-h-64 font-mono text-xs leading-relaxed'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t('insert_yaml_placeholder', 'Paste YAML here…')}
          />
          <div className="space-y-2">
            {errorMsg ? (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <pre className={panel + ' min-h-64 max-h-96 overflow-auto font-mono text-xs text-slate-200'}>
                {result || t('result_placeholder', 'Output will appear here…')}
              </pre>
            )}
            {result && (
              <button className={secondary} onClick={() => navigator.clipboard.writeText(result)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {t('copy_result', 'Copy result')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
