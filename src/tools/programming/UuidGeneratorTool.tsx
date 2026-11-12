import React, { useState, useMemo, useId } from 'react';
import { KeyRound, RefreshCw, Copy, Check, Download, Search, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { md5, webCryptoHash } from '../../utils/cryptoAlgorithms';
import { saveTextWithDialog } from '../../services/fileSystemService';

type IdKind = 'v4' | 'v7' | 'v1' | 'v6' | 'v3' | 'v5' | 'ulid' | 'nanoid';

const NAMESPACES: Record<string, string> = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
};

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GREGORIAN_OFFSET_100NS = 122192928000000000n;

function bytesToUuid(b: Uint8Array): string {
  const hex = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function uuidToBytes(uuid: string): Uint8Array | null {
  const clean = uuid.trim().replace(/^urn:uuid:/i, '').replace(/[{} -]/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(clean)) return null;
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function generateUuidV1(seqOffset: number): string {
  const nowMs = BigInt(Date.now());
  const ts = nowMs * 10000n + GREGORIAN_OFFSET_100NS + BigInt(seqOffset);
  const timeLow = Number(ts & 0xffffffffn);
  const timeMid = Number((ts >> 32n) & 0xffffn);
  const timeHi = Number((ts >> 48n) & 0x0fffn) | 0x1000;

  const rand = crypto.getRandomValues(new Uint8Array(8));
  const clockSeqHi = (rand[0] & 0x3f) | 0x80;
  const clockSeqLow = rand[1];
  const node = rand.slice(2, 8);
  node[0] |= 0x01; // multicast bit per RFC 9562

  const b = new Uint8Array(16);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, timeLow, false);
  dv.setUint16(4, timeMid, false);
  dv.setUint16(6, timeHi, false);
  b[8] = clockSeqHi;
  b[9] = clockSeqLow;
  b.set(node, 10);
  return bytesToUuid(b);
}

function generateUuidV6(seqOffset: number): string {
  const nowMs = BigInt(Date.now());
  const ts = nowMs * 10000n + GREGORIAN_OFFSET_100NS + BigInt(seqOffset);
  const timeHigh = Number((ts >> 28n) & 0xffffffffn);
  const timeMid = Number((ts >> 12n) & 0xffffn);
  const timeLow = Number(ts & 0x0fffn) | 0x6000;

  const rand = crypto.getRandomValues(new Uint8Array(8));
  const b = new Uint8Array(16);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, timeHigh, false);
  dv.setUint16(4, timeMid, false);
  dv.setUint16(6, timeLow, false);
  b[8] = (rand[0] & 0x3f) | 0x80;
  b[9] = rand[1];
  b.set(rand.slice(2, 8), 10);
  return bytesToUuid(b);
}

function generateUuidV4(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return bytesToUuid(b);
}

function generateUuidV7(): string {
  const ms = BigInt(Date.now());
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[0] = Number((ms >> 40n) & 0xffn);
  b[1] = Number((ms >> 32n) & 0xffn);
  b[2] = Number((ms >> 24n) & 0xffn);
  b[3] = Number((ms >> 16n) & 0xffn);
  b[4] = Number((ms >> 8n) & 0xffn);
  b[5] = Number(ms & 0xffn);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  return bytesToUuid(b);
}

