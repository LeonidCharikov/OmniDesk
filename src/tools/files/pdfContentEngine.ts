import {
  PDFArray,
  PDFContentStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
} from 'pdf-lib';

export type Matrix = [number, number, number, number, number, number];

export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

export function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export interface RectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfToken {
  type: 'number' | 'name' | 'string' | 'hex' | 'array' | 'dict' | 'word';
  rawBytes: Uint8Array;
  text: string;
  numberVal?: number;
  arrayItems?: PdfToken[];
}

export interface TjSubSpan {
  tokenIndices: number[];
  text: string;
  viewportBbox: RectBox;
  advanceEm: number;
}

export interface StreamOp {
  id: number;
  operands: PdfToken[];
  operator: string;
  rawInlineImageBytes?: Uint8Array;
  kind: 'text' | 'image' | 'state' | 'other';
  viewportBbox?: RectBox;
  viewportAnchor?: { x: number; y: number };
  fillColorHex?: string;
  decodedText?: string;
  fontSize?: number;
  advanceTextSpace?: number;
  advanceEm?: number;
  tjSubSpans?: TjSubSpan[];
}

export interface DetectedImageObject {
  id: string;
  streamSourceKey: string;
  opId: number;
  xObjectName: string;
  viewportBbox: RectBox;
}

export interface TextColorMapEntry {
  viewportBbox: RectBox;
  text: string;
  colorHex: string;
}

interface ParsedFontInfo {
  isTwoByte: boolean;
  firstChar: number;
  widths: number[];
  defaultWidth: number;
  toUnicode: Map<number, string>;
}

const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘',
  0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜',
  0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

const bytesToLatin1 = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
};

const latin1ToBytes = (str: string): Uint8Array => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
};

const isWhitespace = (b: number): boolean =>
  b === 0x00 || b === 0x09 || b === 0x0a || b === 0x0c || b === 0x0d || b === 0x20;

const isDelimiter = (b: number): boolean =>
  b === 0x28 || // (
  b === 0x29 || // )
  b === 0x3c || // <
  b === 0x3e || // >
  b === 0x5b || // [
  b === 0x5d || // ]
  b === 0x7b || // {
  b === 0x7d || // }
  b === 0x2f || // /
  b === 0x25;   // %

const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  );
};

const concatUint8Arrays = (chunks: Uint8Array[], separatorByte?: number): Uint8Array => {
  if (chunks.length === 0) return new Uint8Array(0);
  if (chunks.length === 1) return chunks[0];
  let totalLen = 0;
  for (let i = 0; i < chunks.length; i++) {
    totalLen += chunks[i].length;
    if (separatorByte !== undefined && i < chunks.length - 1) totalLen += 1;
  }
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], offset);
    offset += chunks[i].length;
    if (separatorByte !== undefined && i < chunks.length - 1) {
      out[offset] = separatorByte;
      offset += 1;
    }
  }
  return out;
};

function decodeSingleStreamObject(obj: PDFObject | undefined): Uint8Array {
  if (!obj) return new Uint8Array(0);
  if (obj instanceof PDFContentStream) {
    return obj.getUnencodedContents();
  }
  if (obj instanceof PDFRawStream) {
    return decodePDFRawStream(obj).decode();
  }
  if (obj instanceof PDFStream) {
    const maybeAny = obj as unknown as { getUnencodedContents?: () => Uint8Array; contents?: Uint8Array };
    if (typeof maybeAny.getUnencodedContents === 'function') {
      return maybeAny.getUnencodedContents();
    }
    if (maybeAny.contents instanceof Uint8Array) {
      return maybeAny.contents;
    }
  }
  return new Uint8Array(0);
}

function getPageContentBytes(pdfDoc: PDFDocument, pageIndex: number): Uint8Array {
  const page = pdfDoc.getPage(pageIndex);
  const contentsRaw = page.node.get(PDFName.of('Contents'));
  const resolved = pdfDoc.context.lookup(contentsRaw);
  if (!resolved) return new Uint8Array(0);
  if (resolved instanceof PDFArray) {
    const parts: Uint8Array[] = [];
    for (let i = 0; i < resolved.size(); i++) {
      const item = pdfDoc.context.lookup(resolved.get(i));
      const decoded = decodeSingleStreamObject(item);
      if (decoded.length > 0) parts.push(decoded);
    }
    return concatUint8Arrays(parts, 0x0a);
  }
  return decodeSingleStreamObject(resolved);
}

