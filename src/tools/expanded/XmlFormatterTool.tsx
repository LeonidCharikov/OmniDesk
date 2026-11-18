import React, { useEffect, useState } from 'react';
import { Download, Copy, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { btn, secondary, input, box, Header, downloadText, innerPanel as panel } from './shared';

/* ─────────────────────────────────────────────────────────────
   XML FORMATTER & VALIDATOR (Pretty, Minify, XML->JSON, Error reporting)
   ───────────────────────────────────────────────────────────── */
function prettifyXml(xml: string, indentSize = 2): string {
  let formatted = '';
  let indent = 0;
  const tab = ' '.repeat(indentSize);

  // Normalize by stripping between-tag whitespace
  const clean = xml.replace(/>\s+</g, '><').trim();
  const tokens = clean.split(/(<[^>]+>)/g).filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('<') && token.endsWith('/>')) {
      formatted += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('<?') || token.startsWith('<!')) {
      formatted += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('<')) {
      formatted += tab.repeat(indent) + token + '\n';
      indent++;
    } else {
      const text = token.trim();
      if (text) {
        // inline text
        formatted = formatted.trimEnd() + text;
      }
    }
  }
  return formatted.trim();
}

function xmlToJsonHelper(node: Node): unknown {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue?.trim();
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const obj: Record<string, unknown> = {};

    // Attributes
    if (el.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        (obj['@attributes'] as Record<string, string>)[attr.name] = attr.value;
      }
    }

    // Children
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) continue;
      const childData = xmlToJsonHelper(child);
      if (child.nodeType === Node.TEXT_NODE) {
        if (Object.keys(obj).length === 0) return childData;
        obj['#text'] = childData;
      } else {
        const name = child.nodeName;
        if (!obj[name]) {
          obj[name] = childData;
        } else if (Array.isArray(obj[name])) {
          (obj[name] as unknown[]).push(childData);
        } else {
          obj[name] = [obj[name], childData];
        }
      }
    }
    return obj;
  }
  return null;
}

export const XmlFormatterTool: React.FC = () => {
  const { t } = useI18n();
  const [value, setValue] = useState(
    '<?xml version="1.0" encoding="UTF-8"?>\n<catalog>\n  <book id="bk101">\n    <author>Gambardella, Matthew</author>\n    <title>XML Developer\'s Guide</title>\n    <genre>Computer</genre>\n    <price>44.95</price>\n  </book>\n  <book id="bk102">\n    <author>Ralls, Kim</author>\n    <title>Midnight Rain</title>\n    <price>5.95</price>\n  </book>\n</catalog>'
  );
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const piped = consumePendingToolPipe('xml-formatter');
    if (!piped) return;
    if (piped.kind === 'text' && typeof piped.text === 'string') {
      setValue(piped.text);
    } else if (piped.kind === 'file' && piped.file) {
      piped.file.text().then(txt => setValue(txt));
    }
  }, []);

  const formatXml = () => {
    setErrorMsg('');
    try {
      const doc = new DOMParser().parseFromString(value, 'application/xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(parseError.textContent || t('xml_syntax_error', 'XML syntax error.'));
      }
      setResult(prettifyXml(value, 2));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('invalid_xml', 'Invalid XML.'));
    }
  };

  const minifyXml = () => {
    setErrorMsg('');
    try {
      const doc = new DOMParser().parseFromString(value, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error(t('invalid_xml', 'Invalid XML.'));
      setResult(value.replace(/>\s+</g, '><').trim());
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('err_minify', 'Minification error.'));
    }
  };

  const convertToJson = () => {
    setErrorMsg('');
    try {
      const doc = new DOMParser().parseFromString(value, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error(t('invalid_xml', 'Invalid XML.'));
      const parsed = xmlToJsonHelper(doc.documentElement);
      setResult(JSON.stringify({ [doc.documentElement.nodeName]: parsed }, null, 2));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('err_json_convert', 'Conversion to JSON failed.'));
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="XML Formatter & Validator"
        desc={t('xml_formatter_desc', 'Format, minify, validate XML or convert it to JSON locally.')}
      />
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={formatXml}>
            {t('prettify_xml', 'Format (Prettify)')}
          </button>
          <button className={secondary} onClick={minifyXml}>
            {t('minify', 'Minify')}
          </button>
          <button className={secondary} onClick={convertToJson}>
            {t('convert_xml_to_json', 'Convert XML → JSON')}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            className={input + ' min-h-64 font-mono text-xs leading-relaxed'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t('insert_xml_placeholder', 'Paste XML here…')}
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
              <div className="flex gap-2">
                <button className={secondary} onClick={() => navigator.clipboard.writeText(result)}>
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  {t('copy', 'Copy')}
                </button>
                <button
                  className={secondary}
                  onClick={() => downloadText('data.xml', result, 'xml', t('save_xml', 'Save XML'))}
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  {t('download_xml', 'Download XML')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
