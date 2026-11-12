import React, { useState, useMemo, useId } from 'react';
import { Network, Copy, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';

function ip4ToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let res = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    res = (res << 8) | n;
  }
  return res >>> 0;
}

function intToIp4(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

function intToBin4(num: number): string {
  return [
    ((num >>> 24) & 255).toString(2).padStart(8, '0'),
    ((num >>> 16) & 255).toString(2).padStart(8, '0'),
    ((num >>> 8) & 255).toString(2).padStart(8, '0'),
    (num & 255).toString(2).padStart(8, '0'),
  ].join('.');
}

function classifyIp4(ip: number): string {
  const a = (ip >>> 24) & 255;
  const b = (ip >>> 16) & 255;
  if (a === 10) return 'RFC 1918 Private (Class A)';
  if (a === 172 && b >= 16 && b <= 31) return 'RFC 1918 Private (Class B)';
  if (a === 192 && b === 168) return 'RFC 1918 Private (Class C)';
  if (a === 127) return 'Loopback (127.0.0.0/8)';
  if (a === 169 && b === 254) return 'Link-Local (APIPA)';
  if (a === 100 && b >= 64 && b <= 127) return 'CGNAT (RFC 6598)';
  if (a >= 224 && a <= 239) return 'Multicast (Class D)';
  if (a >= 240) return 'Reserved (Class E)';
  return 'Public Routable';
}

function parseIpv6(addr: string): bigint | null {
  const clean = addr.trim().toLowerCase();
  if (!clean) return null;
  const halves = clean.split('::');
  if (halves.length > 2) return null;

  const parseGroups = (part: string): number[] | null => {
    if (!part) return [];
    const tokens = part.split(':');
    const out: number[] = [];
    for (const tok of tokens) {
      if (!/^[0-9a-f]{1,4}$/.test(tok)) return null;
      out.push(parseInt(tok, 16));
    }
    return out;
  };

  const left = parseGroups(halves[0]);
  const right = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (!left || !right) return null;

  if (halves.length === 1 && left.length !== 8) return null;
  const missing = 8 - left.length - right.length;
  if (halves.length === 2 && missing < 0) return null;

  const full = halves.length === 2 ? [...left, ...Array(missing).fill(0), ...right] : left;
  if (full.length !== 8) return null;

  let val = 0n;
  for (const g of full) {
    val = (val << 16n) | BigInt(g);
  }
  return val;
}

function formatIpv6Full(val: bigint): string {
  const groups: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const g = Number((val >> BigInt(i * 16)) & 0xffffn);
    groups.push(g.toString(16).padStart(4, '0'));
  }
  return groups.join(':');
}