function tokenizeContentStream(bytes: Uint8Array): { ops: StreamOp[] } {
  const tokens: Array<{ token?: PdfToken; inlineImageBytes?: Uint8Array }> = [];
  let i = 0;
  const len = bytes.length;

  const skipWsAndComments = () => {
    while (i < len) {
      const b = bytes[i];
      if (isWhitespace(b)) {
        i++;
      } else if (b === 0x25) {
        while (i < len && bytes[i] !== 0x0a && bytes[i] !== 0x0d) i++;
      } else {
        break;
      }
    }
  };

  const readLiteralString = (): PdfToken => {
    const start = i;
    i++; // skip '('
    let depth = 1;
    while (i < len && depth > 0) {
      const b = bytes[i];
      if (b === 0x5c) {
        i += 2;
        continue;
      }
      if (b === 0x28) depth++;
      else if (b === 0x29) depth--;
      i++;
    }
    const raw = bytes.slice(start, i);
    return { type: 'string', rawBytes: raw, text: bytesToLatin1(raw) };
  };

  const readHexOrDict = (): PdfToken => {
    const start = i;
    if (i + 1 < len && bytes[i + 1] === 0x3c) {
      // Dictionary << ... >>
      i += 2;
      let depth = 1;
      while (i < len && depth > 0) {
        const b = bytes[i];
        if (b === 0x28) {
          readLiteralString();
          continue;
        }
        if (b === 0x3c && i + 1 < len && bytes[i + 1] === 0x3c) {
          depth++;
          i += 2;
          continue;
        }
        if (b === 0x3e && i + 1 < len && bytes[i + 1] === 0x3e) {
          depth--;
          i += 2;
          continue;
        }
        i++;
      }
      const raw = bytes.slice(start, i);
      return { type: 'dict', rawBytes: raw, text: bytesToLatin1(raw) };
    }
    // Hex string <...>
    i++;
    while (i < len && bytes[i] !== 0x3e) i++;
    if (i < len && bytes[i] === 0x3e) i++;
    const raw = bytes.slice(start, i);
    return { type: 'hex', rawBytes: raw, text: bytesToLatin1(raw) };
  };

  const readNextToken = (): PdfToken | null => {
    skipWsAndComments();
    if (i >= len) return null;
    const b = bytes[i];

    if (b === 0x28) return readLiteralString();
    if (b === 0x3c) return readHexOrDict();

    if (b === 0x5b) {
      const start = i;
      i++; // skip '['
      const items: PdfToken[] = [];
      while (i < len) {
        skipWsAndComments();
        if (i >= len) break;
        if (bytes[i] === 0x5d) {
          i++;
          break;
        }
        const inner = readNextToken();
        if (inner) items.push(inner);
        else break;
      }
      const raw = bytes.slice(start, i);
      return { type: 'array', rawBytes: raw, text: bytesToLatin1(raw), arrayItems: items };
    }

    if (b === 0x2f) {
      const start = i;
      i++;
      while (i < len && !isWhitespace(bytes[i]) && !isDelimiter(bytes[i])) i++;
      const raw = bytes.slice(start, i);
      return { type: 'name', rawBytes: raw, text: bytesToLatin1(raw) };
    }

    if (b === 0x5d || b === 0x29 || b === 0x3e) {
      const start = i;
      i++;
      const raw = bytes.slice(start, i);
      return { type: 'word', rawBytes: raw, text: bytesToLatin1(raw) };
    }

    const start = i;
    while (i < len && !isWhitespace(bytes[i]) && !isDelimiter(bytes[i])) i++;
    const raw = bytes.slice(start, i);
    const text = bytesToLatin1(raw);
    const num = Number(text);
    if (text.length > 0 && !Number.isNaN(num) && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(text)) {
      return { type: 'number', rawBytes: raw, text, numberVal: num };
    }
    return { type: 'word', rawBytes: raw, text };
  };

  while (i < len) {
    const tok = readNextToken();
    if (!tok) break;
    if (tok.type === 'word' && tok.text === 'BI') {
      const biStart = i - 2;
      // Read until 'ID'
      while (i < len) {
        const inner = readNextToken();
        if (!inner) break;
        if (inner.type === 'word' && inner.text === 'ID') break;
      }
      // Skip single whitespace byte after ID
      if (i < len && isWhitespace(bytes[i])) {
        if (bytes[i] === 0x0d && i + 1 < len && bytes[i + 1] === 0x0a) i += 2;
        else i += 1;
      }
      // Scan until whitespace + 'EI' + (whitespace or EOF)
      while (i < len - 1) {
        if (
          isWhitespace(bytes[i]) &&
          bytes[i + 1] === 0x45 &&
          i + 2 < len &&
          bytes[i + 2] === 0x49 &&
          (i + 3 >= len || isWhitespace(bytes[i + 3]))
        ) {
          i += 3;
          break;
        }
        i++;
      }
      tokens.push({ inlineImageBytes: bytes.slice(biStart, i) });
    } else {
      tokens.push({ token: tok });
    }
  }

  const ops: StreamOp[] = [];
  let operands: PdfToken[] = [];
  let nextId = 1;

  for (const entry of tokens) {
    if (entry.inlineImageBytes) {
      ops.push({
        id: nextId++,
        operands: [],
        operator: 'BI_IMAGE',
        rawInlineImageBytes: entry.inlineImageBytes,
        kind: 'image',
      });
      operands = [];
      continue;
    }
    const tok = entry.token!;
    if (
      tok.type === 'word' &&
      tok.text !== 'true' &&
      tok.text !== 'false' &&
      tok.text !== 'null'
    ) {
      ops.push({
        id: nextId++,
        operands,
        operator: tok.text,
        kind: 'other',
      });
      operands = [];
    } else {
      operands.push(tok);
    }
  }

  return { ops };
}

function decodeLiteralStringBytes(raw: Uint8Array): number[] {
  const out: number[] = [];
  // Strip outer ( and )
  const start = raw[0] === 0x28 ? 1 : 0;
  const end = raw[raw.length - 1] === 0x29 ? raw.length - 1 : raw.length;
  for (let i = start; i < end; i++) {
    const b = raw[i];
    if (b === 0x5c && i + 1 < end) {
      i++;
      const next = raw[i];
      if (next === 0x6e) out.push(0x0a);
      else if (next === 0x72) out.push(0x0d);
      else if (next === 0x74) out.push(0x09);
      else if (next === 0x62) out.push(0x08);
      else if (next === 0x66) out.push(0x0c);
      else if (next === 0x0d) {
        if (i + 1 < end && raw[i + 1] === 0x0a) i++;
      } else if (next === 0x0a) {
        // line continuation
      } else if (next >= 0x30 && next <= 0x37) {
        let oct = String.fromCharCode(next);
        for (let k = 0; k < 2 && i + 1 < end && raw[i + 1] >= 0x30 && raw[i + 1] <= 0x37; k++) {
          i++;
          oct += String.fromCharCode(raw[i]);
        }
        out.push(parseInt(oct, 8) & 0xff);
      } else {
        out.push(next);
      }
    } else {
      out.push(b);
    }
  }
  return out;
}

function decodeHexStringBytes(raw: Uint8Array): number[] {
  const hexChars: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const c = String.fromCharCode(raw[i]);
    if (/[0-9a-fA-F]/.test(c)) hexChars.push(c);
  }
  if (hexChars.length % 2 === 1) hexChars.push('0');
  const out: number[] = [];
  for (let i = 0; i < hexChars.length; i += 2) {
    out.push(parseInt(hexChars[i] + hexChars[i + 1], 16));
  }
  return out;
}

function getStringTokenBytes(tok: PdfToken): number[] {
  if (tok.type === 'string') return decodeLiteralStringBytes(tok.rawBytes);
  if (tok.type === 'hex') return decodeHexStringBytes(tok.rawBytes);
  return [];
}

