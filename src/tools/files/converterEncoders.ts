import { zipSync, unzipSync, gzipSync, gunzipSync } from 'fflate';

export interface ArchiveEntry {
  name: string;
  data: Uint8Array;
  size: number;
}

// ---------------------------------------------------------------------------
// 1. AUDIO PCM ENCODERS (WAV 16-bit & AIFF 16-bit)
// ---------------------------------------------------------------------------

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function resampleChannelData(
  channels: Float32Array[],
  sourceRate: number,
  targetRate: number,
  targetChannels: 1 | 2
): Float32Array[] {
  // Channel mixdown / duplication first
  let mixed: Float32Array[];
  if (targetChannels === 1) {
    if (channels.length === 1) {
      mixed = [channels[0]];
    } else {
      const len = channels[0].length;
      const mono = new Float32Array(len);
      const count = channels.length;
      for (let i = 0; i < len; i++) {
        let sum = 0;
        for (let c = 0; c < count; c++) sum += channels[c][i];
        mono[i] = sum / count;
      }
      mixed = [mono];
    }
  } else {
    if (channels.length >= 2) {
      mixed = [channels[0], channels[1]];
    } else {
      mixed = [channels[0], channels[0]];
    }
  }

  if (sourceRate === targetRate) return mixed;

  const ratio = sourceRate / targetRate;
  return mixed.map(ch => {
    const newLength = Math.max(1, Math.round(ch.length / ratio));
    const out = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcPos = i * ratio;
      const idx0 = Math.floor(srcPos);
      const idx1 = Math.min(ch.length - 1, idx0 + 1);
      const frac = srcPos - idx0;
      out[i] = ch[idx0] * (1 - frac) + ch[idx1] * frac;
    }
    return out;
  });
}

export function encodeWavPcm16(
  channels: Float32Array[],
  sampleRate: number
): Uint8Array {
  const numChannels = channels.length;
  const numFrames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}

// IEEE 754 80-bit extended float encoder for AIFF sample rate header
function writeExtended80(view: DataView, offset: number, value: number): void {
  if (value === 0) {
    for (let i = 0; i < 10; i++) view.setUint8(offset + i, 0);
    return;
  }
  const sign = value < 0 ? 1 : 0;
  let absVal = Math.abs(value);
  const exp = Math.floor(Math.log2(absVal));
  const biasedExp = exp + 16383;
  absVal /= Math.pow(2, exp);
  const hi = Math.floor(absVal * 0x80000000);
  const lo = Math.floor((absVal * 0x80000000 - hi) * 0x100000000);

  view.setUint16(offset, (sign << 15) | (biasedExp & 0x7fff), false);
  view.setUint32(offset + 2, hi >>> 0, false);
  view.setUint32(offset + 6, lo >>> 0, false);
}

export function encodeAiffPcm16(
  channels: Float32Array[],
  sampleRate: number
): Uint8Array {
  const numChannels = channels.length;
  const numFrames = channels[0]?.length ?? 0;
  const soundDataSize = numFrames * numChannels * 2;
  const ssndChunkSize = 8 + soundDataSize;
  const totalSize = 12 + 26 + 8 + ssndChunkSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // FORM header
  writeAscii(view, 0, 'FORM');
  view.setUint32(4, totalSize - 8, false);
  writeAscii(view, 8, 'AIFF');

  // COMM chunk (26 bytes total: 8 header + 18 data)
  writeAscii(view, 12, 'COMM');
  view.setUint32(16, 18, false);
  view.setUint16(20, numChannels, false);
  view.setUint32(22, numFrames, false);
  view.setUint16(26, 16, false);
  writeExtended80(view, 28, sampleRate);

  // SSND chunk
  writeAscii(view, 38, 'SSND');
  view.setUint32(42, ssndChunkSize, false);
  view.setUint32(46, 0, false); // offset
  view.setUint32(50, 0, false); // blockSize

  let offset = 54;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, false);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// 2. IMAGE BINARY ENCODERS (BMP 24-bit & Windows ICO wrapping PNG)
// ---------------------------------------------------------------------------

