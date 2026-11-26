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
      const int16 = Math.max(-32768, Math.min(32767, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff)));
      view.setInt16(offset, int16, true);
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
      const int16 = Math.max(-32768, Math.min(32767, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff)));
      view.setInt16(offset, int16, false);
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

const RTF_IGNORABLE_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'header',
  'headerl',
  'headerr',
  'headerf',
  'footer',
  'footerl',
  'footerr',
  'footerf',
  'generator',
  'themedata',
  'colorschememapping',
  'datastore',
  'latentstyles',
  'listtable',
  'listoverridetable',
  'rsidtbl',
  'mmathPr',
  'fldinst',
  'object',
  'objdata',
  'xmlnstbl',
]);

function decodeCodepageBytes(bytes: number[], codepage: number): string {
  const encodingMap: Record<number, string> = {
    1250: 'windows-1250',
    1251: 'windows-1251',
    1252: 'windows-1252',
    1253: 'windows-1253',
    1254: 'windows-1254',
    1255: 'windows-1255',
    1256: 'windows-1256',
    1257: 'windows-1257',
    1258: 'windows-1258',
    65001: 'utf-8',
  };
  const label = encodingMap[codepage] || 'windows-1252';
  try {
    return new TextDecoder(label).decode(new Uint8Array(bytes));
  } catch {
    return String.fromCharCode(...bytes);
  }
}

export function stripRtfToText(rtf: string): string {
  const cpgMatch = /\\ansicpg(\d+)/.exec(rtf);
  const codepage = cpgMatch ? parseInt(cpgMatch[1], 10) : 1252;

  const stack: Array<{ uc: number; skip: boolean }> = [{ uc: 1, skip: false }];
  let out = '';
  let hexBuffer: number[] = [];

  const flushHex = () => {
    if (hexBuffer.length > 0) {
      out += decodeCodepageBytes(hexBuffer, codepage);
      hexBuffer = [];
    }
  };

  let i = 0;
  const len = rtf.length;

  while (i < len) {
    const ch = rtf[i];
    const current = stack[stack.length - 1];

    if (ch === '{') {
      flushHex();
      stack.push({ uc: current.uc, skip: current.skip });
      i++;
      continue;
    }

    if (ch === '}') {
      flushHex();
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      i++;
      continue;
    }

    if (ch === '\\') {
      i++;
      if (i >= len) break;
      const next = rtf[i];

      // Hex-encoded byte \'xx
      if (next === "'") {
        const hex = rtf.slice(i + 1, i + 3);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          if (!current.skip) {
            hexBuffer.push(parseInt(hex, 16));
          }
          i += 3;
          continue;
        }
      }

      flushHex();

      if (next === '*') {
        current.skip = true;
        i++;
        continue;
      }

      if (next === '\\' || next === '{' || next === '}') {
        if (!current.skip) out += next;
        i++;
        continue;
      }

      if (next === '~') {
        if (!current.skip) out += ' ';
        i++;
        continue;
      }

      if (next === '_') {
        if (!current.skip) out += '-';
        i++;
        continue;
      }

      if (next === '-') {
        i++;
        continue;
      }

      if (next === '\n' || next === '\r') {
        if (!current.skip) out += '\n';
        i++;
        continue;
      }

      // Control word: letters + optional signed integer + optional single space delimiter
      const wordMatch = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i));
      if (wordMatch) {
        const word = wordMatch[1];
        const param = wordMatch[2] !== undefined ? parseInt(wordMatch[2], 10) : undefined;
        i += wordMatch[0].length;

        if (RTF_IGNORABLE_DESTINATIONS.has(word)) {
          current.skip = true;
          continue;
        }

        if (word === 'uc' && param !== undefined) {
          current.uc = Math.max(0, param);
          continue;
        }

        if (current.skip) continue;

        if (word === 'u' && param !== undefined) {
          const codeUnit = param < 0 ? param + 65536 : param;
          out += String.fromCharCode(codeUnit);
          // Skip `uc` fallback replacement characters (either \'xx or a single char)
          let toSkip = current.uc;
          while (toSkip > 0 && i < len) {
            if (rtf[i] === '\\' && rtf[i + 1] === "'" && /^[0-9a-fA-F]{2}$/.test(rtf.slice(i + 2, i + 4))) {
              i += 4;
            } else if (rtf[i] !== '{' && rtf[i] !== '}') {
              i++;
            } else {
              break;
            }
            toSkip--;
          }
          continue;
        }

        if (word === 'par' || word === 'line') {
          out += '\n';
        } else if (word === 'tab') {
          out += '\t';
        } else if (word === 'emdash') {
          out += '—';
        } else if (word === 'endash') {
          out += '–';
        } else if (word === 'lquote') {
          out += '‘';
        } else if (word === 'rquote') {
          out += '’';
        } else if (word === 'ldblquote') {
          out += '“';
        } else if (word === 'rdblquote') {
          out += '”';
        } else if (word === 'bullet') {
          out += '•';
        }
        continue;
      }

      i++;
      continue;
    }

    flushHex();
    if (!current.skip) {
      out += ch;
    }
    i++;
  }

  flushHex();

  return out
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const cp = parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const cp = parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    });
}

