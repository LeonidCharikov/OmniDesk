/* ─────────────────────────────────────────────────────────────
   Pure, unit-testable logic for upgraded OmniDesk tools:
   1. Investment & Compound Interest Calculator
   2. Geographic & GPS Converter
   3. String-safe CSS/HTML/JS/JSON Minifier & Beautifier
   4. JWT Decoder & Web Crypto HMAC-SHA Verifier/Signer
   5. Regex Analysis, Highlighting, Capture Groups & Replace
   ───────────────────────────────────────────────────────────── */

// ── 1. INVESTMENT & COMPOUND INTEREST ─────────────────────────
export interface InvestmentInput {
  initial: number;
  periodicAddition: number;
  annualRatePct: number;
  compoundingPerYear: number;
  years: number;
  annualInflationPct: number;
  contributeAtStart: boolean;
}

export interface InvestmentYearRow {
  year: number;
  totalContributed: number;
  yearlyInterest: number;
  totalInterest: number;
  nominalBalance: number;
  realBalance: number;
}

export interface InvestmentSummary {
  finalNominal: number;
  finalReal: number;
  totalContributed: number;
  totalInterest: number;
  effectiveAnnualYieldPct: number;
  schedule: InvestmentYearRow[];
}

export function computeInvestmentSchedule(input: InvestmentInput): InvestmentSummary {
  const initial = Math.max(0, Number.isFinite(input.initial) ? input.initial : 0);
  const addition = Math.max(0, Number.isFinite(input.periodicAddition) ? input.periodicAddition : 0);
  const rate = Number.isFinite(input.annualRatePct) ? input.annualRatePct : 0;
  const freq = Math.max(1, Math.min(365, Math.round(input.compoundingPerYear || 12)));
  const years = Math.max(1, Math.min(80, Math.round(input.years || 1)));
  const inflation = Math.max(0, Number.isFinite(input.annualInflationPct) ? input.annualInflationPct : 0);

  const periodRate = rate / 100 / freq;
  const effectiveAnnualYieldPct = (Math.pow(1 + periodRate, freq) - 1) * 100;

  let balance = initial;
  let totalContributed = initial;
  const schedule: InvestmentYearRow[] = [];

  for (let year = 1; year <= years; year++) {
    const startBalance = balance;
    const startContributed = totalContributed;

    for (let p = 0; p < freq; p++) {
      if (input.contributeAtStart) {
        balance += addition;
        totalContributed += addition;
        balance *= 1 + periodRate;
      } else {
        balance *= 1 + periodRate;
        balance += addition;
        totalContributed += addition;
      }
    }

    const yearlyAdded = totalContributed - startContributed;
    const yearlyInterest = balance - startBalance - yearlyAdded;
    const totalInterest = balance - totalContributed;
    const realBalance = inflation > 0 ? balance / Math.pow(1 + inflation / 100, year) : balance;

    schedule.push({
      year,
      totalContributed,
      yearlyInterest,
      totalInterest,
      nominalBalance: balance,
      realBalance,
    });
  }

  const last = schedule[schedule.length - 1];
  return {
    finalNominal: last ? last.nominalBalance : initial,
    finalReal: last ? last.realBalance : initial,
    totalContributed: last ? last.totalContributed : initial,
    totalInterest: last ? last.totalInterest : 0,
    effectiveAnnualYieldPct,
    schedule,
  };
}

// ── 2. GEOGRAPHIC & GPS CONVERTER ─────────────────────────────
export interface DmsParts {
  deg: number;
  min: number;
  sec: number;
  dir: 'N' | 'S' | 'E' | 'W';
}

export function ddToDms(value: number, axis: 'lat' | 'lon'): DmsParts {
  const safe = Number.isFinite(value) ? value : 0;
  const clamped = axis === 'lat' ? Math.max(-90, Math.min(90, safe)) : Math.max(-180, Math.min(180, safe));
  const abs = Math.abs(clamped);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Number(((minFloat - min) * 60).toFixed(2));
  const dir: DmsParts['dir'] = axis === 'lat' ? (clamped >= 0 ? 'N' : 'S') : clamped >= 0 ? 'E' : 'W';
  return { deg, min, sec, dir };
}

export function formatDms(parts: DmsParts): string {
  return `${parts.deg}° ${parts.min}' ${parts.sec.toFixed(2)}" ${parts.dir}`;
}