async function generateUuidV3orV5(version: 3 | 5, namespaceUuid: string, name: string): Promise<string | null> {
  const nsBytes = uuidToBytes(namespaceUuid);
  if (!nsBytes) return null;
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(nsBytes.length + nameBytes.length);
  input.set(nsBytes);
  input.set(nameBytes, nsBytes.length);

  const hash = version === 3 ? md5(input) : (await webCryptoHash('SHA-1', input)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | (version === 3 ? 0x30 : 0x50);
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return bytesToUuid(hash);
}

function generateUlid(): string {
  let time = Date.now();
  let timeChars = '';
  for (let i = 0; i < 10; i++) {
    timeChars = CROCKFORD[time % 32] + timeChars;
    time = Math.floor(time / 32);
  }
  const rand = crypto.getRandomValues(new Uint8Array(16));
  let randChars = '';
  for (let i = 0; i < 16; i++) {
    randChars += CROCKFORD[rand[i] & 31];
  }
  return timeChars + randChars;
}

function generateNanoId(size: number, alphabet: string): string {
  if (!alphabet.length) return '';
  const chars: string[] = [];
  const mask = (2 << Math.floor(Math.log2(Math.max(1, alphabet.length - 1)))) - 1;
  const step = Math.ceil((1.6 * mask * size) / alphabet.length);
  while (chars.length < size) {
    const bytes = crypto.getRandomValues(new Uint8Array(step));
    for (let i = 0; i < bytes.length && chars.length < size; i++) {
      const idx = bytes[i] & mask;
      if (idx < alphabet.length) chars.push(alphabet[idx]);
    }
  }
  return chars.join('');
}

export const UuidGeneratorTool: React.FC = () => {
  const { t } = useI18n();
  const [kind, setKind] = useState<IdKind>('v4');
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [braces, setBraces] = useState(false);
  const [urn, setUrn] = useState(false);

  // v3 / v5 options
  const [nsPreset, setNsPreset] = useState<'DNS' | 'URL' | 'OID' | 'X500' | 'custom'>('DNS');
  const [customNs, setCustomNs] = useState(NAMESPACES.DNS);
  const [nsName, setNsName] = useState('omnidesk.app');

  // NanoID options
  const [nanoLen, setNanoLen] = useState(21);
  const [nanoAlphabet, setNanoAlphabet] = useState('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-');

  const [generated, setGenerated] = useState<string[]>(() => Array.from({ length: 5 }, () => generateUuidV4()));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Inspector
  const [inspectInput, setInspectInput] = useState(() => generateUuidV7());

  const countId = useId();
  const inspectId = useId();

  const formatUuid = (raw: string): string => {
    if (kind === 'ulid' || kind === 'nanoid') {
      return uppercase && kind === 'ulid' ? raw.toUpperCase() : raw;
    }
    let val = hyphens ? raw : raw.replace(/-/g, '');
    val = uppercase ? val.toUpperCase() : val.toLowerCase();
    if (urn) return `urn:uuid:${val}`;
    if (braces) return `{${val}}`;
    return val;
  };

  const handleGenerate = async () => {
    setGenError(null);
    const safeCount = Math.min(100, Math.max(1, count));
    const list: string[] = [];

    if (kind === 'v3' || kind === 'v5') {
      const ns = nsPreset === 'custom' ? customNs : NAMESPACES[nsPreset];
      const res = await generateUuidV3orV5(kind === 'v3' ? 3 : 5, ns, nsName);
      if (!res) {
        setGenError(t('uuid_invalid_namespace', 'Invalid Namespace UUID. Must be a valid 32-hex UUID.'));
        return;
      }
      list.push(res);
    } else {
      for (let i = 0; i < safeCount; i++) {
        if (kind === 'v4') list.push(generateUuidV4());
        else if (kind === 'v7') list.push(generateUuidV7());
        else if (kind === 'v1') list.push(generateUuidV1(i));
        else if (kind === 'v6') list.push(generateUuidV6(i));
        else if (kind === 'ulid') list.push(generateUlid());
        else list.push(generateNanoId(Math.min(128, Math.max(4, nanoLen)), nanoAlphabet));
      }
    }
    setGenerated(list);
  };

  const formattedList = useMemo(() => generated.map(formatUuid), [generated, uppercase, hyphens, braces, urn, kind]);

  const inspection = useMemo(() => {
    const raw = inspectInput.trim();
    if (!raw) return null;

    // Check ULID (26 Crockford chars)
    if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(raw)) {
      const upper = raw.toUpperCase();
      let ms = 0;
      for (let i = 0; i < 10; i++) {
        ms = ms * 32 + CROCKFORD.indexOf(upper[i]);
      }
      return {
        type: 'ULID',
        version: 'Crockford Base32 (128-bit)',
        variant: 'Lexicographically sortable',
        timestamp: new Date(ms).toISOString(),
        valid: true,
      };
    }

    const b = uuidToBytes(raw);
    if (!b) return { valid: false };

    const version = (b[6] >> 4) & 0x0f;
    const varByte = b[8];
    const variant =
      (varByte & 0x80) === 0
        ? 'NCS (0xx)'
        : (varByte & 0xc0) === 0x80
          ? 'RFC 4122 / 9562 (10x)'
          : (varByte & 0xe0) === 0xc0
            ? 'Microsoft COM (110)'
            : 'Future (111)';

    let timestamp: string | null = null;
    if (version === 7) {
      const ms =
        BigInt(b[0]) * 0x10000000000n +
        BigInt(b[1]) * 0x100000000n +
        BigInt(b[2]) * 0x1000000n +
        BigInt(b[3]) * 0x10000n +
        BigInt(b[4]) * 0x100n +
        BigInt(b[5]);
      timestamp = new Date(Number(ms)).toISOString();
    } else if (version === 1) {
      const dv = new DataView(b.buffer);
      const low = BigInt(dv.getUint32(0, false));
      const mid = BigInt(dv.getUint16(4, false));
      const hi = BigInt(dv.getUint16(6, false) & 0x0fff);
      const ts100ns = (hi << 48n) | (mid << 32n) | low;
      const unixMs = Number((ts100ns - GREGORIAN_OFFSET_100NS) / 10000n);
      if (Number.isFinite(unixMs)) timestamp = new Date(unixMs).toISOString();
    } else if (version === 6) {
      const dv = new DataView(b.buffer);
      const hi = BigInt(dv.getUint32(0, false));
      const mid = BigInt(dv.getUint16(4, false));
      const low = BigInt(dv.getUint16(6, false) & 0x0fff);
      const ts100ns = (hi << 28n) | (mid << 12n) | low;
      const unixMs = Number((ts100ns - GREGORIAN_OFFSET_100NS) / 10000n);
      if (Number.isFinite(unixMs)) timestamp = new Date(unixMs).toISOString();
    }

    return {
      valid: true,
      type: 'UUID',
      version: `v${version}`,
      variant,
      timestamp,
    };
  }, [inspectInput]);

  const copyText = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(key);
    setTimeout(() => setCopiedId(prev => (prev === key ? null : prev)), 1800);
  };

  const downloadAll = async () => {
    await saveTextWithDialog(
      `uuids-${kind}.txt`,
      formattedList.join('\n'),
      [{ name: `${t('text_file_label', 'Text File')} (*.txt)`, extensions: ['txt'] }],
      t('uuid_save_title', 'Save generated IDs')
    );
  };

  const kinds: Array<{ id: IdKind; label: string }> = [
    { id: 'v4', label: 'UUID v4' },
    { id: 'v7', label: 'UUID v7' },
    { id: 'v1', label: 'UUID v1' },
    { id: 'v6', label: 'UUID v6' },
    { id: 'v3', label: 'UUID v3 (MD5)' },
    { id: 'v5', label: 'UUID v5 (SHA-1)' },
    { id: 'ulid', label: 'ULID' },
    { id: 'nanoid', label: 'NanoID' },
  ];

  const isUuid = kind !== 'ulid' && kind !== 'nanoid';

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-400" />
            {t('tool_uuid_generator_title', 'UUID (v1–v7), ULID & NanoID Generator')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_uuid_generator_desc', 'Generate UUID v1, v3, v4, v5, v6, v7, ULID and NanoID in bulk, and inspect embedded timestamps.')}
          </p>
        </div>

        <button
          onClick={() => void handleGenerate()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('uuid_generate', 'Generate')}
        </button>
      </div>

      {/* Mode Selector & Options */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {kinds.map(k => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                kind === k.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {(kind === 'v3' || kind === 'v5') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t('uuid_namespace_preset', 'Namespace Preset')}</span>
              <select
                value={nsPreset}
                onChange={e => setNsPreset(e.target.value as typeof nsPreset)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                <option value="DNS">DNS (6ba7b810-...)</option>
                <option value="URL">URL (6ba7b811-...)</option>
                <option value="OID">OID (6ba7b812-...)</option>
                <option value="X500">X.500 (6ba7b814-...)</option>
                <option value="custom">{t('uuid_custom_ns', 'Custom UUID')}</option>
              </select>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t('uuid_namespace_uuid', 'Namespace UUID')}</span>
              <input
                type="text"
                disabled={nsPreset !== 'custom'}
                value={nsPreset === 'custom' ? customNs : NAMESPACES[nsPreset]}
                onChange={e => setCustomNs(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 disabled:opacity-60"
              />
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t('uuid_name_input', 'Name')}</span>
              <input
                type="text"
                value={nsName}
                onChange={e => setNsName(e.target.value)}
                placeholder="example.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
              />
            </div>
          </div>
        )}

        {kind === 'nanoid' && (
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t('uuid_length', 'Length')}</span>
              <input
                type="number"
                min={4}
                max={128}
                value={nanoLen}
                onChange={e => setNanoLen(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
              />
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t('enc_alphabet', 'Alphabet')}</span>
              <input
                type="text"
                value={nanoAlphabet}
                onChange={e => setNanoAlphabet(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            {kind !== 'v3' && kind !== 'v5' && (
              <label htmlFor={countId} className="flex items-center gap-2">
                <span className="text-slate-400">{t('uuid_count', 'Quantity')}:</span>
                <input
                  id={countId}
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200"
                />
              </label>
            )}

            {kind !== 'nanoid' && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={uppercase} onChange={e => setUppercase(e.target.checked)} className="rounded bg-slate-950 text-indigo-600" />
                <span>{t('uuid_uppercase', 'UPPERCASE')}</span>
              </label>
            )}

            {isUuid && (
              <>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={hyphens} onChange={e => setHyphens(e.target.checked)} className="rounded bg-slate-950 text-indigo-600" />
                  <span>{t('uuid_hyphens', 'Hyphens (-)')}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={braces} onChange={e => setBraces(e.target.checked)} className="rounded bg-slate-950 text-indigo-600" />
                  <span>{'{Braces}'}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={urn} onChange={e => setUrn(e.target.checked)} className="rounded bg-slate-950 text-indigo-600" />
                  <span>urn:uuid:</span>
                </label>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyText('all', formattedList.join('\n'))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
            >
              {copiedId === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === 'all' ? t('copied', 'Copied') : t('uuid_copy_all', 'Copy All')}
            </button>
            <button
              onClick={() => void downloadAll()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {t('download', 'Download')}
            </button>
          </div>
        </div>

        {genError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{genError}</span>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {formattedList.map((item, idx) => (
            <div key={`${item}-${idx}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-mono text-xs sm:text-sm text-indigo-300 select-all break-all">{item}</span>
              <button
                onClick={() => copyText(`row-${idx}`, item)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title={t('copy', 'Copy')}
              >
                {copiedId === `row-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* UUID / ULID Inspector */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <label htmlFor={inspectId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          {t('uuid_inspector_title', 'UUID / ULID Inspector & Timestamp Decoder')}
        </label>
        <input
          id={inspectId}
          type="text"
          value={inspectInput}
          onChange={e => setInspectInput(e.target.value)}
          placeholder={t('uuid_inspector_placeholder', 'Paste any UUID (v1–v7) or ULID to decode version, variant, and timestamp...')}
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        {inspection && (
          inspection.valid ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{t('uuid_type', 'Format')}</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">{inspection.type}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{t('uuid_version', 'Version')}</span>
                <span className="text-xs font-mono text-indigo-300">{inspection.version}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{t('uuid_variant', 'Variant')}</span>
                <span className="text-xs font-mono text-slate-200">{inspection.variant}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{t('uuid_embedded_time', 'Embedded Timestamp')}</span>
                <span className="text-xs font-mono text-amber-300">{inspection.timestamp || t('not_available', 'N/A')}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-400">{t('uuid_invalid_inspect', 'Invalid UUID or ULID format.')}</p>
          )
        )}
      </div>
    </div>
  );
};