export function encodeBmp24(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowStride * height;
  const fileSize = 54 + pixelArraySize;
  const out = new Uint8Array(fileSize);
  const view = new DataView(out.buffer);

  // BMP File Header (14 bytes)
  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);

  // DIB Header BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive = bottom-up
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // 24-bit RGB
  view.setUint32(30, 0, true); // BI_RGB uncompressed
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // 72 DPI
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y;
    const dstRowOffset = 54 + y * rowStride;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow * width + x) * 4;
      const dstIdx = dstRowOffset + x * 3;
      const a = rgba[srcIdx + 3] / 255;
      const r = Math.round(rgba[srcIdx] * a + 255 * (1 - a));
      const g = Math.round(rgba[srcIdx + 1] * a + 255 * (1 - a));
      const b = Math.round(rgba[srcIdx + 2] * a + 255 * (1 - a));
      out[dstIdx] = b;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = r;
    }
  }
  return out;
}

export function encodeIcoFromPng(
  pngBytes: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const headerSize = 6 + 16;
  const out = new Uint8Array(headerSize + pngBytes.length);
  const view = new DataView(out.buffer);

  // ICONDIR (6 bytes)
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type = 1 (ICO)
  view.setUint16(4, 1, true); // count = 1 image

  // ICONDIRENTRY (16 bytes)
  out[6] = width >= 256 ? 0 : width;
  out[7] = height >= 256 ? 0 : height;
  out[8] = 0; // palette count
  out[9] = 0; // reserved
  view.setUint16(10, 1, true); // color planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, pngBytes.length, true); // image data size
  view.setUint32(18, headerSize, true); // offset to PNG payload

  out.set(pngBytes, headerSize);
  return out;
}

// ---------------------------------------------------------------------------
// 3. DOCUMENT CONVERSION HELPERS (RTF, HTML <-> Markdown, Minimal DOCX)
// ---------------------------------------------------------------------------

export function stripRtfToText(rtf: string): string {
  let out = rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\line/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\~|\\_/g, ' ')
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\u(-?\d+)\??/g, (_, code: string) => {
      const n = parseInt(code, 10);
      return String.fromCharCode(n < 0 ? n + 65536 : n);
    });

  // Remove header groups like fonttbl, colortbl, stylesheet, info (replace with space so preceding control words don't fuse with text)
  out = out.replace(
    /\{\\\*?(?:fonttbl|colortbl|stylesheet|info|pict|header|footer|generator)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
    ' '
  );
  // Remove remaining control words & braces
  out = out
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function markdownToHtml(md: string, title = 'Document'): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const htmlLines: string[] = [];
  let inList = false;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const renderInline = (line: string): string => {
    let s = escapeHtml(line);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
    return s;
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        htmlLines.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      const level = headingMatch[1].length;
      htmlLines.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      htmlLines.push(`<li>${renderInline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
      continue;
    }

    if (inList) {
      htmlLines.push('</ul>');
      inList = false;
    }
    htmlLines.push(`<p>${renderInline(trimmed)}</p>`);
  }

  if (inList) htmlLines.push('</ul>');
  if (inCodeBlock) {
    htmlLines.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 780px; margin: 2rem auto; padding: 0 1.25rem; line-height: 1.65; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5rem; }
    code { background: #f1f5f9; padding: 0.15rem 0.35rem; border-radius: 4px; font-family: monospace; }
    pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: transparent; color: inherit; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
${htmlLines.join('\n')}
</body>
</html>`;
}

export function htmlToMarkdown(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n#### $1\n\n')
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return cleaned
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function htmlToPlainText(html: string): string {
  return htmlToMarkdown(html)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .trim();
}

function escapeXmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a valid, standards-compliant minimal OOXML (.docx) archive locally using fflate.
 */
export function buildMinimalDocx(plainText: string): Uint8Array {
  const enc = new TextEncoder();
  const paragraphs = plainText.replace(/\r\n/g, '\n').split('\n');

  const bodyXml = paragraphs
    .map(line => {
      const trimmed = line.trim();
      const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
      if (headingMatch) {
        const sizeHalfPt = headingMatch[1].length === 1 ? 32 : headingMatch[1].length === 2 ? 26 : 22;
        return `<w:p><w:r><w:rPr><w:b/><w:sz w:val="${sizeHalfPt}"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(headingMatch[2])}</w:t></w:r></w:p>`;
      }
      return `<w:p><w:r><w:t xml:space="preserve">${escapeXmlText(line)}</w:t></w:r></w:p>`;
    })
    .join('');

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  return zipSync({
    '[Content_Types].xml': enc.encode(contentTypes),
    '_rels/.rels': enc.encode(rootRels),
    'word/document.xml': enc.encode(documentXml),
  });
}

// ---------------------------------------------------------------------------
// 4. SPREADSHEET & STRUCTURED DATA HELPERS (CSV, TSV, XML, Markdown/HTML Table)
// ---------------------------------------------------------------------------

export function parseDelimitedText(
  text: string,
  delimiter = ','
): Record<string, string | number | boolean>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  const input = text.replace(/\r\n/g, '\n');

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentVal += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if (ch === '\n') {
      currentRow.push(currentVal.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += ch;
    }
  }
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h, idx) => h || `column_${idx + 1}`);
  return rows.slice(1).map(cols => {
    const obj: Record<string, string | number | boolean> = {};
    headers.forEach((header, idx) => {
      const raw = cols[idx] ?? '';
      if (raw === 'true') obj[header] = true;
      else if (raw === 'false') obj[header] = false;
      else if (raw !== '' && !Number.isNaN(Number(raw))) obj[header] = Number(raw);
      else obj[header] = raw;
    });
    return obj;
  });
}

