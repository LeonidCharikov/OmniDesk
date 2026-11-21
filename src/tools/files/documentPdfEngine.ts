import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { unzipSync } from 'fflate';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';

import liberationSansRegularUrl from '../../assets/fonts/LiberationSans-Regular.ttf?url';
import liberationSansBoldUrl from '../../assets/fonts/LiberationSans-Bold.ttf?url';
import liberationSansItalicUrl from '../../assets/fonts/LiberationSans-Italic.ttf?url';
import liberationSansBoldItalicUrl from '../../assets/fonts/LiberationSans-BoldItalic.ttf?url';
import liberationMonoRegularUrl from '../../assets/fonts/LiberationMono-Regular.ttf?url';

// ---------------------------------------------------------------------------
// TYPES & LAYOUT MODEL
// ---------------------------------------------------------------------------

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface TextRunModel {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  mono: boolean;
  fontSize: number;
  color: RgbColor;
  isLineBreak?: boolean;
  isPageBreak?: boolean;
}

export interface ImageBlockModel {
  kind: 'image';
  bytes: Uint8Array;
  mime: 'image/png' | 'image/jpeg';
  widthPt: number;
  heightPt: number;
  align: TextAlign;
  spaceBefore: number;
  spaceAfter: number;
}

export interface ParagraphBlockModel {
  kind: 'paragraph';
  runs: TextRunModel[];
  align: TextAlign;
  spaceBefore: number;
  spaceAfter: number;
  lineHeightMultiplier: number;
  indentLeft: number;
  firstLineIndent: number;
  listMarker?: string;
  pageBreakBefore?: boolean;
  bottomBorder?: boolean;
  backgroundColor?: RgbColor;
  leftBorderColor?: RgbColor;
  defaultFontSize: number;
}

export interface TableCellModel {
  paragraphs: ParagraphBlockModel[];
  colSpan: number;
  backgroundColor?: RgbColor;
  isHeader?: boolean;
  widthPt?: number;
}

export interface TableRowModel {
  cells: TableCellModel[];
  isHeader?: boolean;
}

export interface TableBlockModel {
  kind: 'table';
  colWidthsPt: number[];
  rows: TableRowModel[];
  hasBorders: boolean;
  spaceBefore: number;
  spaceAfter: number;
}

export interface PageBreakBlockModel {
  kind: 'page-break';
}

export interface HorizontalRuleBlockModel {
  kind: 'hr';
  spaceBefore: number;
  spaceAfter: number;
}

export type DocumentBlock =
  | ParagraphBlockModel
  | TableBlockModel
  | ImageBlockModel
  | PageBreakBlockModel
  | HorizontalRuleBlockModel;

export interface DocumentLayoutModel {
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  blocks: DocumentBlock[];
}

export interface FontBundleBytes {
  regular: Uint8Array;
  bold: Uint8Array;
  italic: Uint8Array;
  boldItalic: Uint8Array;
  mono: Uint8Array;
}

interface EmbeddedFontPack {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  mono: PDFFont;
  charSets: Map<PDFFont, Set<number>>;
}

// ---------------------------------------------------------------------------
// CONSTANTS & FONT CACHE
// ---------------------------------------------------------------------------

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const DEFAULT_MARGIN = 56.7; // 20 mm
const DEFAULT_FONT_SIZE = 10.5;
const DEFAULT_TEXT_COLOR: RgbColor = { r: 0.08, g: 0.09, b: 0.12 };

let cachedFontBundle: FontBundleBytes | null = null;
let fontBundlePromise: Promise<FontBundleBytes> | null = null;

export function setDocumentPdfFontBundle(bundle: FontBundleBytes | null): void {
  cachedFontBundle = bundle;
  fontBundlePromise = null;
}

async function fetchFontAsset(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load bundled Unicode font (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function loadFontBundle(): Promise<FontBundleBytes> {
  if (cachedFontBundle) return cachedFontBundle;
  if (!fontBundlePromise) {
    fontBundlePromise = Promise.all([
      fetchFontAsset(liberationSansRegularUrl),
      fetchFontAsset(liberationSansBoldUrl),
      fetchFontAsset(liberationSansItalicUrl),
      fetchFontAsset(liberationSansBoldItalicUrl),
      fetchFontAsset(liberationMonoRegularUrl),
    ])
      .then(([regular, bold, italic, boldItalic, mono]) => {
        cachedFontBundle = { regular, bold, italic, boldItalic, mono };
        return cachedFontBundle;
      })
      .catch(err => {
        fontBundlePromise = null;
        throw err;
      });
  }
  return fontBundlePromise;
}

async function embedFontPack(pdfDoc: PDFDocument): Promise<EmbeddedFontPack> {
  pdfDoc.registerFontkit(fontkit);
  const bundle = await loadFontBundle();
  const [regular, bold, italic, boldItalic, mono] = await Promise.all([
    pdfDoc.embedFont(bundle.regular, { subset: true }),
    pdfDoc.embedFont(bundle.bold, { subset: true }),
    pdfDoc.embedFont(bundle.italic, { subset: true }),
    pdfDoc.embedFont(bundle.boldItalic, { subset: true }),
    pdfDoc.embedFont(bundle.mono, { subset: true }),
  ]);

  const charSets = new Map<PDFFont, Set<number>>();
  for (const font of [regular, bold, italic, boldItalic, mono]) {
    charSets.set(font, new Set(font.getCharacterSet()));
  }

  return { regular, bold, italic, boldItalic, mono, charSets };
}

function selectFont(pack: EmbeddedFontPack, run: Pick<TextRunModel, 'bold' | 'italic' | 'mono'>): PDFFont {
  if (run.mono) return pack.mono;
  if (run.bold && run.italic) return pack.boldItalic;
  if (run.bold) return pack.bold;
  if (run.italic) return pack.italic;
  return pack.regular;
}

/**
 * Preserves full Unicode (Czech, Slovak, German, Polish, Spanish, Russian/Cyrillic, Greek,
 * typographic dashes/quotes, currency symbols) while safely cleaning control characters
 * and substituting any codepoint absent from the embedded font so pdf-lib never throws.
 */
function sanitizeForFont(text: string, font: PDFFont, pack: EmbeddedFontPack): string {
  const supported = pack.charSets.get(font);
  const cleaned = text
    .replace(/\r/g, '')
    .replace(/\t/g, '    ')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F\uFEFF\u200B-\u200D\u2060]/g, '');

  if (!supported || supported.size === 0) return cleaned;

  let out = '';
  for (const ch of cleaned) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (supported.has(cp)) {
      out += ch;
      continue;
    }
    if (cp === 0x00a0 || cp === 0x2002 || cp === 0x2003 || cp === 0x2009 || cp === 0x202f) {
      out += ' ';
      continue;
    }
    // Try compatibility decomposition (e.g. ligatures or fancy spaces) before fallback
    const nfkc = ch.normalize('NFKC');
    if (nfkc !== ch) {
      let ok = true;
      for (const sub of nfkc) {
        const subCp = sub.codePointAt(0);
        if (subCp === undefined || !supported.has(subCp)) {
          ok = false;
          break;
        }
      }
      if (ok) {
        out += nfkc;
        continue;
      }
    }
    // Try stripping combining diacritics only if the exact composed glyph isn't in font
    const stripped = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (stripped.length > 0) {
      const baseCp = stripped.codePointAt(0);
      if (baseCp !== undefined && supported.has(baseCp)) {
        out += stripped[0];
        continue;
      }
    }
    out += supported.has(0x25a1) ? '□' : '?';
  }
  return out;
}

// ---------------------------------------------------------------------------
// COLOR & XML HELPERS
// ---------------------------------------------------------------------------

function parseHexColor(val: string | null | undefined, fallback?: RgbColor): RgbColor | undefined {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/^#/, '');
  if (cleaned.toLowerCase() === 'auto' || cleaned.toLowerCase() === 'transparent' || cleaned.toLowerCase() === 'none') {
    return fallback;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16) / 255,
      g: parseInt(cleaned.slice(2, 4), 16) / 255,
      b: parseInt(cleaned.slice(4, 6), 16) / 255,
    };
  }
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16) / 255,
      g: parseInt(cleaned[1] + cleaned[1], 16) / 255,
      b: parseInt(cleaned[2] + cleaned[2], 16) / 255,
    };
  }
  const rgbMatch = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(val.trim());
  if (rgbMatch) {
    return {
      r: Math.min(255, Number(rgbMatch[1])) / 255,
      g: Math.min(255, Number(rgbMatch[2])) / 255,
      b: Math.min(255, Number(rgbMatch[3])) / 255,
    };
  }
  return fallback;
}

function localNameOf(node: Element): string {
  if (node.localName) return node.localName;
  const tag = node.tagName || node.nodeName || '';
  const idx = tag.indexOf(':');
  return idx >= 0 ? tag.slice(idx + 1) : tag;
}

function getChildrenByLocalName(parent: Element | null | undefined, localName: string): Element[] {
  if (!parent) return [];
  const result: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (localNameOf(child) === localName) {
      result.push(child);
    }
  }
  return result;
}

