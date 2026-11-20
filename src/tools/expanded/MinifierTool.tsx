import React, { useState } from 'react';
import { Copy, Download, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { beautifyCode, minifyCode, type CodeKind } from '../../utils/toolUpgrades.logic';
import { btn, secondary, input, box, Header, FilePicker, downloadText } from './shared';

/* ─────────────────────────────────────────────────────────────
   MINIFIER & BEAUTIFIER TOOL (String-safe CSS / HTML / JS / JSON)
   ───────────────────────────────────────────────────────────── */
const SAMPLES: Record<CodeKind, string> = {
  css: `/* OmniDesk Main Stylesheet */
.header-container {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: #0f172a;
  border-bottom: 1px solid #1e293b;
}

.header-title {
  font-size: 1.25rem;
  color: #ffffff;
  font-weight: 700;
}`,
  html: `<!-- Hero Card -->
<section class="card">
  <h2>OmniDesk Workstation</h2>
  <p>100% offline-first local developer tools.</p>
</section>`,
  js: `// Preserves URLs & string literals safely
function greetUser(name) {
  const endpoint = "https://omnidesk.app/api/v1"; // inline comment
  return \`Hello \${name} — \${endpoint}\`;
}`,
  json: `{
  "app": "OmniDesk",
  "offlineFirst": true,
  "themes": ["light", "dark", "oled", "nord"]
}`,
};

export const MinifierTool: React.FC = () => {
  const { t } = useI18n();
  const [kind, setKind] = useState<CodeKind>('css');
  const [indent, setIndent] = useState<2 | 4>(2);
  const [value, setValue] = useState(SAMPLES.css);
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [origSize, setOrigSize] = useState<number>(0);
  const [outSize, setOutSize] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const handleKindChange = (nextKind: CodeKind) => {
    setKind(nextKind);
    setErrorMsg('');
    if (Object.values(SAMPLES).includes(value)) {
      setValue(SAMPLES[nextKind]);
      setResult('');
      setOrigSize(0);
      setOutSize(0);
    }
  };

  const runMinify = () => {
    setErrorMsg('');
    try {
      const originalBytes = new TextEncoder().encode(value).length;
      const output = minifyCode(value, kind);
      setOrigSize(originalBytes);
      setResult(output);
      setOutSize(new TextEncoder().encode(output).length);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('err_invalid_json', 'Syntax error while processing input.'));
    }
  };

  const runBeautify = () => {
    setErrorMsg('');
    try {
      const originalBytes = new TextEncoder().encode(value).length;
      const output = beautifyCode(value, kind, indent);
      setOrigSize(originalBytes);
      setResult(output);
      setOutSize(new TextEncoder().encode(output).length);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('err_invalid_json', 'Syntax error while processing input.'));
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'css' || ext === 'html' || ext === 'js' || ext === 'json') {
      setKind(ext);
    }
    void file.text().then(txt => {
      setValue(txt);
      setErrorMsg('');
    });
  };

  const handleCopy = () => {
    if (!result) return;
    void navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const savedBytes = origSize - outSize;
  const savedPct = origSize > 0 ? Math.round((savedBytes / origSize) * 100) : 0;

  return (
    <div className="space-y-5">
      <Header
        title="CSS/HTML/JavaScript Minifier"
        desc={t('minifier_desc', 'String-safe minifier and beautifier for CSS, HTML, JavaScript, and JSON with byte-savings metrics.')}
      />
      <div className={box + ' space-y-4'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={input + ' w-36 font-semibold'}
              value={kind}
              onChange={e => handleKindChange(e.target.value as CodeKind)}
            >
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="js">JavaScript</option>
              <option value="json">JSON</option>
            </select>
            <button type="button" className={btn} onClick={runMinify}>
              {t('minify', 'Minify')}
            </button>
            <button type="button" className={secondary} onClick={runBeautify}>
              {t('beautify', 'Beautify')}
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-400 ml-1">
              <span>{t('indent_spaces', 'Indent:')}</span>
              <select
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
                value={indent}
                onChange={e => setIndent(Number(e.target.value) as 2 | 4)}
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </label>
          </div>

          {origSize > 0 && outSize > 0 && (
            <div className="text-xs font-mono text-slate-300">
              {t('minifier_savings', 'Original: {orig} B → Output: {min} B (Saved {saved} B / {percent}%)', {
                orig: origSize,
                min: outSize,
                saved: savedBytes,
                percent: savedPct,
              })}
            </div>
          )}
        </div>

        <FilePicker
          id="minifier-file-upload"
          label={t('minifier_load_file', 'Load .css / .html / .js / .json file')}
          accept=".css,.html,.htm,.js,.json,text/plain"
          onChange={handleFile}
        />

        {errorMsg && (
          <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            className={input + ' min-h-64 font-mono text-xs leading-relaxed'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t('insert_code_placeholder', 'Paste code here…')}
          />
          <div className="space-y-2">
            <textarea
              className={input + ' min-h-64 font-mono text-xs leading-relaxed bg-slate-950'}
              value={result}
              readOnly
              placeholder={t('result_placeholder', 'Output will appear here…')}
            />
            {result && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondary} onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  {copied ? t('copied', 'Copied!') : t('copy_result', 'Copy result')}
                </button>
                <button
                  type="button"
                  className={secondary}
                  onClick={() => downloadText(`output.min.${kind}`, result, kind, t('download_result', 'Save output'))}
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  {t('download', 'Download')} .{kind}
                </button>
                <SendToToolButton sourceToolId="web-minifier" kind="text" getText={() => result} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
