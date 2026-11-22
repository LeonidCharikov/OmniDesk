import type {
  DocumentBlock,
  DocumentLayoutModel,
  ParagraphBlockModel,
  RgbColor,
  TableCellModel,
  TableRowModel,
  TextAlign,
  TextRunModel,
} from '../tools/files/documentPdfEngine';

export interface InvoiceParty {
  name: string;
  street: string;
  city: string;
  ico: string;
  dic: string;
  phone?: string;
  email?: string;
  account?: string;
}

export interface InvoiceMeta {
  number: string;
  issueDate: string;
  dueDate: string;
  variableSymbol: string;
  constantSymbol: string;
  currency: string;
  note: string;
}

export interface InvoiceLineItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  vat: number;
}

export interface InvoiceDraftPayload {
  version: 1;
  seller: InvoiceParty;
  customer: InvoiceParty;
  invoice: InvoiceMeta;
  lines: InvoiceLineItem[];
}

export interface InvoiceLabels {
  docTitle: string;
  invoiceNumber: string;
  variableSymbol: string;
  constantSymbol: string;
  issueDate: string;
  dueDate: string;
  bankAccount: string;
  supplier: string;
  customer: string;
  businessId: string;
  taxId: string;
  itemHeader: string;
  quantityHeader: string;
  unitPriceHeader: string;
  vatHeader: string;
  totalWithVatHeader: string;
  subtotalWithoutVat: string;
  vatTotal: string;
  totalToPay: string;
}

export interface InvoiceTotals {
  subtotal: number;
  vatTotal: number;
  total: number;
}

export function computeInvoiceTotals(lines: readonly InvoiceLineItem[]): InvoiceTotals {
  let subtotal = 0;
  let vatTotal = 0;
  for (const line of lines) {
    const base = (Number.isFinite(line.quantity) ? line.quantity : 0) * (Number.isFinite(line.unitPrice) ? line.unitPrice : 0);
    const vatRate = Number.isFinite(line.vat) ? line.vat : 0;
    subtotal += base;
    vatTotal += (base * vatRate) / 100;
  }
  return { subtotal, vatTotal, total: subtotal + vatTotal };
}

