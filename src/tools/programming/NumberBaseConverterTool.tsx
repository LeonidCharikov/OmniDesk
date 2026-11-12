import React, { useState, useMemo, useId } from 'react';
import { Binary, Check, Copy, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';

function parseBigIntRadix(raw: string, radix: number): bigint {
  const clean = raw.trim().replace(/[_\s]/g, '');
  if (!clean) throw new Error('EMPTY');
  const neg = clean.startsWith('-');
  const body = neg || clean.startsWith('+') ? clean.slice(1) : clean;
  const stripped =
    radix === 16 && body.toLowerCase().startsWith('0x')
      ? body.slice(2)
      : radix === 2 && body.toLowerCase().startsWith('0b')
        ? body.slice(2)
        : radix === 8 && body.toLowerCase().startsWith('0o')
          ? body.slice(2)
          : body;

  if (!stripped) throw new Error('EMPTY');
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  const validSet = digits.slice(0, radix);
  let acc = 0n;
  const base = BigInt(radix);
  for (const ch of stripped.toLowerCase()) {
    const idx = validSet.indexOf(ch);
    if (idx === -1) throw new Error('INVALID_DIGIT');
    acc = acc * base + BigInt(idx);
  }
  return neg ? -acc : acc;
}

function formatGrouped(str: string, groupSize: number): string {
  const neg = str.startsWith('-');
  const body = neg ? str.slice(1) : str;
  const parts: string[] = [];
  for (let i = body.length; i > 0; i -= groupSize) {
    parts.unshift(body.slice(Math.max(0, i - groupSize), i));
  }
  return (neg ? '-' : '') + parts.join(' ');
}

export const NumberBaseConverterTool: React.FC = () => {
  const { t } = useI18n();
  const [decStr, setDecStr] = useState('255');
  const [binStr, setBinStr] = useState('11111111');
  const [octStr, setOctStr] = useState('377');
  const [hexStr, setHexStr] = useState('FF');
  const [customBase, setCustomBase] = useState(36);
  const [customStr, setCustomStr] = useState('73');
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bitwise calculator state
  const [bwA, setBwA] = useState('0xCA');
  const [bwB, setBwB] = useState('0x0F');
  const [bwShift, setBwShift] = useState(2);
  const [bwBase, setBwBase] = useState<2 | 10 | 16>(16);

  const decId = useId();
  const binId = useId();
  const octId = useId();
  const hexId = useId();
  const customId = useId();

  const updateFromValue = (val: bigint, source?: 'dec' | 'bin' | 'oct' | 'hex' | 'custom', customRadix = customBase) => {
    setParseError(null);
    if (source !== 'dec') setDecStr(val.toString(10));
    if (source !== 'bin') setBinStr(val.toString(2));
    if (source !== 'oct') setOctStr(val.toString(8));
    if (source !== 'hex') setHexStr(val.toString(16).toUpperCase());
    if (source !== 'custom') setCustomStr(val.toString(customRadix).toUpperCase());
  };

  const handleFieldChange = (raw: string, radix: number, source: 'dec' | 'bin' | 'oct' | 'hex' | 'custom') => {
    if (source === 'dec') setDecStr(raw);
    if (source === 'bin') setBinStr(raw);
    if (source === 'oct') setOctStr(raw);
    if (source === 'hex') setHexStr(raw);
    if (source === 'custom') setCustomStr(raw);

    if (!raw.trim()) {
      setParseError(null);
      return;
    }
    try {
      const val = parseBigIntRadix(raw, radix);
      updateFromValue(val, source);
    } catch {
      setParseError(t('num_invalid_for_base', 'Invalid character for base {base}', { base: radix }));
    }
  };

  const currentBigInt = useMemo(() => {
    try {
      return parseBigIntRadix(decStr, 10);
    } catch {
      return null;
    }
  }, [decStr]);

  const bitViews = useMemo(() => {
    if (currentBigInt === null) return null;
    const widths = [8, 16, 32, 64] as const;
    return widths.map(w => {
      const mask = (1n << BigInt(w)) - 1n;
      const twos = currentBigInt & mask;
      const hex = twos.toString(16).toUpperCase().padStart(w / 4, '0');
      const bin = twos.toString(2).padStart(w, '0');
      // Swap byte pairs for little-endian display
      const bytes: string[] = [];
      for (let i = 0; i < hex.length; i += 2) bytes.push(hex.slice(i, i + 2));
      const leHex = bytes.slice().reverse().join(' ');
      return { w, hex, leHex, bin: formatGrouped(bin, 4) };
    });
  }, [currentBigInt]);

  const bitwiseResult = useMemo(() => {
    const parseAuto = (s: string) => {
      const trimmed = s.trim().toLowerCase();
      if (trimmed.startsWith('0x')) return parseBigIntRadix(trimmed, 16);
      if (trimmed.startsWith('0b')) return parseBigIntRadix(trimmed, 2);
      if (trimmed.startsWith('0o')) return parseBigIntRadix(trimmed, 8);
      return parseBigIntRadix(trimmed, bwBase);
    };
    try {
      const a = parseAuto(bwA);
      const b = parseAuto(bwB);
      const sh = BigInt(Math.max(0, Math.min(64, bwShift)));
      return {
        valid: true as const,
        and: a & b,
        or: a | b,
        xor: a ^ b,
        notA: ~a,
        shl: a << sh,
        shr: a >> sh,
      };
    } catch {
      return { valid: false as const };
    }
  }, [bwA, bwB, bwShift, bwBase]);

  const formatBw = (v: bigint) => {
    if (bwBase === 16) return (v < 0n ? '-0x' + (-v).toString(16).toUpperCase() : '0x' + v.toString(16).toUpperCase());
    if (bwBase === 2) return (v < 0n ? '-0b' + (-v).toString(2) : '0b' + v.toString(2));
    return v.toString(10);
  };

  const copyVal = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800);
  };

  const baseFields = [
    { id: decId, key: 'dec' as const, label: t('num_decimal', 'Decimal (Base 10)'), val: decStr, radix: 10 },
    { id: hexId, key: 'hex' as const, label: t('num_hexadecimal', 'Hexadecimal (Base 16)'), val: hexStr, radix: 16 },
    { id: binId, key: 'bin' as const, label: t('num_binary', 'Binary (Base 2)'), val: binStr, radix: 2 },
    { id: octId, key: 'oct' as const, label: t('num_octal', 'Octal (Base 8)'), val: octStr, radix: 8 },
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Binary className="w-5 h-5 text-indigo-400" />
          {t('tool_number_base_converter_title', 'Number Base & Bitwise Converter')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_number_base_converter_desc', 'Arbitrary-precision BigInt converter across Binary, Octal, Decimal, Hex, Base 2–36, two\'s complement and bitwise ops.')}
        </p>
      </div>

      {/* Radix Inputs */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {baseFields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={f.id} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {f.label}
                </label>
                <button
                  onClick={() => copyVal(f.key, f.val)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {copiedKey === f.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === f.key ? t('copied', 'Copied') : t('copy', 'Copy')}
                </button>
              </div>
              <input
                id={f.id}
                type="text"
                value={f.val}
                onChange={e => handleFieldChange(e.target.value, f.radix, f.key)}
                spellCheck={false}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-indigo-300 focus:outline-none"
              />
            </div>
          ))}
        </div>

        {/* Custom Base (2-36) */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 items-end">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              {t('num_custom_base', 'Custom Base (2–36)')}
            </span>
            <select
              value={customBase}
              onChange={e => {
                const nb = Number(e.target.value);
                setCustomBase(nb);
                if (currentBigInt !== null) setCustomStr(currentBigInt.toString(nb).toUpperCase());
              }}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            >
              {Array.from({ length: 35 }, (_, i) => i + 2).map(b => (
                <option key={b} value={b}>Base {b}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor={customId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Base {customBase}
              </label>
              <button
                onClick={() => copyVal('custom', customStr)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedKey === 'custom' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'custom' ? t('copied', 'Copied') : t('copy', 'Copy')}
              </button>
            </div>
            <input
              id={customId}
              type="text"
              value={customStr}
              onChange={e => handleFieldChange(e.target.value, customBase, 'custom')}
              spellCheck={false}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-emerald-300 focus:outline-none"
            />
          </div>
        </div>

        {parseError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Fixed-Width & Endianness View */}
      {bitViews && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('num_bit_widths', 'Two\'s Complement & Byte Order (Big / Little Endian)')}
          </h3>
          <div className="space-y-2">
            {bitViews.map(v => (
              <div key={v.w} className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 lg:grid-cols-[70px_180px_180px_1fr] gap-2 items-center text-xs font-mono">
                <span className="text-indigo-400 font-semibold">{v.w}-bit</span>
                <div>
                  <span className="text-[10px] text-slate-500 block">BE Hex</span>
                  <span className="text-slate-200">0x{v.hex}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">LE Bytes</span>
                  <span className="text-amber-300">{v.leHex}</span>
                </div>
                <div className="overflow-x-auto">
                  <span className="text-[10px] text-slate-500 block">Binary</span>
                  <span className="text-emerald-300 whitespace-nowrap">{v.bin}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bitwise Operations */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('num_bitwise_calc', 'Bitwise Calculator')}
          </h3>
          <div className="flex items-center gap-1.5">
            {([
              { b: 16 as const, l: 'HEX' },
              { b: 10 as const, l: 'DEC' },
              { b: 2 as const, l: 'BIN' },
            ]).map(opt => (
              <button
                key={opt.b}
                onClick={() => setBwBase(opt.b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono ${
                  bwBase === opt.b ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('num_operand_a', 'Operand A')}</span>
            <input
              type="text"
              value={bwA}
              onChange={e => setBwA(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('num_operand_b', 'Operand B')}</span>
            <input
              type="text"
              value={bwB}
              onChange={e => setBwB(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('num_shift_bits', 'Shift Amount (bits)')}</span>
            <input
              type="number"
              min={0}
              max={64}
              value={bwShift}
              onChange={e => setBwShift(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
        </div>

        {bitwiseResult.valid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: 'A AND B (&)', val: formatBw(bitwiseResult.and) },
              { label: 'A OR B (|)', val: formatBw(bitwiseResult.or) },
              { label: 'A XOR B (^)', val: formatBw(bitwiseResult.xor) },
              { label: 'NOT A (~A)', val: formatBw(bitwiseResult.notA) },
              { label: `A << ${bwShift}`, val: formatBw(bitwiseResult.shl) },
              { label: `A >> ${bwShift}`, val: formatBw(bitwiseResult.shr) },
            ].map(op => (
              <div key={op.label} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 block font-mono">{op.label}</span>
                  <span className="text-xs font-mono text-indigo-300 break-all">{op.val}</span>
                </div>
                <button
                  onClick={() => copyVal(op.label, op.val)}
                  className="p-1 text-slate-500 hover:text-white shrink-0"
                  title={t('copy', 'Copy')}
                >
                  {copiedKey === op.label ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-rose-400">{t('num_bw_invalid', 'Enter valid numbers (supports 0x, 0b, 0o prefixes).')}</p>
        )}
      </div>
    </div>
  );
};