export function dmsToDd(parts: DmsParts): number {
  const sign = parts.dir === 'S' || parts.dir === 'W' ? -1 : 1;
  const val = Math.abs(parts.deg) + Math.abs(parts.min) / 60 + Math.abs(parts.sec) / 3600;
  return Number((sign * val).toFixed(6));
}

export function parseDmsPair(input: string): { lat: number; lon: number } | null {
  const regex = /(\d+(?:\.\d+)?)\s*[°d]\s*(\d+(?:\.\d+)?)?\s*['′m]?\s*(\d+(?:\.\d+)?)?\s*["″s]?\s*([NSEW])/gi;
  const matches = [...input.matchAll(regex)];
  if (matches.length < 2) return null;

  let lat: number | null = null;
  let lon: number | null = null;

  for (const m of matches) {
    const deg = Number(m[1] || 0);
    const min = Number(m[2] || 0);
    const sec = Number(m[3] || 0);
    const dir = m[4].toUpperCase() as DmsParts['dir'];
    const dd = dmsToDd({ deg, min, sec, dir });
    if (dir === 'N' || dir === 'S') lat = dd;
    if (dir === 'E' || dir === 'W') lon = dd;
  }

  if (lat === null || lon === null) return null;
  return { lat, lon };
}

export function computeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function computeInitialBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function bearingToCompass(bearing: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((bearing % 360) / 22.5)) % 16;
  return dirs[idx];
}

export function computeMidpoint(lat1: number, lon1: number, lat2: number, lon2: number): { lat: number; lon: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const lam1 = toRad(lon1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);

  const bx = Math.cos(phi2) * Math.cos(dLon);
  const by = Math.cos(phi2) * Math.sin(dLon);
  const phi3 = Math.atan2(
    Math.sin(phi1) + Math.sin(phi2),
    Math.sqrt((Math.cos(phi1) + bx) ** 2 + by ** 2)
  );
  const lam3 = lam1 + Math.atan2(by, Math.cos(phi1) + bx);
  return {
    lat: Number(toDeg(phi3).toFixed(6)),
    lon: Number((((toDeg(lam3) + 540) % 360) - 180).toFixed(6)),
  };
}

// ── 3. STRING-SAFE MINIFIER & BEAUTIFIER ──────────────────────
export type CodeKind = 'css' | 'html' | 'js' | 'json';

function stripJsCommentsPreserveStrings(code: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < code.length) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