function parseToUnicodeCMap(bytes: Uint8Array): Map<number, string> {
  const map = new Map<number, string>();
  const text = bytesToLatin1(bytes);

  const hexToUnicodeStr = (hex: string): string => {
    const clean = hex.replace(/[^0-9a-fA-F]/g, '');
    let res = '';
    for (let i = 0; i + 3 < clean.length; i += 4) {
      res += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
    }
    if (res.length === 0 && clean.length >= 2) {
      res = String.fromCharCode(parseInt(clean, 16));
    }
    return res;
  };

  const bfCharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
  let match: RegExpExecArray | null;
  while ((match = bfCharRegex.exec(text)) !== null) {
    const pairRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pairRegex.exec(match[1])) !== null) {
      const code = parseInt(pMatch[1], 16);
      map.set(code, hexToUnicodeStr(pMatch[2]));
    }
  }

  const bfRangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((match = bfRangeRegex.exec(text)) !== null) {
    const lineRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]+)\])/g;
    let lMatch: RegExpExecArray | null;
    while ((lMatch = lineRegex.exec(match[1])) !== null) {
      const start = parseInt(lMatch[1], 16);
      const end = parseInt(lMatch[2], 16);
      if (lMatch[3]) {
        let dest = parseInt(lMatch[3], 16);
        for (let code = start; code <= end && code - start < 4096; code++) {
          map.set(code, String.fromCharCode(dest));
          dest++;
        }
      } else if (lMatch[4]) {
        const arrHex = lMatch[4].match(/<([0-9a-fA-F]+)>/g) || [];
        for (let idx = 0; idx < arrHex.length && start + idx <= end; idx++) {
          map.set(start + idx, hexToUnicodeStr(arrHex[idx]));
        }
      }
    }
  }

  return map;
}

function buildFontMap(pdfDoc: PDFDocument, resources: PDFDict | undefined): Map<string, ParsedFontInfo> {
  const fontMap = new Map<string, ParsedFontInfo>();
  if (!resources) return fontMap;
  const fontDictRaw = resources.get(PDFName.of('Font'));
  const fontDict = pdfDoc.context.lookupMaybe(fontDictRaw, PDFDict);
  if (!fontDict) return fontMap;

  for (const [key, val] of fontDict.entries()) {
    const fontName = key.asString(); // e.g. "/F1"
    const dict = pdfDoc.context.lookupMaybe(val, PDFDict);
    if (!dict) continue;

    const subtype = pdfDoc.context.lookupMaybe(dict.get(PDFName.of('Subtype')), PDFName)?.asString();
    const encodingName = pdfDoc.context.lookupMaybe(dict.get(PDFName.of('Encoding')), PDFName)?.asString();
    const isTwoByte = subtype === '/Type0' || encodingName === '/Identity-H' || encodingName === '/Identity-V';

    const firstChar = pdfDoc.context.lookupMaybe(dict.get(PDFName.of('FirstChar')), PDFNumber)?.asNumber() ?? 0;
    const widthsArr = pdfDoc.context.lookupMaybe(dict.get(PDFName.of('Widths')), PDFArray);
    const widths: number[] = [];
    if (widthsArr) {
      for (let i = 0; i < widthsArr.size(); i++) {
        const num = pdfDoc.context.lookupMaybe(widthsArr.get(i), PDFNumber)?.asNumber() ?? 500;
        widths.push(num);
      }
    }

    const baseFont = pdfDoc.context.lookupMaybe(dict.get(PDFName.of('BaseFont')), PDFName)?.asString() ?? '';
    const defaultWidth = baseFont.toLowerCase().includes('courier') ? 600 : 520;

    let toUnicode = new Map<number, string>();
    const toUniObj = pdfDoc.context.lookup(dict.get(PDFName.of('ToUnicode')));
    const toUniBytes = decodeSingleStreamObject(toUniObj);
    if (toUniBytes.length > 0) {
      toUnicode = parseToUnicodeCMap(toUniBytes);
    }

    fontMap.set(fontName, {
      isTwoByte,
      firstChar,
      widths,
      defaultWidth,
      toUnicode,
    });
  }

  return fontMap;
}

function decodeTextToken(
  tok: PdfToken,
  fontInfo: ParsedFontInfo | undefined,
  fontSize: number,
  charSpacing: number,
  wordSpacing: number,
  horizScale: number
): { text: string; advanceTextSpace: number; advanceEm: number } {
  const bytes = getStringTokenBytes(tok);
  const scaleFactor = horizScale / 100;
  let text = '';
  let totalEm = 0;
  let extraSpacing = 0;

  if (fontInfo?.isTwoByte && bytes.length >= 2) {
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const code = (bytes[i] << 8) | bytes[i + 1];
      const mapped = fontInfo.toUnicode.get(code);
      if (mapped !== undefined) {
        text += mapped;
      } else if (code >= 0x20 && code <= 0x7e) {
        text += String.fromCharCode(code);
      }
      totalEm += fontInfo.defaultWidth;
      extraSpacing += charSpacing;
    }
  } else {
    for (let i = 0; i < bytes.length; i++) {
      const code = bytes[i];
      const mapped = fontInfo?.toUnicode.get(code);
      if (mapped !== undefined) {
        text += mapped;
      } else if (WIN_ANSI_HIGH[code]) {
        text += WIN_ANSI_HIGH[code];
      } else if (code >= 0x20) {
        text += String.fromCharCode(code);
      }
      let w = fontInfo?.defaultWidth ?? 520;
      if (fontInfo && fontInfo.widths.length > 0) {
        const idx = code - fontInfo.firstChar;
        if (idx >= 0 && idx < fontInfo.widths.length) {
          w = fontInfo.widths[idx];
        }
      }
      totalEm += w;
      extraSpacing += charSpacing + (code === 0x20 ? wordSpacing : 0);
    }
  }

  const advanceTextSpace = ((totalEm / 1000) * fontSize + extraSpacing) * scaleFactor;
  return { text, advanceTextSpace, advanceEm: totalEm };
}

function computeViewportBboxFromTextBox(
  trm: Matrix,
  viewportTransform: Matrix,
  advTextSpace: number,
  fontSize: number
): { bbox: RectBox; anchor: { x: number; y: number } } {
  const combined = multiplyMatrix(viewportTransform, trm);
  const [ax, ay] = applyMatrix(combined, 0, 0);
  const corners: [number, number][] = [
    applyMatrix(combined, 0, -0.25 * fontSize),
    applyMatrix(combined, advTextSpace, -0.25 * fontSize),
    applyMatrix(combined, 0, 0.9 * fontSize),
    applyMatrix(combined, advTextSpace, 0.9 * fontSize),
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [cx, cy] of corners) {
    if (cx < minX) minX = cx;
    if (cy < minY) minY = cy;
    if (cx > maxX) maxX = cx;
    if (cy > maxY) maxY = cy;
  }
  return {
    bbox: {
      x: minX,
      y: minY,
      width: Math.max(4, maxX - minX),
      height: Math.max(4, maxY - minY),
    },
    anchor: { x: ax, y: ay },
  };
}