function convertHtmlTablesToMarkdown(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner: string) => {
    const rowMatches = tableInner.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (!rowMatches || rowMatches.length === 0) return '';

    const parsedRows: string[][] = [];
    for (const tr of rowMatches) {
      const cellMatches = tr.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi) ?? [];
      const cells = cellMatches.map(cell =>
        decodeHtmlEntities(
          cell
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        ).replace(/\|/g, '\\|')
      );
      if (cells.length > 0) parsedRows.push(cells);
    }

    if (parsedRows.length === 0) return '';
    const colCount = Math.max(...parsedRows.map(r => r.length));
    const padRow = (r: string[]) =>
      Array.from({ length: colCount }, (_, i) => r[i] ?? '');
    const header = padRow(parsedRows[0]);
    const sep = Array.from({ length: colCount }, () => '---');
    const body = parsedRows.slice(1).map(padRow);

    const lines = [
      `| ${header.join(' | ')} |`,
      `| ${sep.join(' | ')} |`,
      ...body.map(r => `| ${r.join(' | ')} |`),
    ];
    return `\n\n${lines.join('\n')}\n\n`;
  });
}

export function htmlToMarkdown(html: string): string {
  const withTables = convertHtmlTablesToMarkdown(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
  );

  const cleaned = decodeHtmlEntities(
    withTables
      .replace(/<hr\s*\/?>/gi, '\n---\n\n')
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
  );

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

function buildDocxInlineRunsXml(text: string): string {
  // Parse simple inline **bold**, *italic*, and `code` tokens into OOXML <w:r> nodes
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(tokenRegex).filter(p => p.length > 0);
  if (parts.length === 0) return '<w:r><w:t xml:space="preserve"></w:t></w:r>';

  return parts
    .map(part => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXmlText(part.slice(2, -2))}</w:t></w:r>`;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${escapeXmlText(part.slice(1, -1))}</w:t></w:r>`;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return `<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(part.slice(1, -1))}</w:t></w:r>`;
      }
      return `<w:r><w:t xml:space="preserve">${escapeXmlText(part)}</w:t></w:r>`;
    })
    .join('');
}

/**
 * Generates a valid, standards-compliant OOXML (.docx) archive locally using fflate,
 * supporting headings, inline bold/italic/code, bullet lists, and Markdown tables.
 */
export function buildMinimalDocx(plainText: string): Uint8Array {
  const enc = new TextEncoder();
  const lines = plainText.replace(/\r\n/g, '\n').split('\n');
  const bodyChunks: string[] = [];

  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Detect Markdown table block
    if (
      trimmed.startsWith('|') &&
      trimmed.endsWith('|') &&
      idx + 1 < lines.length &&
      /^\|[\s:|-]+\|$/.test(lines[idx + 1].trim())
    ) {
      const tableLines: string[] = [trimmed];
      idx += 2; // Skip separator row
      while (idx < lines.length && lines[idx].trim().startsWith('|') && lines[idx].trim().endsWith('|')) {
        tableLines.push(lines[idx].trim());
        idx++;
      }

      const parsedRows = tableLines.map(rowLine =>
        rowLine
          .slice(1, -1)
          .split('|')
          .map(cell => cell.trim())
      );

      const rowsXml = parsedRows
        .map((cells, rIdx) => {
          const cellsXml = cells
            .map(cell => {
              const shd = rIdx === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : '';
              const rPr = rIdx === 0 ? '<w:rPr><w:b/></w:rPr>' : '';
              return `<w:tc><w:tcPr>${shd}</w:tcPr><w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXmlText(cell)}</w:t></w:r></w:p></w:tc>`;
            })
            .join('');
          return `<w:tr>${cellsXml}</w:tr>`;
        })
        .join('');

      bodyChunks.push(
        `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/></w:tblBorders></w:tblPr>${rowsXml}</w:tbl>`
      );
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizeHalfPt = level === 1 ? 32 : level === 2 ? 26 : 22;
      bodyChunks.push(
        `<w:p><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="${sizeHalfPt}"/></w:rPr><w:t xml:space="preserve">${escapeXmlText(headingMatch[2])}</w:t></w:r></w:p>`
      );
      idx++;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*+]\s+/, '');
      bodyChunks.push(
        `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="60"/></w:pPr><w:r><w:t xml:space="preserve">• </w:t></w:r>${buildDocxInlineRunsXml(bulletText)}</w:p>`
      );
      idx++;
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      bodyChunks.push(
        `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="CBD5E1"/></w:pBdr></w:pPr></w:p>`
      );
      idx++;
      continue;
    }

    bodyChunks.push(`<w:p>${buildDocxInlineRunsXml(line)}</w:p>`);
    idx++;
  }

  const bodyXml = bodyChunks.join('');

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

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
    'word/_rels/document.xml.rels': enc.encode(docRels),
    'word/styles.xml': enc.encode(stylesXml),
    'word/document.xml': enc.encode(documentXml),
  });
}

