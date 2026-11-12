import React, { useState, useEffect, useId, useCallback } from 'react';
import { Hash, Check, Copy, Upload, ShieldCheck, AlertCircle, KeyRound, FileText, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  md5,
  sha224,
  keccakHash,
  crc32Bytes,
  adler32Bytes,
  webCryptoHash,
  computeHmac,
  bytesToHex,
  bytesToBase64,
  hexToBytes,
  base64ToBytes,
} from '../../utils/cryptoAlgorithms';

type InputEncoding = 'utf8' | 'hex' | 'base64';
type OutputEncoding = 'hex-lower' | 'hex-upper' | 'base64';

interface HashResultRow {
  id: string;
  label: string;
  group: 'checksum' | 'classic' | 'sha2' | 'sha3' | 'keccak';
  value: string;
  bits: number;
}

export const HashChecksumSuiteTool: React.FC = () => {
  const { t } = useI18n();
  const [sourceMode, setSourceMode] = useState<'text' | 'file'>('text');
  const [textInput, setTextInput] = useState<string>('OmniDesk');
  const [inputEncoding, setInputEncoding] = useState<InputEncoding>('utf8');
  const [outputEncoding, setOutputEncoding] = useState<OutputEncoding>('hex-lower');

  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; bytes: Uint8Array } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [hmacEnabled, setHmacEnabled] = useState(false);
  const [hmacKey, setHmacKey] = useState('secret-key');
  const [hmacKeyEncoding, setHmacKeyEncoding] = useState<InputEncoding>('utf8');

  const [verifyTarget, setVerifyTarget] = useState('');
  const [results, setResults] = useState<HashResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputId = useId();
  const hmacKeyId = useId();
  const verifyId = useId();

  const decodeInput = useCallback((raw: string, encoding: InputEncoding): Uint8Array => {
    if (encoding === 'utf8') return new TextEncoder().encode(raw);
    if (encoding === 'hex') return hexToBytes(raw);
    return base64ToBytes(raw);
  }, []);

  const formatDigest = useCallback((bytes: Uint8Array, format: OutputEncoding): string => {
    if (format === 'hex-lower') return bytesToHex(bytes, false);
    if (format === 'hex-upper') return bytesToHex(bytes, true);
    return bytesToBase64(bytes);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const computeAll = async () => {
      try {
        setError(null);
        let data: Uint8Array;
        if (sourceMode === 'file') {
          if (!fileInfo) {
            if (!cancelled) setResults([]);
            return;
          }
          data = fileInfo.bytes;
        } else {
          data = decodeInput(textInput, inputEncoding);
        }

        let keyBytes: Uint8Array | null = null;
        if (hmacEnabled) {
          keyBytes = decodeInput(hmacKey, hmacKeyEncoding);
        }

        const runAlgo = async (
          fn: (d: Uint8Array) => Promise<Uint8Array> | Uint8Array,
          blockSize: number
        ): Promise<Uint8Array> => {
          if (hmacEnabled && keyBytes) {
            return await computeHmac(fn, blockSize, keyBytes, data);
          }
          return await fn(data);
        };

        const rows: HashResultRow[] = [];

        if (!hmacEnabled) {
          rows.push(
            { id: 'crc32', label: 'CRC-32', group: 'checksum', bits: 32, value: formatDigest(crc32Bytes(data), outputEncoding) },
            { id: 'adler32', label: 'Adler-32', group: 'checksum', bits: 32, value: formatDigest(adler32Bytes(data), outputEncoding) }
          );
        }

        const [
          md5Buf,
          sha1Buf,
          sha224Buf,
          sha256Buf,
          sha384Buf,
          sha512Buf,
          sha3_224Buf,
          sha3_256Buf,
          sha3_384Buf,
          sha3_512Buf,
          kec_224Buf,
          kec_256Buf,
          kec_384Buf,
          kec_512Buf,
        ] = await Promise.all([
          runAlgo(md5, 64),
          runAlgo(d => webCryptoHash('SHA-1', d), 64),
          runAlgo(sha224, 64),
          runAlgo(d => webCryptoHash('SHA-256', d), 64),
          runAlgo(d => webCryptoHash('SHA-384', d), 128),
          runAlgo(d => webCryptoHash('SHA-512', d), 128),
          runAlgo(d => keccakHash(224, d, true), 144),
          runAlgo(d => keccakHash(256, d, true), 136),
          runAlgo(d => keccakHash(384, d, true), 104),
          runAlgo(d => keccakHash(512, d, true), 72),
          runAlgo(d => keccakHash(224, d, false), 144),
          runAlgo(d => keccakHash(256, d, false), 136),
          runAlgo(d => keccakHash(384, d, false), 104),
          runAlgo(d => keccakHash(512, d, false), 72),
        ]);

        const prefix = hmacEnabled ? 'HMAC-' : '';
        rows.push(
          { id: 'md5', label: `${prefix}MD5`, group: 'classic', bits: 128, value: formatDigest(md5Buf, outputEncoding) },
          { id: 'sha1', label: `${prefix}SHA-1`, group: 'classic', bits: 160, value: formatDigest(sha1Buf, outputEncoding) },
          { id: 'sha224', label: `${prefix}SHA-224`, group: 'sha2', bits: 224, value: formatDigest(sha224Buf, outputEncoding) },
          { id: 'sha256', label: `${prefix}SHA-256`, group: 'sha2', bits: 256, value: formatDigest(sha256Buf, outputEncoding) },
          { id: 'sha384', label: `${prefix}SHA-384`, group: 'sha2', bits: 384, value: formatDigest(sha384Buf, outputEncoding) },
          { id: 'sha512', label: `${prefix}SHA-512`, group: 'sha2', bits: 512, value: formatDigest(sha512Buf, outputEncoding) },
          { id: 'sha3-224', label: `${prefix}SHA3-224`, group: 'sha3', bits: 224, value: formatDigest(sha3_224Buf, outputEncoding) },
          { id: 'sha3-256', label: `${prefix}SHA3-256`, group: 'sha3', bits: 256, value: formatDigest(sha3_256Buf, outputEncoding) },
          { id: 'sha3-384', label: `${prefix}SHA3-384`, group: 'sha3', bits: 384, value: formatDigest(sha3_384Buf, outputEncoding) },
          { id: 'sha3-512', label: `${prefix}SHA3-512`, group: 'sha3', bits: 512, value: formatDigest(sha3_512Buf, outputEncoding) },
          { id: 'keccak-224', label: `${prefix}Keccak-224`, group: 'keccak', bits: 224, value: formatDigest(kec_224Buf, outputEncoding) },
          { id: 'keccak-256', label: `${prefix}Keccak-256`, group: 'keccak', bits: 256, value: formatDigest(kec_256Buf, outputEncoding) },
          { id: 'keccak-384', label: `${prefix}Keccak-384`, group: 'keccak', bits: 384, value: formatDigest(kec_384Buf, outputEncoding) },
          { id: 'keccak-512', label: `${prefix}Keccak-512`, group: 'keccak', bits: 512, value: formatDigest(kec_512Buf, outputEncoding) },
        );

        if (!cancelled) setResults(rows);
      } catch (err: unknown) {
        if (!cancelled) {
          setResults([]);
          const msg = err instanceof Error ? err.message : '';
          if (msg === 'INVALID_HEX') {
            setError(t('hash_invalid_hex', 'Invalid hexadecimal input. Use pairs of characters 0-9 and A-F.'));
          } else {
            setError(t('hash_invalid_input', 'Unable to decode input with the selected encoding.'));
          }
        }
      }
    };

    void computeAll();
    return () => {
      cancelled = true;
    };
  }, [sourceMode, textInput, inputEncoding, outputEncoding, fileInfo, hmacEnabled, hmacKey, hmacKeyEncoding, decodeInput, formatDigest, t]);

  const handleFilePick = async (file: File) => {
    const buffer = await file.arrayBuffer();
    setFileInfo({ name: file.name, size: file.size, bytes: new Uint8Array(buffer) });
  };

  const copyValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1800);
  };

  const copyAllJson = () => {
    const obj: Record<string, string> = {};
    results.forEach(r => {
      obj[r.label] = r.value;
    });
    copyValue('all', JSON.stringify(obj, null, 2));
  };

  const normalizedVerify = verifyTarget.trim();
  const matchedRows = normalizedVerify
    ? results.filter(r =>
        outputEncoding === 'base64'
          ? r.value === normalizedVerify
          : r.value.toLowerCase() === normalizedVerify.toLowerCase()
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-indigo-400" />
            {t('tool_hash_checksum_suite_title', 'Hash, HMAC & Checksum Suite')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_hash_checksum_suite_desc', 'Compute MD5, SHA-1, SHA-2, SHA-3, Keccak, CRC-32, Adler-32 and HMAC locally for text or files.')}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setSourceMode('text')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              sourceMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {t('hash_mode_text', 'Text')}
          </button>
          <button
            onClick={() => setSourceMode('file')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              sourceMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            {t('hash_mode_file', 'File')}
          </button>
        </div>
      </div>

      {/* Controls & Input */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        {sourceMode === 'text' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={inputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('input', 'Input')}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">{t('hash_input_encoding', 'Input Encoding')}:</span>
                {(['utf8', 'hex', 'base64'] as InputEncoding[]).map(enc => (
                  <button
                    key={enc}
                    onClick={() => setInputEncoding(enc)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      inputEncoding === enc
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {enc.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id={inputId}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={t('hash_text_placeholder', 'Enter text, hex bytes, or Base64 to hash...')}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-slate-200 focus:outline-none"
            />
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFilePick(f);
            }}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/40'
            }`}
          >
            <input
              type="file"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) void handleFilePick(f);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center pointer-events-none space-y-2">
              <Upload className="w-7 h-7 text-indigo-400" />
              <p className="text-sm font-medium text-slate-200">
                {fileInfo ? fileInfo.name : t('hash_drop_file', 'Drop a file here or click to select')}
              </p>
              {fileInfo && (
                <p className="text-xs font-mono text-slate-400">
                  {(fileInfo.size / 1024).toFixed(2)} KB ({fileInfo.size.toLocaleString()} B)
                </p>
              )}
            </div>
            {fileInfo && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFileInfo(null); }}
                className="relative z-20 mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                <Trash2 className="w-3 h-3" />
                {t('clear', 'Clear')}
              </button>
            )}
          </div>
        )}

        {/* Options Bar: Output Format + HMAC Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">{t('hash_output_format', 'Output Format')}:</span>
            {([
              { id: 'hex-lower', label: t('hash_fmt_hex_lower', 'hex (lower)') },
              { id: 'hex-upper', label: t('hash_fmt_hex_upper', 'HEX (UPPER)') },
              { id: 'base64', label: 'Base64' },
            ] as Array<{ id: OutputEncoding; label: string }>).map(fmt => (
              <button
                key={fmt.id}
                onClick={() => setOutputEncoding(fmt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                  outputEncoding === fmt.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={hmacEnabled}
              onChange={e => setHmacEnabled(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600"
            />
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('hash_enable_hmac', 'Enable HMAC (Keyed Hash)')}</span>
          </label>
        </div>

        {/* HMAC Secret Key Row */}
        {hmacEnabled && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={hmacKeyId} className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                {t('hash_hmac_key', 'HMAC Secret Key')}
              </label>
              <div className="flex items-center gap-1.5">
                {(['utf8', 'hex', 'base64'] as InputEncoding[]).map(enc => (
                  <button
                    key={enc}
                    onClick={() => setHmacKeyEncoding(enc)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      hmacKeyEncoding === enc ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {enc.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <input
              id={hmacKeyId}
              type="text"
              value={hmacKey}
              onChange={e => setHmacKey(e.target.value)}
              placeholder={t('hash_hmac_placeholder', 'Enter HMAC secret key...')}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {/* Verify / Compare Checksum */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor={verifyId} className="sr-only">{t('hash_verify_label', 'Compare expected checksum')}</label>
            <div className="relative flex items-center">
              <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                id={verifyId}
                type="text"
                value={verifyTarget}
                onChange={e => setVerifyTarget(e.target.value)}
                placeholder={t('hash_verify_placeholder', 'Paste expected hash/checksum to verify match...')}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {normalizedVerify && (
            <div
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 ${
                matchedRows.length > 0
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-700/60 text-rose-300'
              }`}
            >
              {matchedRows.length > 0 ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('hash_match_found', 'Match')}: {matchedRows.map(m => m.label).join(', ')}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{t('hash_no_match', 'No matching digest')}</span>
                </>
              )}
            </div>
          )}

          {results.length > 0 && (
            <button
              onClick={copyAllJson}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copiedId === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === 'all' ? t('copied', 'Copied') : t('hash_copy_all_json', 'Copy All (JSON)')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5">
          {results.map(row => {
            const isMatch = matchedRows.some(m => m.id === row.id);
            return (
              <div
                key={row.id}
                className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  isMatch
                    ? 'bg-emerald-950/30 border-emerald-600/70'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-[160px] shrink-0">
                  <span className="text-xs font-semibold font-mono text-indigo-300">{row.label}</span>
                  <span className="text-[10px] font-mono text-slate-500">{row.bits}b</span>
                </div>
                <div className="flex-1 min-w-0 font-mono text-xs text-slate-200 break-all select-all bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800/80">
                  {row.value}
                </div>
                <button
                  onClick={() => copyValue(row.id, row.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 shrink-0 self-end sm:self-center transition-colors"
                >
                  {copiedId === row.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === row.id ? t('copied', 'Copied') : t('copy', 'Copy')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