function getChildByLocalName(parent: Element | null | undefined, localName: string): Element | null {
  if (!parent) return null;
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (localNameOf(child) === localName) {
      return child;
    }
  }
  return null;
}

function getDescendantsByLocalName(parent: Element | null | undefined, localName: string): Element[] {
  if (!parent) return [];
  const result: Element[] = [];
  const stack: Element[] = [];
  for (let i = parent.children.length - 1; i >= 0; i--) {
    stack.push(parent.children[i]);
  }
  while (stack.length > 0) {
    const el = stack.pop()!;
    if (localNameOf(el) === localName) {
      result.push(el);
    }
    for (let i = el.children.length - 1; i >= 0; i--) {
      stack.push(el.children[i]);
    }
  }
  return result;
}

function getAttrByLocalName(el: Element | null | undefined, attrLocalName: string): string | null {
  if (!el) return null;
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    const name = attr.localName || (attr.name.includes(':') ? attr.name.split(':')[1] : attr.name);
    if (name === attrLocalName) return attr.value;
  }
  return null;
}

function parseXmlDocument(xmlText: string): Document | null {
  if (typeof DOMParser === 'undefined') return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) return null;
  return doc;
}

function twipsToPt(val: string | null | undefined): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  if (!Number.isFinite(n)) return undefined;
  return n / 20;
}

function parseToggleProp(el: Element | null): boolean | undefined {
  if (!el) return undefined;
  const val = getAttrByLocalName(el, 'val');
  if (val === null) return true;
  const lower = val.toLowerCase();
  if (lower === '0' || lower === 'false' || lower === 'none' || lower === 'off') return false;
  return true;
}

// ---------------------------------------------------------------------------
// OOXML (.DOCX) FULL PARSER -> DOCUMENT LAYOUT MODEL
// ---------------------------------------------------------------------------

interface ResolvedStyleProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  mono?: boolean;
  fontSize?: number;
  color?: RgbColor;
  align?: TextAlign;
  spaceBefore?: number;
  spaceAfter?: number;
  lineHeightMultiplier?: number;
  indentLeft?: number;
  firstLineIndent?: number;
  pageBreakBefore?: boolean;
  bottomBorder?: boolean;
  backgroundColor?: RgbColor;
}

interface RawDocxStyle {
  id: string;
  basedOn?: string;
  props: ResolvedStyleProps;
}

interface NumberingLevelDef {
  numFmt: string;
  lvlText: string;
  start: number;
}

function extractRunProps(rPr: Element | null): ResolvedStyleProps {
  if (!rPr) return {};
  const props: ResolvedStyleProps = {};

  const b = parseToggleProp(getChildByLocalName(rPr, 'b'));
  if (b !== undefined) props.bold = b;

  const i = parseToggleProp(getChildByLocalName(rPr, 'i'));
  if (i !== undefined) props.italic = i;

  const uEl = getChildByLocalName(rPr, 'u');
  if (uEl) {
    const uVal = getAttrByLocalName(uEl, 'val')?.toLowerCase();
    props.underline = uVal !== 'none' && uVal !== 'false' && uVal !== '0';
  }

  const strike = parseToggleProp(getChildByLocalName(rPr, 'strike'));
  if (strike !== undefined) props.strike = strike;

  const szEl = getChildByLocalName(rPr, 'sz');
  const szVal = getAttrByLocalName(szEl, 'val');
  if (szVal) {
    const halfPt = Number(szVal);
    if (Number.isFinite(halfPt) && halfPt > 0) {
      props.fontSize = Math.max(6, Math.min(72, halfPt / 2));
    }
  }

  const colorEl = getChildByLocalName(rPr, 'color');
  const color = parseHexColor(getAttrByLocalName(colorEl, 'val'));
  if (color) props.color = color;

  const rFonts = getChildByLocalName(rPr, 'rFonts');
  const asciiFont = (getAttrByLocalName(rFonts, 'ascii') || getAttrByLocalName(rFonts, 'hAnsi') || '').toLowerCase();
  if (asciiFont && /(courier|consolas|mono|menlo|fira code|jetbrains)/i.test(asciiFont)) {
    props.mono = true;
  }

  return props;
}

function extractParaProps(pPr: Element | null): ResolvedStyleProps {
  if (!pPr) return {};
  const props: ResolvedStyleProps = {};

  const jcEl = getChildByLocalName(pPr, 'jc');
  const jc = getAttrByLocalName(jcEl, 'val')?.toLowerCase();
  if (jc === 'center') props.align = 'center';
  else if (jc === 'right' || jc === 'end') props.align = 'right';
  else if (jc === 'both' || jc === 'distribute') props.align = 'justify';
  else if (jc === 'left' || jc === 'start') props.align = 'left';

  const spacingEl = getChildByLocalName(pPr, 'spacing');
  if (spacingEl) {
    const before = twipsToPt(getAttrByLocalName(spacingEl, 'before'));
    const after = twipsToPt(getAttrByLocalName(spacingEl, 'after'));
    if (before !== undefined) props.spaceBefore = Math.max(0, before);
    if (after !== undefined) props.spaceAfter = Math.max(0, after);
    const lineVal = Number(getAttrByLocalName(spacingEl, 'line'));
    const lineRule = getAttrByLocalName(spacingEl, 'lineRule') || 'auto';
    if (Number.isFinite(lineVal) && lineVal > 0 && lineRule === 'auto') {
      props.lineHeightMultiplier = Math.max(1.05, Math.min(2.4, (lineVal / 240) * 1.15));
    }
  }

  const indEl = getChildByLocalName(pPr, 'ind');
  if (indEl) {
    const left = twipsToPt(getAttrByLocalName(indEl, 'left') || getAttrByLocalName(indEl, 'start'));
    const firstLine = twipsToPt(getAttrByLocalName(indEl, 'firstLine'));
    const hanging = twipsToPt(getAttrByLocalName(indEl, 'hanging'));
    if (left !== undefined) props.indentLeft = Math.max(0, left);
    if (firstLine !== undefined) props.firstLineIndent = firstLine;
    else if (hanging !== undefined) props.firstLineIndent = -Math.min(hanging, props.indentLeft ?? hanging);
  }

  if (parseToggleProp(getChildByLocalName(pPr, 'pageBreakBefore'))) {
    props.pageBreakBefore = true;
  }

  const pBdr = getChildByLocalName(pPr, 'pBdr');
  if (pBdr) {
    const bottom = getChildByLocalName(pBdr, 'bottom');
    const bVal = getAttrByLocalName(bottom, 'val')?.toLowerCase();
    if (bottom && bVal && bVal !== 'none' && bVal !== 'nil') {
      props.bottomBorder = true;
    }
  }

  const shd = getChildByLocalName(pPr, 'shd');
  if (shd) {
    const bg = parseHexColor(getAttrByLocalName(shd, 'fill'));
    if (bg) props.backgroundColor = bg;
  }

  const rPr = getChildByLocalName(pPr, 'rPr');
  if (rPr) {
    Object.assign(props, extractRunProps(rPr));
  }

  return props;
}

function mergeStyleProps(base: ResolvedStyleProps, override: ResolvedStyleProps): ResolvedStyleProps {
  const out: ResolvedStyleProps = { ...base };
  (Object.keys(override) as Array<keyof ResolvedStyleProps>).forEach(key => {
    const val = override[key];
    if (val !== undefined) {
      (out as Record<string, unknown>)[key] = val;
    }
  });
  return out;
}