function computeUnitSquareViewportBbox(ctm: Matrix, viewportTransform: Matrix): RectBox {
  const combined = multiplyMatrix(viewportTransform, ctm);
  const corners: [number, number][] = [
    applyMatrix(combined, 0, 0),
    applyMatrix(combined, 1, 0),
    applyMatrix(combined, 0, 1),
    applyMatrix(combined, 1, 1),
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [cx, cy] of corners) {
    if (cx < minX) minX = cx;
    if (cy < minY) minY = cy;
    if (cx > maxX) maxX = cx;
    if (cy > maxY) maxY = cy;
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(2, maxX - minX),
    height: Math.max(2, maxY - minY),
  };
}

interface GraphicsState {
  ctm: Matrix;
  fillColorHex: string;
}

interface AnalyzedStream {
  streamKey: string; // 'page' or XObject name/ref info
  formXObjectName?: string;
  ops: StreamOp[];
}

function analyzeOperations(
  pdfDoc: PDFDocument,
  ops: StreamOp[],
  resources: PDFDict | undefined,
  initialCtm: Matrix,
  viewportTransform: Matrix,
  streamKey: string,
  visitedFormRefs: Set<string>,
  collectedStreams: AnalyzedStream[],
  detectedImages: DetectedImageObject[],
  textColors: TextColorMapEntry[]
) {
  const fontMap = buildFontMap(pdfDoc, resources);
  const xObjDict = resources
    ? pdfDoc.context.lookupMaybe(resources.get(PDFName.of('XObject')), PDFDict)
    : undefined;

  const stack: GraphicsState[] = [];
  let ctm: Matrix = [...initialCtm];
  let fillColorHex = '#0f172a';

  let tm: Matrix = [...IDENTITY_MATRIX];
  let tlm: Matrix = [...IDENTITY_MATRIX];
  let fontName = '';
  let fontSize = 12;
  let leading = 0;
  let charSpacing = 0;
  let wordSpacing = 0;
  let horizScale = 100;

  const numArg = (tok: PdfToken | undefined, fallback = 0): number =>
    tok && tok.numberVal !== undefined ? tok.numberVal : fallback;

  for (const op of ops) {
    const o = op.operator;
    const args = op.operands;

    if (o === 'q') {
      op.kind = 'state';
      stack.push({ ctm: [...ctm], fillColorHex });
    } else if (o === 'Q') {
      op.kind = 'state';
      const popped = stack.pop();
      if (popped) {
        ctm = popped.ctm;
        fillColorHex = popped.fillColorHex;
      }
    } else if (o === 'cm' && args.length >= 6) {
      op.kind = 'state';
      const m: Matrix = [
        numArg(args[0], 1), numArg(args[1], 0),
        numArg(args[2], 0), numArg(args[3], 1),
        numArg(args[4], 0), numArg(args[5], 0),
      ];
      ctm = multiplyMatrix(ctm, m);
    } else if (o === 'rg' && args.length >= 3) {
      op.kind = 'state';
      fillColorHex = rgbToHex(numArg(args[0]), numArg(args[1]), numArg(args[2]));
    } else if (o === 'g' && args.length >= 1) {
      op.kind = 'state';
      const g = numArg(args[0]);
      fillColorHex = rgbToHex(g, g, g);
    } else if (o === 'k' && args.length >= 4) {
      op.kind = 'state';
      const c = numArg(args[0]), m = numArg(args[1]), y = numArg(args[2]), k = numArg(args[3]);
      fillColorHex = rgbToHex((1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k));
    } else if ((o === 'sc' || o === 'scn') && args.length > 0) {
      op.kind = 'state';
      const nums = args.filter(a => a.type === 'number').map(a => a.numberVal ?? 0);
      if (nums.length === 1) fillColorHex = rgbToHex(nums[0], nums[0], nums[0]);
      else if (nums.length === 3) fillColorHex = rgbToHex(nums[0], nums[1], nums[2]);
      else if (nums.length === 4) {
        fillColorHex = rgbToHex((1 - nums[0]) * (1 - nums[3]), (1 - nums[1]) * (1 - nums[3]), (1 - nums[2]) * (1 - nums[3]));
      }
    } else if (o === 'BT') {
      op.kind = 'state';
      tm = [...IDENTITY_MATRIX];
      tlm = [...IDENTITY_MATRIX];
    } else if (o === 'ET') {
      op.kind = 'state';
    } else if (o === 'Tf' && args.length >= 2) {
      op.kind = 'state';
      fontName = args[0].text;
      fontSize = numArg(args[1], 12);
    } else if (o === 'TL' && args.length >= 1) {
      op.kind = 'state';
      leading = numArg(args[0]);
    } else if (o === 'Tc' && args.length >= 1) {
      op.kind = 'state';
      charSpacing = numArg(args[0]);
    } else if (o === 'Tw' && args.length >= 1) {
      op.kind = 'state';
      wordSpacing = numArg(args[0]);
    } else if (o === 'Tz' && args.length >= 1) {
      op.kind = 'state';
      horizScale = numArg(args[0], 100);
    } else if (o === 'Tm' && args.length >= 6) {
      op.kind = 'state';
      const m: Matrix = [
        numArg(args[0], 1), numArg(args[1], 0),
        numArg(args[2], 0), numArg(args[3], 1),
        numArg(args[4], 0), numArg(args[5], 0),
      ];
      tm = [...m];
      tlm = [...m];
    } else if (o === 'Td' && args.length >= 2) {
      op.kind = 'state';
      tlm = multiplyMatrix(tlm, [1, 0, 0, 1, numArg(args[0]), numArg(args[1])]);
      tm = [...tlm];
    } else if (o === 'TD' && args.length >= 2) {
      op.kind = 'state';
      const ty = numArg(args[1]);
      leading = -ty;
      tlm = multiplyMatrix(tlm, [1, 0, 0, 1, numArg(args[0]), ty]);
      tm = [...tlm];
    } else if (o === 'T*') {
      op.kind = 'state';
      tlm = multiplyMatrix(tlm, [1, 0, 0, 1, 0, -leading]);
      tm = [...tlm];
    } else if ((o === 'Tj' || o === "'" || o === '"') && args.length >= 1) {
      if (o === "'") {
        tlm = multiplyMatrix(tlm, [1, 0, 0, 1, 0, -leading]);
        tm = [...tlm];
      } else if (o === '"') {
        if (args.length >= 3) {
          wordSpacing = numArg(args[0]);
          charSpacing = numArg(args[1]);
        }
        tlm = multiplyMatrix(tlm, [1, 0, 0, 1, 0, -leading]);
        tm = [...tlm];
      }
      const strTok = args[args.length - 1];
      const fInfo = fontMap.get(fontName);
      const decoded = decodeTextToken(strTok, fInfo, fontSize, charSpacing, wordSpacing, horizScale);
      const trm = multiplyMatrix(ctm, tm);
      const { bbox, anchor } = computeViewportBboxFromTextBox(trm, viewportTransform, decoded.advanceTextSpace, fontSize);

      op.kind = 'text';
      op.viewportBbox = bbox;
      op.viewportAnchor = anchor;
      op.fillColorHex = fillColorHex;
      op.decodedText = decoded.text;
      op.fontSize = fontSize;
      op.advanceTextSpace = decoded.advanceTextSpace;
      op.advanceEm = decoded.advanceEm;

      if (decoded.text.trim().length > 0) {
        textColors.push({ viewportBbox: bbox, text: decoded.text, colorHex: fillColorHex });
      }

      tm = multiplyMatrix(tm, [1, 0, 0, 1, decoded.advanceTextSpace, 0]);
    } else if (o === 'TJ' && args.length >= 1 && args[0].type === 'array' && args[0].arrayItems) {
      const items = args[0].arrayItems;
      const fInfo = fontMap.get(fontName);
      const scaleFactor = horizScale / 100;

      const startTrm = multiplyMatrix(ctm, tm);
      let fullText = '';
      let totalAdvTextSpace = 0;
      let totalAdvEm = 0;

      const subSpans: TjSubSpan[] = [];
      let curSpanIndices: number[] = [];
      let curSpanText = '';
      let curSpanStartTm: Matrix = [...tm];
      let curSpanAdvTextSpace = 0;
      let curSpanAdvEm = 0;

      const flushSubSpan = () => {
        if (curSpanIndices.length > 0 && curSpanText.trim().length > 0) {
          const spanTrm = multiplyMatrix(ctm, curSpanStartTm);
          const { bbox } = computeViewportBboxFromTextBox(spanTrm, viewportTransform, curSpanAdvTextSpace, fontSize);
          subSpans.push({
            tokenIndices: [...curSpanIndices],
            text: curSpanText,
            viewportBbox: bbox,
            advanceEm: curSpanAdvEm,
          });
          textColors.push({ viewportBbox: bbox, text: curSpanText, colorHex: fillColorHex });
        }
        curSpanIndices = [];
        curSpanText = '';
        curSpanAdvTextSpace = 0;
        curSpanAdvEm = 0;
      };

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        if (it.type === 'number' && it.numberVal !== undefined) {
          const kernShiftTextSpace = (-it.numberVal / 1000) * fontSize * scaleFactor;
          // Large negative kerning (e.g. <= -180 thousandths of em) indicates a word/column split
          if (it.numberVal <= -180) {
            flushSubSpan();
            tm = multiplyMatrix(tm, [1, 0, 0, 1, kernShiftTextSpace, 0]);
            curSpanStartTm = [...tm];
            if (it.numberVal > -600) fullText += ' ';
          } else {
            if (curSpanIndices.length > 0) {
              curSpanIndices.push(idx);
              curSpanAdvTextSpace += kernShiftTextSpace;
              curSpanAdvEm += -it.numberVal;
            }
            tm = multiplyMatrix(tm, [1, 0, 0, 1, kernShiftTextSpace, 0]);
          }
          totalAdvTextSpace += kernShiftTextSpace;
          totalAdvEm += -it.numberVal;
        } else if (it.type === 'string' || it.type === 'hex') {
          if (curSpanIndices.length === 0) {
            curSpanStartTm = [...tm];
          }
          const dec = decodeTextToken(it, fInfo, fontSize, charSpacing, wordSpacing, horizScale);
          curSpanIndices.push(idx);
          curSpanText += dec.text;
          curSpanAdvTextSpace += dec.advanceTextSpace;
          curSpanAdvEm += dec.advanceEm;

          fullText += dec.text;
          totalAdvTextSpace += dec.advanceTextSpace;
          totalAdvEm += dec.advanceEm;
          tm = multiplyMatrix(tm, [1, 0, 0, 1, dec.advanceTextSpace, 0]);
        }
      }
      flushSubSpan();

      const { bbox, anchor } = computeViewportBboxFromTextBox(
        startTrm,
        viewportTransform,
        Math.max(4, totalAdvTextSpace),
        fontSize
      );

      op.kind = 'text';
      op.viewportBbox = bbox;
      op.viewportAnchor = anchor;
      op.fillColorHex = fillColorHex;
      op.decodedText = fullText;
      op.fontSize = fontSize;
      op.advanceTextSpace = totalAdvTextSpace;
      op.advanceEm = totalAdvEm;
      op.tjSubSpans = subSpans;
    } else if (o === 'Do' && args.length >= 1 && xObjDict) {
      const nameStr = args[0].text; // e.g. /Im1
      const nameKey = PDFName.of(nameStr.startsWith('/') ? nameStr.slice(1) : nameStr);
      const rawRef = xObjDict.get(nameKey);
      const xObj = pdfDoc.context.lookup(rawRef);

      if (xObj instanceof PDFStream || xObj instanceof PDFRawStream) {
        const xDict = xObj.dict;
        const subtype = pdfDoc.context.lookupMaybe(xDict.get(PDFName.of('Subtype')), PDFName)?.asString();
        if (subtype === '/Image') {
          const bbox = computeUnitSquareViewportBbox(ctm, viewportTransform);
          op.kind = 'image';
          op.viewportBbox = bbox;
          detectedImages.push({
            id: `pdf-img-${streamKey}-${op.id}`,
            streamSourceKey: streamKey,
            opId: op.id,
            xObjectName: nameStr,
            viewportBbox: bbox,
          });
        } else if (subtype === '/Form') {
          const refKey = rawRef instanceof PDFRef ? rawRef.toString() : nameStr;
          if (!visitedFormRefs.has(refKey)) {
            visitedFormRefs.add(refKey);
            let formMatrix: Matrix = [...IDENTITY_MATRIX];
            const matArr = pdfDoc.context.lookupMaybe(xDict.get(PDFName.of('Matrix')), PDFArray);
            if (matArr && matArr.size() >= 6) {
              formMatrix = [
                pdfDoc.context.lookupMaybe(matArr.get(0), PDFNumber)?.asNumber() ?? 1,
                pdfDoc.context.lookupMaybe(matArr.get(1), PDFNumber)?.asNumber() ?? 0,
                pdfDoc.context.lookupMaybe(matArr.get(2), PDFNumber)?.asNumber() ?? 0,
                pdfDoc.context.lookupMaybe(matArr.get(3), PDFNumber)?.asNumber() ?? 1,
                pdfDoc.context.lookupMaybe(matArr.get(4), PDFNumber)?.asNumber() ?? 0,
                pdfDoc.context.lookupMaybe(matArr.get(5), PDFNumber)?.asNumber() ?? 0,
              ];
            }
            const formResources = pdfDoc.context.lookupMaybe(xDict.get(PDFName.of('Resources')), PDFDict) ?? resources;
            const formBytes = decodeSingleStreamObject(xObj);
            if (formBytes.length > 0) {
              const { ops: formOps } = tokenizeContentStream(formBytes);
              const formStreamKey = `form:${nameStr}`;
              collectedStreams.push({
                streamKey: formStreamKey,
                formXObjectName: nameStr,
                ops: formOps,
              });
              analyzeOperations(
                pdfDoc,
                formOps,
                formResources,
                multiplyMatrix(ctm, formMatrix),
                viewportTransform,
                formStreamKey,
                visitedFormRefs,
                collectedStreams,
                detectedImages,
                textColors
              );
            }
          }
        }
      }
    } else if (o === 'BI_IMAGE') {
      op.kind = 'image';
      op.viewportBbox = computeUnitSquareViewportBbox(ctm, viewportTransform);
    }
  }
}

