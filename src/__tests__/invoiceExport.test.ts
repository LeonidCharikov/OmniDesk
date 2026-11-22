import { describe, it, expect } from 'vitest';
import {
  buildInvoiceCsv,
  buildInvoicePdfLayoutModel,
  buildInvoicePlainText,
  computeInvoiceTotals,
  parseInvoiceDraftJson,
  sanitizeInvoiceFilename,
  type InvoiceLabels,
} from '../utils/invoiceExport.logic';
import { buildMinimalDocx } from '../tools/files/converterEncoders';

const SAMPLE_LABELS: InvoiceLabels = {
  docTitle: 'INVOICE - TAX DOCUMENT',
  invoiceNumber: 'Invoice No.:',
  variableSymbol: 'Variable Symbol:',
  constantSymbol: 'Constant Symbol:',
  issueDate: 'Issue Date:',
  dueDate: 'Due Date:',
  bankAccount: 'Bank Account:',
  supplier: 'Supplier',
  customer: 'Customer',
  businessId: 'Business ID',
  taxId: 'Tax ID',
  itemHeader: 'Item',
  quantityHeader: 'Quantity',
  unitPriceHeader: 'Unit Price',
  vatHeader: 'VAT',
  totalWithVatHeader: 'Total incl. VAT',
  subtotalWithoutVat: 'Subtotal excl. VAT:',
  vatTotal: 'Total VAT:',
  totalToPay: 'Total to Pay:',
};

const SAMPLE_DATA = {
  seller: {
    name: 'Jan Novák - IT Solutions',
    street: 'Vodičkova 25',
    city: '110 00 Praha 1',
    ico: '12345678',
    dic: 'CZ12345678',
    phone: '+420 777 123 456',
    email: 'info@novak-it.cz',
    account: '123456789/0800',
  },
  customer: {
    name: 'Acme Corp, s.r.o.',
    street: 'Klimentská 10',
    city: '110 00 Praha 1',
    ico: '87654321',
    dic: 'CZ87654321',
  },
  invoice: {
    number: 'INV/2026 001',
    issueDate: '2026-11-22',
    dueDate: '2026-12-06',
    variableSymbol: '2026001',
    constantSymbol: '0308',
    currency: 'CZK',
    note: 'Thank you for your business.',
  },
  lines: [
    { id: 1, description: 'Frontend development', quantity: 2, unitPrice: 1000, vat: 21 },
    { id: 2, description: 'Hosting, support', quantity: 1, unitPrice: 500, vat: 0 },
  ],
};

describe('invoiceExport.logic', () => {
  it('computes subtotal, VAT, and grand total accurately', () => {
    const totals = computeInvoiceTotals(SAMPLE_DATA.lines);
    expect(totals.subtotal).toBe(2500);
    expect(totals.vatTotal).toBeCloseTo(420, 6);
    expect(totals.total).toBeCloseTo(2920, 6);
  });

  it('sanitizes invoice filenames safely', () => {
    expect(sanitizeInvoiceFilename('INV/2026 001')).toBe('INV-2026-001');
    expect(sanitizeInvoiceFilename('   ')).toBe('invoice');
  });

  it('builds a valid A4 PDF layout model containing header, party cards, line-items table, and note', () => {
    const model = buildInvoicePdfLayoutModel(SAMPLE_DATA, SAMPLE_LABELS);
    expect(model.pageWidth).toBeCloseTo(595.28, 2);
    expect(model.pageHeight).toBeCloseTo(841.89, 2);
    const tables = model.blocks.filter(b => b.kind === 'table');
    expect(tables.length).toBe(3); // header, parties, line items
  });

  it('generates UTF-8 BOM CSV with escaped commas and accurate totals', () => {
    const csv = buildInvoiceCsv(SAMPLE_DATA, SAMPLE_LABELS);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Acme Corp, s.r.o."');
    expect(csv).toContain('"Hosting, support"');
    expect(csv).toContain('2920.00');
  });

  it('produces valid DOCX binary bytes from invoice plain text', () => {
    const plain = buildInvoicePlainText(SAMPLE_DATA, SAMPLE_LABELS);
    expect(plain).toContain('Jan Novák - IT Solutions');
    expect(plain).toContain('2,920.00 CZK');
    const docx = buildMinimalDocx(plain);
    expect(docx[0]).toBe(0x50); // 'P' (ZIP magic)
    expect(docx[1]).toBe(0x4b); // 'K'
  });

  it('round-trips and validates JSON invoice drafts and rejects invalid payloads', () => {
    const json = JSON.stringify({ version: 1, ...SAMPLE_DATA });
    const parsed = parseInvoiceDraftJson(json);
    expect(parsed).not.toBeNull();
    expect(parsed?.seller.name).toBe('Jan Novák - IT Solutions');
    expect(parsed?.lines).toHaveLength(2);
    expect(parseInvoiceDraftJson('not json')).toBeNull();
    expect(parseInvoiceDraftJson('{}')).toBeNull();
  });
});