function parseDocxStyles(files: Record<string, Uint8Array>): {
  docDefaults: ResolvedStyleProps;
  resolveStyle: (styleId?: string | null) => ResolvedStyleProps;
} {
  const dec = new TextDecoder();
  const stylesBytes = files['word/styles.xml'];
  const docDefaults: ResolvedStyleProps = {
    fontSize: 11,
    color: DEFAULT_TEXT_COLOR,
    align: 'left',
    spaceBefore: 0,
    spaceAfter: 6,
    lineHeightMultiplier: 1.28,
    indentLeft: 0,
    firstLineIndent: 0,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    mono: false,
  };

  const rawMap = new Map<string, RawDocxStyle>();
  let defaultParaStyleId: string | null = null;

  if (stylesBytes) {
    const doc = parseXmlDocument(dec.decode(stylesBytes));
    if (doc?.documentElement) {
      const defaultsEl = getChildByLocalName(doc.documentElement, 'docDefaults');
      if (defaultsEl) {
        const rPrDef = getChildByLocalName(getChildByLocalName(defaultsEl, 'rPrDefault'), 'rPr');
        const pPrDef = getChildByLocalName(getChildByLocalName(defaultsEl, 'pPrDefault'), 'pPr');
        Object.assign(docDefaults, extractRunProps(rPrDef), extractParaProps(pPrDef));
      }

      const styleEls = getChildrenByLocalName(doc.documentElement, 'style');
      for (const sEl of styleEls) {
        const id = getAttrByLocalName(sEl, 'styleId');
        if (!id) continue;
        const type = getAttrByLocalName(sEl, 'type');
        const isDefault = getAttrByLocalName(sEl, 'default') === '1';
        if (type === 'paragraph' && isDefault) {
          defaultParaStyleId = id;
        }
        const basedOnEl = getChildByLocalName(sEl, 'basedOn');
        const basedOn = getAttrByLocalName(basedOnEl, 'val') ?? undefined;
        const pPr = getChildByLocalName(sEl, 'pPr');
        const rPr = getChildByLocalName(sEl, 'rPr');
        const props = mergeStyleProps(extractParaProps(pPr), extractRunProps(rPr));

        // Ensure standard heading styles look clearly distinguished even if minimal
        const lowerId = id.toLowerCase();
        if (lowerId === 'title' && props.fontSize === undefined) {
          props.fontSize = 20;
          props.bold = props.bold ?? true;
        } else if (/^heading1$|^nadpis1$/i.test(lowerId) && props.fontSize === undefined) {
          props.fontSize = 16;
          props.bold = props.bold ?? true;
        } else if (/^heading2$|^nadpis2$/i.test(lowerId) && props.fontSize === undefined) {
          props.fontSize = 13.5;
          props.bold = props.bold ?? true;
        } else if (/^heading3$|^nadpis3$/i.test(lowerId) && props.fontSize === undefined) {
          props.fontSize = 12;
          props.bold = props.bold ?? true;
        }

        rawMap.set(id, { id, basedOn, props });
      }
    }
  }

  const resolvedCache = new Map<string, ResolvedStyleProps>();
  const resolveById = (styleId: string, visited = new Set<string>()): ResolvedStyleProps => {
    if (resolvedCache.has(styleId)) return resolvedCache.get(styleId)!;
    if (visited.has(styleId)) return docDefaults;
    visited.add(styleId);
    const entry = rawMap.get(styleId);
    if (!entry) return docDefaults;
    const parent = entry.basedOn ? resolveById(entry.basedOn, visited) : docDefaults;
    const merged = mergeStyleProps(parent, entry.props);
    resolvedCache.set(styleId, merged);
    return merged;
  };

  const baseParaStyle = defaultParaStyleId ? resolveById(defaultParaStyleId) : docDefaults;

  return {
    docDefaults: baseParaStyle,
    resolveStyle: (styleId?: string | null) => {
      if (!styleId) return baseParaStyle;
      if (rawMap.has(styleId)) return resolveById(styleId);
      return baseParaStyle;
    },
  };
}

function parseDocxNumbering(files: Record<string, Uint8Array>): Map<string, Map<number, NumberingLevelDef>> {
  const result = new Map<string, Map<number, NumberingLevelDef>>();
  const bytes = files['word/numbering.xml'];
  if (!bytes) return result;
  const doc = parseXmlDocument(new TextDecoder().decode(bytes));
  if (!doc?.documentElement) return result;

  const abstractMap = new Map<string, Map<number, NumberingLevelDef>>();
  for (const abs of getChildrenByLocalName(doc.documentElement, 'abstractNum')) {
    const absId = getAttrByLocalName(abs, 'abstractNumId');
    if (!absId) continue;
    const levels = new Map<number, NumberingLevelDef>();
    for (const lvl of getChildrenByLocalName(abs, 'lvl')) {
      const ilvl = Number(getAttrByLocalName(lvl, 'ilvl') ?? '0');
      const numFmt = getAttrByLocalName(getChildByLocalName(lvl, 'numFmt'), 'val') ?? 'bullet';
      const lvlText = getAttrByLocalName(getChildByLocalName(lvl, 'lvlText'), 'val') ?? '•';
      const start = Number(getAttrByLocalName(getChildByLocalName(lvl, 'start'), 'val') ?? '1');
      levels.set(ilvl, { numFmt, lvlText, start: Number.isFinite(start) ? start : 1 });
    }
    abstractMap.set(absId, levels);
  }

  for (const num of getChildrenByLocalName(doc.documentElement, 'num')) {
    const numId = getAttrByLocalName(num, 'numId');
    const absId = getAttrByLocalName(getChildByLocalName(num, 'abstractNumId'), 'val');
    if (numId && absId && abstractMap.has(absId)) {
      result.set(numId, abstractMap.get(absId)!);
    }
  }

  return result;
}

function parseDocxRels(files: Record<string, Uint8Array>): Map<string, string> {
  const rels = new Map<string, string>();
  const bytes = files['word/_rels/document.xml.rels'];
  if (!bytes) return rels;
  const doc = parseXmlDocument(new TextDecoder().decode(bytes));
  if (!doc?.documentElement) return rels;

  for (const rel of getChildrenByLocalName(doc.documentElement, 'Relationship')) {
    const id = getAttrByLocalName(rel, 'Id');
    const target = getAttrByLocalName(rel, 'Target');
    if (id && target) {
      rels.set(id, target);
    }
  }
  return rels;
}

function resolveZipMediaEntry(files: Record<string, Uint8Array>, target: string): { bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' } | null {
  const cleanTarget = target.replace(/^\/+/, '').replace(/^\.\.\//, '');
  const candidates = [
    `word/${cleanTarget}`,
    cleanTarget,
  ];
  for (const key of candidates) {
    const bytes = files[key];
    if (bytes && bytes.length > 8) {
      // Detect PNG / JPEG by magic bytes
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        return { bytes, mime: 'image/png' };
      }
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        return { bytes, mime: 'image/jpeg' };
      }
    }
  }
  return null;
}