export function serializeDelimitedRows(
  rows: Record<string, unknown>[],
  delimiter = ','
): string {
  if (rows.length === 0) return '';
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const escapeCell = (val: unknown): string => {
    const str = val === undefined || val === null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes('"') || str.includes(delimiter) || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    keys.map(escapeCell).join(delimiter),
    ...rows.map(row => keys.map(k => escapeCell(row[k])).join(delimiter)),
  ];
  return lines.join('\n');
}

export function rowsToMarkdownTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const esc = (v: unknown): string =>
    (v === undefined || v === null ? '' : String(v)).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const headerLine = `| ${keys.map(esc).join(' | ')} |`;
  const sepLine = `| ${keys.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map(row => `| ${keys.map(k => esc(row[k])).join(' | ')} |`);
  return [headerLine, sepLine, ...bodyLines].join('\n');
}

export function rowsToHtmlTable(rows: Record<string, unknown>[], title = 'Data Table'): string {
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const thead = `<tr>${keys.map(k => `<th>${escapeHtml(k)}</th>`).join('')}</tr>`;
  const tbody = rows
    .map(
      row =>
        `<tr>${keys
          .map(k => `<td>${escapeHtml(row[k] === undefined || row[k] === null ? '' : String(row[k]))}</td>`)
          .join('')}</tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 1.5rem; color: #0f172a; }
    table { border-collapse: collapse; width: 100%; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;
}