export const CidrCalculatorTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'ipv4' | 'ipv6'>('ipv4');
  const [ipv4Input, setIpv4Input] = useState('192.168.10.45/24');
  const [splitPrefix, setSplitPrefix] = useState(26);
  const [ipv6Input, setIpv6Input] = useState('2001:db8:85a3::8a2e:370:7334/64');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const inputId = useId();

  const ipv4Info = useMemo(() => {
    const parts = ipv4Input.trim().split('/');
    if (parts.length !== 2) return null;
    const ip = ip4ToInt(parts[0]);
    const prefix = Number(parts[1]);
    if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;

    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const wildcard = (~mask) >>> 0;
    const network = (ip & mask) >>> 0;
    const broadcast = (network | wildcard) >>> 0;
    const total = 2 ** (32 - prefix);
    const usable = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, total - 2);
    const firstHost = prefix >= 31 ? network : (network + 1) >>> 0;
    const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;

    return {
      ip,
      prefix,
      network,
      broadcast,
      mask,
      wildcard,
      firstHost,
      lastHost,
      total,
      usable,
      scope: classifyIp4(ip),
    };
  }, [ipv4Input]);

  const subnets = useMemo(() => {
    if (!ipv4Info || splitPrefix <= ipv4Info.prefix || splitPrefix > 32) return [];
    const diff = splitPrefix - ipv4Info.prefix;
    const count = Math.min(32, 2 ** diff);
    const step = 2 ** (32 - splitPrefix);
    const list: Array<{ cidr: string; range: string; hosts: number }> = [];
    for (let i = 0; i < count; i++) {
      const net = (ipv4Info.network + i * step) >>> 0;
      const bcast = (net + step - 1) >>> 0;
      const usable = splitPrefix === 32 ? 1 : splitPrefix === 31 ? 2 : Math.max(0, step - 2);
      const first = splitPrefix >= 31 ? net : (net + 1) >>> 0;
      const last = splitPrefix >= 31 ? bcast : (bcast - 1) >>> 0;
      list.push({
        cidr: `${intToIp4(net)}/${splitPrefix}`,
        range: `${intToIp4(first)} – ${intToIp4(last)}`,
        hosts: usable,
      });
    }
    return list;
  }, [ipv4Info, splitPrefix]);

  const ipv6Info = useMemo(() => {
    const parts = ipv6Input.trim().split('/');
    if (parts.length !== 2) return null;
    const ip = parseIpv6(parts[0]);
    const prefix = Number(parts[1]);
    if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 128) return null;

    const allOnes = (1n << 128n) - 1n;
    const hostBits = BigInt(128 - prefix);
    const hostMask = (1n << hostBits) - 1n;
    const netMask = allOnes ^ hostMask;
    const network = ip & netMask;
    const last = network | hostMask;
    const total = 1n << hostBits;

    return {
      prefix,
      expandedIp: formatIpv6Full(ip),
      network: formatIpv6Full(network),
      last: formatIpv6Full(last),
      totalStr: total > 1_000_000_000n ? `2^${128 - prefix}` : total.toLocaleString(),
    };
  }, [ipv6Input]);

  const copyText = (k: string, v: string) => {
    navigator.clipboard.writeText(v);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(prev => (prev === k ? null : prev)), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            {t('tool_cidr_calculator_title', 'IPv4 / IPv6 Subnet & CIDR Calculator')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_cidr_calculator_desc', 'Calculate network ranges, netmasks, usable hosts, binary views, IPv6 blocks, and split subnets.')}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {(['ipv4', 'ipv6'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors ${
                mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {mode === 'ipv4' ? (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <label htmlFor={inputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {t('cidr_ipv4_input', 'IPv4 Address / CIDR Prefix')}
            </label>
            <input
              id={inputId}
              type="text"
              value={ipv4Input}
              onChange={e => setIpv4Input(e.target.value)}
              placeholder="192.168.10.45/24"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-base font-mono text-indigo-300 focus:outline-none"
            />

            {ipv4Info ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { k: 'net', label: t('cidr_network', 'Network Address'), v: `${intToIp4(ipv4Info.network)}/${ipv4Info.prefix}` },
                    { k: 'bcast', label: t('cidr_broadcast', 'Broadcast Address'), v: intToIp4(ipv4Info.broadcast) },
                    { k: 'mask', label: t('cidr_netmask', 'Subnet Mask'), v: intToIp4(ipv4Info.mask) },
                    { k: 'wild', label: t('cidr_wildcard', 'Wildcard Mask'), v: intToIp4(ipv4Info.wildcard) },
                    { k: 'range', label: t('cidr_usable_range', 'Usable Host Range'), v: `${intToIp4(ipv4Info.firstHost)} – ${intToIp4(ipv4Info.lastHost)}` },
                    { k: 'counts', label: t('cidr_host_count', 'Usable / Total IPs'), v: `${ipv4Info.usable.toLocaleString()} / ${ipv4Info.total.toLocaleString()}` },
                  ].map(row => (
                    <div key={row.k} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 block">{row.label}</span>
                        <span className="text-xs font-mono text-slate-200 break-all">{row.v}</span>
                      </div>
                      <button
                        onClick={() => copyText(row.k, row.v)}
                        className="p-1 text-slate-500 hover:text-white shrink-0"
                        title={t('copy', 'Copy')}
                      >
                        {copiedKey === row.k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('cidr_ip_scope', 'Address Scope')}:</span>
                    <span className="text-emerald-300">{ipv4Info.scope}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('cidr_binary_ip', 'Binary IP')}:</span>
                    <span className="text-indigo-300">{intToBin4(ipv4Info.ip)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('cidr_binary_mask', 'Binary Mask')}:</span>
                    <span className="text-slate-300">{intToBin4(ipv4Info.mask)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{t('cidr_invalid_ipv4', 'Invalid IPv4 CIDR notation. Example: 192.168.1.0/24')}</span>
              </div>
            )}
          </div>

          {/* Subnet Splitter */}
          {ipv4Info && ipv4Info.prefix < 32 && (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('cidr_splitter_title', 'Subnet Splitter')}
                </h3>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <span>{t('cidr_split_to_prefix', 'Target Prefix')}:</span>
                  <select
                    value={Math.max(ipv4Info.prefix + 1, splitPrefix)}
                    onChange={e => setSplitPrefix(Number(e.target.value))}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200"
                  >
                    {Array.from({ length: 32 - ipv4Info.prefix }, (_, i) => ipv4Info.prefix + 1 + i).map(p => (
                      <option key={p} value={p}>/{p}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {subnets.map((sn, i) => (
                  <div key={sn.cidr} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-indigo-300 font-semibold">#{i + 1} · {sn.cidr}</span>
                    <span className="text-slate-300">{sn.range}</span>
                    <span className="text-emerald-400">{sn.hosts.toLocaleString()} {t('cidr_hosts_unit', 'hosts')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('cidr_ipv6_input', 'IPv6 Address / Prefix')}
          </label>
          <input
            id={inputId}
            type="text"
            value={ipv6Input}
            onChange={e => setIpv6Input(e.target.value)}
            placeholder="2001:db8::/64"
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-indigo-300 focus:outline-none"
          />

          {ipv6Info ? (
            <div className="space-y-2.5">
              {[
                { k: 'v6-exp', label: t('cidr_v6_expanded', 'Expanded Address'), v: ipv6Info.expandedIp },
                { k: 'v6-net', label: t('cidr_v6_first', 'Network / First Address'), v: `${ipv6Info.network}/${ipv6Info.prefix}` },
                { k: 'v6-last', label: t('cidr_v6_last', 'Last Address in Prefix'), v: ipv6Info.last },
                { k: 'v6-total', label: t('cidr_v6_total', 'Total Addresses'), v: ipv6Info.totalStr },
              ].map(row => (
                <div key={row.k} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block">{row.label}</span>
                    <span className="text-xs font-mono text-slate-200 break-all">{row.v}</span>
                  </div>
                  <button
                    onClick={() => copyText(row.k, row.v)}
                    className="p-1 text-slate-500 hover:text-white shrink-0"
                    title={t('copy', 'Copy')}
                  >
                    {copiedKey === row.k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('cidr_invalid_ipv6', 'Invalid IPv6 CIDR notation. Example: 2001:db8::1/64')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