export function inspectPageInternalObjects(
  pdfDoc: PDFDocument,
  pageIndex: number,
  viewportTransform: Matrix
): {
  streams: AnalyzedStream[];
  images: DetectedImageObject[];
  textColors: TextColorMapEntry[];
} {
  const page = pdfDoc.getPage(pageIndex);
  const resources = page.node.Resources();
  const contentBytes = getPageContentBytes(pdfDoc, pageIndex);
  const { ops } = tokenizeContentStream(contentBytes);

  const collectedStreams: AnalyzedStream[] = [{ streamKey: 'page', ops }];
  const detectedImages: DetectedImageObject[] = [];
  const textColors: TextColorMapEntry[] = [];
  const visitedForms = new Set<string>();

  analyzeOperations(
    pdfDoc,
    ops,
    resources,
    IDENTITY_MATRIX,
    viewportTransform,
    'page',
    visitedForms,
    collectedStreams,
    detectedImages,
    textColors
  );

  return {
    streams: collectedStreams,
    images: detectedImages,
    textColors,
  };
}

function boxesIntersect(a: RectBox, b: RectBox, pad = 0): boolean {
  return (
    a.x <= b.x + b.width + pad &&
    a.x + a.width + pad >= b.x &&
    a.y <= b.y + b.height + pad &&
    a.y + a.height + pad >= b.y
  );
}

