import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { btn, secondary, input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   MINIFIER TOOL (CSS / HTML / JS / JSON, Beautify, Size savings)
   ───────────────────────────────────────────────────────────── */
export const MinifierTool: React.FC = () => {
  const { t } = useI18n();
  const [kind, setKind] = useState<'css' | 'html' | 'js' | 'json'>('css');
  const [value, setValue] = useState(
    '/* OmniDesk Main Stylesheet */\n.header-container {\n  display: flex;\n  justify-content: space-between;\n  padding: 16px 24px;\n  background-color: #0f172a;\n  border-bottom: 1px solid #1e293b;\n}\n\n.header-title {\n  font-size: 1.25rem;\n  color: #ffffff;\n  font-weight: 700;\n}\n'
  );
  const [result, setResult] = useState('');
  const [origSize, setOrigSize] = useState<number>(0);
  const [minSize, setMinSize] = useState<number>(0);

  const minify = () => {
    const originalBytes = new TextEncoder().encode(value).length;
    setOrigSize(originalBytes);

    let output = '';
    if (kind === 'html') {
      output = value
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
    } else if (kind === 'css') {
      output = value
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;\}/g, '}')
        .trim();
    } else if (kind === 'json') {
      try {
        output = JSON.stringify(JSON.parse(value));
      } catch {
        output = value.replace(/\s+/g, ' ').trim();
      }
    } else {
      // JavaScript
      output = value
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
        .replace(/\s+/g, ' ')
        .replace(/\s*([=+\-*\/%{}();,:<>|&!])\s*/g, '$1')
        .trim();
    }

    setResult(output);
    setMinSize(new TextEncoder().encode(output).length);
  };

  const beautify = () => {
    if (kind === 'json') {
      try {
        setResult(JSON.stringify(JSON.parse(value), null, 2));
      } catch {
        setResult(t('err_invalid_json', 'Error: Invalid JSON.'));
      }
    } else if (kind === 'css') {
      let formatted = '';
      let indent = 0;
      const clean = value.replace(/\s+/g, ' ').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const char of clean) {
        if (char === '{') {
          indent++;
          formatted += ' {\n' + '  '.repeat(indent);
        } else if (char === '}') {
          indent = Math.max(0, indent - 1);
          formatted += '\n' + '  '.repeat(indent) + '}\n\n' + '  '.repeat(indent);
        } else if (char === ';') {
          formatted += ';\n' + '  '.repeat(indent);
        } else {
          formatted += char;
        }
      }
      setResult(formatted.trim());
    } else {
      setResult(value);
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="CSS/HTML/JavaScript Minifier"
        desc={t('minifier_desc', 'Minify or beautify CSS, HTML, JS, and JSON code with byte-savings statistics.')}
      />
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              className={input + ' w-36 font-semibold'}
              value={kind}
              onChange={e => setKind(e.target.value as typeof kind)}
            >
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="js">JavaScript</option>
              <option value="json">JSON</option>
            </select>
            <button className={btn} onClick={minify}>
              {t('minify', 'Minify')}
            </button>
            <button className={secondary} onClick={beautify}>
              {t('beautify', 'Beautify')}
            </button>
          </div>

          {origSize > 0 && minSize > 0 && (
            <div className="text-xs font-mono text-slate-300">
              {t('minifier_savings', 'Original: {orig} B → Output: {min} B (Saved {saved} B / {percent}%)', {
                orig: origSize,
                min: minSize,
                saved: origSize - minSize,
                percent: Math.round((1 - minSize / origSize) * 100)
              })}
            </div>
          )}
        </div>

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
