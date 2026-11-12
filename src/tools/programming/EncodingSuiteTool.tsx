import React, { useState, useMemo, useId } from 'react';
import { ArrowLeftRight, Check, Copy, AlertCircle, Upload, Link2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  BASE32_RFC4648,
  BASE32_HEX,
  BASE58_BITCOIN,
  BASE58_RIPPLE,
  BASE58_FLICKR,
  base32Encode,
  base32Decode,
  base58Encode,
  base58Decode,
  bytesToBase64,
  base64ToBytes,
} from '../../utils/cryptoAlgorithms';

type EncodingTab = 'base32' | 'base58' | 'base64' | 'html' | 'url' | 'escape';

export const EncodingSuiteTool: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<EncodingTab>('base32');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Base32 state
  const [b32Input, setB32Input] = useState('OmniDesk Online Tools');
  const [b32Output, setB32Output] = useState(() => base32Encode(new TextEncoder().encode('OmniDesk Online Tools')));
  const [b32Alphabet, setB32Alphabet] = useState<'rfc4648' | 'hex'>('rfc4648');
  const [b32Padding, setB32Padding] = useState(true);
  const [b32Error, setB32Error] = useState<string | null>(null);

  // Base58 state
  const [b58Input, setB58Input] = useState('OmniDesk 2026');
  const [b58Output, setB58Output] = useState(() => base58Encode(new TextEncoder().encode('OmniDesk 2026')));
  const [b58Alphabet, setB58Alphabet] = useState<'bitcoin' | 'ripple' | 'flickr'>('bitcoin');
  const [b58Error, setB58Error] = useState<string | null>(null);

  // Base64 state
  const [b64Input, setB64Input] = useState('OmniDesk UTF-8: Příliš žluťoučký kůň');
  const [b64Output, setB64Output] = useState(() => bytesToBase64(new TextEncoder().encode('OmniDesk UTF-8: Příliš žluťoučký kůň')));
  const [b64UrlSafe, setB64UrlSafe] = useState(false);
  const [b64Error, setB64Error] = useState<string | null>(null);

  // HTML state
  const [htmlInput, setHtmlInput] = useState('<div class="card">Hello & "welcome" to <b>OmniDesk</b>!</div>');
  const [htmlOutput, setHtmlOutput] = useState('');

  // URL state
  const [urlInput, setUrlInput] = useState('https://example.com:8080/api/v1/search?q=hello+world&lang=en&tag=dev#results');
  const [urlOutput, setUrlOutput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Escape state
  const [escInput, setEscInput] = useState('Hello 🌍 OmniDesk!');
  const [escMode, setEscMode] = useState<'js-unicode' | 'css-hex' | 'hex-escape' | 'html-hex'>('js-unicode');
  const [escOutput, setEscOutput] = useState('');

  const inputId = useId();

  const copyText = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800);
  };

  // Base32 handlers
  const handleBase32 = (encode: boolean) => {
    setB32Error(null);
    const alphabet = b32Alphabet === 'rfc4648' ? BASE32_RFC4648 : BASE32_HEX;
    try {
      if (encode) {
        setB32Output(base32Encode(new TextEncoder().encode(b32Input), alphabet, b32Padding));
      } else {
        const bytes = base32Decode(b32Input, alphabet);
        setB32Output(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      }
    } catch {
      setB32Error(t('enc_invalid_base32', 'Invalid Base32 input for the selected alphabet.'));
    }
  };

  const handleFileToBase32 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setB32Error(null);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const alphabet = b32Alphabet === 'rfc4648' ? BASE32_RFC4648 : BASE32_HEX;
    setB32Output(base32Encode(bytes, alphabet, b32Padding));
  };

  // Base58 handlers
  const getB58Alpha = () =>
    b58Alphabet === 'bitcoin' ? BASE58_BITCOIN : b58Alphabet === 'ripple' ? BASE58_RIPPLE : BASE58_FLICKR;

  const handleBase58 = (encode: boolean) => {
    setB58Error(null);
    const alpha = getB58Alpha();
    try {
      if (encode) {
        setB58Output(base58Encode(new TextEncoder().encode(b58Input), alpha));
      } else {
        const bytes = base58Decode(b58Input, alpha);
        setB58Output(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      }
    } catch {
      setB58Error(t('enc_invalid_base58', 'Invalid Base58 character for the selected alphabet.'));
    }
  };

  // Base64 handlers
  const handleBase64 = (encode: boolean) => {
    setB64Error(null);
    try {
      if (encode) {
        setB64Output(bytesToBase64(new TextEncoder().encode(b64Input), b64UrlSafe));
      } else {
        const bytes = base64ToBytes(b64Input);
        setB64Output(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      }
    } catch {
      setB64Error(t('invalid_base64_string', 'Invalid Base64 string.'));
    }
  };

  const handleFileToBase64 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setB64Error(null);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const b64 = bytesToBase64(bytes, b64UrlSafe);
    setB64Output(b64UrlSafe ? b64 : `data:${f.type || 'application/octet-stream'};base64,${b64}`);
  };

  // HTML handlers
  const encodeHtml = (mode: 'named' | 'numeric') => {
    if (mode === 'named') {
      const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      setHtmlOutput(htmlInput.replace(/[&<>"']/g, ch => map[ch]));
    } else {
      setHtmlOutput(
        Array.from(htmlInput)
          .map(ch => {
            const cp = ch.codePointAt(0) ?? 0;
            return cp > 127 || '&<>"\''.includes(ch) ? `&#${cp};` : ch;
          })
          .join('')
      );
    }
  };

  const decodeHtml = () => {
    const doc = new DOMParser().parseFromString(htmlInput, 'text/html');
    setHtmlOutput(doc.documentElement.textContent || '');
  };

  const stripHtml = () => {
    const doc = new DOMParser().parseFromString(htmlInput, 'text/html');
    setHtmlOutput((doc.body.textContent || '').replace(/\s+/g, ' ').trim());
  };

  // URL handlers & live parser
  const handleUrl = (action: 'encode-comp' | 'decode-comp' | 'encode-uri' | 'decode-uri') => {
    setUrlError(null);
    try {
      if (action === 'encode-comp') setUrlOutput(encodeURIComponent(urlInput));
      else if (action === 'decode-comp') setUrlOutput(decodeURIComponent(urlInput));
      else if (action === 'encode-uri') setUrlOutput(encodeURI(urlInput));
      else setUrlOutput(decodeURI(urlInput));
    } catch {
      setUrlError(t('url_decode_error', 'URL decode error'));
    }
  };

  const parsedUrl = useMemo(() => {
    try {
      const u = new URL(urlInput.trim());
      return {
        valid: true as const,
        protocol: u.protocol,
        username: u.username,
        hostname: u.hostname,
        port: u.port,
        pathname: u.pathname,
        hash: u.hash,
        params: Array.from(u.searchParams.entries()),
      };
    } catch {
      return { valid: false as const };
    }
  }, [urlInput]);

  // Escape sequences
  const handleEscape = (encode: boolean) => {
    if (encode) {
      const chars = Array.from(escInput);
      if (escMode === 'js-unicode') {
        setEscOutput(
          chars
            .map(ch => {
              const cp = ch.codePointAt(0) ?? 0;
              if (cp > 0xffff) return `\\u{${cp.toString(16).toUpperCase()}}`;
              if (cp >= 32 && cp <= 126) return ch;
              return `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`;
            })
            .join('')
        );
      } else if (escMode === 'css-hex') {
        setEscOutput(
          chars
            .map(ch => {
              const cp = ch.codePointAt(0) ?? 0;
              return cp >= 32 && cp <= 126 ? ch : `\\${cp.toString(16).toUpperCase()} `;
            })
            .join('')
        );
      } else if (escMode === 'hex-escape') {
        const bytes = new TextEncoder().encode(escInput);
        setEscOutput(Array.from(bytes).map(b => `\\x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(''));
      } else {
        setEscOutput(
          chars.map(ch => `&#x${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase()};`).join('')
        );
      }
    } else {
      try {
        let out = escInput
          .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
          .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
          .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
        if (/\\x[0-9a-fA-F]{2}/.test(out)) {
          const hexMatches = out.match(/\\x[0-9a-fA-F]{2}/g);
          if (hexMatches && out.replace(/\\x[0-9a-fA-F]{2}/g, '') === '') {
            const bytes = new Uint8Array(hexMatches.map(m => parseInt(m.slice(2), 16)));
            out = new TextDecoder().decode(bytes);
          } else {
            out = out.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
          }
        }
        setEscOutput(out);
      } catch {
        setEscOutput(t('enc_decode_error', 'Unable to unescape input.'));
      }
    }
  };

  const tabs: Array<{ id: EncodingTab; label: string }> = [
    { id: 'base32', label: 'Base32' },
    { id: 'base58', label: 'Base58' },
    { id: 'base64', label: 'Base64 / URL' },
    { id: 'html', label: 'HTML' },
    { id: 'url', label: t('enc_tab_url_parser', 'URL & Query') },
    { id: 'escape', label: t('enc_tab_escape', 'Unicode / Escape') },
  ];

  const renderIoPanels = (
    inVal: string,
    setInVal: (v: string) => void,
    outVal: string,
    copyKey: string
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          {t('input', 'Input')}
        </label>
        <textarea
          id={inputId}
          value={inVal}
          onChange={e => setInVal(e.target.value)}
          rows={6}
          spellCheck={false}
          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-slate-200 focus:outline-none"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('result', 'Result')}</span>
          <button
            onClick={() => copyText(copyKey, outVal)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            {copiedKey === copyKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === copyKey ? t('copied', 'Copied') : t('copy', 'Copy')}
          </button>
        </div>
        <textarea
          readOnly
          value={outVal}
          rows={6}
          className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 select-all focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
            {t('tool_encoding_suite_title', 'Base32 / Base58 / Base64 & Web Encoder')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_encoding_suite_desc', 'Encode and decode Base32, Base58, Base64URL, HTML entities, URL query parameters, and Unicode escapes.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'base32' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => handleBase32(true)} className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">
                {t('enc_encode', 'Encode')}
              </button>
              <button onClick={() => handleBase32(false)} className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
                {t('enc_decode', 'Decode')}
              </button>
              <label className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                {t('enc_file_to_b32', 'File to Base32')}
                <input type="file" onChange={handleFileToBase32} className="sr-only" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <select
                value={b32Alphabet}
                onChange={e => setB32Alphabet(e.target.value as 'rfc4648' | 'hex')}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                <option value="rfc4648">RFC 4648 (A-Z, 2-7)</option>
                <option value="hex">Base32hex (0-9, A-V)</option>
              </select>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={b32Padding} onChange={e => setB32Padding(e.target.checked)} className="rounded bg-slate-950 text-indigo-600" />
                <span>{t('enc_padding', 'Padding (=)')}</span>
              </label>
            </div>
          </div>
          {b32Error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{b32Error}</span>
            </div>
          )}
          {renderIoPanels(b32Input, setB32Input, b32Output, 'b32')}
        </div>
      )}

      {activeTab === 'base58' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => handleBase58(true)} className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">
                {t('enc_encode', 'Encode')}
              </button>
              <button onClick={() => handleBase58(false)} className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
                {t('enc_decode', 'Decode')}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">{t('enc_alphabet', 'Alphabet')}:</span>
              <select
                value={b58Alphabet}
                onChange={e => setB58Alphabet(e.target.value as 'bitcoin' | 'ripple' | 'flickr')}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                <option value="bitcoin">Bitcoin / IPFS</option>
                <option value="ripple">Ripple (XRP)</option>
                <option value="flickr">Flickr</option>
              </select>
            </div>
          </div>
          {b58Error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{b58Error}</span>
            </div>
          )}
          {renderIoPanels(b58Input, setB58Input, b58Output, 'b58')}
        </div>
      )}

      {activeTab === 'base64' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => handleBase64(true)} className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">
                {t('enc_encode', 'Encode')}
              </button>
              <button onClick={() => handleBase64(false)} className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
                {t('enc_decode', 'Decode')}
              </button>
              <label className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                {t('enc_file_to_b64', 'File to Base64 / Data URI')}
                <input type="file" onChange={handleFileToBase64} className="sr-only" />
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input type="checkbox" checked={b64UrlSafe} onChange={e => setB64UrlSafe(e.target.checked)} className="rounded bg-slate-950 text-indigo-600" />
              <span>{t('enc_url_safe_b64', 'URL-safe (-_ without =)')}</span>
            </label>
          </div>
          {b64Error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{b64Error}</span>
            </div>
          )}
          {renderIoPanels(b64Input, setB64Input, b64Output, 'b64')}
        </div>
      )}

      {activeTab === 'html' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => encodeHtml('named')} className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">
              {t('enc_html_encode_named', 'HTML Encode (Named)')}
            </button>
            <button onClick={() => encodeHtml('numeric')} className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
              {t('enc_html_encode_numeric', 'HTML Encode (Numeric)')}
            </button>
            <button onClick={decodeHtml} className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
              {t('enc_html_decode', 'HTML Decode')}
            </button>
            <button onClick={stripHtml} className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
              {t('enc_html_strip', 'Strip HTML Tags')}
            </button>
          </div>
          {renderIoPanels(htmlInput, setHtmlInput, htmlOutput, 'html')}
        </div>
      )}

      {activeTab === 'url' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => handleUrl('encode-comp')} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">
                encodeURIComponent
              </button>
              <button onClick={() => handleUrl('decode-comp')} className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
                decodeURIComponent
              </button>
              <button onClick={() => handleUrl('encode-uri')} className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
                encodeURI
              </button>
              <button onClick={() => handleUrl('decode-uri')} className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
                decodeURI
              </button>
            </div>
            {urlError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{urlError}</span>
              </div>
            )}
            {renderIoPanels(urlInput, setUrlInput, urlOutput, 'url')}
          </div>

          {/* Live URL Anatomy Parser */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              {t('enc_url_inspector', 'Live URL Breakdown')}
            </h3>
            {parsedUrl.valid ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { k: t('enc_url_protocol', 'Protocol'), v: parsedUrl.protocol },
                    { k: t('enc_url_host', 'Host'), v: parsedUrl.hostname },
                    { k: t('enc_url_port', 'Port'), v: parsedUrl.port || '—' },
                    { k: t('enc_url_path', 'Path'), v: parsedUrl.pathname },
                    { k: t('enc_url_hash', 'Hash'), v: parsedUrl.hash || '—' },
                  ].map(item => (
                    <div key={item.k} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">{item.k}</span>
                      <span className="text-xs font-mono text-indigo-300 break-all">{item.v}</span>
                    </div>
                  ))}
                </div>
                {parsedUrl.params.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-400 font-medium block">{t('enc_url_query_params', 'Query Parameters')}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsedUrl.params.map(([pk, pv], i) => (
                        <div key={`${pk}-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                          <span className="text-amber-300">{pk}</span>
                          <span className="text-emerald-300 break-all ml-2">{pv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{t('enc_url_invalid_hint', 'Enter a full URL (with https://) to inspect its components and query parameters.')}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'escape' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => handleEscape(true)} className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">
                {t('enc_escape', 'Escape')}
              </button>
              <button onClick={() => handleEscape(false)} className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg">
                {t('enc_unescape', 'Unescape')}
              </button>
            </div>
            <select
              value={escMode}
              onChange={e => setEscMode(e.target.value as typeof escMode)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
            >
              <option value="js-unicode">JS / JSON (\uXXXX)</option>
              <option value="hex-escape">UTF-8 Hex (\xXX)</option>
              <option value="css-hex">CSS (\XXXX)</option>
              <option value="html-hex">HTML Hex (&#xXX;)</option>
            </select>
          </div>
          {renderIoPanels(escInput, setEscInput, escOutput, 'esc')}
        </div>
      )}
    </div>
  );
};