function overlapArea(a: RectBox, b: RectBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function serializeOpsToBytes(ops: StreamOp[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const space = new Uint8Array([0x20]);
  const newline = new Uint8Array([0x0a]);

  const serializeToken = (tok: PdfToken): Uint8Array => {
    if (tok.type === 'array' && tok.arrayItems) {
      const inner: Uint8Array[] = [latin1ToBytes('[')];
      for (let i = 0; i < tok.arrayItems.length; i++) {
        if (i > 0) inner.push(space);
        inner.push(serializeToken(tok.arrayItems[i]));
      }
      inner.push(latin1ToBytes(']'));
      return concatUint8Arrays(inner);
    }
    return tok.rawBytes;
  };

  for (const op of ops) {
    if (op.rawInlineImageBytes) {
      chunks.push(op.rawInlineImageBytes);
      chunks.push(newline);
      continue;
    }
    for (let i = 0; i < op.operands.length; i++) {
      chunks.push(serializeToken(op.operands[i]));
      chunks.push(space);
    }
    chunks.push(latin1ToBytes(op.operator));
    chunks.push(newline);
  }
  return concatUint8Arrays(chunks);
}

function writeModifiedStream(
  pdfDoc: PDFDocument,
  pageIndex: number,
  streamInfo: AnalyzedStream,
  newBytes: Uint8Array
) {
  const page = pdfDoc.getPage(pageIndex);
  if (streamInfo.streamKey === 'page') {
    const newStream = pdfDoc.context.flateStream(newBytes);
    const newRef = pdfDoc.context.register(newStream);
    page.node.set(PDFName.of('Contents'), newRef);
  } else if (streamInfo.formXObjectName) {
    const resources = page.node.Resources();
    const xObjDict = resources
      ? pdfDoc.context.lookupMaybe(resources.get(PDFName.of('XObject')), PDFDict)
      : undefined;
    if (!xObjDict) return;
    const rawName = streamInfo.formXObjectName.startsWith('/')
      ? streamInfo.formXObjectName.slice(1)
      : streamInfo.formXObjectName;
    const keyName = PDFName.of(rawName);
    const existingObj = pdfDoc.context.lookup(xObjDict.get(keyName));
    if (existingObj instanceof PDFStream || existingObj instanceof PDFRawStream) {
      // Preserve existing Form XObject dictionary entries (BBox, Matrix, Resources, Subtype, Type)
      const dictEntries: Record<string, PDFObject> = {};
      for (const [k, v] of existingObj.dict.entries()) {
        const kStr = k.asString();
        if (kStr !== '/Length' && kStr !== '/Filter' && kStr !== '/DecodeParms') {
          dictEntries[kStr.slice(1)] = v;
        }
      }
      const newFormStream = pdfDoc.context.flateStream(newBytes, dictEntries);
      const newRef = pdfDoc.context.register(newFormStream);
      xObjDict.set(keyName, newRef);
    }
  }
}

function applyTextOpRemovalToOps(
  ops: StreamOp[],
  opsToDelete: Set<number>,
  tjPartialRemovals: Map<number, Set<number>>
): StreamOp[] {
  const result: StreamOp[] = [];

  const hasSubsequentTextBeforeReset = (fromIdx: number): boolean => {
    for (let j = fromIdx + 1; j < ops.length; j++) {
      const nextOp = ops[j].operator;
      if (nextOp === 'ET' || nextOp === 'Tm' || nextOp === 'Td' || nextOp === 'TD' || nextOp === 'T*' || nextOp === "'" || nextOp === '"') {
        return false;
      }
      if ((nextOp === 'Tj' || nextOp === 'TJ') && !opsToDelete.has(ops[j].id)) {
        return true;
      }
    }
    return false;
  };

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];

    // Partial removal inside a TJ array
    if (op.operator === 'TJ' && tjPartialRemovals.has(op.id) && !opsToDelete.has(op.id)) {
      const indicesToRemove = tjPartialRemovals.get(op.id)!;
      const items = op.operands[0]?.arrayItems;
      if (items && op.tjSubSpans) {
        const hasRemainingStrings = items.some(
          (item, idx) => !indicesToRemove.has(idx) && (item.type === 'string' || item.type === 'hex')
        );

        if (hasRemainingStrings) {
          const rebuilt: PdfToken[] = [];
          let idx = 0;
          while (idx < items.length) {
            if (indicesToRemove.has(idx)) {
              const span = op.tjSubSpans.find(s => s.tokenIndices.includes(idx));
              if (span) {
                const kernVal = -span.advanceEm;
                const kernStr = String(Math.round(kernVal * 100) / 100);
                rebuilt.push({
                  type: 'number',
                  rawBytes: latin1ToBytes(kernStr),
                  text: kernStr,
                  numberVal: kernVal,
                });
                const maxIdx = Math.max(...span.tokenIndices);
                idx = maxIdx + 1;
                continue;
              }
            }
            rebuilt.push(items[idx]);
            idx++;
          }

          result.push({
            ...op,
            operands: [{ ...op.operands[0], arrayItems: rebuilt }],
          });
          continue;
        }
        // All strings in TJ removed -> delete entire TJ op
        opsToDelete.add(op.id);
      }
    }

    if (opsToDelete.has(op.id)) {
      if (op.operator === "'") {
        // Preserve the implicit T* line advance
        result.push({ id: op.id, operands: [], operator: 'T*', kind: 'state' });
      } else if (op.operator === '"') {
        const args = op.operands;
        if (args.length >= 2) {
          result.push({ id: op.id, operands: [args[0]], operator: 'Tw', kind: 'state' });
          result.push({ id: op.id, operands: [args[1]], operator: 'Tc', kind: 'state' });
        }
        result.push({ id: op.id, operands: [], operator: 'T*', kind: 'state' });
      } else if ((op.operator === 'Tj' || op.operator === 'TJ') && hasSubsequentTextBeforeReset(i)) {
        // Preserve horizontal cursor advance so subsequent text on the same line stays put
        const advEm = op.advanceEm ?? ((op.advanceTextSpace ?? 0) / Math.max(1, op.fontSize ?? 12)) * 1000;
        const kernStr = String(Math.round(-advEm * 100) / 100);
        const kernTok: PdfToken = {
          type: 'number',
          rawBytes: latin1ToBytes(kernStr),
          text: kernStr,
          numberVal: -advEm,
        };
        result.push({
          id: op.id,
          operands: [
            {
              type: 'array',
              rawBytes: latin1ToBytes(`[${kernStr}]`),
              text: `[${kernStr}]`,
              arrayItems: [kernTok],
            },
          ],
          operator: 'TJ',
          kind: 'state',
        });
      }
      continue;
    }

    result.push(op);
  }

  return result;
}