function formatListCounter(numFmt: string, count: number): string {
  if (numFmt === 'bullet') return '•';
  if (numFmt === 'lowerLetter') {
    const code = ((count - 1) % 26) + 97;
    return `${String.fromCharCode(code)}.`;
  }
  if (numFmt === 'upperLetter') {
    const code = ((count - 1) % 26) + 65;
    return `${String.fromCharCode(code)}.`;
  }
  if (numFmt === 'lowerRoman' || numFmt === 'upperRoman') {
    const pairs: Array<[number, string]> = [
      [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
      [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
      [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
    ];
    let n = Math.max(1, count);
    let str = '';
    for (const [val, sym] of pairs) {
      while (n >= val) {
        str += sym;
        n -= val;
      }
    }
    return `${numFmt === 'upperRoman' ? str.toUpperCase() : str}.`;
  }
  return `${count}.`;
}

export function parseDocxToLayoutModel(arrayBuffer: ArrayBuffer): DocumentLayoutModel {
  const files = unzipSync(new Uint8Array(arrayBuffer));
  const docXmlBytes = files['word/document.xml'];
  if (!docXmlBytes) {
    throw new Error('Invalid DOCX archive: missing word/document.xml');
  }

  const doc = parseXmlDocument(new TextDecoder().decode(docXmlBytes));
  if (!doc?.documentElement) {
    throw new Error('Invalid DOCX XML structure.');
  }

  const body = getChildByLocalName(doc.documentElement, 'body');
  if (!body) {
    throw new Error('DOCX document is missing body content.');
  }

  const { resolveStyle } = parseDocxStyles(files);
  const numberingMap = parseDocxNumbering(files);
  const relsMap = parseDocxRels(files);
  const listCounters = new Map<string, number>();

  // Extract page size & margins from sectPr
  let pageWidth = A4_WIDTH;
  let pageHeight = A4_HEIGHT;
  let marginTop = DEFAULT_MARGIN;
  let marginRight = DEFAULT_MARGIN;
  let marginBottom = DEFAULT_MARGIN;
  let marginLeft = DEFAULT_MARGIN;

  const sectPr = getChildByLocalName(body, 'sectPr') ?? getDescendantsByLocalName(body, 'sectPr')[0];
  if (sectPr) {
    const pgSz = getChildByLocalName(sectPr, 'pgSz');
    if (pgSz) {
      const w = twipsToPt(getAttrByLocalName(pgSz, 'w'));
      const h = twipsToPt(getAttrByLocalName(pgSz, 'h'));
      if (w && w >= 200 && w <= 2000) pageWidth = w;
      if (h && h >= 200 && h <= 2000) pageHeight = h;
    }
    const pgMar = getChildByLocalName(sectPr, 'pgMar');
    if (pgMar) {
      const top = twipsToPt(getAttrByLocalName(pgMar, 'top'));
      const right = twipsToPt(getAttrByLocalName(pgMar, 'right'));
      const bottom = twipsToPt(getAttrByLocalName(pgMar, 'bottom'));
      const left = twipsToPt(getAttrByLocalName(pgMar, 'left'));
      if (top !== undefined) marginTop = Math.max(24, Math.min(144, top));
      if (right !== undefined) marginRight = Math.max(24, Math.min(144, right));
      if (bottom !== undefined) marginBottom = Math.max(24, Math.min(144, bottom));
      if (left !== undefined) marginLeft = Math.max(24, Math.min(144, left));
    }
  }

  const contentWidth = pageWidth - marginLeft - marginRight;

  const parseParagraphElement = (
    pEl: Element,
    extractedImages: ImageBlockModel[]
  ): ParagraphBlockModel => {
    const pPr = getChildByLocalName(pEl, 'pPr');
    const pStyleId = getAttrByLocalName(getChildByLocalName(pPr, 'pStyle'), 'val');
    const styleProps = resolveStyle(pStyleId);
    const directPProps = extractParaProps(pPr);
    const mergedP = mergeStyleProps(styleProps, directPProps);

    let listMarker: string | undefined;
    let extraIndent = 0;
    const numPr = getChildByLocalName(pPr, 'numPr');
    if (numPr) {
      const numId = getAttrByLocalName(getChildByLocalName(numPr, 'numId'), 'val');
      const ilvl = Number(getAttrByLocalName(getChildByLocalName(numPr, 'ilvl'), 'val') ?? '0');
      if (numId && numId !== '0') {
        const levelDef = numberingMap.get(numId)?.get(ilvl);
        const key = `${numId}:${ilvl}`;
        const prev = listCounters.get(key) ?? ((levelDef?.start ?? 1) - 1);
        const next = prev + 1;
        listCounters.set(key, next);
        listMarker = formatListCounter(levelDef?.numFmt ?? 'bullet', next);
        extraIndent = (ilvl + 1) * 18;
      }
    }

    const runs: TextRunModel[] = [];

    const collectRunsFromContainer = (container: Element, isHyperlink = false) => {
      for (let i = 0; i < container.children.length; i++) {
        const child = container.children[i];
        const tag = localNameOf(child);

        if (tag === 'hyperlink' || tag === 'smartTag' || tag === 'ins' || tag === 'sdt') {
          const inner = tag === 'sdt' ? getChildByLocalName(child, 'sdtContent') ?? child : child;
          collectRunsFromContainer(inner, isHyperlink || tag === 'hyperlink');
          continue;
        }

        if (tag !== 'r') continue;

        const rPr = getChildByLocalName(child, 'rPr');
        const rStyleId = getAttrByLocalName(getChildByLocalName(rPr, 'rStyle'), 'val');
        const rStyleProps = rStyleId ? resolveStyle(rStyleId) : {};
        const directRProps = extractRunProps(rPr);
        const finalR = mergeStyleProps(mergeStyleProps(mergedP, rStyleProps), directRProps);

        const baseRun: Omit<TextRunModel, 'text'> = {
          bold: Boolean(finalR.bold),
          italic: Boolean(finalR.italic),
          underline: Boolean(finalR.underline || isHyperlink),
          strike: Boolean(finalR.strike),
          mono: Boolean(finalR.mono),
          fontSize: finalR.fontSize ?? mergedP.fontSize ?? DEFAULT_FONT_SIZE,
          color: finalR.color ?? (isHyperlink ? { r: 0.1, g: 0.32, b: 0.72 } : DEFAULT_TEXT_COLOR),
        };

        for (let j = 0; j < child.children.length; j++) {
          const rChild = child.children[j];
          const rTag = localNameOf(rChild);

          if (rTag === 't' || rTag === 'delText') {
            const text = rChild.textContent ?? '';
            if (text.length > 0) {
              runs.push({ ...baseRun, text });
            }
          } else if (rTag === 'tab') {
            runs.push({ ...baseRun, text: '    ' });
          } else if (rTag === 'br' || rTag === 'cr') {
            const brType = getAttrByLocalName(rChild, 'type');
            if (brType === 'page') {
              runs.push({ ...baseRun, text: '', isPageBreak: true });
            } else {
              runs.push({ ...baseRun, text: '', isLineBreak: true });
            }
          } else if (rTag === 'drawing' || rTag === 'pict') {
            const blips = getDescendantsByLocalName(rChild, 'blip');
            const imgDataNodes = blips.length > 0 ? blips : getDescendantsByLocalName(rChild, 'imagedata');
            for (const blip of imgDataNodes) {
              const rId = getAttrByLocalName(blip, 'embed') || getAttrByLocalName(blip, 'id');
              if (!rId) continue;
              const target = relsMap.get(rId);
              if (!target) continue;
              const media = resolveZipMediaEntry(files, target);
              if (!media) continue;

              const extent = getDescendantsByLocalName(rChild, 'extent')[0];
              const cx = Number(getAttrByLocalName(extent, 'cx') ?? '0');
              const cy = Number(getAttrByLocalName(extent, 'cy') ?? '0');
              // 1 pt = 12700 EMU
              const widthPt = cx > 0 ? cx / 12700 : contentWidth * 0.7;
              const heightPt = cy > 0 ? cy / 12700 : 180;

              extractedImages.push({
                kind: 'image',
                bytes: media.bytes,
                mime: media.mime,
                widthPt,
                heightPt,
                align: mergedP.align ?? 'left',
                spaceBefore: 4,
                spaceAfter: 6,
              });
            }
          }
        }
      }
    };

    collectRunsFromContainer(pEl);

    return {
      kind: 'paragraph',
      runs,
      align: mergedP.align ?? 'left',
      spaceBefore: mergedP.spaceBefore ?? 0,
      spaceAfter: mergedP.spaceAfter ?? 6,
      lineHeightMultiplier: mergedP.lineHeightMultiplier ?? 1.28,
      indentLeft: Math.max(mergedP.indentLeft ?? 0, extraIndent),
      firstLineIndent: mergedP.firstLineIndent ?? 0,
      listMarker,
      pageBreakBefore: mergedP.pageBreakBefore,
      bottomBorder: mergedP.bottomBorder,
      backgroundColor: mergedP.backgroundColor,
      defaultFontSize: mergedP.fontSize ?? DEFAULT_FONT_SIZE,
    };
  };

  const parseTableElement = (tblEl: Element): TableBlockModel => {
    const tblPr = getChildByLocalName(tblEl, 'tblPr');
    const tblBorders = getChildByLocalName(tblPr, 'tblBorders');
    let hasBorders = true;
    if (tblBorders) {
      const topVal = getAttrByLocalName(getChildByLocalName(tblBorders, 'top'), 'val');
      const insideHVal = getAttrByLocalName(getChildByLocalName(tblBorders, 'insideH'), 'val');
      if (topVal === 'none' && insideHVal === 'none') {
        hasBorders = false;
      }
    }

    const tblGrid = getChildByLocalName(tblEl, 'tblGrid');
    const gridCols = getChildrenByLocalName(tblGrid, 'gridCol')
      .map(col => twipsToPt(getAttrByLocalName(col, 'w')) ?? 0)
      .filter(w => w > 0);

    const rows: TableRowModel[] = [];
    let maxCols = gridCols.length;

    for (const tr of getChildrenByLocalName(tblEl, 'tr')) {
      const trPr = getChildByLocalName(tr, 'trPr');
      const isHeader = Boolean(getChildByLocalName(trPr, 'tblHeader'));
      const cells: TableCellModel[] = [];
      let rowCols = 0;

      for (const tc of getChildrenByLocalName(tr, 'tc')) {
        const tcPr = getChildByLocalName(tc, 'tcPr');
        const gridSpan = Number(getAttrByLocalName(getChildByLocalName(tcPr, 'gridSpan'), 'val') ?? '1');
        const colSpan = Number.isFinite(gridSpan) && gridSpan >= 1 ? Math.floor(gridSpan) : 1;
        rowCols += colSpan;

        const shd = getChildByLocalName(tcPr, 'shd');
        const bg = parseHexColor(getAttrByLocalName(shd, 'fill'));
        const tcW = twipsToPt(getAttrByLocalName(getChildByLocalName(tcPr, 'tcW'), 'w'));

        const cellParas: ParagraphBlockModel[] = [];
        for (const pChild of getChildrenByLocalName(tc, 'p')) {
          const dummyImgs: ImageBlockModel[] = [];
          const p = parseParagraphElement(pChild, dummyImgs);
          p.spaceBefore = Math.min(p.spaceBefore, 2);
          p.spaceAfter = Math.min(p.spaceAfter, 3);
          cellParas.push(p);
        }

        cells.push({
          paragraphs: cellParas,
          colSpan,
          backgroundColor: bg,
          isHeader,
          widthPt: tcW,
        });
      }
      if (rowCols > maxCols) maxCols = rowCols;
      if (cells.length > 0) {
        rows.push({ cells, isHeader });
      }
    }

    let colWidthsPt = gridCols;
    if (colWidthsPt.length < maxCols) {
      const colCount = Math.max(1, maxCols);
      colWidthsPt = Array.from({ length: colCount }, () => contentWidth / colCount);
    } else if (colWidthsPt.length > 0) {
      const sum = colWidthsPt.reduce((a, b) => a + b, 0);
      if (sum > contentWidth || sum < contentWidth * 0.4) {
        const scale = contentWidth / Math.max(1, sum);
        colWidthsPt = colWidthsPt.map(w => w * scale);
      }
    }

    return {
      kind: 'table',
      colWidthsPt,
      rows,
      hasBorders,
      spaceBefore: 4,
      spaceAfter: 8,
    };
  };

  const blocks: DocumentBlock[] = [];

  for (let i = 0; i < body.children.length; i++) {
    const child = body.children[i];
    const tag = localNameOf(child);

    if (tag === 'p') {
      const extractedImages: ImageBlockModel[] = [];
      const para = parseParagraphElement(child, extractedImages);
      if (para.runs.length > 0 || extractedImages.length === 0) {
        blocks.push(para);
      }
      for (const img of extractedImages) {
        blocks.push(img);
      }
    } else if (tag === 'tbl') {
      blocks.push(parseTableElement(child));
    } else if (tag === 'sdt') {
      const sdtContent = getChildByLocalName(child, 'sdtContent');
      if (sdtContent) {
        for (let j = 0; j < sdtContent.children.length; j++) {
          const inner = sdtContent.children[j];
          const innerTag = localNameOf(inner);
          if (innerTag === 'p') {
            const imgs: ImageBlockModel[] = [];
            blocks.push(parseParagraphElement(inner, imgs));
            imgs.forEach(img => blocks.push(img));
          } else if (innerTag === 'tbl') {
            blocks.push(parseTableElement(inner));
          }
        }
      }
    }
  }

  return {
    pageWidth,
    pageHeight,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// HTML -> DOCUMENT LAYOUT MODEL
// ---------------------------------------------------------------------------

function decodeDataUrlImage(src: string): { bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' } | null {
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,([A-Za-z0-9+/=\s]+)$/i.exec(src.trim());
  if (!match) return null;
  const mime = match[1].toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg';
  const binary = atob(match[2].replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

function parseAlignFromStyle(el: Element): TextAlign | undefined {
  const alignAttr = el.getAttribute('align')?.toLowerCase();
  if (alignAttr === 'center' || alignAttr === 'right' || alignAttr === 'justify' || alignAttr === 'left') {
    return alignAttr;
  }
  const style = el.getAttribute('style') || '';
  const m = /text-align\s*:\s*(left|center|right|justify)/i.exec(style);
  if (m) return m[1].toLowerCase() as TextAlign;
  return undefined;
}

function parseColorFromStyle(el: Element): RgbColor | undefined {
  const style = el.getAttribute('style') || '';
  const m = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
  if (m) return parseHexColor(m[1]);
  return undefined;
}

export function parseHtmlToLayoutModel(rawHtml: string): DocumentLayoutModel {
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['style', 'align', 'colspan'],
  });

  const blocks: DocumentBlock[] = [];
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  if (!parser) {
    return parsePlainTextToLayoutModel(safeHtml.replace(/<[^>]+>/g, ''));
  }

  const doc = parser.parseFromString(safeHtml, 'text/html');
  const contentWidth = A4_WIDTH - DEFAULT_MARGIN * 2;

  interface InlineState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    mono: boolean;
    fontSize: number;
    color: RgbColor;
  }

  const collectInlineRuns = (
    node: Node,
    state: InlineState,
    runs: TextRunModel[],
    images: ImageBlockModel[]
  ) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? '';
      if (text.length > 0) {
        runs.push({ ...state, text });
      }
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'script' || tag === 'style' || tag === 'head') return;
    if (tag === 'br') {
      runs.push({ ...state, text: '', isLineBreak: true });
      return;
    }
    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      const decoded = decodeDataUrlImage(src);
      if (decoded) {
        const wAttr = Number(el.getAttribute('width') || '0');
        const hAttr = Number(el.getAttribute('height') || '0');
        images.push({
          kind: 'image',
          bytes: decoded.bytes,
          mime: decoded.mime,
          widthPt: wAttr > 0 ? wAttr * 0.75 : contentWidth * 0.75,
          heightPt: hAttr > 0 ? hAttr * 0.75 : 180,
          align: 'left',
          spaceBefore: 4,
          spaceAfter: 6,
        });
      }
      return;
    }

    const next: InlineState = {
      ...state,
      bold: state.bold || tag === 'strong' || tag === 'b' || tag === 'th',
      italic: state.italic || tag === 'em' || tag === 'i',
      underline: state.underline || tag === 'u' || tag === 'a',
      strike: state.strike || tag === 's' || tag === 'del' || tag === 'strike',
      mono: state.mono || tag === 'code' || tag === 'kbd' || tag === 'samp',
      color: parseColorFromStyle(el) ?? (tag === 'a' ? { r: 0.1, g: 0.32, b: 0.72 } : state.color),
    };

    for (let i = 0; i < el.childNodes.length; i++) {
      collectInlineRuns(el.childNodes[i], next, runs, images);
    }
  };

  const processBlockElement = (el: Element, listIndent = 0) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'title' || tag === 'link') {
      return;
    }

    if (tag === 'hr') {
      blocks.push({ kind: 'hr', spaceBefore: 6, spaceAfter: 8 });
      return;
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const sizes = [20, 16, 13.5, 12, 11, 10.5];
      const fontSize = sizes[level - 1] ?? 11;
      const runs: TextRunModel[] = [];
      const imgs: ImageBlockModel[] = [];
      collectInlineRuns(
        el,
        {
          bold: true,
          italic: false,
          underline: false,
          strike: false,
          mono: false,
          fontSize,
          color: parseColorFromStyle(el) ?? { r: 0.06, g: 0.09, b: 0.16 },
        },
        runs,
        imgs
      );
      blocks.push({
        kind: 'paragraph',
        runs,
        align: parseAlignFromStyle(el) ?? 'left',
        spaceBefore: level === 1 ? 6 : 10,
        spaceAfter: 6,
        lineHeightMultiplier: 1.25,
        indentLeft: listIndent,
        firstLineIndent: 0,
        defaultFontSize: fontSize,
      });
      imgs.forEach(img => blocks.push(img));
      return;
    }

    if (tag === 'pre') {
      const text = (el.textContent ?? '').replace(/\r\n/g, '\n');
      const lines = text.split('\n');
      const runs: TextRunModel[] = [];
      lines.forEach((line, idx) => {
        runs.push({
          text: line,
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          mono: true,
          fontSize: 9,
          color: { r: 0.12, g: 0.15, b: 0.2 },
        });
        if (idx < lines.length - 1) {
          runs.push({
            text: '',
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            mono: true,
            fontSize: 9,
            color: DEFAULT_TEXT_COLOR,
            isLineBreak: true,
          });
        }
      });
      blocks.push({
        kind: 'paragraph',
        runs,
        align: 'left',
        spaceBefore: 4,
        spaceAfter: 8,
        lineHeightMultiplier: 1.32,
        indentLeft: listIndent + 8,
        firstLineIndent: 0,
        backgroundColor: { r: 0.95, g: 0.96, b: 0.98 },
        defaultFontSize: 9,
      });
      return;
    }

    if (tag === 'blockquote') {
      const runs: TextRunModel[] = [];
      const imgs: ImageBlockModel[] = [];
      collectInlineRuns(
        el,
        {
          bold: false,
          italic: true,
          underline: false,
          strike: false,
          mono: false,
          fontSize: DEFAULT_FONT_SIZE,
          color: { r: 0.28, g: 0.33, b: 0.41 },
        },
        runs,
        imgs
      );
      blocks.push({
        kind: 'paragraph',
        runs,
        align: parseAlignFromStyle(el) ?? 'left',
        spaceBefore: 4,
        spaceAfter: 8,
        lineHeightMultiplier: 1.3,
        indentLeft: listIndent + 14,
        firstLineIndent: 0,
        leftBorderColor: { r: 0.45, g: 0.5, b: 0.6 },
        defaultFontSize: DEFAULT_FONT_SIZE,
      });
      imgs.forEach(img => blocks.push(img));
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      let itemIndex = 1;
      for (let i = 0; i < el.children.length; i++) {
        const li = el.children[i];
        if (li.tagName.toLowerCase() !== 'li') continue;
        const runs: TextRunModel[] = [];
        const imgs: ImageBlockModel[] = [];
        const nestedLists: Element[] = [];

        for (let j = 0; j < li.childNodes.length; j++) {
          const child = li.childNodes[j];
          if (child.nodeType === 1) {
            const cTag = (child as Element).tagName.toLowerCase();
            if (cTag === 'ul' || cTag === 'ol') {
              nestedLists.push(child as Element);
              continue;
            }
          }
          collectInlineRuns(
            child,
            {
              bold: false,
              italic: false,
              underline: false,
              strike: false,
              mono: false,
              fontSize: DEFAULT_FONT_SIZE,
              color: DEFAULT_TEXT_COLOR,
            },
            runs,
            imgs
          );
        }

        blocks.push({
          kind: 'paragraph',
          runs,
          align: 'left',
          spaceBefore: 1,
          spaceAfter: 3,
          lineHeightMultiplier: 1.3,
          indentLeft: listIndent + 18,
          firstLineIndent: 0,
          listMarker: tag === 'ol' ? `${itemIndex}.` : '•',
          defaultFontSize: DEFAULT_FONT_SIZE,
        });
        imgs.forEach(img => blocks.push(img));
        nestedLists.forEach(nl => processBlockElement(nl, listIndent + 16));
        itemIndex++;
      }
      return;
    }

    if (tag === 'table') {
      const trNodes = Array.from(el.querySelectorAll('tr'));
      const rows: TableRowModel[] = [];
      let maxCols = 1;

      for (const tr of trNodes) {
        const cells: TableCellModel[] = [];
        let rowCols = 0;
        let isHeaderRow = tr.parentElement?.tagName.toLowerCase() === 'thead';

        for (let i = 0; i < tr.children.length; i++) {
          const cellEl = tr.children[i];
          const cTag = cellEl.tagName.toLowerCase();
          if (cTag !== 'td' && cTag !== 'th') continue;
          const isTh = cTag === 'th';
          if (isTh) isHeaderRow = true;
          const colSpan = Math.max(1, Number(cellEl.getAttribute('colspan') || '1') || 1);
          rowCols += colSpan;

          const runs: TextRunModel[] = [];
          const dummyImgs: ImageBlockModel[] = [];
          collectInlineRuns(
            cellEl,
            {
              bold: isTh,
              italic: false,
              underline: false,
              strike: false,
              mono: false,
              fontSize: 9.5,
              color: DEFAULT_TEXT_COLOR,
            },
            runs,
            dummyImgs
          );

          cells.push({
            paragraphs: [
              {
                kind: 'paragraph',
                runs,
                align: parseAlignFromStyle(cellEl) ?? 'left',
                spaceBefore: 0,
                spaceAfter: 0,
                lineHeightMultiplier: 1.25,
                indentLeft: 0,
                firstLineIndent: 0,
                defaultFontSize: 9.5,
              },
            ],
            colSpan,
            isHeader: isTh,
            backgroundColor: isTh ? { r: 0.94, g: 0.95, b: 0.98 } : undefined,
          });
        }
        if (rowCols > maxCols) maxCols = rowCols;
        if (cells.length > 0) rows.push({ cells, isHeader: isHeaderRow });
      }

      if (rows.length > 0) {
        blocks.push({
          kind: 'table',
          colWidthsPt: Array.from({ length: maxCols }, () => contentWidth / maxCols),
          rows,
          hasBorders: true,
          spaceBefore: 4,
          spaceAfter: 8,
        });
      }
      return;
    }

    if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'header' || tag === 'footer') {
      // If container holds nested block children, recurse into them
      const hasBlockChildren = Array.from(el.children).some(ch =>
        ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'pre', 'blockquote', 'hr', 'section', 'article'].includes(
          ch.tagName.toLowerCase()
        )
      );
      if (hasBlockChildren) {
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          if (child.nodeType === 1) {
            processBlockElement(child as Element, listIndent);
          } else if (child.nodeType === 3 && (child.textContent ?? '').trim().length > 0) {
            blocks.push({
              kind: 'paragraph',
              runs: [
                {
                  text: (child.textContent ?? '').trim(),
                  bold: false,
                  italic: false,
                  underline: false,
                  strike: false,
                  mono: false,
                  fontSize: DEFAULT_FONT_SIZE,
                  color: DEFAULT_TEXT_COLOR,
                },
              ],
              align: 'left',
              spaceBefore: 0,
              spaceAfter: 6,
              lineHeightMultiplier: 1.3,
              indentLeft: listIndent,
              firstLineIndent: 0,
              defaultFontSize: DEFAULT_FONT_SIZE,
            });
          }
        }
        return;
      }

      const runs: TextRunModel[] = [];
      const imgs: ImageBlockModel[] = [];
      collectInlineRuns(
        el,
        {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          mono: false,
          fontSize: DEFAULT_FONT_SIZE,
          color: parseColorFromStyle(el) ?? DEFAULT_TEXT_COLOR,
        },
        runs,
        imgs
      );
      if (runs.length > 0 || imgs.length === 0) {
        blocks.push({
          kind: 'paragraph',
          runs,
          align: parseAlignFromStyle(el) ?? 'left',
          spaceBefore: 0,
          spaceAfter: 6,
          lineHeightMultiplier: 1.3,
          indentLeft: listIndent,
          firstLineIndent: 0,
          defaultFontSize: DEFAULT_FONT_SIZE,
        });
      }
      imgs.forEach(img => blocks.push(img));
      return;
    }

    // Fallback inline element at root
    const runs: TextRunModel[] = [];
    const imgs: ImageBlockModel[] = [];
    collectInlineRuns(
      el,
      {
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        mono: false,
        fontSize: DEFAULT_FONT_SIZE,
        color: DEFAULT_TEXT_COLOR,
      },
      runs,
      imgs
    );
    if (runs.length > 0) {
      blocks.push({
        kind: 'paragraph',
        runs,
        align: 'left',
        spaceBefore: 0,
        spaceAfter: 6,
        lineHeightMultiplier: 1.3,
        indentLeft: listIndent,
        firstLineIndent: 0,
        defaultFontSize: DEFAULT_FONT_SIZE,
      });
    }
    imgs.forEach(img => blocks.push(img));
  };

  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const child = doc.body.childNodes[i];
    if (child.nodeType === 1) {
      processBlockElement(child as Element, 0);
    } else if (child.nodeType === 3 && (child.textContent ?? '').trim().length > 0) {
      blocks.push({
        kind: 'paragraph',
        runs: [
          {
            text: (child.textContent ?? '').trim(),
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            mono: false,
            fontSize: DEFAULT_FONT_SIZE,
            color: DEFAULT_TEXT_COLOR,
          },
        ],
        align: 'left',
        spaceBefore: 0,
        spaceAfter: 6,
        lineHeightMultiplier: 1.3,
        indentLeft: 0,
        firstLineIndent: 0,
        defaultFontSize: DEFAULT_FONT_SIZE,
      });
    }
  }

  return {
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
    marginTop: DEFAULT_MARGIN,
    marginRight: DEFAULT_MARGIN,
    marginBottom: DEFAULT_MARGIN,
    marginLeft: DEFAULT_MARGIN,
    blocks,
  };
}

