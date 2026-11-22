import React, { useEffect, useState } from 'react';
import {
  Download,
  Plus,
  Trash2,
  Printer,
  FileText,
  FileSpreadsheet,
  FileCode2,
  Save,
  Upload,
  Loader2,
} from 'lucide-react';
import { printHtmlDocument } from '../../services/printService';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, SUPPORTED_FIAT_CURRENCIES } from '../../services/currencyService';
import { openFileWithPicker, saveBinaryWithDialog, saveTextWithDialog } from '../../services/fileSystemService';
import { toastService } from '../../services/toastService';
import { buildMinimalDocx } from '../files/converterEncoders';
import {
  buildInvoiceCsv,
  buildInvoicePdfLayoutModel,
  buildInvoicePlainText,
  computeInvoiceTotals,
  parseInvoiceDraftJson,
  sanitizeInvoiceFilename,
  type InvoiceDraftPayload,
  type InvoiceLabels,
  type InvoiceLineItem,
  type InvoiceMeta,
  type InvoiceParty,
} from '../../utils/invoiceExport.logic';
import { btn, secondary, input, box, Header } from './shared';

const DRAFT_STORAGE_KEY = 'omnidesk_invoice_draft_v1';

/* ─────────────────────────────────────────────────────────────
   INVOICE GENERATOR
   ───────────────────────────────────────────────────────────── */