export function rowsToXml(rows: Record<string, unknown>[], rootName = 'records', itemName = 'record'): string {
  const sanitizeTag = (key: string): string => {
    const cleaned = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `field_${cleaned}`;
  };
  const items = rows
    .map(row => {
      const fields = Object.entries(row)
        .map(([k, v]) => {
          const tag = sanitizeTag(k);
          const text = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
          return `    <${tag}>${escapeXmlText(text)}</${tag}>`;
        })
        .join('\n');
      return `  <${itemName}>\n${fields}\n  </${itemName}>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${items}\n</${rootName}>`;
}

export function parseSimpleXmlToRows(xmlText: string): Record<string, string | number | boolean>[] {
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  if (parser) {
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const root = doc.documentElement;
    if (root && !doc.querySelector('parsererror')) {
      const children = Array.from(root.children);
      if (children.length > 0) {
        return children.map(node => {
          const obj: Record<string, string | number | boolean> = {};
          const subElements = Array.from(node.children);
          if (subElements.length > 0) {
            for (const sub of subElements) {
              const raw = (sub.textContent ?? '').trim();
              if (raw === 'true') obj[sub.tagName] = true;
              else if (raw === 'false') obj[sub.tagName] = false;
              else if (raw !== '' && !Number.isNaN(Number(raw))) obj[sub.tagName] = Number(raw);
              else obj[sub.tagName] = raw;
            }
          } else {
            obj[node.tagName] = (node.textContent ?? '').trim();
          }
          return obj;
        });
      }
    }
  }

  // Fallback lightweight regex parser for Node/test environments without full XML DOM
  const rows: Record<string, string | number | boolean>[] = [];
  const blockMatches = xmlText.match(/<([a-zA-Z0-9_-]+)>[\s\S]*?<\/\1>/g) ?? [];
  for (const block of blockMatches) {
    const inner = block.replace(/^<[^>]+>|<\/[^>]+>$/g, '');
    const fieldRegex = /<([a-zA-Z0-9_-]+)>([^<]*)<\/\1>/g;
    const obj: Record<string, string | number | boolean> = {};
    let m: RegExpExecArray | null;
    while ((m = fieldRegex.exec(inner)) !== null) {
      const raw = m[2].trim();
      if (raw === 'true') obj[m[1]] = true;
      else if (raw === 'false') obj[m[1]] = false;
      else if (raw !== '' && !Number.isNaN(Number(raw))) obj[m[1]] = Number(raw);
      else obj[m[1]] = raw;
    }
    if (Object.keys(obj).length > 0) rows.push(obj);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 5. ARCHIVE CODECS (POSIX USTAR TAR + fflate ZIP & GZIP)
// ---------------------------------------------------------------------------

function writeOctal(buf: Uint8Array, offset: number, length: number, value: number): void {
  const oct = Math.max(0, Math.floor(value)).toString(8).padStart(length - 1, '0');
  for (let i = 0; i < length - 1; i++) {
    buf[offset + i] = oct.charCodeAt(i);
  }
  buf[offset + length - 1] = 0;
}

function writeTarString(buf: Uint8Array, offset: number, length: number, str: string): void {
  const bytes = new TextEncoder().encode(str);
  const count = Math.min(bytes.length, length);
  for (let i = 0; i < count; i++) {
    buf[offset + i] = bytes[i];
  }
}

function readTarString(buf: Uint8Array, offset: number, length: number): string {
  let end = offset;
  const max = offset + length;
  while (end < max && buf[end] !== 0) end++;
  return new TextDecoder().decode(buf.subarray(offset, end));
}

export function createTarArchive(entries: ArchiveEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];

  for (const entry of entries) {
    const header = new Uint8Array(512);
    const cleanName = entry.name.replace(/^\/+/, '').slice(0, 99);
    writeTarString(header, 0, 100, cleanName);
    writeOctal(header, 100, 8, 0o644); // mode
    writeOctal(header, 108, 8, 0); // uid
    writeOctal(header, 116, 8, 0); // gid
    writeOctal(header, 124, 12, entry.data.length); // size
    writeOctal(header, 136, 12, Math.floor(Date.now() / 1000)); // mtime

    // Fill checksum field with spaces prior to calculating checksum
    for (let i = 148; i < 156; i++) header[i] = 32;
    header[156] = 48; // '0' normal file
    writeTarString(header, 257, 6, 'ustar');
    writeTarString(header, 263, 2, '00');

    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    const chkStr = checksum.toString(8).padStart(6, '0');
    for (let i = 0; i < 6; i++) header[148 + i] = chkStr.charCodeAt(i);
    header[154] = 0;
    header[155] = 32;

    chunks.push(header);
    chunks.push(entry.data);
    const remainder = entry.data.length % 512;
    if (remainder > 0) {
      chunks.push(new Uint8Array(512 - remainder));
    }
  }

  // Two 512-byte zero blocks mark end-of-archive
  chunks.push(new Uint8Array(1024));

  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

export function parseTarArchive(bytes: Uint8Array): ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    const isZeroBlock = header.every(b => b === 0);
    if (isZeroBlock) break;

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const sizeOct = readTarString(header, 124, 12).trim();
    const size = parseInt(sizeOct, 8) || 0;
    const typeFlag = header[156];

    offset += 512;
    if (offset + size > bytes.length) break;

    // Include regular files ('0' or '\0')
    if ((typeFlag === 0 || typeFlag === 48) && fullName && !fullName.endsWith('/')) {
      const data = bytes.slice(offset, offset + size);
      entries.push({ name: fullName, data, size: data.length });
    }

    const padded = Math.ceil(size / 512) * 512;
    offset += padded;
  }

  return entries;
}

export function createZipArchive(entries: ArchiveEntry[]): Uint8Array {
  const map: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    const clean = entry.name.replace(/^\/+/, '') || 'file.bin';
    map[clean] = entry.data;
  }
  return zipSync(map, { level: 6 });
}

export function parseZipArchive(bytes: Uint8Array): ArchiveEntry[] {
  const files = unzipSync(bytes);
  return Object.entries(files)
    .filter(([name]) => !name.endsWith('/'))
    .map(([name, data]) => ({
      name,
      data,
      size: data.length,
    }));
}

export function compressGzip(bytes: Uint8Array): Uint8Array {
  return gzipSync(bytes, { level: 6 });
}

export function decompressGzip(bytes: Uint8Array): Uint8Array {
  return gunzipSync(bytes);
}