export function formatInvoiceMoney(value: number, currency: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function sanitizeInvoiceFilename(invoiceNumber: string): string {
  const cleaned = invoiceNumber.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'invoice';
}

const SLATE_900: RgbColor = { r: 0.06, g: 0.09, b: 0.16 };
const SLATE_600: RgbColor = { r: 0.28, g: 0.34, b: 0.42 };
const INDIGO_900: RgbColor = { r: 0.12, g: 0.23, b: 0.54 };
const INDIGO_500: RgbColor = { r: 0.39, g: 0.4, b: 0.95 };
const CARD_BG: RgbColor = { r: 0.97, g: 0.98, b: 0.99 };
const HEADER_BG: RgbColor = { r: 0.94, g: 0.96, b: 0.98 };

function makeRun(
  text: string,
  opts?: Partial<Pick<TextRunModel, 'bold' | 'italic' | 'mono' | 'fontSize' | 'color'>>
): TextRunModel {
  return {
    text,
    bold: opts?.bold ?? false,
    italic: opts?.italic ?? false,
    underline: false,
    strike: false,
    mono: opts?.mono ?? false,
    fontSize: opts?.fontSize ?? 10,
    color: opts?.color ?? SLATE_900,
  };
}

function makeParagraph(
  runs: TextRunModel[],
  opts?: Partial<Pick<ParagraphBlockModel, 'align' | 'spaceBefore' | 'spaceAfter' | 'backgroundColor' | 'leftBorderColor' | 'bottomBorder' | 'indentLeft' | 'defaultFontSize'>>
): ParagraphBlockModel {
  return {
    kind: 'paragraph',
    runs,
    align: opts?.align ?? 'left',
    spaceBefore: opts?.spaceBefore ?? 0,
    spaceAfter: opts?.spaceAfter ?? 4,
    lineHeightMultiplier: 1.25,
    indentLeft: opts?.indentLeft ?? 0,
    firstLineIndent: 0,
    backgroundColor: opts?.backgroundColor,
    leftBorderColor: opts?.leftBorderColor,
    bottomBorder: opts?.bottomBorder,
    defaultFontSize: opts?.defaultFontSize ?? (runs[0]?.fontSize ?? 10),
  };
}

function makeCell(
  paragraphs: ParagraphBlockModel[],
  opts?: { backgroundColor?: RgbColor; isHeader?: boolean; colSpan?: number }
): TableCellModel {
  return {
    paragraphs,
    colSpan: opts?.colSpan ?? 1,
    backgroundColor: opts?.backgroundColor,
    isHeader: opts?.isHeader,
  };
}

function makeTextCell(
  text: string,
  opts?: {
    align?: TextAlign;
    bold?: boolean;
    fontSize?: number;
    color?: RgbColor;
    backgroundColor?: RgbColor;
    isHeader?: boolean;
  }
): TableCellModel {
  return makeCell(
    [
      makeParagraph([makeRun(text, { bold: opts?.bold, fontSize: opts?.fontSize ?? 9.5, color: opts?.color })], {
        align: opts?.align ?? 'left',
        spaceAfter: 1,
      }),
    ],
    { backgroundColor: opts?.backgroundColor, isHeader: opts?.isHeader }
  );
}

/**
 * Builds a structured A4 DocumentLayoutModel for OmniDesk's Unicode PDF renderer.
 */
export function buildInvoicePdfLayoutModel(
  payload: Omit<InvoiceDraftPayload, 'version'>,
  labels: InvoiceLabels
): DocumentLayoutModel {
  const { seller, customer, invoice, lines } = payload;
  const totals = computeInvoiceTotals(lines);

  const blocks: DocumentBlock[] = [];

  // Header table (left: title + invoice #, right: dates + bank account)
  const headerLeftParagraphs: ParagraphBlockModel[] = [
    makeParagraph([makeRun(labels.docTitle, { bold: true, fontSize: 18, color: SLATE_900 })], { spaceAfter: 3 }),
    makeParagraph(
      [
        makeRun(`${labels.invoiceNumber} `, { fontSize: 11, color: SLATE_600 }),
        makeRun(invoice.number, { bold: true, fontSize: 11, color: SLATE_900 }),
      ],
      { spaceAfter: 3 }
    ),
  ];

  const symbolParts: string[] = [];
  if (invoice.variableSymbol.trim()) symbolParts.push(`${labels.variableSymbol} ${invoice.variableSymbol.trim()}`);
  if (invoice.constantSymbol.trim()) symbolParts.push(`${labels.constantSymbol} ${invoice.constantSymbol.trim()}`);
  if (symbolParts.length > 0) {
    headerLeftParagraphs.push(
      makeParagraph([makeRun(symbolParts.join('  •  '), { fontSize: 9, color: SLATE_600 })], { spaceAfter: 2 })
    );
  }

  const headerRightParagraphs: ParagraphBlockModel[] = [
    makeParagraph(
      [
        makeRun(`${labels.issueDate} `, { fontSize: 9.5, color: SLATE_600 }),
        makeRun(invoice.issueDate, { bold: true, fontSize: 9.5 }),
      ],
      { align: 'right', spaceAfter: 2 }
    ),
    makeParagraph(
      [
        makeRun(`${labels.dueDate} `, { fontSize: 9.5, color: SLATE_600 }),
        makeRun(invoice.dueDate, { bold: true, fontSize: 9.5 }),
      ],
      { align: 'right', spaceAfter: 5 }
    ),
  ];

  if (seller.account?.trim()) {
    headerRightParagraphs.push(
      makeParagraph([makeRun(labels.bankAccount, { fontSize: 8.5, color: SLATE_600 })], { align: 'right', spaceAfter: 1 }),
      makeParagraph([makeRun(seller.account.trim(), { bold: true, fontSize: 10, color: INDIGO_900 })], {
        align: 'right',
        spaceAfter: 0,
      })
    );
  }

  blocks.push({
    kind: 'table',
    colWidthsPt: [280, 215],
    hasBorders: false,
    spaceBefore: 0,
    spaceAfter: 6,
    rows: [
      {
        cells: [makeCell(headerLeftParagraphs), makeCell(headerRightParagraphs)],
      },
    ],
  });

  blocks.push({ kind: 'hr', spaceBefore: 2, spaceAfter: 10 });

  // Supplier & Customer cards
  const buildPartyParagraphs = (heading: string, party: InvoiceParty): ParagraphBlockModel[] => {
    const out: ParagraphBlockModel[] = [
      makeParagraph([makeRun(heading.toUpperCase(), { bold: true, fontSize: 8.5, color: SLATE_600 })], { spaceAfter: 4 }),
      makeParagraph([makeRun(party.name || '-', { bold: true, fontSize: 11, color: SLATE_900 })], { spaceAfter: 2 }),
    ];
    if (party.street.trim()) {
      out.push(makeParagraph([makeRun(party.street.trim(), { fontSize: 9.5 })], { spaceAfter: 1 }));
    }
    if (party.city.trim()) {
      out.push(makeParagraph([makeRun(party.city.trim(), { fontSize: 9.5 })], { spaceAfter: 5 }));
    }
    if (party.ico.trim()) {
      out.push(
        makeParagraph(
          [makeRun(`${labels.businessId}: `, { fontSize: 9, color: SLATE_600 }), makeRun(party.ico.trim(), { bold: true, fontSize: 9 })],
          { spaceAfter: 1 }
        )
      );
    }
    if (party.dic.trim()) {
      out.push(
        makeParagraph(
          [makeRun(`${labels.taxId}: `, { fontSize: 9, color: SLATE_600 }), makeRun(party.dic.trim(), { bold: true, fontSize: 9 })],
          { spaceAfter: 1 }
        )
      );
    }
    if (party.email?.trim()) {
      out.push(makeParagraph([makeRun(`Email: ${party.email.trim()}`, { fontSize: 9, color: SLATE_600 })], { spaceAfter: 1 }));
    }
    if (party.phone?.trim()) {
      out.push(makeParagraph([makeRun(`Tel: ${party.phone.trim()}`, { fontSize: 9, color: SLATE_600 })], { spaceAfter: 0 }));
    }
    return out;
  };

  blocks.push({
    kind: 'table',
    colWidthsPt: [242, 11, 242],
    hasBorders: false,
    spaceBefore: 2,
    spaceAfter: 14,
    rows: [
      {
        cells: [
          makeCell(buildPartyParagraphs(labels.supplier, seller), { backgroundColor: CARD_BG }),
          makeCell([makeParagraph([makeRun('', { fontSize: 6 })], { spaceAfter: 0 })]),
          makeCell(buildPartyParagraphs(labels.customer, customer), { backgroundColor: CARD_BG }),
        ],
      },
    ],
  });

  // Line items table
  const itemRows: TableRowModel[] = [
    {
      isHeader: true,
      cells: [
        makeTextCell(labels.itemHeader, { bold: true, backgroundColor: HEADER_BG, isHeader: true }),
        makeTextCell(labels.quantityHeader, { align: 'right', bold: true, backgroundColor: HEADER_BG, isHeader: true }),
        makeTextCell(labels.unitPriceHeader, { align: 'right', bold: true, backgroundColor: HEADER_BG, isHeader: true }),
        makeTextCell(labels.vatHeader, { align: 'right', bold: true, backgroundColor: HEADER_BG, isHeader: true }),
        makeTextCell(labels.totalWithVatHeader, { align: 'right', bold: true, backgroundColor: HEADER_BG, isHeader: true }),
      ],
    },
    ...lines.map(line => {
      const lineTotal = (line.quantity * line.unitPrice * (100 + line.vat)) / 100;
      return {
        cells: [
          makeTextCell(line.description || '-'),
          makeTextCell(String(line.quantity), { align: 'right' }),
          makeTextCell(formatInvoiceMoney(line.unitPrice, invoice.currency), { align: 'right' }),
          makeTextCell(`${line.vat}%`, { align: 'right' }),
          makeTextCell(formatInvoiceMoney(lineTotal, invoice.currency), { align: 'right', bold: true }),
        ],
      };
    }),
  ];

  blocks.push({
    kind: 'table',
    colWidthsPt: [215, 50, 90, 45, 95],
    hasBorders: true,
    spaceBefore: 4,
    spaceAfter: 14,
    rows: itemRows,
  });

  // Totals summary
  blocks.push(
    makeParagraph(
      [
        makeRun(
          `${labels.subtotalWithoutVat} ${formatInvoiceMoney(totals.subtotal, invoice.currency)}   •   ${labels.vatTotal} ${formatInvoiceMoney(totals.vatTotal, invoice.currency)}`,
          { fontSize: 9.5, color: SLATE_600 }
        ),
      ],
      { align: 'right', spaceBefore: 4, spaceAfter: 4 }
    ),
    makeParagraph(
      [
        makeRun(`${labels.totalToPay} `, { bold: true, fontSize: 12, color: SLATE_900 }),
        makeRun(formatInvoiceMoney(totals.total, invoice.currency), { bold: true, fontSize: 16, color: INDIGO_900 }),
      ],
      { align: 'right', spaceBefore: 2, spaceAfter: 16 }
    )
  );

  // Note block
  if (invoice.note.trim()) {
    blocks.push(
      makeParagraph([makeRun(invoice.note.trim(), { fontSize: 9.5, color: SLATE_600 })], {
        spaceBefore: 8,
        spaceAfter: 4,
        backgroundColor: CARD_BG,
        leftBorderColor: INDIGO_500,
        indentLeft: 8,
      })
    );
  }

  return {
    pageWidth: 595.28,
    pageHeight: 841.89,
    marginTop: 48,
    marginRight: 50,
    marginBottom: 48,
    marginLeft: 50,
    blocks,
  };
}

/**
 * Generates clean plain text suitable for `.txt` or `.docx` (via buildMinimalDocx).
 */
export function buildInvoicePlainText(
  payload: Omit<InvoiceDraftPayload, 'version'>,
  labels: InvoiceLabels
): string {
  const { seller, customer, invoice, lines } = payload;
  const totals = computeInvoiceTotals(lines);
  const out: string[] = [];

  out.push(labels.docTitle);
  out.push(`${labels.invoiceNumber} ${invoice.number}`);
  out.push(`${labels.issueDate} ${invoice.issueDate} | ${labels.dueDate} ${invoice.dueDate}`);
  if (invoice.variableSymbol || invoice.constantSymbol) {
    out.push(`${labels.variableSymbol} ${invoice.variableSymbol} | ${labels.constantSymbol} ${invoice.constantSymbol}`);
  }
  if (seller.account) {
    out.push(`${labels.bankAccount} ${seller.account}`);
  }
  out.push('');
  out.push(`${labels.supplier.toUpperCase()}:`);
  out.push(seller.name);
  if (seller.street) out.push(seller.street);
  if (seller.city) out.push(seller.city);
  if (seller.ico) out.push(`${labels.businessId}: ${seller.ico}`);
  if (seller.dic) out.push(`${labels.taxId}: ${seller.dic}`);
  if (seller.email) out.push(`Email: ${seller.email}`);
  if (seller.phone) out.push(`Tel: ${seller.phone}`);
  out.push('');
  out.push(`${labels.customer.toUpperCase()}:`);
  out.push(customer.name);
  if (customer.street) out.push(customer.street);
  if (customer.city) out.push(customer.city);
  if (customer.ico) out.push(`${labels.businessId}: ${customer.ico}`);
  if (customer.dic) out.push(`${labels.taxId}: ${customer.dic}`);
  out.push('');
  out.push(`${labels.itemHeader} | ${labels.quantityHeader} | ${labels.unitPriceHeader} | ${labels.vatHeader} | ${labels.totalWithVatHeader}`);
  out.push('------------------------------------------------------------------------');
  for (const line of lines) {
    const lineTotal = (line.quantity * line.unitPrice * (100 + line.vat)) / 100;
    out.push(
      `${line.description || '-'} | ${line.quantity} | ${formatInvoiceMoney(line.unitPrice, invoice.currency)} | ${line.vat}% | ${formatInvoiceMoney(lineTotal, invoice.currency)}`
    );
  }
  out.push('------------------------------------------------------------------------');
  out.push(`${labels.subtotalWithoutVat} ${formatInvoiceMoney(totals.subtotal, invoice.currency)}`);
  out.push(`${labels.vatTotal} ${formatInvoiceMoney(totals.vatTotal, invoice.currency)}`);
  out.push(`${labels.totalToPay} ${formatInvoiceMoney(totals.total, invoice.currency)}`);

  if (invoice.note.trim()) {
    out.push('');
    out.push(invoice.note.trim());
  }

  return out.join('\n');
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an Excel-friendly UTF-8 BOM CSV with invoice metadata and line items.
 */
export function buildInvoiceCsv(
  payload: Omit<InvoiceDraftPayload, 'version'>,
  labels: InvoiceLabels
): string {
  const { seller, customer, invoice, lines } = payload;
  const totals = computeInvoiceTotals(lines);
  const rows: Array<Array<string | number>> = [
    ['Field', 'Value'],
    [labels.invoiceNumber.replace(/:$/, ''), invoice.number],
    [labels.issueDate.replace(/:$/, ''), invoice.issueDate],
    [labels.dueDate.replace(/:$/, ''), invoice.dueDate],
    [labels.variableSymbol.replace(/:$/, ''), invoice.variableSymbol],
    [labels.constantSymbol.replace(/:$/, ''), invoice.constantSymbol],
    ['Currency', invoice.currency],
    [labels.supplier, seller.name],
    [`${labels.supplier} ${labels.businessId}`, seller.ico],
    [`${labels.supplier} ${labels.taxId}`, seller.dic],
    [labels.bankAccount.replace(/:$/, ''), seller.account ?? ''],
    [labels.customer, customer.name],
    [`${labels.customer} ${labels.businessId}`, customer.ico],
    [`${labels.customer} ${labels.taxId}`, customer.dic],
    [],
    [
      labels.itemHeader,
      labels.quantityHeader,
      labels.unitPriceHeader,
      labels.vatHeader,
      'Net Subtotal',
      'VAT Amount',
      labels.totalWithVatHeader,
    ],
  ];

  for (const line of lines) {
    const net = line.quantity * line.unitPrice;
    const vatAmt = (net * line.vat) / 100;
    const gross = net + vatAmt;
    rows.push([
      line.description,
      line.quantity,
      line.unitPrice.toFixed(2),
      `${line.vat}%`,
      net.toFixed(2),
      vatAmt.toFixed(2),
      gross.toFixed(2),
    ]);
  }

  rows.push([]);
  rows.push([labels.subtotalWithoutVat.replace(/:$/, ''), '', '', '', totals.subtotal.toFixed(2), '', '']);
  rows.push([labels.vatTotal.replace(/:$/, ''), '', '', '', '', totals.vatTotal.toFixed(2), '']);
  rows.push([labels.totalToPay.replace(/:$/, ''), '', '', '', '', '', totals.total.toFixed(2)]);

  return '\uFEFF' + rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function asString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

function asNumber(val: unknown, fallback = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Safely validates and parses an exported Invoice JSON draft file.
 */
export function parseInvoiceDraftJson(rawJson: string): InvoiceDraftPayload | null {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (!obj.seller || typeof obj.seller !== 'object') return null;
    if (!obj.customer || typeof obj.customer !== 'object') return null;
    if (!obj.invoice || typeof obj.invoice !== 'object') return null;
    if (!Array.isArray(obj.lines)) return null;

    const s = obj.seller as Record<string, unknown>;
    const c = obj.customer as Record<string, unknown>;
    const inv = obj.invoice as Record<string, unknown>;

    const parsedLines: InvoiceLineItem[] = obj.lines
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item, idx) => ({
        id: asNumber(item.id, idx + 1),
        description: asString(item.description),
        quantity: asNumber(item.quantity, 1),
        unitPrice: asNumber(item.unitPrice, 0),
        vat: asNumber(item.vat, 21),
      }));

    return {
      version: 1,
      seller: {
        name: asString(s.name),
        street: asString(s.street),
        city: asString(s.city),
        ico: asString(s.ico),
        dic: asString(s.dic),
        phone: asString(s.phone),
        email: asString(s.email),
        account: asString(s.account),
      },
      customer: {
        name: asString(c.name),
        street: asString(c.street),
        city: asString(c.city),
        ico: asString(c.ico),
        dic: asString(c.dic),
      },
      invoice: {
        number: asString(inv.number),
        issueDate: asString(inv.issueDate),
        dueDate: asString(inv.dueDate),
        variableSymbol: asString(inv.variableSymbol),
        constantSymbol: asString(inv.constantSymbol),
        currency: asString(inv.currency, 'USD'),
        note: asString(inv.note),
      },
      lines: parsedLines.length > 0 ? parsedLines : [{ id: 1, description: '', quantity: 1, unitPrice: 0, vat: 21 }],
    };
  } catch {
    return null;
  }
}
