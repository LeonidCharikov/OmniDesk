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
  highlightColor?: RgbColor;
  isLineBreak?: boolean;
  isPageBreak?: boolean;
  isColumnBreak?: boolean;
  isTab?: boolean;
}

export interface TabStopDef {
  posPt: number;
  align: 'left' | 'center' | 'right';
}

export interface ColumnDef {
  widthPt: number;
  spaceAfterPt: number;
}

export interface SectionLayoutConfig {
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  columnCount: number;
  columnGap: number;
  columns?: ColumnDef[];
  columnSeparator?: boolean;
  breakType?: 'nextPage' | 'continuous';
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
  exactLineHeightPt?: number;
  minLineHeightPt?: number;
  indentLeft: number;
  firstLineIndent: number;
  listMarker?: string;
  pageBreakBefore?: boolean;
  bottomBorder?: boolean;
  backgroundColor?: RgbColor;
  leftBorderColor?: RgbColor;
  tabStops?: TabStopDef[];
  preserveLeadingSpaces?: boolean;
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

export interface ColumnBreakBlockModel {
  kind: 'column-break';
}

export interface SectionBreakBlockModel {
  kind: 'section-break';
  nextSection: SectionLayoutConfig;
  breakType: 'nextPage' | 'continuous';
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
  | ColumnBreakBlockModel
  | SectionBreakBlockModel
  | HorizontalRuleBlockModel;

export interface DocumentLayoutModel {
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  initialSection?: SectionLayoutConfig;
  defaultTabStopPt?: number;
  pageBackgroundColor?: RgbColor;
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

const WORD_HIGHLIGHT_COLORS: Record<string, RgbColor> = {
  yellow: { r: 1, g: 0.98, b: 0.35 },
  green: { r: 0.25, g: 0.92, b: 0.32 },
  cyan: { r: 0.3, g: 0.94, b: 0.98 },
  magenta: { r: 0.96, g: 0.35, b: 0.92 },
  blue: { r: 0.2, g: 0.45, b: 0.95 },
  red: { r: 0.92, g: 0.22, b: 0.22 },
  darkblue: { r: 0.08, g: 0.16, b: 0.52 },
  darkcyan: { r: 0.08, g: 0.48, b: 0.52 },
  darkgreen: { r: 0.1, g: 0.48, b: 0.16 },
  darkmagenta: { r: 0.5, g: 0.1, b: 0.5 },
  darkred: { r: 0.55, g: 0.1, b: 0.1 },
  darkyellow: { r: 0.65, g: 0.56, b: 0.1 },
  darkgray: { r: 0.68, g: 0.68, b: 0.7 },
  darkgrey: { r: 0.68, g: 0.68, b: 0.7 },
  lightgray: { r: 0.85, g: 0.86, b: 0.88 },
  lightgrey: { r: 0.85, g: 0.86, b: 0.88 },
  gray: { r: 0.8, g: 0.81, b: 0.83 },
  grey: { r: 0.8, g: 0.81, b: 0.83 },
  black: { r: 0.1, g: 0.1, b: 0.12 },
  white: { r: 1, g: 1, b: 1 },
};

function parseWordHighlightColor(val: string | null | undefined): RgbColor | undefined {
  if (!val) return undefined;
  const key = val.trim().toLowerCase();
  if (key === 'none' || key === 'auto' || key === 'transparent') return undefined;
  return WORD_HIGHLIGHT_COLORS[key] ?? parseHexColor(val);
}

function parseShadingColor(shdEl: Element | null): RgbColor | undefined {
  if (!shdEl) return undefined;
  const shdVal = (getAttrByLocalName(shdEl, 'val') || '').toLowerCase();
  if (shdVal === 'nil') return undefined;

  if (shdVal === 'solid') {
    const fg = parseHexColor(getAttrByLocalName(shdEl, 'color'));
    if (fg) return fg;
  }

  const fill = parseHexColor(getAttrByLocalName(shdEl, 'fill'));
  if (fill) return fill;

  // Support percentage gray shading patterns when w:fill="auto"
  const pctMatch = /^pct(\d+)$/.exec(shdVal);
  if (pctMatch) {
    const pct = Math.min(90, Math.max(5, Number(pctMatch[1])));
    const shade = 1 - pct / 100;
    return { r: shade, g: shade, b: shade };
  }

  // Fallback for Word themeFill when explicit hex w:fill is omitted or "auto"
  const themeFill = (getAttrByLocalName(shdEl, 'themeFill') || '').toLowerCase();
  if (themeFill) {
    if (themeFill.includes('background2') || themeFill.includes('light2')) {
      return { r: 0.87, g: 0.87, b: 0.89 };
    }
    if (themeFill.includes('background1') || themeFill.includes('light1')) {
      const shadeHex = getAttrByLocalName(shdEl, 'themeFillShade');
      if (shadeHex && /^[0-9a-fA-F]{2}$/.test(shadeHex)) {
        const shade = Math.max(0.25, Math.min(0.95, parseInt(shadeHex, 16) / 255));
        return { r: shade, g: shade, b: shade };
      }
    }
    if (themeFill.includes('dark') || themeFill.includes('text')) {
      return { r: 0.72, g: 0.73, b: 0.75 };
    }
  }

  return undefined;
}

function colorLuminance(c: RgbColor): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function sameRgbColor(a?: RgbColor, b?: RgbColor): boolean {
  if (!a || !b) return !a && !b;
  return (
    Math.abs(a.r - b.r) < 0.002 &&
    Math.abs(a.g - b.g) < 0.002 &&
    Math.abs(a.b - b.b) < 0.002
  );
}

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
  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(val.trim());
  if (rgbMatch) {
    return {
      r: Math.min(255, Number(rgbMatch[1])) / 255,
      g: Math.min(255, Number(rgbMatch[2])) / 255,
      b: Math.min(255, Number(rgbMatch[3])) / 255,
    };
  }
  const named = WORD_HIGHLIGHT_COLORS[cleaned.toLowerCase()];
  if (named) return named;
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
  highlightColor?: RgbColor;
  align?: TextAlign;
  spaceBefore?: number;
  spaceAfter?: number;
  lineHeightMultiplier?: number;
  exactLineHeightPt?: number;
  minLineHeightPt?: number;
  indentLeft?: number;
  firstLineIndent?: number;
  pageBreakBefore?: boolean;
  bottomBorder?: boolean;
  backgroundColor?: RgbColor;
  tabStops?: TabStopDef[];
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

function extractRunProps(rPr: Element | null, includeHighlight = true): ResolvedStyleProps {
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

  if (includeHighlight) {
    const hlEl = getChildByLocalName(rPr, 'highlight');
    const hlColor = parseWordHighlightColor(getAttrByLocalName(hlEl, 'val'));
    const shdColor = parseShadingColor(getChildByLocalName(rPr, 'shd'));
    if (hlColor) {
      props.highlightColor = hlColor;
    } else if (shdColor) {
      props.highlightColor = shdColor;
    }
  }

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
    const lineRule = (getAttrByLocalName(spacingEl, 'lineRule') || 'auto').toLowerCase();
    if (Number.isFinite(lineVal) && lineVal > 0) {
      if (lineRule === 'exact') {
        props.exactLineHeightPt = Math.max(7, lineVal / 20);
      } else if (lineRule === 'atleast') {
        props.minLineHeightPt = Math.max(7, lineVal / 20);
      } else {
        props.lineHeightMultiplier = Math.max(1.05, Math.min(2.4, (lineVal / 240) * 1.15));
      }
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
  const bg = parseShadingColor(shd);
  if (bg) props.backgroundColor = bg;

  const tabsEl = getChildByLocalName(pPr, 'tabs');
  if (tabsEl) {
    const stops: TabStopDef[] = [];
    for (const tabEl of getChildrenByLocalName(tabsEl, 'tab')) {
      const val = (getAttrByLocalName(tabEl, 'val') || 'left').toLowerCase();
      if (val === 'clear' || val === 'bar') continue;
      const posPt = twipsToPt(getAttrByLocalName(tabEl, 'pos'));
      if (posPt !== undefined && posPt > 0) {
        const align: TabStopDef['align'] =
          val === 'center' ? 'center' : val === 'right' || val === 'decimal' ? 'right' : 'left';
        stops.push({ posPt, align });
      }
    }
    if (stops.length > 0) {
      stops.sort((a, b) => a.posPt - b.posPt);
      props.tabStops = stops;
    }
  }

  // Paragraph mark rPr gives default font size/styling for empty paragraphs,
  // but should not bleed highlight/shading onto unhighlighted runs inside the paragraph.
  const rPr = getChildByLocalName(pPr, 'rPr');
  if (rPr) {
    Object.assign(props, extractRunProps(rPr, false));
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

function parseDefaultTabStop(files: Record<string, Uint8Array>): number {
  const settingsBytes = files['word/settings.xml'];
  if (!settingsBytes) return 36;
  const doc = parseXmlDocument(new TextDecoder().decode(settingsBytes));
  if (!doc?.documentElement) return 36;
  const tabStopEl = getChildByLocalName(doc.documentElement, 'defaultTabStop');
  const pt = twipsToPt(getAttrByLocalName(tabStopEl, 'val'));
  return pt && pt >= 8 && pt <= 144 ? pt : 36;
}

function parseSectPrConfig(sectPr: Element | null, fallback?: SectionLayoutConfig): SectionLayoutConfig {
  let pageWidth = fallback?.pageWidth ?? A4_WIDTH;
  let pageHeight = fallback?.pageHeight ?? A4_HEIGHT;
  let marginTop = fallback?.marginTop ?? DEFAULT_MARGIN;
  let marginRight = fallback?.marginRight ?? DEFAULT_MARGIN;
  let marginBottom = fallback?.marginBottom ?? DEFAULT_MARGIN;
  let marginLeft = fallback?.marginLeft ?? DEFAULT_MARGIN;
  let columnCount = 1;
  let columnGap = 36;
  let columns: ColumnDef[] | undefined;
  let columnSeparator = false;
  let breakType: 'nextPage' | 'continuous' = 'nextPage';

  if (sectPr) {
    const pgSz = getChildByLocalName(sectPr, 'pgSz');
    if (pgSz) {
      let w = twipsToPt(getAttrByLocalName(pgSz, 'w'));
      let h = twipsToPt(getAttrByLocalName(pgSz, 'h'));
      const orient = (getAttrByLocalName(pgSz, 'orient') || '').toLowerCase();
      if (orient === 'landscape' && w && h && w < h) {
        const tmp = w;
        w = h;
        h = tmp;
      }
      if (w && w >= 200 && w <= 2000) pageWidth = w;
      if (h && h >= 200 && h <= 2000) pageHeight = h;
    }

    const pgMar = getChildByLocalName(sectPr, 'pgMar');
    if (pgMar) {
      const top = twipsToPt(getAttrByLocalName(pgMar, 'top'));
      const right = twipsToPt(getAttrByLocalName(pgMar, 'right'));
      const bottom = twipsToPt(getAttrByLocalName(pgMar, 'bottom'));
      const left = twipsToPt(getAttrByLocalName(pgMar, 'left'));
      if (top !== undefined) marginTop = Math.max(12, Math.min(180, top));
      if (right !== undefined) marginRight = Math.max(12, Math.min(180, right));
      if (bottom !== undefined) marginBottom = Math.max(12, Math.min(180, bottom));
      if (left !== undefined) marginLeft = Math.max(12, Math.min(180, left));
    }

    const colsEl = getChildByLocalName(sectPr, 'cols');
    if (colsEl) {
      const rawNum = Number(getAttrByLocalName(colsEl, 'num') ?? '0');
      const rawSpace = twipsToPt(getAttrByLocalName(colsEl, 'space'));
      if (rawSpace !== undefined && rawSpace >= 0 && rawSpace <= 144) {
        columnGap = rawSpace;
      }
      const sepAttr = (getAttrByLocalName(colsEl, 'sep') || '').toLowerCase();
      columnSeparator = sepAttr === '1' || sepAttr === 'true' || sepAttr === 'on';

      const equalAttr = (getAttrByLocalName(colsEl, 'equalWidth') || '').toLowerCase();
      const isEqualWidth = equalAttr !== '0' && equalAttr !== 'false';

      const colChildren = getChildrenByLocalName(colsEl, 'col');
      if (Number.isFinite(rawNum) && rawNum >= 1) {
        columnCount = Math.min(6, Math.max(1, Math.floor(rawNum)));
      } else if (colChildren.length > 1) {
        columnCount = Math.min(6, colChildren.length);
      }

      if (!isEqualWidth && colChildren.length > 1) {
        const parsedCols: ColumnDef[] = colChildren.map((c, idx) => ({
          widthPt: Math.max(40, twipsToPt(getAttrByLocalName(c, 'w')) ?? 200),
          spaceAfterPt:
            idx < colChildren.length - 1
              ? Math.max(0, twipsToPt(getAttrByLocalName(c, 'space')) ?? columnGap)
              : 0,
        }));
        columnCount = Math.min(6, parsedCols.length);
        columns = parsedCols.slice(0, columnCount);
      }
    }

    const typeEl = getChildByLocalName(sectPr, 'type');
    const typeVal = (getAttrByLocalName(typeEl, 'val') || '').toLowerCase();
    if (typeVal === 'continuous') {
      breakType = 'continuous';
    }
  }

  return {
    pageWidth,
    pageHeight,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    columnCount,
    columnGap,
    columns,
    columnSeparator,
    breakType,
  };
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
  const defaultTabStopPt = parseDefaultTabStop(files);
  const listCounters = new Map<string, number>();

  // Optional explicit document page background (ignore white/auto)
  let pageBackgroundColor: RgbColor | undefined;
  const bgEl = getChildByLocalName(doc.documentElement, 'background');
  if (bgEl) {
    const parsedBg = parseHexColor(getAttrByLocalName(bgEl, 'color'));
    if (parsedBg && !(parsedBg.r > 0.98 && parsedBg.g > 0.98 && parsedBg.b > 0.98)) {
      pageBackgroundColor = parsedBg;
    }
  }

  // Group body children into OOXML sections (each section's sectPr lives at the end of that section)
  interface RawSectionGroup {
    elements: Element[];
    sectPr: Element | null;
  }

  const sectionGroups: RawSectionGroup[] = [];
  let currentGroupElements: Element[] = [];
  let trailingSectPr: Element | null = null;

  for (let i = 0; i < body.children.length; i++) {
    const child = body.children[i];
    const tag = localNameOf(child);
    if (tag === 'sectPr') {
      trailingSectPr = child;
      continue;
    }

    currentGroupElements.push(child);

    if (tag === 'p') {
      const pPr = getChildByLocalName(child, 'pPr');
      const inlineSectPr = getChildByLocalName(pPr, 'sectPr');
      if (inlineSectPr) {
        sectionGroups.push({ elements: currentGroupElements, sectPr: inlineSectPr });
        currentGroupElements = [];
      }
    }
  }

  if (currentGroupElements.length > 0 || sectionGroups.length === 0) {
    sectionGroups.push({ elements: currentGroupElements, sectPr: trailingSectPr });
  } else if (trailingSectPr && sectionGroups.length > 0 && !sectionGroups[sectionGroups.length - 1].sectPr) {
    sectionGroups[sectionGroups.length - 1].sectPr = trailingSectPr;
  }

  const parsedSections: SectionLayoutConfig[] = [];
  for (let i = 0; i < sectionGroups.length; i++) {
    const prev = i > 0 ? parsedSections[i - 1] : undefined;
    parsedSections.push(parseSectPrConfig(sectionGroups[i].sectPr, prev));
  }

  const initialSection = parsedSections[0] ?? parseSectPrConfig(null);
  const { pageWidth, pageHeight, marginTop, marginRight, marginBottom, marginLeft } = initialSection;

  const parseParagraphElement = (
    pEl: Element,
    extractedImages: ImageBlockModel[],
    sectionContentWidth: number
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
        const directRProps = extractRunProps(rPr, true);
        const finalR = mergeStyleProps(mergeStyleProps(mergedP, rStyleProps), directRProps);

        let textColor =
          finalR.color ?? (isHyperlink ? { r: 0.1, g: 0.32, b: 0.72 } : DEFAULT_TEXT_COLOR);
        const highlightColor = finalR.highlightColor;

        // Preserve legible contrast if a dark highlight (e.g. black/darkBlue) has default dark text
        if (highlightColor && !directRProps.color && !rStyleProps.color && colorLuminance(highlightColor) < 0.25) {
          textColor = { r: 0.98, g: 0.98, b: 0.98 };
        }

        const baseRun: Omit<TextRunModel, 'text'> = {
          bold: Boolean(finalR.bold),
          italic: Boolean(finalR.italic),
          underline: Boolean(finalR.underline || isHyperlink),
          strike: Boolean(finalR.strike),
          mono: Boolean(finalR.mono),
          fontSize: finalR.fontSize ?? mergedP.fontSize ?? DEFAULT_FONT_SIZE,
          color: textColor,
          highlightColor,
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
            runs.push({ ...baseRun, text: '', isTab: true });
          } else if (rTag === 'br' || rTag === 'cr') {
            const brType = (getAttrByLocalName(rChild, 'type') || '').toLowerCase();
            if (brType === 'page') {
              runs.push({ ...baseRun, text: '', isPageBreak: true });
            } else if (brType === 'column') {
              runs.push({ ...baseRun, text: '', isColumnBreak: true });
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
              const widthPt = cx > 0 ? cx / 12700 : sectionContentWidth * 0.7;
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
      lineHeightMultiplier: mergedP.lineHeightMultiplier ?? 1.25,
      exactLineHeightPt: mergedP.exactLineHeightPt,
      minLineHeightPt: mergedP.minLineHeightPt,
      indentLeft: Math.max(mergedP.indentLeft ?? 0, extraIndent),
      firstLineIndent: mergedP.firstLineIndent ?? 0,
      listMarker,
      pageBreakBefore: mergedP.pageBreakBefore,
      bottomBorder: mergedP.bottomBorder,
      backgroundColor: mergedP.backgroundColor,
      tabStops: mergedP.tabStops,
      preserveLeadingSpaces: true,
      defaultFontSize: mergedP.fontSize ?? DEFAULT_FONT_SIZE,
    };
  };

  const parseTableElement = (tblEl: Element, sectionContentWidth: number): TableBlockModel => {
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
        const bg = parseShadingColor(shd);
        const tcW = twipsToPt(getAttrByLocalName(getChildByLocalName(tcPr, 'tcW'), 'w'));

        const cellParas: ParagraphBlockModel[] = [];
        for (const pChild of getChildrenByLocalName(tc, 'p')) {
          const dummyImgs: ImageBlockModel[] = [];
          const p = parseParagraphElement(pChild, dummyImgs, sectionContentWidth);
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
      colWidthsPt = Array.from({ length: colCount }, () => sectionContentWidth / colCount);
    } else if (colWidthsPt.length > 0) {
      const sum = colWidthsPt.reduce((a, b) => a + b, 0);
      if (sum > sectionContentWidth || sum < sectionContentWidth * 0.4) {
        const scale = sectionContentWidth / Math.max(1, sum);
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

  for (let sIdx = 0; sIdx < sectionGroups.length; sIdx++) {
    const sec = parsedSections[sIdx];
    const secContentW = sec.pageWidth - sec.marginLeft - sec.marginRight;
    const activeColWidth =
      sec.columnCount > 1
        ? (secContentW - sec.columnGap * (sec.columnCount - 1)) / sec.columnCount
        : secContentW;

    if (sIdx > 0) {
      blocks.push({
        kind: 'section-break',
        nextSection: sec,
        breakType: sec.breakType ?? 'nextPage',
      });
    }

    for (const child of sectionGroups[sIdx].elements) {
      const tag = localNameOf(child);

      if (tag === 'p') {
        const extractedImages: ImageBlockModel[] = [];
        const para = parseParagraphElement(child, extractedImages, activeColWidth);
        if (para.runs.length > 0 || extractedImages.length === 0) {
          blocks.push(para);
        }
        for (const img of extractedImages) {
          blocks.push(img);
        }
      } else if (tag === 'tbl') {
        blocks.push(parseTableElement(child, activeColWidth));
      } else if (tag === 'sdt') {
        const sdtContent = getChildByLocalName(child, 'sdtContent');
        if (sdtContent) {
          for (let j = 0; j < sdtContent.children.length; j++) {
            const inner = sdtContent.children[j];
            const innerTag = localNameOf(inner);
            if (innerTag === 'p') {
              const imgs: ImageBlockModel[] = [];
              blocks.push(parseParagraphElement(inner, imgs, activeColWidth));
              imgs.forEach(img => blocks.push(img));
            } else if (innerTag === 'tbl') {
              blocks.push(parseTableElement(inner, activeColWidth));
            }
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
    initialSection,
    defaultTabStopPt,
    pageBackgroundColor,
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

function parseBgColorFromStyle(el: Element): RgbColor | undefined {
  const style = el.getAttribute('style') || '';
  const m = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(style);
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
    highlightColor?: RgbColor;
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

    const inlineBg = parseBgColorFromStyle(el) ?? (tag === 'mark' ? WORD_HIGHLIGHT_COLORS.yellow : undefined);
    const next: InlineState = {
      ...state,
      bold: state.bold || tag === 'strong' || tag === 'b' || tag === 'th',
      italic: state.italic || tag === 'em' || tag === 'i',
      underline: state.underline || tag === 'u' || tag === 'a',
      strike: state.strike || tag === 's' || tag === 'del' || tag === 'strike',
      mono: state.mono || tag === 'code' || tag === 'kbd' || tag === 'samp',
      color: parseColorFromStyle(el) ?? (tag === 'a' ? { r: 0.1, g: 0.32, b: 0.72 } : state.color),
      highlightColor: inlineBg ?? state.highlightColor,
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
    preserveLeadingSpaces: true,
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
  highlightColor?: RgbColor;
  underline: boolean;
  strike: boolean;
  isSpace: boolean;
  isTab?: boolean;
}

interface WrappedLine {
  segments: StyledSegment[];
  width: number;
  maxFontSize: number;
  lineHeight: number;
  isLastInParagraph: boolean;
  isPageBreak?: boolean;
  isColumnBreak?: boolean;
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

function computeLineHeight(para: ParagraphBlockModel, maxFontSize: number): number {
  if (para.exactLineHeightPt !== undefined) {
    return para.exactLineHeightPt;
  }
  const natural = maxFontSize * para.lineHeightMultiplier;
  if (para.minLineHeightPt !== undefined) {
    return Math.max(para.minLineHeightPt, natural);
  }
  return natural;
}

function resolveNextTabWidth(
  currentRelX: number,
  tabStops: TabStopDef[] | undefined,
  defaultTabStopPt: number
): number {
  if (tabStops && tabStops.length > 0) {
    const nextExplicit = tabStops.find(s => s.posPt > currentRelX + 1);
    if (nextExplicit) {
      return Math.max(6, nextExplicit.posPt - currentRelX);
    }
  }
  const grid = Math.max(12, defaultTabStopPt);
  const nextGrid = (Math.floor((currentRelX + 0.5) / grid) + 1) * grid;
  return Math.max(6, nextGrid - currentRelX);
}

function wrapParagraphRuns(
  para: ParagraphBlockModel,
  maxLineWidth: number,
  pack: EmbeddedFontPack,
  defaultTabStopPt = 36
): WrappedLine[] {
  const safeMaxWidth = Math.max(30, maxLineWidth);
  const lines: WrappedLine[] = [];

  if (para.runs.length === 0) {
    return [
      {
        segments: [],
        width: 0,
        maxFontSize: para.defaultFontSize,
        lineHeight: computeLineHeight(para, para.defaultFontSize),
        isLastInParagraph: true,
      },
    ];
  }

  let currentSegments: StyledSegment[] = [];
  let currentWidth = 0;
  let currentMaxSize = para.defaultFontSize;
  let isFirstLine = true;
  let justAutoWrapped = false;

  const getFirstLineOffset = () => (isFirstLine ? Math.max(0, para.firstLineIndent) : 0);
  const getAvailableWidth = () => Math.max(30, safeMaxWidth - getFirstLineOffset());

  const flushLine = (isLast: boolean, fromAutoWrap: boolean) => {
    // Trim trailing unhighlighted regular spaces on wrapped lines
    while (
      currentSegments.length > 0 &&
      currentSegments[currentSegments.length - 1].isSpace &&
      !currentSegments[currentSegments.length - 1].isTab &&
      !currentSegments[currentSegments.length - 1].highlightColor
    ) {
      const removed = currentSegments.pop()!;
      currentWidth -= removed.width;
    }
    lines.push({
      segments: currentSegments,
      width: Math.max(0, currentWidth),
      maxFontSize: currentMaxSize,
      lineHeight: computeLineHeight(para, currentMaxSize),
      isLastInParagraph: isLast,
    });
    currentSegments = [];
    currentWidth = 0;
    currentMaxSize = para.defaultFontSize;
    isFirstLine = false;
    justAutoWrapped = fromAutoWrap;
  };

  for (const run of para.runs) {
    if (run.isPageBreak) {
      if (currentSegments.length > 0) flushLine(true, false);
      lines.push({
        segments: [],
        width: 0,
        maxFontSize: para.defaultFontSize,
        lineHeight: 0,
        isLastInParagraph: true,
        isPageBreak: true,
      });
      justAutoWrapped = false;
      continue;
    }

    if (run.isColumnBreak) {
      if (currentSegments.length > 0) flushLine(true, false);
      lines.push({
        segments: [],
        width: 0,
        maxFontSize: para.defaultFontSize,
        lineHeight: 0,
        isLastInParagraph: true,
        isColumnBreak: true,
      });
      justAutoWrapped = false;
      continue;
    }

    if (run.isLineBreak) {
      flushLine(true, false);
      continue;
    }

    const font = selectFont(pack, run);

    if (run.isTab) {
      const avail = getAvailableWidth();
      const relX = getFirstLineOffset() + currentWidth;
      let tabWidth = resolveNextTabWidth(relX, para.tabStops, defaultTabStopPt);
      if (currentSegments.length > 0 && currentWidth + tabWidth > avail) {
        flushLine(false, true);
        tabWidth = resolveNextTabWidth(getFirstLineOffset(), para.tabStops, defaultTabStopPt);
      }
      const clampedTab = Math.min(tabWidth, getAvailableWidth());
      currentSegments.push({
        text: '',
        font,
        fontSize: run.fontSize,
        width: clampedTab,
        color: run.color,
        highlightColor: run.highlightColor,
        underline: run.underline,
        strike: run.strike,
        isSpace: true,
        isTab: true,
      });
      currentWidth += clampedTab;
      currentMaxSize = Math.max(currentMaxSize, run.fontSize);
      justAutoWrapped = false;
      continue;
    }

    const safeText = sanitizeForFont(run.text, font, pack);
    if (!safeText) continue;

    // Tokenize into alternating non-space words and whitespace runs
    const tokens = safeText.match(/\S+|\s+/g) ?? [];
    for (const token of tokens) {
      const isSpace = /^\s+$/.test(token);
      if (
        isSpace &&
        currentSegments.length === 0 &&
        !run.mono &&
        (justAutoWrapped || !para.preserveLeadingSpaces)
      ) {
        // Only drop accidental leading spaces caused by soft auto-wrapping (or collapsed HTML)
        continue;
      }

      const tokWidth = measureSafeWidth(font, token, run.fontSize);
      const avail = getAvailableWidth();

      if (!isSpace && currentSegments.length > 0 && currentWidth + tokWidth > avail) {
        flushLine(false, true);
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
            highlightColor: run.highlightColor,
            underline: run.underline,
            strike: run.strike,
            isSpace: false,
          });
          currentWidth += w;
          currentMaxSize = Math.max(currentMaxSize, run.fontSize);
          justAutoWrapped = false;
          if (idx < chunks.length - 1) {
            flushLine(false, true);
          }
        });
      } else {
        currentSegments.push({
          text: token,
          font,
          fontSize: run.fontSize,
          width: tokWidth,
          color: run.color,
          highlightColor: run.highlightColor,
          underline: run.underline,
          strike: run.strike,
          isSpace,
        });
        currentWidth += tokWidth;
        currentMaxSize = Math.max(currentMaxSize, run.fontSize);
        justAutoWrapped = false;
      }
    }
  }

  if (currentSegments.length > 0 || lines.length === 0) {
    flushLine(true, false);
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
    const spaceCount = line.segments.filter(s => s.isSpace && !s.isTab).length;
    const slack = maxWidth - line.width;
    if (spaceCount > 0 && slack > 0 && slack < maxWidth * 0.35) {
      extraSpacePerGap = slack / spaceCount;
    }
  }

  // Precompute segment X positions & effective widths
  const placed: Array<{ seg: StyledSegment; x: number; w: number }> = [];
  let cursorX = startX;
  for (const seg of line.segments) {
    const w = seg.width + (seg.isSpace && !seg.isTab ? extraSpacePerGap : 0);
    placed.push({ seg, x: cursorX, w });
    cursorX += w;
  }

  // Pass 1: Draw merged inline highlight/shading rectangles behind text
  let spanStartX = 0;
  let spanEndX = 0;
  let spanMaxSize = 0;
  let spanColor: RgbColor | undefined;

  const flushHighlightSpan = () => {
    if (!spanColor || spanEndX <= spanStartX) return;
    page.drawRectangle({
      x: spanStartX - 1.2,
      y: baselineY - spanMaxSize * 0.22,
      width: spanEndX - spanStartX + 2.4,
      height: spanMaxSize * 1.18,
      color: rgb(spanColor.r, spanColor.g, spanColor.b),
    });
    spanColor = undefined;
  };

  for (const item of placed) {
    const hl = item.seg.highlightColor;
    if (hl && sameRgbColor(hl, spanColor)) {
      spanEndX = item.x + item.w;
      spanMaxSize = Math.max(spanMaxSize, item.seg.fontSize);
    } else {
      flushHighlightSpan();
      if (hl) {
        spanColor = hl;
        spanStartX = item.x;
        spanEndX = item.x + item.w;
        spanMaxSize = item.seg.fontSize;
      }
    }
  }
  flushHighlightSpan();

  // Pass 2: Draw text, underlines, and strikethroughs cleanly on top
  for (const { seg, x } of placed) {
    if (seg.text.length > 0) {
      page.drawText(seg.text, {
        x,
        y: baselineY,
        size: seg.fontSize,
        font: seg.font,
        color: rgb(seg.color.r, seg.color.g, seg.color.b),
      });

      if (seg.underline && !seg.isSpace) {
        page.drawLine({
          start: { x, y: baselineY - seg.fontSize * 0.14 },
          end: { x: x + seg.width, y: baselineY - seg.fontSize * 0.14 },
          thickness: Math.max(0.5, seg.fontSize * 0.06),
          color: rgb(seg.color.r, seg.color.g, seg.color.b),
        });
      }
      if (seg.strike && !seg.isSpace) {
        page.drawLine({
          start: { x, y: baselineY + seg.fontSize * 0.28 },
          end: { x: x + seg.width, y: baselineY + seg.fontSize * 0.28 },
          thickness: Math.max(0.5, seg.fontSize * 0.06),
          color: rgb(seg.color.r, seg.color.g, seg.color.b),
        });
      }
    }
  }
}

function computeColumnBoxes(sec: SectionLayoutConfig): Array<{ x: number; width: number }> {
  const totalContentW = Math.max(60, sec.pageWidth - sec.marginLeft - sec.marginRight);
  const count = Math.max(1, sec.columnCount);
  if (count === 1) {
    return [{ x: sec.marginLeft, width: totalContentW }];
  }

  if (sec.columns && sec.columns.length === count) {
    const rawTotal = sec.columns.reduce(
      (sum, c, idx) => sum + c.widthPt + (idx < count - 1 ? c.spaceAfterPt : 0),
      0
    );
    const scale = rawTotal > 0 ? totalContentW / rawTotal : 1;
    const boxes: Array<{ x: number; width: number }> = [];
    let x = sec.marginLeft;
    sec.columns.forEach((c, idx) => {
      const w = Math.max(30, c.widthPt * scale);
      boxes.push({ x, width: w });
      x += w + (idx < count - 1 ? c.spaceAfterPt * scale : 0);
    });
    return boxes;
  }

  const gap = Math.min(sec.columnGap, totalContentW * 0.25);
  const colW = Math.max(40, (totalContentW - gap * (count - 1)) / count);
  return Array.from({ length: count }, (_, idx) => ({
    x: sec.marginLeft + idx * (colW + gap),
    width: colW,
  }));
}

export async function renderLayoutModelToPdfBytes(model: DocumentLayoutModel): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pack = await embedFontPack(pdfDoc);
  const defaultTabStopPt = model.defaultTabStopPt ?? 36;

  let activeSec: SectionLayoutConfig = model.initialSection ?? {
    pageWidth: model.pageWidth,
    pageHeight: model.pageHeight,
    marginTop: model.marginTop,
    marginRight: model.marginRight,
    marginBottom: model.marginBottom,
    marginLeft: model.marginLeft,
    columnCount: 1,
    columnGap: 36,
  };
  let colBoxes = computeColumnBoxes(activeSec);
  let colIndex = 0;

  const paintPageBackground = (p: PDFPage, sec: SectionLayoutConfig) => {
    if (model.pageBackgroundColor) {
      p.drawRectangle({
        x: 0,
        y: 0,
        width: sec.pageWidth,
        height: sec.pageHeight,
        color: rgb(
          model.pageBackgroundColor.r,
          model.pageBackgroundColor.g,
          model.pageBackgroundColor.b
        ),
      });
    }
  };

  let page = pdfDoc.addPage([activeSec.pageWidth, activeSec.pageHeight]);
  paintPageBackground(page, activeSec);
  let sectionTopY = activeSec.pageHeight - activeSec.marginTop;
  let cursorY = sectionTopY;
  let sectionLowestY = sectionTopY;

  const getActiveCol = () => colBoxes[colIndex] ?? colBoxes[0];

  const startNewPage = (sec: SectionLayoutConfig = activeSec) => {
    activeSec = sec;
    colBoxes = computeColumnBoxes(activeSec);
    colIndex = 0;
    page = pdfDoc.addPage([activeSec.pageWidth, activeSec.pageHeight]);
    paintPageBackground(page, activeSec);
    sectionTopY = activeSec.pageHeight - activeSec.marginTop;
    cursorY = sectionTopY;
    sectionLowestY = sectionTopY;
  };

  const advanceColumnOrPage = () => {
    sectionLowestY = Math.min(sectionLowestY, cursorY);
    if (colIndex + 1 < colBoxes.length) {
      if (activeSec.columnSeparator) {
        const prevCol = colBoxes[colIndex];
        const nextCol = colBoxes[colIndex + 1];
        const sepX = (prevCol.x + prevCol.width + nextCol.x) / 2;
        page.drawLine({
          start: { x: sepX, y: sectionTopY },
          end: { x: sepX, y: activeSec.marginBottom },
          thickness: 0.5,
          color: rgb(0.75, 0.78, 0.84),
        });
      }
      colIndex += 1;
      cursorY = sectionTopY;
    } else {
      startNewPage(activeSec);
    }
  };

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY - heightNeeded < activeSec.marginBottom && cursorY < sectionTopY - 1) {
      advanceColumnOrPage();
    }
  };

  const imageCache = new Map<Uint8Array, PDFImage>();

  for (const block of model.blocks) {
    if (block.kind === 'page-break') {
      startNewPage(activeSec);
      continue;
    }

    if (block.kind === 'column-break') {
      advanceColumnOrPage();
      continue;
    }

    if (block.kind === 'section-break') {
      sectionLowestY = Math.min(sectionLowestY, cursorY);
      const samePageSize =
        Math.abs(block.nextSection.pageWidth - activeSec.pageWidth) < 1 &&
        Math.abs(block.nextSection.pageHeight - activeSec.pageHeight) < 1;

      if (block.breakType === 'continuous' && samePageSize) {
        activeSec = block.nextSection;
        colBoxes = computeColumnBoxes(activeSec);
        colIndex = 0;
        const nextTop = sectionLowestY - 4;
        if (nextTop - 24 < activeSec.marginBottom) {
          startNewPage(activeSec);
        } else {
          sectionTopY = nextTop;
          cursorY = sectionTopY;
          sectionLowestY = sectionTopY;
        }
      } else {
        startNewPage(block.nextSection);
      }
      continue;
    }

    if (block.kind === 'hr') {
      cursorY -= block.spaceBefore;
      ensureSpace(6);
      const col = getActiveCol();
      page.drawLine({
        start: { x: col.x, y: cursorY },
        end: { x: col.x + col.width, y: cursorY },
        thickness: 0.75,
        color: rgb(0.75, 0.78, 0.84),
      });
      cursorY -= block.spaceAfter;
      sectionLowestY = Math.min(sectionLowestY, cursorY);
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

        const col = getActiveCol();
        const maxColContentH = activeSec.pageHeight - activeSec.marginTop - activeSec.marginBottom;
        const natW = embedded.width || block.widthPt || 200;
        const natH = embedded.height || block.heightPt || 150;
        let drawW = block.widthPt > 0 ? block.widthPt : natW;
        let drawH = block.heightPt > 0 ? block.heightPt : (natH / natW) * drawW;

        if (drawW > col.width) {
          const ratio = col.width / drawW;
          drawW *= ratio;
          drawH *= ratio;
        }
        if (drawH > maxColContentH * 0.9) {
          const ratio = (maxColContentH * 0.9) / drawH;
          drawW *= ratio;
          drawH *= ratio;
        }

        cursorY -= block.spaceBefore;
        ensureSpace(drawH);
        const drawCol = getActiveCol();

        let imgX = drawCol.x;
        if (block.align === 'center') imgX = drawCol.x + (drawCol.width - drawW) / 2;
        else if (block.align === 'right') imgX = drawCol.x + drawCol.width - drawW;

        page.drawImage(embedded, {
          x: imgX,
          y: cursorY - drawH,
          width: drawW,
          height: drawH,
        });
        cursorY -= drawH + block.spaceAfter;
        sectionLowestY = Math.min(sectionLowestY, cursorY);
      } catch {
        // Skip corrupt embedded image gracefully without breaking document export
      }
      continue;
    }

    if (block.kind === 'paragraph') {
      if (block.pageBreakBefore && cursorY < sectionTopY - 1) {
        startNewPage(activeSec);
      }

      const initialCol = getActiveCol();
      const paraMaxWidth = Math.max(40, initialCol.width - block.indentLeft);
      const wrapped = wrapParagraphRuns(block, paraMaxWidth, pack, defaultTabStopPt);

      if (cursorY < sectionTopY - 1) {
        cursorY -= block.spaceBefore;
      }

      const firstContentLine = wrapped.find(l => !l.isPageBreak && !l.isColumnBreak);
      if (firstContentLine) {
        ensureSpace(firstContentLine.lineHeight);
      }

      let drewMarker = false;
      for (let i = 0; i < wrapped.length; i++) {
        const line = wrapped[i];
        if (line.isPageBreak) {
          startNewPage(activeSec);
          continue;
        }
        if (line.isColumnBreak) {
          advanceColumnOrPage();
          continue;
        }

        ensureSpace(line.lineHeight);
        const activeCol = getActiveCol();
        const paraBaseX = activeCol.x + block.indentLeft;
        const activeParaMaxW = Math.max(40, activeCol.width - block.indentLeft);

        const lineTopY = cursorY;
        const baselineY = lineTopY - line.maxFontSize * 0.85;

        if (block.backgroundColor) {
          page.drawRectangle({
            x: paraBaseX - 4,
            y: lineTopY - line.lineHeight,
            width: activeParaMaxW + 8,
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
            x: Math.max(activeCol.x, paraBaseX - 14),
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
          Math.max(30, activeParaMaxW - xOffset),
          block.align
        );

        cursorY -= line.lineHeight;
        sectionLowestY = Math.min(sectionLowestY, cursorY);
      }

      if (block.bottomBorder) {
        const activeCol = getActiveCol();
        page.drawLine({
          start: { x: activeCol.x, y: cursorY + 2 },
          end: { x: activeCol.x + activeCol.width, y: cursorY + 2 },
          thickness: 0.75,
          color: rgb(0.65, 0.7, 0.78),
        });
      }

      cursorY -= block.spaceAfter;
      sectionLowestY = Math.min(sectionLowestY, cursorY);
      continue;
    }

    if (block.kind === 'table') {
      const cellPadX = 5;
      const cellPadY = 4;
      const headerRow = block.rows[0]?.isHeader ? block.rows[0] : null;

      cursorY -= block.spaceBefore;

      const getScaledColWidths = (colWidth: number): number[] => {
        const rawSum = block.colWidthsPt.reduce((a, b) => a + b, 0);
        if (rawSum > colWidth && rawSum > 0) {
          const ratio = colWidth / rawSum;
          return block.colWidthsPt.map(w => w * ratio);
        }
        return block.colWidthsPt;
      };

      const measureAndPrepareRow = (row: TableRowModel) => {
        const activeCol = getActiveCol();
        const colWidths = getScaledColWidths(activeCol.width);
        let colIdx = 0;
        let maxRowHeight = 16;
        const preparedCells = row.cells.map(cell => {
          let cellWidth = 0;
          for (let c = 0; c < cell.colSpan; c++) {
            cellWidth += colWidths[colIdx + c] ?? activeCol.width / Math.max(1, colWidths.length);
          }
          const cellX =
            activeCol.x +
            colWidths.slice(0, colIdx).reduce((sum, w) => sum + w, 0);
          colIdx += cell.colSpan;

          const innerWidth = Math.max(20, cellWidth - cellPadX * 2);
          const wrappedParas = cell.paragraphs.map(p => ({
            para: p,
            lines: wrapParagraphRuns(p, innerWidth, pack, defaultTabStopPt),
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
        sectionLowestY = Math.min(sectionLowestY, cursorY);
      };

      for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
        const row = block.rows[rIdx];
        let prepared = measureAndPrepareRow(row);

        if (cursorY - prepared.rowHeight < activeSec.marginBottom && cursorY < sectionTopY - 1) {
          advanceColumnOrPage();
          if (headerRow && rIdx > 0) {
            drawPreparedRow(measureAndPrepareRow(headerRow));
          }
          // Recompute X coordinates for the new column
          prepared = measureAndPrepareRow(row);
        }

        drawPreparedRow(prepared);
      }

      cursorY -= block.spaceAfter;
      sectionLowestY = Math.min(sectionLowestY, cursorY);
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