// ---------------------------------------------------------------------------
// 4. SPREADSHEET & STRUCTURED DATA HELPERS (CSV, TSV, XML, Markdown/HTML Table)
// ---------------------------------------------------------------------------

export function detectCsvDelimiter(text: string): ',' | ';' | '\t' {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r\n|\r|\n/).filter(l => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return ',';

  const countOutsideQuotes = (line: string, target: string): number => {
    let inQuotes = false;
    let count = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes && ch === target) {
        count++;
      }
    }
    return count;
  };

  const headerLine = lines[0];
  const commas = countOutsideQuotes(headerLine, ',');
  const semis = countOutsideQuotes(headerLine, ';');
  const tabs = countOutsideQuotes(headerLine, '\t');

  if (semis > commas && semis >= tabs) return ';';
  if (tabs > commas && tabs > semis) return '\t';
  return ',';
}

export function parseDelimitedText(
  text: string,
  delimiter = ','
): Record<string, string | number | boolean>[] {
  const activeDelimiter = delimiter === 'auto' ? detectCsvDelimiter(text) : delimiter;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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
    } else if (ch === activeDelimiter) {
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

function stringifyCellValue(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function rowsToMarkdownTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const esc = (v: unknown): string =>
    stringifyCellValue(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
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
          .map(k => `<td>${escapeHtml(stringifyCellValue(row[k]))}</td>`)
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
  const withoutDecl = xmlText.replace(/<\?xml[\s\S]*?\?>/gi, '').trim();
  const rootMatch = /^<([a-zA-Z0-9_:-]+)(?:\s[^>]*)?>([\s\S]*)<\/\1>$/.exec(withoutDecl);
  const scanTarget = rootMatch ? rootMatch[2] : withoutDecl;

  const rows: Record<string, string | number | boolean>[] = [];
  const blockMatches = scanTarget.match(/<([a-zA-Z0-9_:-]+)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g) ?? [];
  for (const block of blockMatches) {
    const inner = block.replace(/^<[^>]+>|<\/[^>]+>$/g, '');
    const fieldRegex = /<([a-zA-Z0-9_:-]+)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
    const obj: Record<string, string | number | boolean> = {};
    let m: RegExpExecArray | null;
    while ((m = fieldRegex.exec(inner)) !== null) {
      const raw = decodeHtmlEntities(m[2].trim());
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
    const cleanFull = entry.name.replace(/^\/+/, '');
    const encBytes = new TextEncoder().encode(cleanFull);
    if (encBytes.length <= 99) {
      writeTarString(header, 0, 100, cleanFull);
    } else {
      const slashIdx = cleanFull.lastIndexOf('/');
      if (slashIdx > 0) {
        writeTarString(header, 345, 155, cleanFull.slice(0, slashIdx));
        writeTarString(header, 0, 100, cleanFull.slice(slashIdx + 1));
      } else {
        writeTarString(header, 0, 99, cleanFull);
      }
    }
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
  let pendingLongName: string | null = null;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    const isZeroBlock = header.every(b => b === 0);
    if (isZeroBlock) break;

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const fullName = pendingLongName ?? (prefix ? `${prefix}/${name}` : name);
    pendingLongName = null;

    const sizeOct = readTarString(header, 124, 12).trim();
    const size = parseInt(sizeOct, 8) || 0;
    const typeFlag = header[156];

    offset += 512;
    if (offset + size > bytes.length) break;

    // Handle GNU LongLink ('L' = 76) extended filename entries
    if (typeFlag === 76) {
      pendingLongName = new TextDecoder()
        .decode(bytes.subarray(offset, offset + size))
        .replace(/\0+$/, '');
    } else if ((typeFlag === 0 || typeFlag === 48) && fullName && !fullName.endsWith('/')) {
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