function collapseOutsideStrings(code: string, tightChars: Set<string>): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;

  while (i < code.length) {
    const ch = code[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < code.length) {
        out += code[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    if (/\s/.test(ch)) {
      while (i < code.length && /\s/.test(code[i])) i++;
      const prev = out[out.length - 1] || '';
      const next = code[i] || '';
      if (!prev || !next) continue;
      if (tightChars.has(prev) || tightChars.has(next)) continue;
      out += ' ';
      continue;
    }

    out += ch;
    i++;
  }
  return out.trim();
}

export function minifyCode(value: string, kind: CodeKind): string {
  if (kind === 'json') {
    return JSON.stringify(JSON.parse(value));
  }
  if (kind === 'css') {
    const noComments = stripJsCommentsPreserveStrings(value);
    const compact = collapseOutsideStrings(noComments, new Set(['{', '}', ':', ';', ',', '>', '+', '~']));
    return compact.replace(/;\}/g, '}');
  }
  if (kind === 'html') {
    return value
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  // JS (preserves string literals, template literals, URLs inside quotes, and identifier spacing)
  const noComments = stripJsCommentsPreserveStrings(value);
  return collapseOutsideStrings(
    noComments,
    new Set(['{', '}', '(', ')', '[', ']', ';', ',', ':', '=', '<', '>', '!', '&', '|', '?', '*', '%'])
  );
}

export function beautifyCode(value: string, kind: CodeKind, indentSize = 2): string {
  const unit = ' '.repeat(indentSize);

  if (kind === 'json') {
    return JSON.stringify(JSON.parse(value), null, indentSize);
  }

  if (kind === 'css') {
    const minified = minifyCode(value, 'css');
    let out = '';
    let level = 0;
    let quote: string | null = null;
    for (let i = 0; i < minified.length; i++) {
      const ch = minified[i];
      if (quote) {
        out += ch;
        if (ch === '\\' && i + 1 < minified.length) {
          out += minified[++i];
        } else if (ch === quote) {
          quote = null;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        out += ch;
      } else if (ch === '{') {
        level++;
        out += ' {\n' + unit.repeat(level);
      } else if (ch === '}') {
        level = Math.max(0, level - 1);
        out = out.trimEnd() + '\n' + unit.repeat(level) + '}\n' + (level === 0 ? '\n' : unit.repeat(level));
      } else if (ch === ';') {
        out += ';\n' + unit.repeat(level);
      } else if (ch === ':' && level > 0) {
        out += ': ';
      } else {
        out += ch;
      }
    }
    return out.trim();
  }

  if (kind === 'html') {
    const voidTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
    ]);
    const tokens = value.replace(/>\s+</g, '><').trim().split(/(<[^>]+>)/g).filter(Boolean);
    let level = 0;
    const lines: string[] = [];

    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      if (/^<\/\w+/.test(trimmed)) {
        level = Math.max(0, level - 1);
        lines.push(unit.repeat(level) + trimmed);
      } else if (/^<(\w+)([^>]*)>$/.test(trimmed)) {
        const tagName = (trimmed.match(/^<(\w+)/)?.[1] || '').toLowerCase();
        const selfClosing = trimmed.endsWith('/>') || voidTags.has(tagName);
        lines.push(unit.repeat(level) + trimmed);
        if (!selfClosing) level++;
      } else {
        lines.push(unit.repeat(level) + trimmed);
      }
    }
    return lines.join('\n');
  }

  // JS beautifier (string-safe brace/semicolon indentation)
  const clean = value.replace(/\r\n/g, '\n').trim();
  let out = '';
  let level = 0;
  let quote: string | null = null;
  let inParens = 0;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < clean.length) {
        out += clean[++i];
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '(') inParens++;
    if (ch === ')') inParens = Math.max(0, inParens - 1);

    if (ch === '{') {
      level++;
      out = out.trimEnd() + ' {\n' + unit.repeat(level);
    } else if (ch === '}') {
      level = Math.max(0, level - 1);
      out = out.trimEnd() + '\n' + unit.repeat(level) + '}';
      if (clean[i + 1] && ![';', ',', ')', '\n'].includes(clean[i + 1])) {
        out += '\n' + unit.repeat(level);
      }
    } else if (ch === ';' && inParens === 0) {
      out += ';\n' + unit.repeat(level);
    } else if (ch === '\n') {
      if (!out.endsWith('\n' + unit.repeat(level))) {
        out = out.trimEnd() + '\n' + unit.repeat(level);
      }
    } else if (/\s/.test(ch)) {
      if (out.length > 0 && !out.endsWith(' ') && !out.endsWith('\n')) {
        out += ' ';
      }
    } else {
      out += ch;
    }
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// ── 4. JWT DECODER & WEB CRYPTO HMAC SIGNER/VERIFIER ──────────
export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  signingInput: string;
  alg: string;
  expDate?: Date;
  iatDate?: Date;
  nbfDate?: Date;
  isExpired?: boolean;
  isNotYetValid?: boolean;
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlEncodeString(text: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

export function decodeJwtToken(rawToken: string): DecodedJwt {
  const cleaned = rawToken.trim().replace(/^Bearer\s+/i, '');
  const parts = cleaned.split('.');
  if (parts.length !== 3) {
    throw new Error('A JWT token must have exactly 3 dot-separated parts (header.payload.signature).');
  }
  const header = JSON.parse(base64UrlDecode(parts[0])) as Record<string, unknown>;
  const payload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
  const nowMs = Date.now();

  const expDate = typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : undefined;
  const iatDate = typeof payload.iat === 'number' ? new Date(payload.iat * 1000) : undefined;
  const nbfDate = typeof payload.nbf === 'number' ? new Date(payload.nbf * 1000) : undefined;

  return {
    header,
    payload,
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`,
    alg: typeof header.alg === 'string' ? header.alg : 'unknown',
    expDate,
    iatDate,
    nbfDate,
    isExpired: expDate ? nowMs > expDate.getTime() : undefined,
    isNotYetValid: nbfDate ? nowMs < nbfDate.getTime() : undefined,
  };
}

function hmacHashName(alg: string): 'SHA-256' | 'SHA-384' | 'SHA-512' | null {
  if (alg === 'HS256') return 'SHA-256';
  if (alg === 'HS384') return 'SHA-384';
  if (alg === 'HS512') return 'SHA-512';
  return null;
}

export async function signJwtHmac(
  headerObj: Record<string, unknown>,
  payloadObj: Record<string, unknown>,
  secret: string,
  alg: 'HS256' | 'HS384' | 'HS512' = 'HS256'
): Promise<string> {
  const hash = hmacHashName(alg);
  if (!hash) throw new Error(`Unsupported HMAC algorithm: ${alg}`);
  const headerPart = base64UrlEncodeString(JSON.stringify({ ...headerObj, alg, typ: headerObj.typ || 'JWT' }));
  const payloadPart = base64UrlEncodeString(JSON.stringify(payloadObj));
  const signingInput = `${headerPart}.${payloadPart}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigPart = base64UrlEncodeBytes(new Uint8Array(sigBuf));
  return `${signingInput}.${sigPart}`;
}

export async function verifyJwtHmac(rawToken: string, secret: string): Promise<{ valid: boolean; alg: string; supported: boolean }> {
  const decoded = decodeJwtToken(rawToken);
  const hash = hmacHashName(decoded.alg);
  if (!hash) {
    return { valid: false, alg: decoded.alg, supported: false };
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(decoded.signingInput));
  const expectedSig = base64UrlEncodeBytes(new Uint8Array(sigBuf));
  return { valid: expectedSig === decoded.signature, alg: decoded.alg, supported: true };
}

// ── 5. REGEX ANALYSIS, HIGHLIGHTING & REPLACE ─────────────────
export interface RegexMatchDetail {
  text: string;
  index: number;
  end: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

export interface RegexSegment {
  text: string;
  isMatch: boolean;
  matchIndex?: number;
}

export interface RegexAnalysisResult {
  matches: RegexMatchDetail[];
  segments: RegexSegment[];
  replacedText: string;
  error: string | null;
}

export function escapeRegexLiteral(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function runRegexAnalysis(
  pattern: string,
  flags: string,
  testText: string,
  replacement?: string
): RegexAnalysisResult {
  if (!pattern) {
    return {
      matches: [],
      segments: [{ text: testText, isMatch: false }],
      replacedText: testText,
      error: null,
    };
  }

  try {
    const cleanFlags = [...new Set(flags.replace(/[^dgimsuvy]/g, '').split(''))].join('');
    const reg = new RegExp(pattern, cleanFlags);
    const matches: RegexMatchDetail[] = [];
    const MAX_MATCHES = 500;

    if (!cleanFlags.includes('g')) {
      const m = reg.exec(testText);
      if (m) {
        matches.push({
          text: m[0],
          index: m.index,
          end: m.index + m[0].length,
          groups: m.slice(1).map(g => g ?? ''),
          namedGroups: m.groups ? { ...m.groups } : {},
        });
      }
    } else {
      let m: RegExpExecArray | null;
      while ((m = reg.exec(testText)) !== null && matches.length < MAX_MATCHES) {
        matches.push({
          text: m[0],
          index: m.index,
          end: m.index + m[0].length,
          groups: m.slice(1).map(g => g ?? ''),
          namedGroups: m.groups ? { ...m.groups } : {},
        });
        if (m[0].length === 0) reg.lastIndex++;
      }
    }

    const segments: RegexSegment[] = [];
    let cursor = 0;
    matches.forEach((m, idx) => {
      if (m.index > cursor) {
        segments.push({ text: testText.slice(cursor, m.index), isMatch: false });
      }
      if (m.end > m.index) {
        segments.push({ text: testText.slice(m.index, m.end), isMatch: true, matchIndex: idx });
        cursor = m.end;
      }
    });
    if (cursor < testText.length) {
      segments.push({ text: testText.slice(cursor), isMatch: false });
    }

    const replacedText =
      replacement !== undefined ? testText.replace(new RegExp(pattern, cleanFlags), replacement) : testText;

    return { matches, segments, replacedText, error: null };
  } catch (e) {
    return {
      matches: [],
      segments: [{ text: testText, isMatch: false }],
      replacedText: testText,
      error: e instanceof Error ? e.message : 'Regular expression syntax error.',
    };
  }
}