export async function removeTextSpanFromPdf(
  pdfBytes: Uint8Array,
  pageIndex: number,
  targetViewportBbox: RectBox,
  targetText: string,
  viewportTransform: Matrix
): Promise<{ updatedBytes: Uint8Array; removedCount: number; detectedColorHex: string }> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const { streams } = inspectPageInternalObjects(pdfDoc, pageIndex, viewportTransform);

  const normalizedTarget = targetText.replace(/\s+/g, ' ').trim().toLowerCase();
  let bestMatch: {
    streamIdx: number;
    opId: number;
    subSpanIndices?: number[];
    score: number;
    colorHex: string;
  } | null = null;

  for (let sIdx = 0; sIdx < streams.length; sIdx++) {
    for (const op of streams[sIdx].ops) {
      if (op.kind !== 'text' || !op.viewportBbox) continue;

      // Check sub-spans first if TJ has multiple distinct segments
      if (op.tjSubSpans && op.tjSubSpans.length > 1) {
        for (const sub of op.tjSubSpans) {
          if (!boxesIntersect(sub.viewportBbox, targetViewportBbox, 6)) continue;
          const subNorm = sub.text.replace(/\s+/g, ' ').trim().toLowerCase();
          const iou =
            overlapArea(sub.viewportBbox, targetViewportBbox) /
            Math.max(
              1,
              sub.viewportBbox.width * sub.viewportBbox.height +
                targetViewportBbox.width * targetViewportBbox.height -
                overlapArea(sub.viewportBbox, targetViewportBbox)
            );
          const textBonus =
            subNorm === normalizedTarget
              ? 3
              : subNorm.includes(normalizedTarget) || normalizedTarget.includes(subNorm)
              ? 1.5
              : 0;
          const score = iou + textBonus;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = {
              streamIdx: sIdx,
              opId: op.id,
              subSpanIndices: sub.tokenIndices,
              score,
              colorHex: op.fillColorHex || '#0f172a',
            };
          }
        }
      }

      if (!boxesIntersect(op.viewportBbox, targetViewportBbox, 6)) continue;
      const opNorm = (op.decodedText || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const areaUnion =
        op.viewportBbox.width * op.viewportBbox.height +
        targetViewportBbox.width * targetViewportBbox.height -
        overlapArea(op.viewportBbox, targetViewportBbox);
      const iou = overlapArea(op.viewportBbox, targetViewportBbox) / Math.max(1, areaUnion);
      const textBonus =
        opNorm === normalizedTarget
          ? 3
          : opNorm.includes(normalizedTarget) || normalizedTarget.includes(opNorm)
          ? 1.5
          : 0;
      const score = iou + textBonus;

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          streamIdx: sIdx,
          opId: op.id,
          score,
          colorHex: op.fillColorHex || '#0f172a',
        };
      }
    }
  }

  // Fallback: if single-span score wasn't strong enough, remove all text ops strongly overlapping the target box
  if (!bestMatch) {
    return { updatedBytes: pdfBytes, removedCount: 0, detectedColorHex: '#0f172a' };
  }

  const targetStream = streams[bestMatch.streamIdx];
  const opsToDelete = new Set<number>();
  const tjPartial = new Map<number, Set<number>>();

  if (bestMatch.subSpanIndices && bestMatch.subSpanIndices.length > 0) {
    tjPartial.set(bestMatch.opId, new Set(bestMatch.subSpanIndices));
  } else {
    opsToDelete.add(bestMatch.opId);
  }

  // Also check if pdfjs merged two adjacent Tj ops into one DetectedTextSpan:
  // Any text op whose center falls strictly inside targetViewportBbox is also part of that span
  if (bestMatch.score < 3.5) {
    for (const op of targetStream.ops) {
      if (op.kind !== 'text' || !op.viewportBbox || op.id === bestMatch.opId) continue;
      const cx = op.viewportBbox.x + op.viewportBbox.width / 2;
      const cy = op.viewportBbox.y + op.viewportBbox.height / 2;
      if (
        cx >= targetViewportBbox.x - 2 &&
        cx <= targetViewportBbox.x + targetViewportBbox.width + 2 &&
        cy >= targetViewportBbox.y - 2 &&
        cy <= targetViewportBbox.y + targetViewportBbox.height + 2
      ) {
        opsToDelete.add(op.id);
      }
    }
  }

  const modifiedOps = applyTextOpRemovalToOps(targetStream.ops, opsToDelete, tjPartial);
  const newStreamBytes = serializeOpsToBytes(modifiedOps);
  writeModifiedStream(pdfDoc, pageIndex, targetStream, newStreamBytes);

  const saved = await pdfDoc.save();
  return {
    updatedBytes: new Uint8Array(saved),
    removedCount: opsToDelete.size + tjPartial.size,
    detectedColorHex: bestMatch.colorHex,
  };
}

