import React, { useEffect, useState } from 'react';
import { Download, Plus, Trash2, Printer } from 'lucide-react';
import { printHtmlDocument } from '../../services/printService';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, SUPPORTED_FIAT_CURRENCIES } from '../../services/currencyService';
import { btn, secondary, input, box, Header, downloadText } from './shared';

/* ─────────────────────────────────────────────────────────────
   INVOICE GENERATOR
   ───────────────────────────────────────────────────────────── */
export const InvoiceGeneratorTool: React.FC = () => {
  const { t } = useI18n();
  const [appCurrency] = useAppCurrency();
  type InvoiceLine = { id: number; description: string; quantity: number; unitPrice: number; vat: number };
  const [seller, setSeller] = useState(() => ({
    name: t('default_seller_name', 'Jan Novák - IT Solutions'),
    street: t('default_seller_street', 'Vodičkova 25'),
    city: t('default_seller_city', '110 00 Praha 1'),
    ico: '12345678',
    dic: 'CZ12345678',
    phone: '+420 777 123 456',
    email: 'info@novak-it.cz',
    account: t('default_seller_account', '123456789/0800 (Česká spořitelna)'),
  }));
  const [customer, setCustomer] = useState(() => ({
    name: t('default_customer_name', 'Acme Corporation s.r.o.'),
    street: t('default_customer_street', 'Klimentská 10'),
    city: t('default_customer_city', '110 00 Praha 1'),
    ico: '87654321',
    dic: 'CZ87654321',
  }));
  const [invoice, setInvoice] = useState(() => ({
    number: `INV-${new Date().getFullYear()}-001`,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    variableSymbol: `${new Date().getFullYear()}001`,
    constantSymbol: '0308',
    currency: appCurrency || 'CZK',
    note: t('default_seller_note', 'Děkujeme za spolupráci. Platbu proveďte převodem na bankovní účet.'),
  }));

  useEffect(() => {
    if (appCurrency) {
      setInvoice(prev => (prev.currency === appCurrency ? prev : { ...prev, currency: appCurrency }));
    }
  }, [appCurrency]);

  const [lines, setLines] = useState<InvoiceLine[]>(() => [
    { id: 1, description: t('default_item_dev', 'Vývoj webové aplikace a frontend integrace'), quantity: 1, unitPrice: 25000, vat: 21 },
    { id: 2, description: t('default_item_support', 'Technická podpora a správa serveru'), quantity: 5, unitPrice: 1200, vat: 21 },
  ]);

  const update = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T, value: T[keyof T]) =>
    setter(current => ({ ...current, [key]: value }));

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const vatTotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.vat) / 100, 0);
  const total = subtotal + vatTotal;

  const field = (label: string, value: string, onChange: (value: string) => void, type = 'text') => (
    <label className="text-xs text-slate-400 block">
      {label}
      <input className={input + ' mt-1'} type={type} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );

  const buildInvoiceParts = () => {
    const esc = (value: string) =>
      value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));

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
          <div class="badge">${t('invoice_title_doc', 'FAKTURA - DAŇOVÝ DOKLAD')}</div>
          <div style="font-size: 16px; color: #475569; margin-top: 4px;">${t('invoice_number_label', 'Číslo:')} <strong>${esc(invoice.number)}</strong></div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
            ${t('variable_symbol_label', 'Variabilní symbol:')} <strong>${esc(invoice.variableSymbol)}</strong> &bull; ${t('constant_symbol_label', 'Konstantní symbol:')} ${esc(invoice.constantSymbol)}
          </div>
        </div>
        <div class="text-right" style="font-size: 13px;">
          <div>${t('issue_date_label', 'Datum vystavení:')} <strong>${esc(invoice.issueDate)}</strong></div>
          <div>${t('due_date_label', 'Datum splatnosti:')} <strong>${esc(invoice.dueDate)}</strong></div>
          <div style="margin-top: 10px;">${t('bank_account_label', 'Bankovní účet:')}</div>
          <div style="font-weight: 700; color: #1e3a8a;">${esc(seller.account)}</div>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <h3>${t('supplier', 'Dodavatel')}</h3>
          <strong style="font-size: 15px;">${esc(seller.name)}</strong><br>
          ${esc(seller.street)}<br>
          ${esc(seller.city)}<br><br>
          ${seller.ico ? `${t('business_id', 'IČO')}: <strong>${esc(seller.ico)}</strong><br>` : ''}
          ${seller.dic ? `${t('tax_id', 'DIČ')}: <strong>${esc(seller.dic)}</strong><br>` : ''}
          ${seller.email ? `Email: ${esc(seller.email)}<br>` : ''}
          ${seller.phone ? `Tel: ${esc(seller.phone)}` : ''}
        </div>
        <div class="box">
          <h3>${t('customer', 'Odběratel')}</h3>
          <strong style="font-size: 15px;">${esc(customer.name)}</strong><br>
          ${esc(customer.street)}<br>
          ${esc(customer.city)}<br><br>
          ${customer.ico ? `${t('business_id', 'IČO')}: <strong>${esc(customer.ico)}</strong><br>` : ''}
          ${customer.dic ? `${t('tax_id', 'DIČ')}: <strong>${esc(customer.dic)}</strong><br>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${t('item_header', 'Položka')}</th>
            <th class="text-right">${t('quantity_header', 'Množství')}</th>
            <th class="text-right">${t('unit_price_header', 'Cena za jedn.')}</th>
            <th class="text-right">${t('vat_header', 'DPH')}</th>
            <th class="text-right">${t('total_with_vat_header', 'Celkem s DPH')}</th>
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
          ${t('subtotal_without_vat', 'Základ bez DPH:')} ${subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)} &bull; ${t('vat_total_label', 'DPH celkem:')} ${vatTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}
        </div>
        <div style="margin-top: 8px;">
          <span style="font-size: 16px; font-weight: 600;">${t('total_to_pay', 'Celkem k úhradě:')} </span>
          <span class="total-amount">${total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}</span>
        </div>
      </div>

      ${invoice.note ? `<div style="margin-top: 30px; padding: 12px; background: #f8fafc; border-left: 3px solid #6366f1; font-size: 12px;">${esc(invoice.note)}</div>` : ''}
    `;

    return { styles, bodyHtml, safeNumber: esc(invoice.number) };
  };

  const exportInvoice = () => {
    const { styles, bodyHtml, safeNumber } = buildInvoiceParts();
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Faktura ${safeNumber}</title>
  <style>${styles}</style>
</head>
<body>${bodyHtml}</body>
</html>`;

    void downloadText(`faktura-${invoice.number || 'doklad'}.html`, html, 'html', t('save_invoice', 'Uložit fakturu'));
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
        desc={t('invoice_generator_desc', 'Create a tax invoice with supplier, customer, and line items and export printable HTML.')}
      />
      <div className={box + ' space-y-4'}>
        <h3 className="font-semibold text-white text-sm">{t('invoice_supplier', 'Dodavatel')}</h3>
        <div className="grid md:grid-cols-4 gap-3">
          {field(t('company_name', 'Firma / Jméno'), seller.name, val => update(setSeller, 'name', val))}
          {field(t('street', 'Ulice a číslo'), seller.street, val => update(setSeller, 'street', val))}
          {field(t('city', 'Město a PSČ'), seller.city, val => update(setSeller, 'city', val))}
          {field(t('company_id', 'IČO'), seller.ico, val => update(setSeller, 'ico', val))}
          {field(t('vat_id', 'DIČ'), seller.dic, val => update(setSeller, 'dic', val))}
          {field(t('email', 'Email'), seller.email, val => update(setSeller, 'email', val), 'email')}
          {field(t('phone', 'Telefon'), seller.phone, val => update(setSeller, 'phone', val))}
          {field(t('bank_account', 'Bankovní účet'), seller.account, val => update(setSeller, 'account', val))}
        </div>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">{t('invoice_customer', 'Odběratel')}</h3>
        <div className="grid md:grid-cols-4 gap-3">
          {field(t('company_name', 'Firma / Jméno odběratele'), customer.name, val => update(setCustomer, 'name', val))}
          {field(t('street', 'Ulice'), customer.street, val => update(setCustomer, 'street', val))}
          {field(t('city', 'Město a PSČ'), customer.city, val => update(setCustomer, 'city', val))}
          {field(t('company_id', 'IČO'), customer.ico, val => update(setCustomer, 'ico', val))}
        </div>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">{t('invoice_details', 'Údaje dokladu')}</h3>
        <div className="grid md:grid-cols-4 gap-3">
          {field(t('invoice_number', 'Číslo dokladu'), invoice.number, val => update(setInvoice, 'number', val))}
          {field(t('invoice_issue_date', 'Datum vystavení'), invoice.issueDate, val => update(setInvoice, 'issueDate', val), 'date')}
          {field(t('invoice_due_date', 'Datum splatnosti'), invoice.dueDate, val => update(setInvoice, 'dueDate', val), 'date')}
          <label className="text-xs text-slate-400 block">
            {t('currency', 'Měna dokladu')}
            <select className={input + ' mt-1'} value={invoice.currency} onChange={e => update(setInvoice, 'currency', e.target.value)}>
              {SUPPORTED_FIAT_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">{t('invoice_items', 'Položky faktury')}</h3>
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={line.id} className="grid md:grid-cols-[2fr_80px_130px_90px_40px] gap-2 items-end">
              <input
                className={input}
                value={line.description}
                onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, description: e.target.value } : item)))}
                placeholder={t('item_desc', 'Popis položky')}
              />
              <input
                className={input}
                type="number"
                value={line.quantity}
                onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, quantity: Number(e.target.value) } : item)))}
                placeholder={t('quantity_pcs_placeholder', 'Ks')}
              />
              <input
                className={input}
                type="number"
                value={line.unitPrice}
                onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, unitPrice: Number(e.target.value) } : item)))}
                placeholder={t('unit_price_placeholder', 'Cena/ks')}
              />
              <select className={input} value={line.vat} onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, vat: Number(e.target.value) } : item)))}>
                <option value="21">{t('vat_21_option', '21% DPH')}</option>
                <option value="12">{t('vat_12_option', '12% DPH')}</option>
                <option value="0">{t('vat_0_option', '0% DPH')}</option>
              </select>
              <button
                className="text-slate-500 hover:text-rose-400 p-2 text-center"
                onClick={() => setLines(lines.length > 1 ? lines.filter(x => x.id !== line.id) : lines)}
                title={t('delete', 'Smazat')}
              >
                <Trash2 className="w-4 h-4 mx-auto" />
              </button>
            </div>
          ))}
          <button className={secondary} onClick={() => setLines([...lines, { id: Date.now(), description: '', quantity: 1, unitPrice: 0, vat: 21 }])}>
            <Plus className="inline w-4 h-4 mr-1" />
            {t('add_item', 'Přidat řádek')}
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-sm">
          <span className="text-slate-400">
            {t('subtotal_summary_label', 'Základ:')} {subtotal.toLocaleString('cs-CZ')} {invoice.currency} &bull; {t('vat_summary_label', 'DPH:')} {vatTotal.toLocaleString('cs-CZ')} {invoice.currency}
          </span>
          <span className="text-lg font-bold text-emerald-400">
            {t('total_summary_label', 'Celkem:')} {total.toLocaleString('cs-CZ')} {invoice.currency}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={exportInvoice}>
            <Download className="inline w-4 h-4 mr-1" />
            {t('export_invoice', 'Stáhnout fakturu jako tiskové HTML')}
          </button>
          <button className={secondary} onClick={printInvoice} title={t('print_btn', 'Print')}>
            <Printer className="inline w-4 h-4 mr-1 text-indigo-400" />
            {t('print_btn', 'Print')}
          </button>
        </div>
      </div>
    </div>
  );
};