export function parsePlainTextToLayoutModel(text: string): DocumentLayoutModel {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks: DocumentBlock[] = lines.map(line => ({
    kind: 'paragraph',
    runs: line.length > 0
      ? [
          {
            text: line,
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            mono: false,
            fontSize: DEFAULT_FONT_SIZE,
            color: DEFAULT_TEXT_COLOR,
          },
        ]
      : [],
    align: 'left',
    spaceBefore: 0,
    spaceAfter: line.trim().length === 0 ? 4 : 3,
    lineHeightMultiplier: 1.32,
    indentLeft: 0,
    firstLineIndent: 0,
    defaultFontSize: DEFAULT_FONT_SIZE,
  }));

  return {
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
    marginTop: DEFAULT_MARGIN,
    marginRight: DEFAULT_MARGIN,
    marginBottom: DEFAULT_MARGIN,
    marginLeft: DEFAULT_MARGIN,
    blocks,
  };
}

export function buildTableLayoutModel(
  rows: Record<string, unknown>[],
  title?: string
): DocumentLayoutModel {
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const useLandscape = keys.length > 5;
  const pageWidth = useLandscape ? A4_HEIGHT : A4_WIDTH;
  const pageHeight = useLandscape ? A4_WIDTH : A4_HEIGHT;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const blocks: DocumentBlock[] = [];
  if (title) {
    blocks.push({
      kind: 'paragraph',
      runs: [
        {
          text: title,
          bold: true,
          italic: false,
          underline: false,
          strike: false,
          mono: false,
          fontSize: 14,
          color: { r: 0.06, g: 0.09, b: 0.16 },
        },
      ],
      align: 'left',
      spaceBefore: 0,
      spaceAfter: 10,
      lineHeightMultiplier: 1.25,
      indentLeft: 0,
      firstLineIndent: 0,
      defaultFontSize: 14,
    });
  }

  if (keys.length === 0) {
    return {
      pageWidth,
      pageHeight,
      marginTop: margin,
      marginRight: margin,
      marginBottom: margin,
      marginLeft: margin,
      blocks,
    };
  }

  const fontSize = keys.length > 8 ? 7.5 : keys.length > 5 ? 8.5 : 9.5;
  const headerCells: TableCellModel[] = keys.map(k => ({
    colSpan: 1,
    isHeader: true,
    backgroundColor: { r: 0.92, g: 0.94, b: 0.98 },
    paragraphs: [
      {
        kind: 'paragraph',
        runs: [
          {
            text: k,
            bold: true,
            italic: false,
            underline: false,
            strike: false,
            mono: false,
            fontSize,
            color: { r: 0.06, g: 0.09, b: 0.16 },
          },
        ],
        align: 'left',
        spaceBefore: 0,
        spaceAfter: 0,
        lineHeightMultiplier: 1.25,
        indentLeft: 0,
        firstLineIndent: 0,
        defaultFontSize: fontSize,
      },
    ],
  }));

  const dataRows: TableRowModel[] = rows.map((row, rIdx) => ({
    isHeader: false,
    cells: keys.map(k => {
      const val = row[k];
      const str =
        val === undefined || val === null
          ? ''
          : typeof val === 'object'
          ? JSON.stringify(val)
          : String(val);
      return {
        colSpan: 1,
        backgroundColor: rIdx % 2 === 1 ? { r: 0.98, g: 0.985, b: 0.995 } : undefined,
        paragraphs: [
          {
            kind: 'paragraph',
            runs: str
              ? [
                  {
                    text: str,
                    bold: false,
                    italic: false,
                    underline: false,
                    strike: false,
                    mono: false,
                    fontSize,
                    color: DEFAULT_TEXT_COLOR,
                  },
                ]
              : [],
            align: 'left',
            spaceBefore: 0,
            spaceAfter: 0,
            lineHeightMultiplier: 1.25,
            indentLeft: 0,
            firstLineIndent: 0,
            defaultFontSize: fontSize,
          },
        ],
      };
    }),
  }));

  blocks.push({
    kind: 'table',
    colWidthsPt: Array.from({ length: keys.length }, () => contentWidth / keys.length),
    rows: [{ cells: headerCells, isHeader: true }, ...dataRows],
    hasBorders: true,
    spaceBefore: 0,
    spaceAfter: 6,
  });

  return {
    pageWidth,
    pageHeight,
    marginTop: margin,
    marginRight: margin,
    marginBottom: margin,
    marginLeft: margin,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// VECTOR PDF RENDERER (FULL UNICODE + RICH INLINE WRAPPING + TABLES + IMAGES)
// ---------------------------------------------------------------------------

interface StyledSegment {
  text: string;
  font: PDFFont;
  fontSize: number;
  width: number;
  color: RgbColor;
  underline: boolean;
  strike: boolean;
  isSpace: boolean;
}

interface WrappedLine {
  segments: StyledSegment[];
  width: number;
  maxFontSize: number;
  lineHeight: number;
  isLastInParagraph: boolean;
  isPageBreak?: boolean;
}

function measureSafeWidth(font: PDFFont, text: string, fontSize: number): number {
  if (!text) return 0;
  try {
    return font.widthOfTextAtSize(text, fontSize);
  } catch {
    return text.length * fontSize * 0.52;
  }
}

function splitLongToken(
  token: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const parts: string[] = [];
  let current = '';
  for (const ch of token) {
    const test = current + ch;
    if (measureSafeWidth(font, test, fontSize) > maxWidth && current.length > 0) {
      parts.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function wrapParagraphRuns(
  para: ParagraphBlockModel,
  maxLineWidth: number,
  pack: EmbeddedFontPack
): WrappedLine[] {
  const safeMaxWidth = Math.max(30, maxLineWidth);
  const lines: WrappedLine[] = [];

  if (para.runs.length === 0) {
    return [
      {
        segments: [],
        width: 0,
        maxFontSize: para.defaultFontSize,
        lineHeight: para.defaultFontSize * para.lineHeightMultiplier,
        isLastInParagraph: true,
      },
    ];
  }

  let currentSegments: StyledSegment[] = [];
  let currentWidth = 0;
  let currentMaxSize = para.defaultFontSize;
  let isFirstLine = true;

  const getAvailableWidth = () =>
    Math.max(30, safeMaxWidth - (isFirstLine ? Math.max(0, para.firstLineIndent) : 0));

  const flushLine = (isLast: boolean) => {
    // Trim trailing whitespace on wrapped lines
    while (currentSegments.length > 0 && currentSegments[currentSegments.length - 1].isSpace) {
      const removed = currentSegments.pop()!;
      currentWidth -= removed.width;
    }
    lines.push({
      segments: currentSegments,
      width: Math.max(0, currentWidth),
      maxFontSize: currentMaxSize,
      lineHeight: currentMaxSize * para.lineHeightMultiplier,
      isLastInParagraph: isLast,
    });
    currentSegments = [];
    currentWidth = 0;
    currentMaxSize = para.defaultFontSize;
    isFirstLine = false;
  };

  for (const run of para.runs) {
    if (run.isPageBreak) {
      if (currentSegments.length > 0) flushLine(true);
      lines.push({
        segments: [],
        width: 0,
        maxFontSize: para.defaultFontSize,
        lineHeight: 0,
        isLastInParagraph: true,
        isPageBreak: true,
      });
      continue;
    }

    if (run.isLineBreak) {
      flushLine(true);
      continue;
    }

    const font = selectFont(pack, run);
    const safeText = sanitizeForFont(run.text, font, pack);
    if (!safeText) continue;

    // Tokenize into alternating non-space words and whitespace runs
    const tokens = safeText.match(/\S+|\s+/g) ?? [];
    for (const token of tokens) {
      const isSpace = /^\s+$/.test(token);
      if (isSpace && currentSegments.length === 0 && !run.mono) {
        // Skip leading spaces on newly wrapped lines
        continue;
      }

      const tokWidth = measureSafeWidth(font, token, run.fontSize);
      const avail = getAvailableWidth();

      if (!isSpace && currentSegments.length > 0 && currentWidth + tokWidth > avail) {
        flushLine(false);
      }

      const availNow = getAvailableWidth();
      if (!isSpace && tokWidth > availNow) {
        const chunks = splitLongToken(token, font, run.fontSize, availNow);
        chunks.forEach((chunk, idx) => {
          const w = measureSafeWidth(font, chunk, run.fontSize);
          currentSegments.push({
            text: chunk,
            font,
            fontSize: run.fontSize,
            width: w,
            color: run.color,
            underline: run.underline,
            strike: run.strike,
            isSpace: false,
          });
          currentWidth += w;
          currentMaxSize = Math.max(currentMaxSize, run.fontSize);
          if (idx < chunks.length - 1) {
            flushLine(false);
          }
        });
      } else {
        currentSegments.push({
          text: token,
          font,
          fontSize: run.fontSize,
          width: tokWidth,
          color: run.color,
          underline: run.underline,
          strike: run.strike,
          isSpace,
        });
        currentWidth += tokWidth;
        currentMaxSize = Math.max(currentMaxSize, run.fontSize);
      }
    }
  }

  if (currentSegments.length > 0 || lines.length === 0) {
    flushLine(true);
  }

  return lines;
}

function drawWrappedLine(
  page: PDFPage,
  line: WrappedLine,
  baseX: number,
  baselineY: number,
  maxWidth: number,
  align: TextAlign
): void {
  if (line.segments.length === 0) return;

  let startX = baseX;
  let extraSpacePerGap = 0;

  if (align === 'center') {
    startX = baseX + Math.max(0, (maxWidth - line.width) / 2);
  } else if (align === 'right') {
    startX = baseX + Math.max(0, maxWidth - line.width);
  } else if (align === 'justify' && !line.isLastInParagraph) {
    const spaceCount = line.segments.filter(s => s.isSpace).length;
    const slack = maxWidth - line.width;
    if (spaceCount > 0 && slack > 0 && slack < maxWidth * 0.35) {
      extraSpacePerGap = slack / spaceCount;
    }
  }

  let cursorX = startX;
  for (const seg of line.segments) {
    if (seg.text.length > 0) {
      page.drawText(seg.text, {
        x: cursorX,
        y: baselineY,
        size: seg.fontSize,
        font: seg.font,
        color: rgb(seg.color.r, seg.color.g, seg.color.b),
      });

      if (seg.underline && !seg.isSpace) {
        page.drawLine({
          start: { x: cursorX, y: baselineY - seg.fontSize * 0.14 },
          end: { x: cursorX + seg.width, y: baselineY - seg.fontSize * 0.14 },
          thickness: Math.max(0.5, seg.fontSize * 0.06),
          color: rgb(seg.color.r, seg.color.g, seg.color.b),
        });
      }
      if (seg.strike && !seg.isSpace) {
        page.drawLine({
          start: { x: cursorX, y: baselineY + seg.fontSize * 0.28 },
          end: { x: cursorX + seg.width, y: baselineY + seg.fontSize * 0.28 },
          thickness: Math.max(0.5, seg.fontSize * 0.06),
          color: rgb(seg.color.r, seg.color.g, seg.color.b),
        });
      }
    }

    cursorX += seg.width + (seg.isSpace ? extraSpacePerGap : 0);
  }
}

export async function renderLayoutModelToPdfBytes(model: DocumentLayoutModel): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pack = await embedFontPack(pdfDoc);

  const { pageWidth, pageHeight, marginTop, marginRight, marginBottom, marginLeft } = model;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxPageContentHeight = pageHeight - marginTop - marginBottom;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - marginTop;

  const startNewPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    cursorY = pageHeight - marginTop;
  };

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY - heightNeeded < marginBottom && cursorY < pageHeight - marginTop - 1) {
      startNewPage();
    }
  };

  const imageCache = new Map<Uint8Array, PDFImage>();

  for (const block of model.blocks) {
    if (block.kind === 'page-break') {
      startNewPage();
      continue;
    }

    if (block.kind === 'hr') {
      cursorY -= block.spaceBefore;
      ensureSpace(6);
      page.drawLine({
        start: { x: marginLeft, y: cursorY },
        end: { x: pageWidth - marginRight, y: cursorY },
        thickness: 0.75,
        color: rgb(0.75, 0.78, 0.84),
      });
      cursorY -= block.spaceAfter;
      continue;
    }

    if (block.kind === 'image') {
      try {
        let embedded = imageCache.get(block.bytes);
        if (!embedded) {
          embedded =
            block.mime === 'image/png'
              ? await pdfDoc.embedPng(block.bytes)
              : await pdfDoc.embedJpg(block.bytes);
          imageCache.set(block.bytes, embedded);
        }

        const natW = embedded.width || block.widthPt || 200;
        const natH = embedded.height || block.heightPt || 150;
        let drawW = block.widthPt > 0 ? block.widthPt : natW;
        let drawH = block.heightPt > 0 ? block.heightPt : (natH / natW) * drawW;

        // Clamp within page content box
        if (drawW > contentWidth) {
          const ratio = contentWidth / drawW;
          drawW *= ratio;
          drawH *= ratio;
        }
        if (drawH > maxPageContentHeight * 0.9) {
          const ratio = (maxPageContentHeight * 0.9) / drawH;
          drawW *= ratio;
          drawH *= ratio;
        }

        cursorY -= block.spaceBefore;
        ensureSpace(drawH);

        let imgX = marginLeft;
        if (block.align === 'center') imgX = marginLeft + (contentWidth - drawW) / 2;
        else if (block.align === 'right') imgX = marginLeft + contentWidth - drawW;

        page.drawImage(embedded, {
          x: imgX,
          y: cursorY - drawH,
          width: drawW,
          height: drawH,
        });
        cursorY -= drawH + block.spaceAfter;
      } catch {
        // Skip corrupt embedded image gracefully without breaking document export
      }
      continue;
    }

    if (block.kind === 'paragraph') {
      if (block.pageBreakBefore && cursorY < pageHeight - marginTop - 1) {
        startNewPage();
      }

      const paraBaseX = marginLeft + block.indentLeft;
      const paraMaxWidth = Math.max(40, contentWidth - block.indentLeft);
      const wrapped = wrapParagraphRuns(block, paraMaxWidth, pack);

      if (cursorY < pageHeight - marginTop - 1) {
        cursorY -= block.spaceBefore;
      }

      const firstNonBreakLine = wrapped.find(l => !l.isPageBreak);
      if (firstNonBreakLine) {
        ensureSpace(firstNonBreakLine.lineHeight);
      }

      let drewMarker = false;
      for (let i = 0; i < wrapped.length; i++) {
        const line = wrapped[i];
        if (line.isPageBreak) {
          startNewPage();
          continue;
        }

        ensureSpace(line.lineHeight);

        const lineTopY = cursorY;
        const baselineY = lineTopY - line.maxFontSize * 0.85;

        if (block.backgroundColor) {
          page.drawRectangle({
            x: paraBaseX - 6,
            y: lineTopY - line.lineHeight,
            width: paraMaxWidth + 12,
            height: line.lineHeight,
            color: rgb(block.backgroundColor.r, block.backgroundColor.g, block.backgroundColor.b),
          });
        }

        if (block.leftBorderColor) {
          page.drawRectangle({
            x: paraBaseX - 10,
            y: lineTopY - line.lineHeight,
            width: 2.5,
            height: line.lineHeight,
            color: rgb(block.leftBorderColor.r, block.leftBorderColor.g, block.leftBorderColor.b),
          });
        }

        if (block.listMarker && !drewMarker) {
          const safeMarker = sanitizeForFont(block.listMarker, pack.regular, pack);
          page.drawText(safeMarker, {
            x: Math.max(marginLeft, paraBaseX - 14),
            y: baselineY,
            size: line.maxFontSize,
            font: pack.regular,
            color: rgb(DEFAULT_TEXT_COLOR.r, DEFAULT_TEXT_COLOR.g, DEFAULT_TEXT_COLOR.b),
          });
          drewMarker = true;
        }

        const xOffset = i === 0 ? Math.max(-block.indentLeft, block.firstLineIndent) : 0;
        drawWrappedLine(
          page,
          line,
          paraBaseX + xOffset,
          baselineY,
          Math.max(30, paraMaxWidth - xOffset),
          block.align
        );

        cursorY -= line.lineHeight;
      }

      if (block.bottomBorder) {
        page.drawLine({
          start: { x: marginLeft, y: cursorY + 2 },
          end: { x: pageWidth - marginRight, y: cursorY + 2 },
          thickness: 0.75,
          color: rgb(0.65, 0.7, 0.78),
        });
      }

      cursorY -= block.spaceAfter;
      continue;
    }

    if (block.kind === 'table') {
      const cellPadX = 5;
      const cellPadY = 4;
      const colWidths = block.colWidthsPt;
      const headerRow = block.rows[0]?.isHeader ? block.rows[0] : null;

      cursorY -= block.spaceBefore;

      const measureAndPrepareRow = (row: TableRowModel) => {
        let colIdx = 0;
        let maxRowHeight = 16;
        const preparedCells = row.cells.map(cell => {
          let cellWidth = 0;
          for (let c = 0; c < cell.colSpan; c++) {
            cellWidth += colWidths[colIdx + c] ?? contentWidth / Math.max(1, colWidths.length);
          }
          const cellX =
            marginLeft +
            colWidths.slice(0, colIdx).reduce((sum, w) => sum + w, 0);
          colIdx += cell.colSpan;

          const innerWidth = Math.max(20, cellWidth - cellPadX * 2);
          const wrappedParas = cell.paragraphs.map(p => ({
            para: p,
            lines: wrapParagraphRuns(p, innerWidth, pack),
          }));

          let totalH = cellPadY * 2;
          wrappedParas.forEach((wp, idx) => {
            wp.lines.forEach(l => {
              totalH += l.lineHeight;
            });
            if (idx < wrappedParas.length - 1) {
              totalH += wp.para.spaceAfter;
            }
          });
          if (totalH > maxRowHeight) maxRowHeight = totalH;

          return { cell, cellX, cellWidth, innerWidth, wrappedParas };
        });

        return { preparedCells, rowHeight: maxRowHeight };
      };

      const drawPreparedRow = (prepared: ReturnType<typeof measureAndPrepareRow>) => {
        const rowTopY = cursorY;
        const rowBottomY = rowTopY - prepared.rowHeight;

        for (const item of prepared.preparedCells) {
          if (item.cell.backgroundColor) {
            page.drawRectangle({
              x: item.cellX,
              y: rowBottomY,
              width: item.cellWidth,
              height: prepared.rowHeight,
              color: rgb(
                item.cell.backgroundColor.r,
                item.cell.backgroundColor.g,
                item.cell.backgroundColor.b
              ),
            });
          }

          if (block.hasBorders) {
            page.drawRectangle({
              x: item.cellX,
              y: rowBottomY,
              width: item.cellWidth,
              height: prepared.rowHeight,
              borderColor: rgb(0.75, 0.78, 0.84),
              borderWidth: 0.5,
            });
          }

          let cellY = rowTopY - cellPadY;
          item.wrappedParas.forEach((wp, pIdx) => {
            for (const line of wp.lines) {
              if (cellY - line.lineHeight < rowBottomY - 1) break;
              const baselineY = cellY - line.maxFontSize * 0.85;
              drawWrappedLine(
                page,
                line,
                item.cellX + cellPadX,
                baselineY,
                item.innerWidth,
                wp.para.align
              );
              cellY -= line.lineHeight;
            }
            if (pIdx < item.wrappedParas.length - 1) {
              cellY -= wp.para.spaceAfter;
            }
          });
        }

        cursorY = rowBottomY;
      };

      const preparedHeader = headerRow ? measureAndPrepareRow(headerRow) : null;

      for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
        const row = block.rows[rIdx];
        const prepared = measureAndPrepareRow(row);

        if (cursorY - prepared.rowHeight < marginBottom && cursorY < pageHeight - marginTop - 1) {
          startNewPage();
          if (preparedHeader && rIdx > 0) {
            drawPreparedRow(preparedHeader);
          }
        }

        drawPreparedRow(prepared);
      }

      cursorY -= block.spaceAfter;
    }
  }

  return await pdfDoc.save();
}

