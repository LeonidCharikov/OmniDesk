import React, { useState, useMemo } from 'react';
import { Terminal, Search, Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type RefTab = 'chmod' | 'http' | 'mime' | 'ascii';

const HTTP_CODES: Array<[number, string, string]> = [
  [200, 'OK', 'Standard response for successful HTTP requests'],
  [201, 'Created', 'Request fulfilled and new resource created'],
  [204, 'No Content', 'Request succeeded with no response body'],
  [301, 'Moved Permanently', 'Permanent redirect to a new URI'],
  [302, 'Found', 'Temporary redirect to another URI'],
  [304, 'Not Modified', 'Cached version of resource is still valid'],
  [400, 'Bad Request', 'Malformed syntax or invalid parameters'],
  [401, 'Unauthorized', 'Authentication is required or failed'],
  [403, 'Forbidden', 'Authenticated client lacks permission'],
  [404, 'Not Found', 'Requested resource could not be found'],
  [409, 'Conflict', 'Request conflicts with current resource state'],
  [422, 'Unprocessable Entity', 'Well-formed payload with semantic validation errors'],
  [429, 'Too Many Requests', 'Rate limit exceeded by client'],
  [500, 'Internal Server Error', 'Unexpected server condition prevented fulfillment'],
  [502, 'Bad Gateway', 'Invalid response received from upstream server'],
  [503, 'Service Unavailable', 'Server temporarily overloaded or in maintenance'],
  [504, 'Gateway Timeout', 'Upstream server did not respond in time'],
];

const MIME_TYPES: Array<[string, string]> = [
  ['.json', 'application/json'],
  ['.html', 'text/html'],
  ['.css', 'text/css'],
  ['.js / .mjs', 'text/javascript'],
  ['.ts', 'application/typescript'],
  ['.xml', 'application/xml'],
  ['.yaml', 'application/yaml'],
  ['.pdf', 'application/pdf'],
  ['.zip', 'application/zip'],
  ['.png', 'image/png'],
  ['.jpg / .jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.mp4', 'video/mp4'],
  ['.woff2', 'font/woff2'],
  ['.wasm', 'application/wasm'],
];

export const ChmodReferenceTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<RefTab>('chmod');
  const [bits, setBits] = useState({
    suid: false, sgid: false, sticky: false,
    ur: true, uw: true, ux: true,
    gr: true, gw: false, gx: true,
    or: true, ow: false, ox: true,
  });
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const octal = useMemo(() => {
    const sp = (bits.suid ? 4 : 0) + (bits.sgid ? 2 : 0) + (bits.sticky ? 1 : 0);
    const u = (bits.ur ? 4 : 0) + (bits.uw ? 2 : 0) + (bits.ux ? 1 : 0);
    const g = (bits.gr ? 4 : 0) + (bits.gw ? 2 : 0) + (bits.gx ? 1 : 0);
    const o = (bits.or ? 4 : 0) + (bits.ow ? 2 : 0) + (bits.ox ? 1 : 0);
    return sp > 0 ? `${sp}${u}${g}${o}` : `${u}${g}${o}`;
  }, [bits]);

  const symbolic = useMemo(() => {
    const uxChar = bits.suid ? (bits.ux ? 's' : 'S') : bits.ux ? 'x' : '-';
    const gxChar = bits.sgid ? (bits.gx ? 's' : 'S') : bits.gx ? 'x' : '-';
    const oxChar = bits.sticky ? (bits.ox ? 't' : 'T') : bits.ox ? 'x' : '-';
    return `${bits.ur ? 'r' : '-'}${bits.uw ? 'w' : '-'}${uxChar}${bits.gr ? 'r' : '-'}${bits.gw ? 'w' : '-'}${gxChar}${bits.or ? 'r' : '-'}${bits.ow ? 'w' : '-'}${oxChar}`;
  }, [bits]);

  const applyOctalString = (val: string) => {
    const clean = val.trim();
    if (!/^[0-7]{3,4}$/.test(clean)) return;
    const padded = clean.padStart(4, '0');
    const sp = Number(padded[0]);
    const u = Number(padded[1]);
    const g = Number(padded[2]);
    const o = Number(padded[3]);
    setBits({
      suid: (sp & 4) !== 0, sgid: (sp & 2) !== 0, sticky: (sp & 1) !== 0,
      ur: (u & 4) !== 0, uw: (u & 2) !== 0, ux: (u & 1) !== 0,
      gr: (g & 4) !== 0, gw: (g & 2) !== 0, gx: (g & 1) !== 0,
      or: (o & 4) !== 0, ow: (o & 2) !== 0, ox: (o & 1) !== 0,
    });
  };

  const asciiRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: Array<{ dec: number; hex: string; char: string }> = [];
    for (let i = 32; i <= 126; i++) {
      const ch = i === 32 ? 'SPACE' : String.fromCharCode(i);
      const hex = `0x${i.toString(16).toUpperCase().padStart(2, '0')}`;
      if (!q || String(i).includes(q) || hex.toLowerCase().includes(q) || ch.toLowerCase().includes(q)) {
        list.push({ dec: i, hex, char: ch });
      }
    }
    return list;
  }, [query]);

  const filteredHttp = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HTTP_CODES.filter(([c, name, d]) => !q || String(c).includes(q) || name.toLowerCase().includes(q) || d.toLowerCase().includes(q));
  }, [query]);

  const filteredMime = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MIME_TYPES.filter(([ext, mime]) => !q || ext.toLowerCase().includes(q) || mime.toLowerCase().includes(q));
  }, [query]);

  const copyCommand = () => {
    navigator.clipboard.writeText(`chmod ${octal} file`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            {t('tool_chmod_reference_title', 'Chmod Calculator & HTTP / MIME / ASCII')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_chmod_reference_desc', 'Interactive Unix chmod permission calculator plus searchable HTTP status codes, MIME types, and ASCII table.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { id: 'chmod' as const, label: 'chmod' },
            { id: 'http' as const, label: 'HTTP' },
            { id: 'mime' as const, label: 'MIME' },
            { id: 'ascii' as const, label: 'ASCII' },
          ].map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors ${
                tab === tb.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'chmod' ? (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-500 uppercase block">{t('chmod_octal', 'Octal Value')}</span>
              <input
                type="text"
                value={octal}
                onChange={e => applyOctalString(e.target.value)}
                maxLength={4}
                className="mt-1 w-full bg-transparent text-2xl font-bold font-mono text-indigo-300 focus:outline-none"
              />
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-500 uppercase block">{t('chmod_symbolic', 'Symbolic Notation')}</span>
              <span className="mt-1 block text-2xl font-bold font-mono text-emerald-300">-{symbolic}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-slate-500 uppercase block">{t('chmod_command', 'Shell Command')}</span>
                <span className="mt-1 block text-sm font-mono text-slate-200">chmod {octal} file</span>
              </div>
              <button onClick={copyCommand} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                title: t('chmod_owner', 'Owner (User)'),
                items: [
                  { key: 'ur' as const, label: t('chmod_read', 'Read (4)') },
                  { key: 'uw' as const, label: t('chmod_write', 'Write (2)') },
                  { key: 'ux' as const, label: t('chmod_exec', 'Execute (1)') },
                ],
              },
              {
                title: t('chmod_group', 'Group'),
                items: [
                  { key: 'gr' as const, label: t('chmod_read', 'Read (4)') },
                  { key: 'gw' as const, label: t('chmod_write', 'Write (2)') },
                  { key: 'gx' as const, label: t('chmod_exec', 'Execute (1)') },
                ],
              },
              {
                title: t('chmod_others', 'Others (Public)'),
                items: [
                  { key: 'or' as const, label: t('chmod_read', 'Read (4)') },
                  { key: 'ow' as const, label: t('chmod_write', 'Write (2)') },
                  { key: 'ox' as const, label: t('chmod_exec', 'Execute (1)') },
                ],
              },
              {
                title: t('chmod_special', 'Special Bits'),
                items: [
                  { key: 'suid' as const, label: 'SetUID (4)' },
                  { key: 'sgid' as const, label: 'SetGID (2)' },
                  { key: 'sticky' as const, label: 'Sticky (1)' },
                ],
              },
            ].map(grp => (
              <div key={grp.title} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-indigo-300 block">{grp.title}</span>
                {grp.items.map(it => (
                  <label key={it.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bits[it.key]}
                      onChange={e => setBits({ ...bits, [it.key]: e.target.checked })}
                      className="rounded bg-slate-900 text-indigo-600"
                    />
                    <span>{it.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {['755', '644', '700', '600', '777', '4755'].map(p => (
              <button
                key={p}
                onClick={() => applyOctalString(p)}
                className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-xs font-mono text-slate-300"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('ref_search_placeholder', 'Filter codes, MIME types, or ASCII characters...')}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {tab === 'http' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredHttp.map(([code, title, desc]) => (
                <div key={code} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold ${code < 300 ? 'text-emerald-400' : code < 400 ? 'text-sky-400' : code < 500 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {code}
                    </span>
                    <span className="font-semibold text-white">{title}</span>
                  </div>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'mime' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {filteredMime.map(([ext, mime]) => (
                <div key={ext} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-300 font-semibold">{ext}</span>
                  <span className="text-slate-300">{mime}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'ascii' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-96 overflow-y-auto">
              {asciiRows.map(r => (
                <div key={r.dec} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono">
                  <div className="text-base font-bold text-indigo-300">{r.char}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{r.dec} · {r.hex}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
