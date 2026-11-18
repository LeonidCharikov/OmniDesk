import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   BINARY & HEX CONVERTER (Two-way synchronized: Text <-> HEX <-> BIN <-> DEC <-> BASE64)
   ───────────────────────────────────────────────────────────── */
export const BinaryHexTool: React.FC = () => {
  const { t } = useI18n();
  const [text, setText] = useState('OmniDesk');
  const [hex, setHex] = useState('4f 6d 6e 69 44 65 73 6b');
  const [binary, setBinary] = useState('01001111 01101101 01101110 01101001 01000100 01100101 01110011 01101011');
  const [decimal, setDecimal] = useState('79 109 110 105 68 101 115 107');
  const [base64, setBase64] = useState('T21uaURlc2s=');

  const updateFromText = (val: string) => {
    setText(val);
    const bytes = new TextEncoder().encode(val);
    setHex(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    setBinary(Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' '));
    setDecimal(Array.from(bytes).map(b => b.toString(10)).join(' '));
    try {
      setBase64(btoa(String.fromCharCode(...bytes)));
    } catch {
      setBase64('');
    }
  };

  const updateFromHex = (hexStr: string) => {
    setHex(hexStr);
    try {
      const clean = hexStr.replace(/[^0-9a-fA-F]/g, '');
      const bytes: number[] = [];
      for (let i = 0; i < clean.length; i += 2) {
        bytes.push(parseInt(clean.slice(i, i + 2), 16));
      }
      const u8 = new Uint8Array(bytes);
      const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(u8);
      setText(decodedText);
      setBinary(Array.from(u8).map(b => b.toString(2).padStart(8, '0')).join(' '));
      setDecimal(Array.from(u8).map(b => b.toString(10)).join(' '));
      setBase64(btoa(String.fromCharCode(...u8)));
    } catch {
      // ignore parsing error
    }
  };

  const updateFromBinary = (binStr: string) => {
    setBinary(binStr);
    try {
      const tokens = binStr.trim().split(/\s+/).filter(Boolean);
      const bytes: number[] = [];
      for (const tok of tokens) {
        bytes.push(parseInt(tok, 2));
      }
      const u8 = new Uint8Array(bytes);
      const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(u8);
      setText(decodedText);
      setHex(Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join(' '));
      setDecimal(Array.from(u8).map(b => b.toString(10)).join(' '));
      setBase64(btoa(String.fromCharCode(...u8)));
    } catch {
      // ignore
    }
  };

  const updateFromBase64 = (b64Str: string) => {
    setBase64(b64Str);
    try {
      const raw = atob(b64Str.trim());
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      setText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      setHex(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
      setBinary(Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' '));
      setDecimal(Array.from(bytes).map(b => b.toString(10)).join(' '));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="Binary & Hex Converter"
        desc={t('binary_hex_desc', 'Bidirectional converter between UTF-8 text, HEX, binary, decimal bytes, and Base64.')}
      />
      <div className={box + ' space-y-4'}>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">{t('bin_hex_section_text', '1. Text (UTF-8):')}</span>
            <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(text)}>
              <Copy className="w-3 h-3 inline mr-1" /> {t('copy', 'Copy')}
            </button>
          </div>
          <textarea className={input + ' min-h-20 font-mono text-xs'} value={text} onChange={e => updateFromText(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">{t('bin_hex_section_hex', '2. Hexadecimal (HEX):')}</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(hex)}>
                <Copy className="w-3 h-3 inline mr-1" /> {t('copy', 'Copy')}
              </button>
            </div>
            <textarea className={input + ' min-h-20 font-mono text-xs text-amber-300'} value={hex} onChange={e => updateFromHex(e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">{t('bin_hex_section_bin', '3. Binary (BIN):')}</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(binary)}>
                <Copy className="w-3 h-3 inline mr-1" /> {t('copy', 'Copy')}
              </button>
            </div>
            <textarea className={input + ' min-h-20 font-mono text-xs text-emerald-300'} value={binary} onChange={e => updateFromBinary(e.target.value)} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">{t('bin_hex_section_ascii', '4. Decimal Byte Values (0-255):')}</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(decimal)}>
                <Copy className="w-3 h-3 inline mr-1" /> {t('copy', 'Copy')}
              </button>
            </div>
            <input className={input + ' font-mono text-xs text-sky-300'} value={decimal} readOnly />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">{t('bin_hex_section_base64', '5. Base64 Encoding:')}</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(base64)}>
                <Copy className="w-3 h-3 inline mr-1" /> {t('copy', 'Copy')}
              </button>
            </div>
            <input className={input + ' font-mono text-xs text-purple-300'} value={base64} onChange={e => updateFromBase64(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
};