export const InvoiceGeneratorTool: React.FC = () => {
  const { t } = useI18n();
  const [appCurrency] = useAppCurrency();
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadSavedDraft = (): InvoiceDraftPayload | null => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DRAFT_STORAGE_KEY) : null;
      if (!raw) return null;
      return parseInvoiceDraftJson(raw);
    } catch {
      return null;
    }
  };

  const [initialDraft] = useState<InvoiceDraftPayload | null>(() => loadSavedDraft());

  const [seller, setSeller] = useState<InvoiceParty>(() =>
    initialDraft?.seller ?? {
      name: t('default_seller_name', 'Jan Novák - IT Solutions'),
      street: t('default_seller_street', 'Vodičkova 25'),
      city: t('default_seller_city', '110 00 Praha 1'),
      ico: '12345678',
      dic: 'CZ12345678',
      phone: '+420 777 123 456',
      email: 'info@novak-it.cz',
      account: t('default_seller_account', '123456789/0800 (Česká spořitelna)'),
    }
  );

  const [customer, setCustomer] = useState<InvoiceParty>(() =>
    initialDraft?.customer ?? {
      name: t('default_customer_name', 'Acme Corporation s.r.o.'),
      street: t('default_customer_street', 'Klimentská 10'),
      city: t('default_customer_city', '110 00 Praha 1'),
      ico: '87654321',
      dic: 'CZ87654321',
    }
  );

  const [invoice, setInvoice] = useState<InvoiceMeta>(() =>
    initialDraft?.invoice ?? {
      number: `INV-${new Date().getFullYear()}-001`,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      variableSymbol: `${new Date().getFullYear()}001`,
      constantSymbol: '0308',
      currency: appCurrency || 'CZK',
      note: t('default_seller_note', 'Děkujeme za spolupráci. Platbu proveďte převodem na bankovní účet.'),
    }
  );

  const [lines, setLines] = useState<InvoiceLineItem[]>(() =>
    initialDraft?.lines ?? [
      { id: 1, description: t('default_item_dev', 'Vývoj webové aplikace a frontend integrace'), quantity: 1, unitPrice: 25000, vat: 21 },
      { id: 2, description: t('default_item_support', 'Technická podpora a správa serveru'), quantity: 5, unitPrice: 1200, vat: 21 },
    ]
  );

  useEffect(() => {
    if (appCurrency && !initialDraft) {
      setInvoice(prev => (prev.currency === appCurrency ? prev : { ...prev, currency: appCurrency }));
    }
  }, [appCurrency, initialDraft]);

  useEffect(() => {
    try {
      const draft: InvoiceDraftPayload = { version: 1, seller, customer, invoice, lines };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota / private-mode write restrictions
    }
  }, [seller, customer, invoice, lines]);

  const update = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T, value: T[keyof T]) =>
    setter(current => ({ ...current, [key]: value }));

  const { subtotal, vatTotal, total } = computeInvoiceTotals(lines);

  const field = (label: string, value: string, onChange: (value: string) => void, type = 'text') => (
    <label className="text-xs text-slate-400 block">
      {label}
      <input className={input + ' mt-1'} type={type} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );

  const getLabels = (): InvoiceLabels => ({
    docTitle: t('invoice_title_doc', 'INVOICE - TAX DOCUMENT'),
    invoiceNumber: t('invoice_number_label', 'Invoice No.:'),
    variableSymbol: t('variable_symbol_label', 'Variable Symbol:'),
    constantSymbol: t('constant_symbol_label', 'Constant Symbol:'),
    issueDate: t('issue_date_label', 'Issue Date:'),
    dueDate: t('due_date_label', 'Due Date:'),
    bankAccount: t('bank_account_label', 'Bank Account:'),
    supplier: t('supplier', 'Supplier'),
    customer: t('customer', 'Customer'),
    businessId: t('business_id', 'Business ID'),
    taxId: t('tax_id', 'Tax ID'),
    itemHeader: t('item_header', 'Item'),
    quantityHeader: t('quantity_header', 'Quantity'),
    unitPriceHeader: t('unit_price_header', 'Unit Price'),
    vatHeader: t('vat_header', 'VAT'),
    totalWithVatHeader: t('total_with_vat_header', 'Total incl. VAT'),
    subtotalWithoutVat: t('subtotal_without_vat', 'Subtotal excl. VAT:'),
    vatTotal: t('vat_total_label', 'Total VAT:'),
    totalToPay: t('total_to_pay', 'Total to Pay:'),
  });

  const buildInvoiceParts = () => {
    const esc = (value: string) =>
      value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));

    const labels = getLabels();

    const styles = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; max-width: 850px; margin: 40px auto; color: #1e293b; padding: 20px; line-height: 1.5; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
      .badge { font-size: 24px; font-weight: 800; color: #0f172a; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0; }
      .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
      .box h3 { margin-top: 0; font-size: 14px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; margin: 30px 0; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 13px; }
      th { background: #f1f5f9; font-weight: 600; }
      .text-right { text-align: right; }
      .total-box { margin-top: 20px; text-align: right; }
      .total-amount { font-size: 26px; font-weight: 800; color: #0f172a; }
      @media print { body { margin: 0; padding: 0; } }
    `;

    const bodyHtml = `
      <div class="header">
        <div>
          <div class="badge">${esc(labels.docTitle)}</div>
          <div style="font-size: 16px; color: #475569; margin-top: 4px;">${esc(labels.invoiceNumber)} <strong>${esc(invoice.number)}</strong></div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
            ${esc(labels.variableSymbol)} <strong>${esc(invoice.variableSymbol)}</strong> &bull; ${esc(labels.constantSymbol)} ${esc(invoice.constantSymbol)}
          </div>
        </div>
        <div class="text-right" style="font-size: 13px;">
          <div>${esc(labels.issueDate)} <strong>${esc(invoice.issueDate)}</strong></div>
          <div>${esc(labels.dueDate)} <strong>${esc(invoice.dueDate)}</strong></div>
          <div style="margin-top: 10px;">${esc(labels.bankAccount)}</div>
          <div style="font-weight: 700; color: #1e3a8a;">${esc(seller.account ?? '')}</div>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <h3>${esc(labels.supplier)}</h3>
          <strong style="font-size: 15px;">${esc(seller.name)}</strong><br>
          ${esc(seller.street)}<br>
          ${esc(seller.city)}<br><br>
          ${seller.ico ? `${esc(labels.businessId)}: <strong>${esc(seller.ico)}</strong><br>` : ''}
          ${seller.dic ? `${esc(labels.taxId)}: <strong>${esc(seller.dic)}</strong><br>` : ''}
          ${seller.email ? `Email: ${esc(seller.email)}<br>` : ''}
          ${seller.phone ? `Tel: ${esc(seller.phone)}` : ''}
        </div>
        <div class="box">
          <h3>${esc(labels.customer)}</h3>
          <strong style="font-size: 15px;">${esc(customer.name)}</strong><br>
          ${esc(customer.street)}<br>
          ${esc(customer.city)}<br><br>
          ${customer.ico ? `${esc(labels.businessId)}: <strong>${esc(customer.ico)}</strong><br>` : ''}
          ${customer.dic ? `${esc(labels.taxId)}: <strong>${esc(customer.dic)}</strong><br>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${esc(labels.itemHeader)}</th>
            <th class="text-right">${esc(labels.quantityHeader)}</th>
            <th class="text-right">${esc(labels.unitPriceHeader)}</th>
            <th class="text-right">${esc(labels.vatHeader)}</th>
            <th class="text-right">${esc(labels.totalWithVatHeader)}</th>
          </tr>
        </thead>
        <tbody>
          ${lines
            .map(
              l => `<tr>
              <td>${esc(l.description)}</td>
              <td class="text-right">${l.quantity}</td>
              <td class="text-right">${l.unitPrice.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}</td>
              <td class="text-right">${l.vat}%</td>
              <td class="text-right"><strong>${((l.quantity * l.unitPrice * (100 + l.vat)) / 100).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}</strong></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>

      <div class="total-box">
        <div style="font-size: 14px; color: #64748b;">
          ${esc(labels.subtotalWithoutVat)} ${subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)} &bull; ${esc(labels.vatTotal)} ${vatTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}
        </div>
        <div style="margin-top: 8px;">
          <span style="font-size: 16px; font-weight: 600;">${esc(labels.totalToPay)} </span>
          <span class="total-amount">${total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}</span>
        </div>
      </div>

      ${invoice.note ? `<div style="margin-top: 30px; padding: 12px; background: #f8fafc; border-left: 3px solid #6366f1; font-size: 12px;">${esc(invoice.note)}</div>` : ''}
    `;

    return { styles, bodyHtml, safeNumber: esc(invoice.number) };
  };

  const baseName = `invoice-${sanitizeInvoiceFilename(invoice.number)}`;

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const { renderLayoutModelToPdfBytes } = await import('../files/documentPdfEngine');
      const model = buildInvoicePdfLayoutModel({ seller, customer, invoice, lines }, getLabels());
      const pdfBytes = await renderLayoutModelToPdfBytes(model);
      const res = await saveBinaryWithDialog(
        `${baseName}.pdf`,
        pdfBytes,
        'application/pdf',
        [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }],
        t('invoice_save_pdf', 'Save Invoice as PDF')
      );
      if (res.success) {
        toastService.show({ type: 'success', title: t('invoice_saved_toast', 'Invoice saved'), message: `${baseName}.pdf` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toastService.show({ type: 'error', title: t('invoice_export_error', 'Export failed'), message: msg });
    } finally {
      setExportingPdf(false);
    }
  };

  const exportDocx = async () => {
    try {
      const plain = buildInvoicePlainText({ seller, customer, invoice, lines }, getLabels());
      const docxBytes = buildMinimalDocx(plain);
      const res = await saveBinaryWithDialog(
        `${baseName}.docx`,
        docxBytes,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        [{ name: 'Word Document (*.docx)', extensions: ['docx'] }],
        t('invoice_save_docx', 'Save Invoice as DOCX')
      );
      if (res.success) {
        toastService.show({ type: 'success', title: t('invoice_saved_toast', 'Invoice saved'), message: `${baseName}.docx` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toastService.show({ type: 'error', title: t('invoice_export_error', 'Export failed'), message: msg });
    }
  };

  const exportCsv = async () => {
    const csv = buildInvoiceCsv({ seller, customer, invoice, lines }, getLabels());
    const res = await saveTextWithDialog(
      `${baseName}.csv`,
      csv,
      [{ name: 'CSV Spreadsheet (*.csv)', extensions: ['csv'] }],
      t('invoice_save_csv', 'Save Invoice as CSV')
    );
    if (res.success) {
      toastService.show({ type: 'success', title: t('invoice_saved_toast', 'Invoice saved'), message: `${baseName}.csv` });
    }
  };

  const exportHtml = async () => {
    const { styles, bodyHtml, safeNumber } = buildInvoiceParts();
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${safeNumber}</title>
  <style>${styles}</style>
</head>
<body>${bodyHtml}</body>
</html>`;

    const res = await saveTextWithDialog(
      `${baseName}.html`,
      html,
      [{ name: 'HTML Document (*.html)', extensions: ['html'] }],
      t('save_invoice', 'Save Invoice')
    );
    if (res.success) {
      toastService.show({ type: 'success', title: t('invoice_saved_toast', 'Invoice saved'), message: `${baseName}.html` });
    }
  };

  const exportJsonDraft = async () => {
    const payload: InvoiceDraftPayload = { version: 1, seller, customer, invoice, lines };
    const res = await saveTextWithDialog(
      `${baseName}.json`,
      JSON.stringify(payload, null, 2),
      [{ name: 'Invoice Draft (*.json)', extensions: ['json'] }],
      t('invoice_save_json', 'Save Invoice Draft (JSON)')
    );
    if (res.success) {
      toastService.show({ type: 'success', title: t('invoice_saved_toast', 'Invoice saved'), message: `${baseName}.json` });
    }
  };

  const importJsonDraft = async () => {
    const picked = await openFileWithPicker({
      filters: [{ name: 'Invoice Draft (*.json)', extensions: ['json'] }],
      accept: '.json,application/json',
      readAs: 'text',
      title: t('invoice_load_json', 'Load Invoice Draft (JSON)'),
    });
    if (!picked || typeof picked.content !== 'string') return;
    const parsed = parseInvoiceDraftJson(picked.content);
    if (!parsed) {
      toastService.show({
        type: 'error',
        title: t('invoice_invalid_json', 'Invalid invoice JSON draft'),
      });
      return;
    }
    setSeller(parsed.seller);
    setCustomer(parsed.customer);
    setInvoice(parsed.invoice);
    setLines(parsed.lines);
    toastService.show({ type: 'success', title: t('invoice_loaded_toast', 'Invoice draft loaded'), message: picked.name });
  };

  const printInvoice = () => {
    const { styles, bodyHtml } = buildInvoiceParts();
    void printHtmlDocument(bodyHtml, {
      title: `${t('invoice_title_doc', 'INVOICE')} ${invoice.number}`.trim(),
      extraCss: styles,
    });
  };

  return (
    <div className="space-y-5">
      <Header
        title="Invoice Generator"
        desc={t('invoice_generator_desc', 'Create a tax invoice with supplier, customer, and line items and export to PDF, DOCX, CSV, HTML, or JSON.')}
      />
      <div className={box + ' space-y-4'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-white text-sm">{t('invoice_supplier', 'Supplier')}</h3>
          <div className="flex flex-wrap gap-2">
            <button className={secondary + ' text-xs py-1.5'} onClick={() => void importJsonDraft()}>
              <Upload className="inline w-3.5 h-3.5 mr-1.5" />
              {t('invoice_load_draft', 'Load Draft (.json)')}
            </button>
            <button className={secondary + ' text-xs py-1.5'} onClick={() => void exportJsonDraft()}>
              <Save className="inline w-3.5 h-3.5 mr-1.5" />
              {t('invoice_save_draft', 'Save Draft (.json)')}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          {field(t('company_name', 'Company / Name'), seller.name, val => update(setSeller, 'name', val))}
          {field(t('street', 'Street & Number'), seller.street, val => update(setSeller, 'street', val))}
          {field(t('city', 'City & ZIP'), seller.city, val => update(setSeller, 'city', val))}
          {field(t('company_id', 'Business ID'), seller.ico, val => update(setSeller, 'ico', val))}
          {field(t('vat_id', 'VAT / Tax ID'), seller.dic, val => update(setSeller, 'dic', val))}
          {field(t('email', 'Email'), seller.email ?? '', val => update(setSeller, 'email', val), 'email')}
          {field(t('phone', 'Phone'), seller.phone ?? '', val => update(setSeller, 'phone', val))}
          {field(t('bank_account', 'Bank Account'), seller.account ?? '', val => update(setSeller, 'account', val))}
        </div>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">{t('invoice_customer', 'Customer')}</h3>
        <div className="grid md:grid-cols-5 gap-3">
          {field(t('company_name', 'Company / Name'), customer.name, val => update(setCustomer, 'name', val))}
          {field(t('street', 'Street'), customer.street, val => update(setCustomer, 'street', val))}
          {field(t('city', 'City & ZIP'), customer.city, val => update(setCustomer, 'city', val))}
          {field(t('company_id', 'Business ID'), customer.ico, val => update(setCustomer, 'ico', val))}
          {field(t('vat_id', 'VAT / Tax ID'), customer.dic, val => update(setCustomer, 'dic', val))}
        </div>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">{t('invoice_details', 'Document Details')}</h3>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
          {field(t('invoice_number', 'Invoice Number'), invoice.number, val => update(setInvoice, 'number', val))}
          {field(t('invoice_issue_date', 'Issue Date'), invoice.issueDate, val => update(setInvoice, 'issueDate', val), 'date')}
          {field(t('invoice_due_date', 'Due Date'), invoice.dueDate, val => update(setInvoice, 'dueDate', val), 'date')}
          {field(t('invoice_var_symbol', 'Variable Symbol'), invoice.variableSymbol, val => update(setInvoice, 'variableSymbol', val))}
          {field(t('invoice_const_symbol', 'Constant Symbol'), invoice.constantSymbol, val => update(setInvoice, 'constantSymbol', val))}
          <label className="text-xs text-slate-400 block">
            {t('currency', 'Currency')}
            <select className={input + ' mt-1'} value={invoice.currency} onChange={e => update(setInvoice, 'currency', e.target.value)}>
              {SUPPORTED_FIAT_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-xs text-slate-400 block">
          {t('invoice_note_label', 'Payment Note / Footer')}
          <input
            className={input + ' mt-1'}
            type="text"
            value={invoice.note}
            onChange={e => update(setInvoice, 'note', e.target.value)}
          />
        </label>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">{t('invoice_items', 'Invoice Items')}</h3>
        <div className="space-y-2">
          {lines.map(line => (
            <div key={line.id} className="grid md:grid-cols-[2fr_80px_130px_90px_40px] gap-2 items-end">
              <input
                className={input}
                value={line.description}
                onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, description: e.target.value } : item)))}
                placeholder={t('item_desc', 'Item description')}
              />
              <input
                className={input}
                type="number"
                value={line.quantity}
                onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, quantity: Number(e.target.value) } : item)))}
                placeholder={t('quantity_pcs_placeholder', 'Qty')}
              />
              <input
                className={input}
                type="number"
                value={line.unitPrice}
                onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, unitPrice: Number(e.target.value) } : item)))}
                placeholder={t('unit_price_placeholder', 'Price')}
              />
              <select className={input} value={line.vat} onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, vat: Number(e.target.value) } : item)))}>
                <option value="21">{t('vat_21_option', '21% VAT')}</option>
                <option value="12">{t('vat_12_option', '12% VAT')}</option>
                <option value="0">{t('vat_0_option', '0% VAT')}</option>
              </select>
              <button
                className="text-slate-500 hover:text-rose-400 p-2 text-center"
                onClick={() => setLines(lines.length > 1 ? lines.filter(x => x.id !== line.id) : lines)}
                title={t('delete', 'Delete')}
              >
                <Trash2 className="w-4 h-4 mx-auto" />
              </button>
            </div>
          ))}
          <button className={secondary} onClick={() => setLines([...lines, { id: Date.now(), description: '', quantity: 1, unitPrice: 0, vat: 21 }])}>
            <Plus className="inline w-4 h-4 mr-1" />
            {t('add_item', 'Add Line Item')}
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap justify-between items-center gap-2 text-sm">
          <span className="text-slate-400">
            {t('subtotal_summary_label', 'Subtotal:')} {subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {invoice.currency} &bull; {t('vat_summary_label', 'VAT:')} {vatTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {invoice.currency}
          </span>
          <span className="text-lg font-bold text-emerald-400">
            {t('total_summary_label', 'Total:')} {total.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {invoice.currency}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => void exportPdf()} disabled={exportingPdf}>
            {exportingPdf ? (
              <Loader2 className="inline w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="inline w-4 h-4 mr-1.5" />
            )}
            {t('invoice_export_pdf', 'Save as PDF (.pdf)')}
          </button>
          <button className={secondary} onClick={() => void exportDocx()}>
            <FileText className="inline w-4 h-4 mr-1.5 text-sky-400" />
            {t('invoice_export_docx', 'Save as Word (.docx)')}
          </button>
          <button className={secondary} onClick={() => void exportCsv()}>
            <FileSpreadsheet className="inline w-4 h-4 mr-1.5 text-emerald-400" />
            {t('invoice_export_csv', 'Export CSV (.csv)')}
          </button>
          <button className={secondary} onClick={() => void exportHtml()}>
            <FileCode2 className="inline w-4 h-4 mr-1.5 text-amber-400" />
            {t('invoice_export_html', 'Save HTML (.html)')}
          </button>
          <button className={secondary} onClick={printInvoice} title={t('print_btn', 'Print')}>
            <Printer className="inline w-4 h-4 mr-1.5 text-indigo-400" />
            {t('print_btn', 'Print')}
          </button>
        </div>
      </div>
    </div>
  );
};