export async function removeContentInRectFromPdf(
  pdfBytes: Uint8Array,
  pageIndex: number,
  rectViewport: RectBox,
  viewportTransform: Matrix,
  options: { removeText: boolean; removeImages: boolean }
): Promise<{ updatedBytes: Uint8Array; removedCount: number }> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const { streams } = inspectPageInternalObjects(pdfDoc, pageIndex, viewportTransform);

  let totalRemoved = 0;

  for (const streamInfo of streams) {
    const opsToDelete = new Set<number>();
    const tjPartial = new Map<number, Set<number>>();

    for (const op of streamInfo.ops) {
      if (op.kind === 'text' && options.removeText && op.viewportBbox) {
        if (op.tjSubSpans && op.tjSubSpans.length > 1) {
          const matchedSubIndices = new Set<number>();
          let matchedSubCount = 0;
          for (const sub of op.tjSubSpans) {
            const area = sub.viewportBbox.width * sub.viewportBbox.height;
            const ov = overlapArea(sub.viewportBbox, rectViewport);
            if (ov > 0 && ov / Math.max(1, area) >= 0.25) {
              matchedSubCount++;
              for (const idx of sub.tokenIndices) matchedSubIndices.add(idx);
            }
          }
          if (matchedSubCount === op.tjSubSpans.length) {
            opsToDelete.add(op.id);
            totalRemoved++;
          } else if (matchedSubIndices.size > 0) {
            tjPartial.set(op.id, matchedSubIndices);
            totalRemoved += matchedSubCount;
          }
        } else {
          const area = op.viewportBbox.width * op.viewportBbox.height;
          const ov = overlapArea(op.viewportBbox, rectViewport);
          if (ov > 0 && ov / Math.max(1, area) >= 0.25) {
            opsToDelete.add(op.id);
            totalRemoved++;
          }
        }
      } else if (op.kind === 'image' && options.removeImages && op.viewportBbox) {
        const area = op.viewportBbox.width * op.viewportBbox.height;
        const ov = overlapArea(op.viewportBbox, rectViewport);
        if (ov > 0 && ov / Math.max(1, area) >= 0.35) {
          opsToDelete.add(op.id);
          totalRemoved++;
        }
      }
    }

    if (opsToDelete.size > 0 || tjPartial.size > 0) {
      const modifiedOps = applyTextOpRemovalToOps(streamInfo.ops, opsToDelete, tjPartial);
      const newBytes = serializeOpsToBytes(modifiedOps);
      writeModifiedStream(pdfDoc, pageIndex, streamInfo, newBytes);
    }
  }

  if (totalRemoved === 0) {
    return { updatedBytes: pdfBytes, removedCount: 0 };
  }

  const saved = await pdfDoc.save();
  return { updatedBytes: new Uint8Array(saved), removedCount: totalRemoved };
}

export async function removeSpecificImageFromPdf(
  pdfBytes: Uint8Array,
  pageIndex: number,
  targetImage: DetectedImageObject,
  viewportTransform: Matrix
): Promise<{ updatedBytes: Uint8Array; removed: boolean }> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const { streams } = inspectPageInternalObjects(pdfDoc, pageIndex, viewportTransform);

  const streamInfo = streams.find(s => s.streamKey === targetImage.streamSourceKey);
  if (!streamInfo) return { updatedBytes: pdfBytes, removed: false };

  const opsToDelete = new Set<number>([targetImage.opId]);
  const modifiedOps = applyTextOpRemovalToOps(streamInfo.ops, opsToDelete, new Map());
  const newBytes = serializeOpsToBytes(modifiedOps);
  writeModifiedStream(pdfDoc, pageIndex, streamInfo, newBytes);

  const saved = await pdfDoc.save();
  return { updatedBytes: new Uint8Array(saved), removed: true };
}

export function findColorForViewportBbox(
  textColors: TextColorMapEntry[],
  bbox: RectBox,
  text: string
): string {
  const norm = text.replace(/\s+/g, ' ').trim().toLowerCase();
  let bestScore = 0;
  let bestColor = '#0f172a';
  for (const entry of textColors) {
    if (!boxesIntersect(entry.viewportBbox, bbox, 4)) continue;
    const eNorm = entry.text.replace(/\s+/g, ' ').trim().toLowerCase();
    const ov = overlapArea(entry.viewportBbox, bbox);
    const score = ov + (eNorm === norm ? 1000 : eNorm.includes(norm) ? 400 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestColor = entry.colorHex;
    }
  }
  return bestColor;
}