// ---------------------------------------------------------------------------
// PUBLIC CONVERSION ENTRY POINTS
// ---------------------------------------------------------------------------

export async function createPdfBlobFromDocx(arrayBuffer: ArrayBuffer): Promise<Blob> {
  try {
    const model = parseDocxToLayoutModel(arrayBuffer);
    if (model.blocks.length > 0) {
      const pdfBytes = await renderLayoutModelToPdfBytes(model);
      return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    }
  } catch (err) {
    console.warn('OOXML direct layout parser fell back to Mammoth HTML:', err);
  }

  // Fallback: convert via Mammoth semantic HTML with full Unicode PDF renderer
  const htmlRes = await mammoth.convertToHtml({ arrayBuffer });
  return createPdfBlobFromHtml(htmlRes.value);
}

export async function createPdfBlobFromHtml(html: string): Promise<Blob> {
  const model = parseHtmlToLayoutModel(html);
  const pdfBytes = await renderLayoutModelToPdfBytes(model);
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

export async function createPdfBlobFromPlainText(text: string): Promise<Blob> {
  const model = parsePlainTextToLayoutModel(text);
  const pdfBytes = await renderLayoutModelToPdfBytes(model);
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

export async function createPdfBlobFromTableRows(
  rows: Record<string, unknown>[],
  title?: string
): Promise<Blob> {
  const model = buildTableLayoutModel(rows, title);
  const pdfBytes = await renderLayoutModelToPdfBytes(model);
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
