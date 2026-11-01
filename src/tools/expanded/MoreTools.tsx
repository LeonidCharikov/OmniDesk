import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FileUp,
  Play,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  MapPin,
  Check,
  AlertCircle,
  Clock,
  Tag,
  KeyRound,
  ShieldCheck,
  Lock,
  Unlock,
  RotateCcw,
  Undo,
  Type,
  Square,
  ArrowUpRight,
  Pencil,
  Sparkles,
  Table as TableIcon,
  RefreshCw,
  Search,
  Code,
  Coins,
} from 'lucide-react';
import { saveBinaryWithDialog, saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';
import { findToolCatalogIdByTitle, getToolCatalogText } from '../../i18n/toolCatalog';
import {
  useAppCurrency,
  getCurrencySymbol,
  formatCurrency,
  SUPPORTED_FIAT_CURRENCIES,
} from '../../services/currencyService';

const btn = 'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const secondary = 'px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const input = 'w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-200';
const box = 'p-4 rounded-xl bg-slate-900/50 border border-slate-800';
const panel = 'p-4 rounded-xl bg-slate-950/70 border border-slate-800';

function FilePicker({
  id,
  label,
  fileName,
  accept,
  onChange,
}: {
  id: string;
  label: string;
  fileName?: string;
  accept?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-slate-300">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={btn + ' inline-flex items-center gap-2 cursor-pointer'}>
          <FileUp className="w-4 h-4" />
          {label}
        </label>
        {fileName && <span className="text-xs text-slate-400 truncate max-w-full">{fileName}</span>}
      </div>
      <input id={id} className="sr-only" type="file" accept={accept} onChange={onChange} />
    </div>
  );
}

const Header = ({ title, desc }: { title: string; desc: string }) => {
  const { t, language } = useI18n();
  const translations: Record<string, [string, string]> = {
    'Time tracker': ['time_tracker_title', 'Sledování času'],
    'Expenses & budget': ['budget_tracker_title', 'Výdaje a rozpočet'],
    'Investment calculator': ['investment_calculator_title', 'Investiční kalkulačka'],
    'File hashing & encryption': ['file_crypto_title', 'Hashování a šifrování souborů'],
    'JWT Decoder': ['jwt_decoder_title', 'Dekodér JWT'],
    'XML formatter & validator': ['xml_formatter_title', 'Formátovač a validátor XML'],
    'YAML formatter & validator': ['yaml_formatter_title', 'Formátovač a validátor YAML'],
    'CSS / HTML / JavaScript minifier': ['minifier_title', 'Minifikátor CSS / HTML / JavaScriptu'],
    'Markdown table generator': ['markdown_table_title', 'Generátor Markdown tabulek'],
    'Regex builder': ['regex_builder_title', 'Generátor regulárních výrazů'],
    'Image color picker': ['color_picker_title', 'Výběr barvy z obrázku'],
    'Screenshot annotator': ['screenshot_annotator_title', 'Anotace snímků obrazovky'],
    'Geographic & GPS Converter': ['geo_gps_title', 'Geografický a GPS převodník'],
    'Periodic Finance Calculator': ['periodic_finance_title', 'Periodický finanční kalkulátor'],
    'Binary & Hex Converter': ['binary_hex_title', 'Binární a hexadecimální převodník'],
  };
  const descriptions: Record<string, string> = {
    'Time tracker': 'Sledujte čas více aktivit současně; data zůstávají v této relaci.',
    'Expenses & budget': 'Přidávejte výdaje s kategoriemi a sledujte průběžný součet rozpočtu.',
    'Investment calculator': 'Odhadněte budoucí hodnotu počáteční investice a pravidelných vkladů se složeným úročením.',
    'File hashing & encryption': 'Vypočítejte SHA-256, SHA-1, SHA-512 nebo zašifrujte a dešifrujte text pomocí AES-GCM.',
    'JWT Decoder': 'Lokálně dekódujte hlavičku a obsah JWT s validací expirace.',
    'XML formatter & validator': 'Formátujte, minifikujte, validujte XML nebo jej převeďte do JSON.',
    'YAML formatter & validator': 'Formátujte, validujte strukturu YAML a převádějte obousměrně do JSON.',
    'CSS / HTML / JavaScript minifier': 'Minifikujte nebo zkrášlete (beautify) kód CSS, HTML, JS a JSON se statistikou úspory.',
    'Markdown table generator': 'Vizuální tabulkový editor i převodník CSV do čistých Markdown tabulek.',
    'Regex builder': 'Interaktivní sestavovač a tester regulárních výrazů s živým zvýrazněním shod.',
    'Image color picker': 'Otevřete obrázek a kliknutím na přesný pixel zjistěte jeho HEX, RGB a HSL barvu.',
    'Screenshot annotator': 'Kreslete rámečky, šipky, text a volnou rukou na snímky s exportem PNG.',
    'Geographic & GPS Converter': 'Převeďte souřadnice mezi DD a DMS, spočítejte vzdálenost a zobrazte mapu.',
    'Periodic Finance Calculator': 'Vypočítejte složené úročení z počátečního vkladu, pravidelných příspěvků a zvolené periody.',
    'Binary & Hex Converter': 'Obousměrný převodník mezi textem, HEX, binárním kódem, decimálními bajty a Base64.',
  };
  const catalogId = findToolCatalogIdByTitle(title);
  const catalogTitle = catalogId ? getToolCatalogText(catalogId, 'title', language, title) : title;
  const catalogDescription = catalogId ? getToolCatalogText(catalogId, 'desc', language, desc) : desc;
  const [key, fallback] = translations[title] || ['', title];
  return (
    <div className={box}>
      <h2 className="text-lg font-semibold text-white">{catalogId ? catalogTitle : key ? t(key, fallback) : title}</h2>
      <p className="mt-1 text-sm text-slate-400">{catalogId ? catalogDescription : key ? t(`${key}_desc`, descriptions[title] || desc) : desc}</p>
    </div>
  );
};

const downloadText = (name: string, value: string, extension: string, dialogTitle: string) =>
  saveTextWithDialog(name, value, [{ name: `${extension.toUpperCase()} (*.${extension})`, extensions: [extension] }], dialogTitle);

/* ─────────────────────────────────────────────────────────────
   TIME TRACKER
   ───────────────────────────────────────────────────────────── */
export const TimeTrackerTool: React.FC = () => {
  const { t } = useI18n();
  const [items, setItems] = useState<{ id: number; name: string; seconds: number; running: boolean }[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setItems(current => current.map(item => (item.running ? { ...item, seconds: item.seconds + 1 } : item)));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const add = () =>
    setItems([...items, { id: Date.now(), name: `${t('activity', 'Aktivita')} ${items.length + 1}`, seconds: 0, running: false }]);

  return (
    <div className="space-y-5">
      <Header title={t('time_tracker', 'Sledování času')} desc={t('time_tracker_desc', 'Sledujte čas více aktivit současně; data zůstávají v této relaci.')} />
      <button className={btn} onClick={add}>
        <Plus className="inline w-4 h-4 mr-1" /> {t('add_activity', 'Přidat aktivitu')}
      </button>
      <div className="space-y-2">
        {items.map(item => (
          <div className={box + ' flex items-center gap-3'} key={item.id}>
            <input
              className={input}
              value={item.name}
              onChange={e => setItems(items.map(x => (x.id === item.id ? { ...x, name: e.target.value } : x)))}
            />
            <strong className="font-mono text-white text-base">
              {new Date(item.seconds * 1000).toISOString().slice(11, 19)}
            </strong>
            <button
              className={btn}
              onClick={() => setItems(items.map(x => (x.id === item.id ? { ...x, running: !x.running } : x)))}
            >
              {item.running ? t('pause', 'Pauza') : t('start', 'Spustit')}
            </button>
            <button
              className="text-red-400 p-1 hover:text-red-300"
              aria-label={t('delete', 'Smazat')}
              onClick={() => setItems(items.filter(x => x.id !== item.id))}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RecurringCalendarTool: React.FC = () => {
  const { t } = useI18n();
  const [title, setTitle] = useState(t('weekly_meeting', 'Týdenní schůzka'));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weeks, setWeeks] = useState(4);
  const dates = useMemo(() => {
    return Array.from({ length: weeks }, (_, i) => {
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() + i * 7);
      return d.toLocaleDateString();
    });
  }, [date, weeks]);

  return (
    <div className="space-y-5">
      <Header title={t('recurring_events', 'Opakované události')} desc={t('recurring_events_desc', 'Naplánujte týdenní událost a zobrazte její následující výskyty.')} />
      <div className={box + ' grid md:grid-cols-3 gap-3'}>
        <input className={input} value={title} onChange={e => setTitle(e.target.value)} />
        <input className={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input className={input} type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(Number(e.target.value))} />
      </div>
      <div className="space-y-2">
        {dates.map(day => (
          <div className={box} key={day}>
            <strong className="text-white">{title}</strong>
            <span className="ml-3 text-slate-400">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   EXPENSES & BUDGET
   ───────────────────────────────────────────────────────────── */
type Expense = { id: number; label: string; amount: number; category: string; date: string };
const EXPENSE_STORAGE = 'omnidesk_budget_expenses_v2';

export const BudgetTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [items, setItems] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(EXPENSE_STORAGE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 1, label: 'Nákup potravin', amount: 850, category: 'food', date: new Date().toISOString().slice(0, 10) },
      { id: 2, label: 'Měsíční jízdenka MHD', amount: 550, category: 'transport', date: new Date().toISOString().slice(0, 10) },
      { id: 3, label: 'Internet a telefon', amount: 690, category: 'utilities', date: new Date().toISOString().slice(0, 10) },
    ];
  });
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');

  useEffect(() => {
    try {
      localStorage.setItem(EXPENSE_STORAGE, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const add = () => {
    const value = Number(amount);
    if (label.trim() && value > 0) {
      setItems([
        { id: Date.now(), label: label.trim(), amount: value, category, date: new Date().toISOString().slice(0, 10) },
        ...items,
      ]);
      setLabel('');
      setAmount('');
    }
  };

  const remove = (id: number) => {
    setItems(items.filter(x => x.id !== id));
  };

  const clearAll = () => {
    if (confirm(t('confirm_clear_expenses', 'Opravdu si přejete smazat všechny položky rozpočtu?'))) {
      setItems([]);
    }
  };

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const categoryTotals = useMemo(() => {
    const res: Record<string, number> = {};
    items.forEach(item => {
      res[item.category] = (res[item.category] || 0) + item.amount;
    });
    return res;
  }, [items]);

  const categoryLabels: Record<string, string> = {
    food: t('cat_food', 'Jídlo & Potraviny'),
    housing: t('cat_housing', 'Bydlení & Nájem'),
    transport: t('cat_transport', 'Doprava'),
    utilities: t('cat_utilities', 'Energie & Služby'),
    entertainment: t('cat_entertainment', 'Zábava & Volný čas'),
    other: t('cat_other', 'Ostatní'),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header title={t('expenses_budget', 'Výdaje a rozpočet')} desc={t('expenses_budget_desc', 'Přidávejte výdaje s kategoriemi a sledujte průběžný součet rozpočtu.')} />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Coins className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-slate-400">{t('currency', 'Měna')}:</span>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="bg-transparent font-semibold font-mono text-indigo-300 focus:outline-none cursor-pointer"
          >
            {SUPPORTED_FIAT_CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-slate-900 text-slate-200">
                {c.flag} {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className={input + ' flex-1 min-w-[180px]'}
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={t('expense_description', 'Popis výdaje (např. Oběd)')}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <input
          className={input + ' w-28'}
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={`${t('amount', 'Částka')} (${currSymbol})`}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <select className={input + ' w-40'} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="food">{categoryLabels.food}</option>
          <option value="housing">{categoryLabels.housing}</option>
          <option value="transport">{categoryLabels.transport}</option>
          <option value="utilities">{categoryLabels.utilities}</option>
          <option value="entertainment">{categoryLabels.entertainment}</option>
          <option value="other">{categoryLabels.other}</option>
        </select>
        <button className={btn} onClick={add}>
          <Plus className="inline w-4 h-4 mr-1" />
          {t('add', 'Přidat')}
        </button>
        {items.length > 0 && (
          <button className={secondary} onClick={clearAll}>
            {t('clear_all', 'Vymazat vše')}
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className={box + ' text-white flex flex-col justify-center'}>
          <span className="text-xs text-slate-400">{t('total_expenses', 'Celkové výdaje')}</span>
          <span className="text-3xl font-bold mt-1 text-emerald-400">{formatCurrency(total, currency)}</span>
          <span className="text-xs text-slate-500 mt-1">{items.length} {t('records_count', 'položek')}</span>
        </div>
        <div className={box + ' space-y-1.5'}>
          <span className="text-xs text-slate-400 block mb-1">{t('by_category', 'Podle kategorií:')}</span>
          {Object.entries(categoryTotals).map(([cat, sum]) => (
            <div key={cat} className="flex justify-between text-xs text-slate-300">
              <span>{categoryLabels[cat] || cat}:</span>
              <span className="font-mono">{formatCurrency(sum, currency)} ({total > 0 ? Math.round((sum / total) * 100) : 0}%)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div className={box + ' flex items-center justify-between py-2.5'} key={item.id}>
            <div>
              <strong className="text-white text-sm block">{item.label}</strong>
              <div className="text-[11px] text-slate-400 flex gap-2">
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {categoryLabels[item.category] || item.category}
                </span>
                <span>{item.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm text-slate-100">{formatCurrency(item.amount, currency)}</span>
              <button className="text-slate-500 hover:text-rose-400 p-1" onClick={() => remove(item.id)} title={t('delete', 'Smazat')}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   INVESTMENT CALCULATOR
   ───────────────────────────────────────────────────────────── */
export const InvestmentCalculatorTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [initial, setInitial] = useState(50000);
  const [monthly, setMonthly] = useState(2500);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(15);

  const future = useMemo(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    return r === 0 ? initial + monthly * n : initial * (1 + r) ** n + monthly * (((1 + r) ** n - 1) / r);
  }, [initial, monthly, rate, years]);

  const totalInvested = initial + monthly * years * 12;
  const totalInterest = Math.max(0, future - totalInvested);

  const fields = [
    { label: `${t('initial_deposit', 'Počáteční vklad')} (${currSymbol})`, value: initial, setter: setInitial },
    { label: `${t('monthly_deposit', 'Měsíční vklad')} (${currSymbol})`, value: monthly, setter: setMonthly },
    { label: t('annual_return', 'Očekávaný roční výnos (%)'), value: rate, setter: setRate },
    { label: t('investment_years', 'Doba investice (roky)'), value: years, setter: setYears },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header
          title={t('investment_calculator', 'Investiční kalkulačka')}
          desc={t('investment_calculator_desc', 'Odhadněte budoucí hodnotu počáteční investice a pravidelných vkladů se složeným úročením.')}
        />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Coins className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-slate-400">{t('currency', 'Měna')}:</span>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="bg-transparent font-semibold font-mono text-indigo-300 focus:outline-none cursor-pointer"
          >
            {SUPPORTED_FIAT_CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-slate-900 text-slate-200">
                {c.flag} {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={box + ' grid md:grid-cols-4 gap-3'}>
        {fields.map(item => (
          <label className="text-xs text-slate-400" key={item.label}>
            {item.label}
            <input className={input + ' mt-1'} type="number" value={item.value} onChange={e => item.setter(Number(e.target.value))} />
          </label>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className={box + ' text-center'}>
          <span className="text-xs text-slate-400 block">{t('total_invested_by_user', 'Celkem vámi vloženo')}</span>
          <span className="text-xl font-bold text-slate-200 mt-1 block">{formatCurrency(totalInvested, currency)}</span>
        </div>
        <div className={box + ' text-center'}>
          <span className="text-xs text-slate-400 block">{t('total_compound_interest', 'Získaný složený úrok')}</span>
          <span className="text-xl font-bold text-indigo-400 mt-1 block">+{formatCurrency(totalInterest, currency)}</span>
        </div>
        <div className={box + ' text-center bg-indigo-950/20 border-indigo-800/40'}>
          <span className="text-xs text-slate-400 block">{t('final_portfolio_value', 'Konečná hodnota portfolia')}</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">{formatCurrency(future, currency)}</span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   INVOICE GENERATOR
   ───────────────────────────────────────────────────────────── */
export const InvoiceGeneratorTool: React.FC = () => {
  const { t } = useI18n();
  const [appCurrency] = useAppCurrency();
  type InvoiceLine = { id: number; description: string; quantity: number; unitPrice: number; vat: number };
  const [seller, setSeller] = useState({
    name: 'Jan Novák - IT Solutions',
    street: 'Vodičkova 25',
    city: '110 00 Praha 1',
    ico: '12345678',
    dic: 'CZ12345678',
    phone: '+420 777 123 456',
    email: 'info@novak-it.cz',
    account: '123456789/0800 (Česká spořitelna)',
  });
  const [customer, setCustomer] = useState({
    name: 'Acme Corporation s.r.o.',
    street: 'Klimentská 10',
    city: '110 00 Praha 1',
    ico: '87654321',
    dic: 'CZ87654321',
  });
  const [invoice, setInvoice] = useState({
    number: `INV-${new Date().getFullYear()}-001`,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    variableSymbol: `${new Date().getFullYear()}001`,
    constantSymbol: '0308',
    currency: appCurrency || 'CZK',
    note: 'Děkujeme za spolupráci. Platbu proveďte převodem na bankovní účet.',
  });
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: 1, description: 'Vývoj webové aplikace a frontend integrace', quantity: 1, unitPrice: 25000, vat: 21 },
    { id: 2, description: 'Technická podpora a správa serveru', quantity: 5, unitPrice: 1200, vat: 21 },
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

  const exportInvoice = () => {
    const esc = (value: string) =>
      value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Faktura ${esc(invoice.number)}</title>
  <style>
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
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="badge">FAKTURA - DAŇOVÝ DOKLAD</div>
      <div style="font-size: 16px; color: #475569; margin-top: 4px;">Číslo: <strong>${esc(invoice.number)}</strong></div>
      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
        Variabilní symbol: <strong>${esc(invoice.variableSymbol)}</strong> &bull; Konstantní symbol: ${esc(invoice.constantSymbol)}
      </div>
    </div>
    <div class="text-right" style="font-size: 13px;">
      <div>Datum vystavení: <strong>${esc(invoice.issueDate)}</strong></div>
      <div>Datum splatnosti: <strong>${esc(invoice.dueDate)}</strong></div>
      <div style="margin-top: 10px;">Bankovní účet:</div>
      <div style="font-weight: 700; color: #1e3a8a;">${esc(seller.account)}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h3>Dodavatel</h3>
      <strong style="font-size: 15px;">${esc(seller.name)}</strong><br>
      ${esc(seller.street)}<br>
      ${esc(seller.city)}<br><br>
      ${seller.ico ? `IČO: <strong>${esc(seller.ico)}</strong><br>` : ''}
      ${seller.dic ? `DIČ: <strong>${esc(seller.dic)}</strong><br>` : ''}
      ${seller.email ? `Email: ${esc(seller.email)}<br>` : ''}
      ${seller.phone ? `Tel: ${esc(seller.phone)}` : ''}
    </div>
    <div class="box">
      <h3>Odběratel</h3>
      <strong style="font-size: 15px;">${esc(customer.name)}</strong><br>
      ${esc(customer.street)}<br>
      ${esc(customer.city)}<br><br>
      ${customer.ico ? `IČO: <strong>${esc(customer.ico)}</strong><br>` : ''}
      ${customer.dic ? `DIČ: <strong>${esc(customer.dic)}</strong><br>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Položka</th>
        <th class="text-right">Množství</th>
        <th class="text-right">Cena za jedn.</th>
        <th class="text-right">DPH</th>
        <th class="text-right">Celkem s DPH</th>
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
      Základ bez DPH: ${subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)} &bull; DPH celkem: ${vatTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}
    </div>
    <div style="margin-top: 8px;">
      <span style="font-size: 16px; font-weight: 600;">Celkem k úhradě: </span>
      <span class="total-amount">${total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} ${esc(invoice.currency)}</span>
    </div>
  </div>

  ${invoice.note ? `<div style="margin-top: 30px; padding: 12px; background: #f8fafc; border-left: 3px solid #6366f1; font-size: 12px;">${esc(invoice.note)}</div>` : ''}
</body>
</html>`;

    void downloadText(`faktura-${invoice.number || 'doklad'}.html`, html, 'html', t('save_invoice', 'Uložit fakturu'));
  };

  return (
    <div className="space-y-5">
      <Header
        title={t('invoice_generator_title', 'Generátor faktur')}
        desc={t('invoice_generator_desc', 'Vytvořte daňový doklad s dodavatelem, odběratelem, položkami a exportujte jako tiskové HTML.')}
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
                placeholder="Ks"
              />
              <input
                className={input}
                type="number"
                value={line.unitPrice}
                onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, unitPrice: Number(e.target.value) } : item)))}
                placeholder="Cena/ks"
              />
              <select className={input} value={line.vat} onChange={e => setLines(lines.map(item => (item.id === line.id ? { ...item, vat: Number(e.target.value) } : item)))}>
                <option value="21">21% DPH</option>
                <option value="12">12% DPH</option>
                <option value="0">0% DPH</option>
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
            Základ: {subtotal.toLocaleString('cs-CZ')} {invoice.currency} &bull; DPH: {vatTotal.toLocaleString('cs-CZ')} {invoice.currency}
          </span>
          <span className="text-lg font-bold text-emerald-400">
            Celkem: {total.toLocaleString('cs-CZ')} {invoice.currency}
          </span>
        </div>

        <button className={btn} onClick={exportInvoice}>
          <Download className="inline w-4 h-4 mr-1" />
          {t('export_invoice', 'Stáhnout fakturu jako tiskové HTML')}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   FILE CRYPTO TOOL (Direct ArrayBuffer reading, Multiple Hashes, AES-GCM)
   ───────────────────────────────────────────────────────────── */
export const FileCryptoTool: React.FC = () => {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAlgo, setSelectedAlgo] = useState<'SHA-256' | 'SHA-1' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [hash, setHash] = useState('');
  const [encrypted, setEncrypted] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBytes, setFileBytes] = useState<ArrayBuffer | null>(null);
  const [cryptoError, setCryptoError] = useState('');

  const handleFileChange = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    setFileBytes(buf);
    // If text file, preview in text area
    if (file.size < 1000000 && !file.type.startsWith('image/')) {
      try {
        const str = new TextDecoder('utf-8', { fatal: true }).decode(buf);
        setText(str);
      } catch {
        setText(`[Binární soubor: ${file.name}, velikost: ${(file.size / 1024).toFixed(1)} KB]`);
      }
    } else {
      setText(`[Binární soubor: ${file.name}, velikost: ${(file.size / 1024).toFixed(1)} KB]`);
    }
  };

  const calculateHash = async () => {
    setCryptoError('');
    try {
      const dataToHash = fileBytes || new TextEncoder().encode(text);
      if (!dataToHash || (dataToHash instanceof ArrayBuffer && dataToHash.byteLength === 0 && !text)) {
        setCryptoError('Zadejte text nebo načtěte soubor.');
        return;
      }
      const digest = await crypto.subtle.digest(selectedAlgo, dataToHash);
      const hashStr = Array.from(new Uint8Array(digest))
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
      setHash(hashStr);
    } catch (e) {
      setCryptoError(e instanceof Error ? e.message : 'Výpočet hashe selhal.');
    }
  };

  const encrypt = async () => {
    setCryptoError('');
    if (!password) {
      setCryptoError(t('enter_password', 'Zadejte šifrovací heslo.'));
      return;
    }
    try {
      const rawData = fileBytes ? new Uint8Array(fileBytes) : new TextEncoder().encode(text);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, rawData);
      const all = new Uint8Array(salt.length + iv.length + data.byteLength);
      all.set(salt);
      all.set(iv, salt.length);
      all.set(new Uint8Array(data), salt.length + iv.length);
      setEncrypted(btoa(String.fromCharCode(...all)));
    } catch (e) {
      setCryptoError(e instanceof Error ? e.message : 'Šifrování selhalo.');
    }
  };

  const decrypt = async () => {
    setCryptoError('');
    if (!password) {
      setCryptoError(t('enter_password', 'Zadejte šifrovací heslo.'));
      return;
    }
    try {
      const raw = atob(encrypted.trim());
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const salt = bytes.slice(0, 16);
      const iv = bytes.slice(16, 28);
      const ciphertext = bytes.slice(28);

      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      setDecrypted(new TextDecoder().decode(decryptedBuf));
    } catch {
      setCryptoError(t('decrypt_failed', 'Dešifrování selhalo: Neplatné heslo nebo poškozená data.'));
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title={t('file_hashing_encryption', 'Hashování a šifrování souborů')}
        desc={t('file_hashing_encryption_desc', 'Vypočítejte SHA-256, SHA-1, SHA-512 nebo zašifrujte a dešifrujte text pomocí AES-GCM.')}
      />
      <div className={box + ' space-y-4'}>
        <FilePicker
          id="file-crypto-input"
          label={t('choose_file', 'Vybrat soubor')}
          fileName={fileName || undefined}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) void handleFileChange(file);
          }}
        />

        <textarea
          className={input + ' min-h-32 font-mono text-xs'}
          value={text}
          onChange={e => {
            setText(e.target.value);
            setFileBytes(null);
          }}
          placeholder={t('text_or_file_content', 'Zadejte text nebo načtěte libovolný soubor…')}
        />

        {/* Algorithm & password section */}
        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Algoritmus kontrolního součtu:</label>
            <div className="flex gap-2">
              <select
                className={input}
                value={selectedAlgo}
                onChange={e => setSelectedAlgo(e.target.value as typeof selectedAlgo)}
              >
                <option value="SHA-256">SHA-256 (Doporučeno)</option>
                <option value="SHA-512">SHA-512 (Maximální bezpečnost)</option>
                <option value="SHA-384">SHA-384</option>
                <option value="SHA-1">SHA-1 (Legacy)</option>
              </select>
              <button className={btn} onClick={calculateHash}>
                Spočítat {selectedAlgo}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Heslo pro AES-GCM šifrování:</label>
            <div className="flex gap-2">
              <input
                className={input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Zadejte tajné heslo…"
              />
              <button className={btn} onClick={encrypt}>
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                Zašifrovat
              </button>
              <button className={secondary} onClick={decrypt} disabled={!encrypted}>
                <Unlock className="w-3.5 h-3.5 inline mr-1" />
                Dešifrovat
              </button>
            </div>
          </div>
        </div>

        {cryptoError && (
          <div className="text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cryptoError}</span>
          </div>
        )}

        {hash && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{selectedAlgo} Hash:</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(hash)}>
                <Copy className="w-3 h-3 inline mr-1" /> Kopírovat hash
              </button>
            </div>
            <pre className={box + ' break-all text-emerald-400 font-mono text-xs'}>{hash}</pre>
          </div>
        )}

        {encrypted && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Zašifrovaný text (Base64 AES-GCM 256-bit):</span>
              <button className="text-amber-400 hover:text-amber-300" onClick={() => navigator.clipboard.writeText(encrypted)}>
                <Copy className="w-3 h-3 inline mr-1" /> Kopírovat ciphertext
              </button>
            </div>
            <pre className={box + ' break-all text-amber-300 font-mono text-xs max-h-40 overflow-auto'}>{encrypted}</pre>
          </div>
        )}

        {decrypted && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Dešifrovaný výsledek:</span>
              <button className="text-emerald-400 hover:text-emerald-300" onClick={() => navigator.clipboard.writeText(decrypted)}>
                <Copy className="w-3 h-3 inline mr-1" /> Kopírovat
              </button>
            </div>
            <pre className={box + ' break-all text-emerald-300 font-mono text-xs max-h-40 overflow-auto'}>{decrypted}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   JWT DECODER
   ───────────────────────────────────────────────────────────── */
export const JwtDecoderTool: React.FC = () => {
  const { t } = useI18n();
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbiBOb3bDoWsiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MjA4NzE2NDAwMCwicm9sZXMiOlsidXNlciIsImFkbWluIl19.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  );
  const [headerJson, setHeaderJson] = useState('');
  const [payloadJson, setPayloadJson] = useState('');
  const [signature, setSignature] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expStatus, setExpStatus] = useState<{ isExpired: boolean; dateStr: string } | null>(null);

  const decodeBase64Url = (str: string) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const decode = () => {
    setErrorMsg('');
    setHeaderJson('');
    setPayloadJson('');
    setSignature('');
    setExpStatus(null);

    try {
      const parts = token.trim().split('.');
      if (parts.length !== 3) {
        throw new Error(t('jwt_invalid_format', 'JWT token musí mít přesně 3 části oddělené tečkou (hlavička.obsah.podpis).'));
      }
      const headerObj = JSON.parse(decodeBase64Url(parts[0]));
      const payloadObj = JSON.parse(decodeBase64Url(parts[1]));
      setHeaderJson(JSON.stringify(headerObj, null, 2));
      setPayloadJson(JSON.stringify(payloadObj, null, 2));
      setSignature(parts[2]);

      if (payloadObj.exp && typeof payloadObj.exp === 'number') {
        const expDate = new Date(payloadObj.exp * 1000);
        const isExpired = Date.now() > expDate.getTime();
        setExpStatus({ isExpired, dateStr: expDate.toLocaleString() });
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('invalid_jwt', 'Neplatný token.'));
    }
  };

  useEffect(() => {
    decode();
  }, []);

  return (
    <div className="space-y-5">
      <Header title={t('jwt_decoder', 'Dekodér JWT')} desc={t('jwt_decoder_desc', 'Lokálně dekódujte hlavičku a obsah JWT s validací expirace.')} />
      <div className={box + ' space-y-3'}>
        <textarea
          className={input + ' min-h-24 font-mono text-xs break-all'}
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder={t('jwt_placeholder', 'Vložte JWT token...')}
        />
        <button className={btn} onClick={decode}>
          {t('decode', 'Dekódovat')}
        </button>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {expStatus && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              expStatus.isExpired
                ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {expStatus.isExpired ? t('token_expired', 'Token je již expirován') : t('token_valid', 'Token je platný')}
              </span>
            </div>
            <span className="font-mono">{expStatus.dateStr}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-rose-400">HEADER: Algorithm & Token Type</span>
              {headerJson && (
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                  onClick={() => navigator.clipboard.writeText(headerJson)}
                >
                  <Copy className="inline w-3 h-3 mr-1" />
                  {t('copy', 'Kopírovat')}
                </button>
              )}
            </div>
            <pre className={box + ' whitespace-pre-wrap text-xs font-mono text-rose-300 min-h-36 max-h-72 overflow-auto'}>
              {headerJson || '—'}
            </pre>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-purple-400">PAYLOAD: Data</span>
              {payloadJson && (
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                  onClick={() => navigator.clipboard.writeText(payloadJson)}
                >
                  <Copy className="inline w-3 h-3 mr-1" />
                  {t('copy', 'Kopírovat')}
                </button>
              )}
            </div>
            <pre className={box + ' whitespace-pre-wrap text-xs font-mono text-purple-300 min-h-36 max-h-72 overflow-auto'}>
              {payloadJson || '—'}
            </pre>
          </div>
        </div>

        {signature && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-sky-400">SIGNATURE</span>
            <pre className={box + ' break-all text-xs font-mono text-sky-300'}>{signature}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   XML FORMATTER & VALIDATOR (Pretty, Minify, XML->JSON, Error reporting)
   ───────────────────────────────────────────────────────────── */
function prettifyXml(xml: string, indentSize = 2): string {
  let formatted = '';
  let indent = 0;
  const tab = ' '.repeat(indentSize);

  // Normalize by stripping between-tag whitespace
  const clean = xml.replace(/>\s+</g, '><').trim();
  const tokens = clean.split(/(<[^>]+>)/g).filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('<') && token.endsWith('/>')) {
      formatted += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('<?') || token.startsWith('<!')) {
      formatted += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('<')) {
      formatted += tab.repeat(indent) + token + '\n';
      indent++;
    } else {
      const text = token.trim();
      if (text) {
        // inline text
        formatted = formatted.trimEnd() + text;
      }
    }
  }
  return formatted.trim();
}

function xmlToJsonHelper(node: Node): unknown {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue?.trim();
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const obj: Record<string, unknown> = {};

    // Attributes
    if (el.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        (obj['@attributes'] as Record<string, string>)[attr.name] = attr.value;
      }
    }

    // Children
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) continue;
      const childData = xmlToJsonHelper(child);
      if (child.nodeType === Node.TEXT_NODE) {
        if (Object.keys(obj).length === 0) return childData;
        obj['#text'] = childData;
      } else {
        const name = child.nodeName;
        if (!obj[name]) {
          obj[name] = childData;
        } else if (Array.isArray(obj[name])) {
          (obj[name] as unknown[]).push(childData);
        } else {
          obj[name] = [obj[name], childData];
        }
      }
    }
    return obj;
  }
  return null;
}

export const XmlFormatterTool: React.FC = () => {
  const { t } = useI18n();
  const [value, setValue] = useState(
    '<?xml version="1.0" encoding="UTF-8"?>\n<catalog>\n  <book id="bk101">\n    <author>Gambardella, Matthew</author>\n    <title>XML Developer\'s Guide</title>\n    <genre>Computer</genre>\n    <price>44.95</price>\n  </book>\n  <book id="bk102">\n    <author>Ralls, Kim</author>\n    <title>Midnight Rain</title>\n    <price>5.95</price>\n  </book>\n</catalog>'
  );
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatXml = () => {
    setErrorMsg('');
    try {
      const doc = new DOMParser().parseFromString(value, 'application/xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(parseError.textContent || 'Chyba syntaxe XML.');
      }
      setResult(prettifyXml(value, 2));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Neplatné XML.');
    }
  };

  const minifyXml = () => {
    setErrorMsg('');
    try {
      const doc = new DOMParser().parseFromString(value, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Neplatné XML.');
      setResult(value.replace(/>\s+</g, '><').trim());
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Chyba při minifikaci.');
    }
  };

  const convertToJson = () => {
    setErrorMsg('');
    try {
      const doc = new DOMParser().parseFromString(value, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Neplatné XML.');
      const parsed = xmlToJsonHelper(doc.documentElement);
      setResult(JSON.stringify({ [doc.documentElement.nodeName]: parsed }, null, 2));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Převod do JSON selhal.');
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="XML formatter & validator"
        desc={t('xml_formatter_desc', 'Formátujte, minifikujte, validujte XML nebo jej převeďte do JSON.')}
      />
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={formatXml}>
            Zformátovat (Prettify)
          </button>
          <button className={secondary} onClick={minifyXml}>
            Minifikovat
          </button>
          <button className={secondary} onClick={convertToJson}>
            Převést XML → JSON
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            className={input + ' min-h-64 font-mono text-xs leading-relaxed'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Zde vložte XML…"
          />
          <div className="space-y-2">
            {errorMsg ? (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <pre className={panel + ' min-h-64 max-h-96 overflow-auto font-mono text-xs text-slate-200'}>
                {result || 'Výsledek se zobrazí zde…'}
              </pre>
            )}
            {result && (
              <div className="flex gap-2">
                <button className={secondary} onClick={() => navigator.clipboard.writeText(result)}>
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  Kopírovat
                </button>
                <button
                  className={secondary}
                  onClick={() => downloadText('data.xml', result, 'xml', 'Uložit XML')}
                >
                  <Download className="w-3.5 h-3.5 inline mr-1" />
                  Stáhnout XML
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   YAML FORMATTER & VALIDATOR (Syntax checking, YAML <-> JSON)
   ───────────────────────────────────────────────────────────── */
function simpleYamlToJson(yaml: string): Record<string, unknown> {
  const lines = yaml.split('\n');
  const root: Record<string, unknown> = {};
  const stack: { indent: number; obj: Record<string, unknown> }[] = [{ indent: -1, obj: root }];

  for (let line of lines) {
    line = line.replace(/#.*$/, ''); // strip comments
    if (!line.trim()) continue;

    const indent = line.search(/\S/);
    const content = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const current = stack[stack.length - 1].obj;

    const colonIdx = content.indexOf(':');
    if (colonIdx > -1) {
      const key = content.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
      const valStr = content.slice(colonIdx + 1).trim();

      if (!valStr) {
        // Child object
        const newObj: Record<string, unknown> = {};
        current[key] = newObj;
        stack.push({ indent, obj: newObj });
      } else {
        // Primitive
        let parsedVal: unknown = valStr.replace(/^['"]|['"]$/g, '');
        if (valStr === 'true') parsedVal = true;
        else if (valStr === 'false') parsedVal = false;
        else if (valStr === 'null') parsedVal = null;
        else if (!isNaN(Number(valStr)) && valStr !== '') parsedVal = Number(valStr);
        current[key] = parsedVal;
      }
    }
  }
  return root;
}

function jsonToYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => `${pad}- ${jsonToYaml(item, indent + 1).trim()}`).join('\n');
  }

  return Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${pad}${k}:\n${jsonToYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${String(v)}`;
    })
    .join('\n');
}

export const YamlFormatterTool: React.FC = () => {
  const { t } = useI18n();
  const [value, setValue] = useState(
    'app:\n  name: OmniDesk\n  version: 2.1\n  production: true\nserver:\n  host: 0.0.0.0\n  port: 3000\nfeatures:\n  encryption: true\n  darkMode: true\n'
  );
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatYaml = () => {
    setErrorMsg('');
    try {
      const parsed = simpleYamlToJson(value);
      setResult(jsonToYaml(parsed));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Neplatný YAML.');
    }
  };

  const convertToJson = () => {
    setErrorMsg('');
    try {
      const parsed = simpleYamlToJson(value);
      setResult(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Převod do JSON selhal.');
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="YAML formatter & validator"
        desc={t('yaml_formatter_desc', 'Formátujte, validujte strukturu YAML a převádějte obousměrně do JSON.')}
      />
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={formatYaml}>
            Normalizovat YAML
          </button>
          <button className={secondary} onClick={convertToJson}>
            YAML → JSON
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            className={input + ' min-h-64 font-mono text-xs leading-relaxed'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Zde vložte YAML…"
          />
          <div className="space-y-2">
            {errorMsg ? (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <pre className={panel + ' min-h-64 max-h-96 overflow-auto font-mono text-xs text-slate-200'}>
                {result || 'Výsledek se zobrazí zde…'}
              </pre>
            )}
            {result && (
              <button className={secondary} onClick={() => navigator.clipboard.writeText(result)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                Kopírovat výsledek
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MINIFIER TOOL (CSS / HTML / JS / JSON, Beautify, Size savings)
   ───────────────────────────────────────────────────────────── */
export const MinifierTool: React.FC = () => {
  const { t } = useI18n();
  const [kind, setKind] = useState<'css' | 'html' | 'js' | 'json'>('css');
  const [value, setValue] = useState(
    '/* OmniDesk Main Stylesheet */\n.header-container {\n  display: flex;\n  justify-content: space-between;\n  padding: 16px 24px;\n  background-color: #0f172a;\n  border-bottom: 1px solid #1e293b;\n}\n\n.header-title {\n  font-size: 1.25rem;\n  color: #ffffff;\n  font-weight: 700;\n}\n'
  );
  const [result, setResult] = useState('');
  const [origSize, setOrigSize] = useState<number>(0);
  const [minSize, setMinSize] = useState<number>(0);

  const minify = () => {
    const originalBytes = new TextEncoder().encode(value).length;
    setOrigSize(originalBytes);

    let output = '';
    if (kind === 'html') {
      output = value
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
    } else if (kind === 'css') {
      output = value
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;\}/g, '}')
        .trim();
    } else if (kind === 'json') {
      try {
        output = JSON.stringify(JSON.parse(value));
      } catch {
        output = value.replace(/\s+/g, ' ').trim();
      }
    } else {
      // JavaScript
      output = value
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
        .replace(/\s+/g, ' ')
        .replace(/\s*([=+\-*\/%{}();,:<>|&!])\s*/g, '$1')
        .trim();
    }

    setResult(output);
    setMinSize(new TextEncoder().encode(output).length);
  };

  const beautify = () => {
    if (kind === 'json') {
      try {
        setResult(JSON.stringify(JSON.parse(value), null, 2));
      } catch {
        setResult('Chyba: Neplatný JSON.');
      }
    } else if (kind === 'css') {
      let formatted = '';
      let indent = 0;
      const clean = value.replace(/\s+/g, ' ').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const char of clean) {
        if (char === '{') {
          indent++;
          formatted += ' {\n' + '  '.repeat(indent);
        } else if (char === '}') {
          indent = Math.max(0, indent - 1);
          formatted += '\n' + '  '.repeat(indent) + '}\n\n' + '  '.repeat(indent);
        } else if (char === ';') {
          formatted += ';\n' + '  '.repeat(indent);
        } else {
          formatted += char;
        }
      }
      setResult(formatted.trim());
    } else {
      setResult(value);
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="CSS / HTML / JavaScript minifier"
        desc={t('minifier_desc', 'Minifikujte nebo zkrášlete (beautify) kód CSS, HTML, JS a JSON se statistikou úspory.')}
      />
      <div className={box + ' space-y-3'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              className={input + ' w-36 font-semibold'}
              value={kind}
              onChange={e => setKind(e.target.value as typeof kind)}
            >
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="js">JavaScript</option>
              <option value="json">JSON</option>
            </select>
            <button className={btn} onClick={minify}>
              Minifikovat
            </button>
            <button className={secondary} onClick={beautify}>
              Zkrášlit (Beautify)
            </button>
          </div>

          {origSize > 0 && minSize > 0 && (
            <div className="text-xs font-mono text-slate-300">
              Původní: {origSize} B → Cíl: {minSize} B{' '}
              <span className="text-emerald-400 font-bold">
                (Úspora {origSize - minSize} B / {Math.round((1 - minSize / origSize) * 100)}%)
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            className={input + ' min-h-64 font-mono text-xs leading-relaxed'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Zde vložte kód…"
          />
          <div className="space-y-2">
            <textarea
              className={input + ' min-h-64 font-mono text-xs leading-relaxed bg-slate-950'}
              value={result}
              readOnly
              placeholder="Výsledek se zobrazí zde…"
            />
            {result && (
              <button className={secondary} onClick={() => navigator.clipboard.writeText(result)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                Kopírovat výsledek
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MARKDOWN TABLE GENERATOR (Interactive Grid Editor & Delimited Text Converter)
   ───────────────────────────────────────────────────────────── */
export const MarkdownTableTool: React.FC = () => {
  const { t } = useI18n();
  const [headers, setHeaders] = useState<string[]>(['Název', 'Kategorie', 'Cena (Kč)', 'Skladem']);
  const [alignments, setAlignments] = useState<('left' | 'center' | 'right')[]>(['left', 'left', 'right', 'center']);
  const [rows, setRows] = useState<string[][]>([
    ['Mechanická klávesnice', 'Hardware', '2 490', 'Ano'],
    ['Bezdrátová myš', 'Příslušenství', '990', 'Ano'],
    ['Podložka pod myš XXL', 'Příslušenství', '390', 'Ne'],
  ]);
  const [delimitText, setDelimitText] = useState('');
  const [mode, setMode] = useState<'grid' | 'paste'>('grid');

  const addColumn = () => {
    setHeaders([...headers, `Sloupec ${headers.length + 1}`]);
    setAlignments([...alignments, 'left']);
    setRows(rows.map(r => [...r, '']));
  };

  const removeColumn = (cidx: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== cidx));
    setAlignments(alignments.filter((_, i) => i !== cidx));
    setRows(rows.map(r => r.filter((_, i) => i !== cidx)));
  };

  const addRow = () => {
    setRows([...rows, Array(headers.length).fill('')]);
  };

  const removeRow = (ridx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== ridx));
  };

  const parseDelimited = () => {
    if (!delimitText.trim()) return;
    const lines = delimitText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    // Detect delimiter: semicolon, tab, or comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

    const parsedHeaders = lines[0].split(delimiter).map(h => h.trim());
    const parsedRows = lines.slice(1).map(l => l.split(delimiter).map(c => c.trim()));

    setHeaders(parsedHeaders);
    setAlignments(Array(parsedHeaders.length).fill('left'));
    setRows(parsedRows.length ? parsedRows : [Array(parsedHeaders.length).fill('')]);
    setMode('grid');
  };

  const markdownOutput = useMemo(() => {
    const headLine = `| ${headers.map(h => h || ' ').join(' | ')} |`;
    const sepLine = `| ${alignments
      .map(a => (a === 'center' ? ':---:' : a === 'right' ? '---:' : ':---'))
      .join(' | ')} |`;
    const bodyLines = rows.map(r => `| ${r.map(c => c || ' ').join(' | ')} |`);
    return [headLine, sepLine, ...bodyLines].join('\n');
  }, [headers, alignments, rows]);

  return (
    <div className="space-y-5">
      <Header
        title="Markdown table generator"
        desc={t('markdown_table_desc', 'Vizuální tabulkový editor i převodník CSV do čistých Markdown tabulek.')}
      />
      <div className={box + ' space-y-4'}>
        <div className="flex gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            className={mode === 'grid' ? btn : secondary}
            onClick={() => setMode('grid')}
          >
            <TableIcon className="w-3.5 h-3.5 inline mr-1" />
            Vizuální tabulka
          </button>
          <button
            type="button"
            className={mode === 'paste' ? btn : secondary}
            onClick={() => setMode('paste')}
          >
            Vložit CSV / TSV text
          </button>
        </div>

        {mode === 'paste' ? (
          <div className="space-y-3">
            <textarea
              className={input + ' min-h-40 font-mono text-xs'}
              value={delimitText}
              onChange={e => setDelimitText(e.target.value)}
              placeholder="Vložte řádky oddělené středníkem (;), čárkou (,) nebo tabulátorem:\nJméno;Role;Lokalita\nAlice;Admin;Praha\nBob;Developer;Brno"
            />
            <button className={btn} onClick={parseDelimited}>
              Načíst a vytvořit tabulku
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={addRow}>
                <Plus className="w-3.5 h-3.5 inline mr-1" /> Přidat řádek
              </button>
              <button className={secondary} onClick={addColumn}>
                <Plus className="w-3.5 h-3.5 inline mr-1" /> Přidat sloupec
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    {headers.map((h, cidx) => (
                      <th key={cidx} className="p-1 min-w-[120px]">
                        <div className="flex items-center gap-1">
                          <input
                            className={input + ' py-1 px-1.5 font-bold text-white text-xs'}
                            value={h}
                            onChange={e => {
                              const next = [...headers];
                              next[cidx] = e.target.value;
                              setHeaders(next);
                            }}
                          />
                          <select
                            className="bg-slate-900 text-slate-300 text-[10px] rounded p-1 border border-slate-800"
                            value={alignments[cidx]}
                            onChange={e => {
                              const next = [...alignments];
                              next[cidx] = e.target.value as typeof alignments[0];
                              setAlignments(next);
                            }}
                          >
                            <option value="left">&lt;</option>
                            <option value="center">=</option>
                            <option value="right">&gt;</option>
                          </select>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                            onClick={() => removeColumn(cidx)}
                            title="Smazat sloupec"
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ridx) => (
                    <tr key={ridx} className="border-b border-slate-800/40">
                      {row.map((cell, cidx) => (
                        <td key={cidx} className="p-1">
                          <input
                            className={input + ' py-1 px-1.5 text-xs'}
                            value={cell}
                            onChange={e => {
                              const nextRows = rows.map((r, i) =>
                                i === ridx ? r.map((c, j) => (j === cidx ? e.target.value : c)) : r
                              );
                              setRows(nextRows);
                            }}
                          />
                        </td>
                      ))}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          className="text-slate-500 hover:text-rose-400 p-1"
                          onClick={() => removeRow(ridx)}
                          title="Smazat řádek"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">Generovaný Markdown kód:</span>
            <div className="flex gap-2">
              <button className={btn} onClick={() => navigator.clipboard.writeText(markdownOutput)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                Kopírovat Markdown
              </button>
            </div>
          </div>
          <pre className={box + ' whitespace-pre-wrap font-mono text-xs overflow-auto text-indigo-300'}>
            {markdownOutput}
          </pre>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   REGEX BUILDER & TESTER (Interactive Tester, Presets, Token chips)
   ───────────────────────────────────────────────────────────── */
const REGEX_PRESETS = [
  { name: 'Emailová adresa', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', flags: 'i' },
  { name: 'Webová URL adresa', pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', flags: 'gi' },
  { name: 'IPv4 Adresa', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g' },
  { name: 'Datum (YYYY-MM-DD)', pattern: '\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])\\b', flags: 'g' },
  { name: 'HEX Barva (#FFF nebo #FFFFFF)', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', flags: 'i' },
  { name: 'UUID v4', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', flags: 'gi' },
];

export const RegexBuilderTool: React.FC = () => {
  const { t } = useI18n();
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState('g');
  const [testText, setTestText] = useState(
    'Ahoj, kontaktujte nás na info@omnidesk.app nebo na podpora@firma.cz pro více informací.\nChybný email: user@domain'
  );

  const testResults = useMemo(() => {
    try {
      const reg = new RegExp(pattern, flags);
      const matches: { text: string; index: number }[] = [];
      let m: RegExpExecArray | null;

      if (!flags.includes('g')) {
        m = reg.exec(testText);
        if (m) matches.push({ text: m[0], index: m.index });
      } else {
        while ((m = reg.exec(testText)) !== null) {
          matches.push({ text: m[0], index: m.index });
          if (!m[0]) reg.lastIndex++;
        }
      }
      return { matches, error: null };
    } catch (e) {
      return { matches: [], error: e instanceof Error ? e.message : 'Chyba v regulárním výrazu.' };
    }
  }, [pattern, flags, testText]);

  const insertToken = (token: string) => {
    setPattern(prev => prev + token);
  };

  return (
    <div className="space-y-5">
      <Header
        title="Regex builder"
        desc={t('regex_builder_desc', 'Interaktivní sestavovač a tester regulárních výrazů s živým zvýrazněním shod.')}
      />
      <div className={box + ' space-y-4'}>
        {/* Presets */}
        <div>
          <span className="text-xs text-slate-400 block mb-1.5">Předpřipravené knihovny vzorů:</span>
          <div className="flex flex-wrap gap-1.5">
            {REGEX_PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                onClick={() => {
                  setPattern(p.pattern);
                  setFlags(p.flags);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern & Flags */}
        <div className="grid sm:grid-cols-[1fr_120px] gap-2 items-end">
          <label className="text-xs text-slate-400">
            Regulární výraz (Pattern):
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 mt-1">
              <span className="text-slate-500 font-mono text-sm">/</span>
              <input
                className="w-full bg-transparent outline-none font-mono text-sm text-indigo-300 py-1.5"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
              />
              <span className="text-slate-500 font-mono text-sm">/</span>
            </div>
          </label>
          <label className="text-xs text-slate-400">
            Příznaky (Flags):
            <input
              className={input + ' mt-1 font-mono text-sm'}
              value={flags}
              onChange={e => setFlags(e.target.value)}
              placeholder="gi"
            />
          </label>
        </div>

        {/* Quick token chips */}
        <div className="flex flex-wrap gap-1 items-center text-xs text-slate-400">
          <span className="text-[11px] mr-1">Rychlé symboly:</span>
          {[
            { label: 'Čísla (\\d+)', val: '\\d+' },
            { label: 'Písmena (\\w+)', val: '\\w+' },
            { label: 'Mezera (\\s)', val: '\\s' },
            { label: 'Začátek (^)', val: '^' },
            { label: 'Konec ($)', val: '$' },
            { label: 'Hranice (\\b)', val: '\\b' },
            { label: 'Skupina (...)', val: '()' },
          ].map(token => (
            <button
              key={token.label}
              type="button"
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300"
              onClick={() => insertToken(token.val)}
            >
              {token.label}
            </button>
          ))}
        </div>

        {testResults.error && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{testResults.error}</span>
          </div>
        )}

        {/* Test Text */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Testovací text pro ověření shod:</span>
            <span className="text-emerald-400 font-mono font-semibold">
              Nalezeno {testResults.matches.length} shod
            </span>
          </div>
          <textarea
            className={input + ' min-h-32 font-mono text-xs leading-relaxed'}
            value={testText}
            onChange={e => setTestText(e.target.value)}
          />
        </div>

        {/* Matches list */}
        {testResults.matches.length > 0 && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-xs text-slate-400 block font-medium">Seznam zachycených shod:</span>
            <div className="flex flex-wrap gap-2">
              {testResults.matches.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded bg-indigo-950/50 border border-indigo-700/50 text-indigo-200 font-mono text-xs"
                >
                  #{idx + 1}: &ldquo;{m.text}&rdquo; (pozice {m.index})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   IMAGE COLOR PICKER
   ───────────────────────────────────────────────────────────── */
export const ColorPickerTool: React.FC = () => {
  const { t } = useI18n();
  const [src, setSrc] = useState('');
  const [fileName, setFileName] = useState('');
  const [hexColor, setHexColor] = useState('#6366f1');
  const [rgbColor, setRgbColor] = useState('rgb(99, 102, 241)');
  const [hslColor, setHslColor] = useState('hsl(239, 84%, 67%)');
  const [history, setHistory] = useState<string[]>(['#6366f1', '#10b981', '#f59e0b', '#ef4444']);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const load = (file: File) => {
    setFileName(file.name);
    const image = new Image();
    image.onload = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = image.width;
      c.height = image.height;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0);
      }
      setSrc(URL.createObjectURL(file));
    };
    image.src = URL.createObjectURL(file);
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (c.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (c.height / rect.height));

    const ctx = c.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${Array.from(pixel.slice(0, 3)).map(val => val.toString(16).padStart(2, '0')).join('')}`;
    const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    const hsl = rgbToHsl(pixel[0], pixel[1], pixel[2]);

    setHexColor(hex);
    setRgbColor(rgb);
    setHslColor(hsl);
    if (!history.includes(hex)) {
      setHistory([hex, ...history.slice(0, 9)]);
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="Image color picker"
        desc={t('color_picker_desc', 'Otevřete obrázek a kliknutím na přesný pixel zjistěte jeho HEX, RGB a HSL barvu.')}
      />
      <div className={box + ' space-y-4'}>
        <FilePicker
          id="color-picker-input"
          label={t('choose_image', 'Vybrat obrázek')}
          fileName={fileName || undefined}
          accept="image/*"
          onChange={e => e.target.files?.[0] && load(e.target.files[0])}
        />

        {src ? (
          <div className="overflow-auto max-h-[500px] border border-slate-800 rounded-lg p-2 bg-slate-950 text-center">
            <p className="text-xs text-slate-400 mb-2">
              💡 {t('click_pixel_to_pick', 'Klikněte kdekoliv do obrázku pro výběr barvy:')}
            </p>
            <canvas ref={canvasRef} onClick={pick} className="max-w-full mx-auto rounded cursor-crosshair shadow" />
          </div>
        ) : (
          <div className="p-8 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
            {t('no_image_loaded_color', 'Nahrajte obrázek pro výběr barev.')}
          </div>
        )}

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl border-2 border-slate-700 shadow-md transition-colors"
              style={{ backgroundColor: hexColor }}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white text-base">{hexColor.toUpperCase()}</span>
                <button
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={() => navigator.clipboard.writeText(hexColor)}
                >
                  <Copy className="w-3.5 h-3.5 inline" />
                </button>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {rgbColor} &bull; {hslColor}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block">{t('recent_swatches', 'Nedávno vybrané barvy:')}</span>
            <div className="flex gap-1.5 flex-wrap">
              {history.map(c => (
                <button
                  key={c}
                  className="w-7 h-7 rounded border border-slate-700 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setHexColor(c);
                    navigator.clipboard.writeText(c);
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SCREENSHOT ANNOTATOR (Interactive Canvas: Boxes, Arrows, Text, Freehand, Undo)
   ───────────────────────────────────────────────────────────── */
type AnnotationShape =
  | { type: 'rect'; x: number; y: number; w: number; h: number; color: string; strokeWidth: number }
  | { type: 'arrow'; fromX: number; fromY: number; toX: number; toY: number; color: string; strokeWidth: number }
  | { type: 'text'; x: number; y: number; text: string; color: string; fontSize: number }
  | { type: 'pen'; points: { x: number; y: number }[]; color: string; strokeWidth: number };

export const ScreenshotAnnotatorTool: React.FC = () => {
  const { t } = useI18n();
  const [src, setSrc] = useState('');
  const [fileName, setFileName] = useState('');
  const [tool, setTool] = useState<'rect' | 'arrow' | 'text' | 'pen'>('rect');
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [textInput, setTextInput] = useState('Chyba v zobrazení');
  const [shapes, setShapes] = useState<AnnotationShape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStart, setCurrentStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPenPoints, setCurrentPenPoints] = useState<{ x: number; y: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const load = (file: File) => {
    setFileName(file.name);
    setShapes([]);
    const img = new Image();
    img.onload = () => {
      baseImageRef.current = img;
      redraw();
      setSrc(URL.createObjectURL(file));
    };
    img.src = URL.createObjectURL(file);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) * (c.width / rect.width)),
      y: Math.floor((e.clientY - rect.top) * (c.height / rect.height)),
    };
  };

  const redraw = (temporaryShape?: AnnotationShape) => {
    const c = canvasRef.current;
    if (!c || !baseImageRef.current) return;
    c.width = baseImageRef.current.width;
    c.height = baseImageRef.current.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Draw base image
    ctx.drawImage(baseImageRef.current, 0, 0);

    // Draw all confirmed shapes
    const all = temporaryShape ? [...shapes, temporaryShape] : shapes;
    for (const s of all) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;

      if (s.type === 'rect') {
        ctx.lineWidth = s.strokeWidth;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      } else if (s.type === 'arrow') {
        ctx.lineWidth = s.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(s.fromX, s.fromY);
        ctx.lineTo(s.toX, s.toY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(s.toY - s.fromY, s.toX - s.fromX);
        const headLen = 14;
        ctx.beginPath();
        ctx.moveTo(s.toX, s.toY);
        ctx.lineTo(s.toX - headLen * Math.cos(angle - Math.PI / 6), s.toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(s.toX - headLen * Math.cos(angle + Math.PI / 6), s.toY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fill();
      } else if (s.type === 'text') {
        ctx.font = `bold ${s.fontSize}px sans-serif`;
        // Draw background pill for text readability
        const metrics = ctx.measureText(s.text);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(s.x - 4, s.y - s.fontSize, metrics.width + 8, s.fontSize + 6);
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, s.x, s.y);
      } else if (s.type === 'pen' && s.points.length > 1) {
        ctx.lineWidth = s.strokeWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    redraw();
  }, [shapes]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!baseImageRef.current) return;
    const coords = getCanvasCoords(e);
    if (tool === 'text') {
      if (textInput.trim()) {
        setShapes([...shapes, { type: 'text', x: coords.x, y: coords.y, text: textInput.trim(), color: activeColor, fontSize: 24 }]);
      }
      return;
    }
    setIsDrawing(true);
    setCurrentStart(coords);
    if (tool === 'pen') {
      setCurrentPenPoints([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStart) return;
    const coords = getCanvasCoords(e);

    if (tool === 'rect') {
      redraw({
        type: 'rect',
        x: Math.min(currentStart.x, coords.x),
        y: Math.min(currentStart.y, coords.y),
        w: Math.abs(coords.x - currentStart.x),
        h: Math.abs(coords.y - currentStart.y),
        color: activeColor,
        strokeWidth: 4,
      });
    } else if (tool === 'arrow') {
      redraw({
        type: 'arrow',
        fromX: currentStart.x,
        fromY: currentStart.y,
        toX: coords.x,
        toY: coords.y,
        color: activeColor,
        strokeWidth: 4,
      });
    } else if (tool === 'pen') {
      const nextPoints = [...currentPenPoints, coords];
      setCurrentPenPoints(nextPoints);
      redraw({
        type: 'pen',
        points: nextPoints,
        color: activeColor,
        strokeWidth: 4,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStart) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(false);

    if (tool === 'rect') {
      const w = Math.abs(coords.x - currentStart.x);
      const h = Math.abs(coords.y - currentStart.y);
      if (w > 5 && h > 5) {
        setShapes([
          ...shapes,
          {
            type: 'rect',
            x: Math.min(currentStart.x, coords.x),
            y: Math.min(currentStart.y, coords.y),
            w,
            h,
            color: activeColor,
            strokeWidth: 4,
          },
        ]);
      }
    } else if (tool === 'arrow') {
      setShapes([
        ...shapes,
        {
          type: 'arrow',
          fromX: currentStart.x,
          fromY: currentStart.y,
          toX: coords.x,
          toY: coords.y,
          color: activeColor,
          strokeWidth: 4,
        },
      ]);
    } else if (tool === 'pen') {
      if (currentPenPoints.length > 1) {
        setShapes([...shapes, { type: 'pen', points: currentPenPoints, color: activeColor, strokeWidth: 4 }]);
      }
      setCurrentPenPoints([]);
    }
    setCurrentStart(null);
  };

  const undo = () => {
    setShapes(shapes.slice(0, -1));
  };

  const save = () =>
    canvasRef.current?.toBlob(blob =>
      blob &&
      saveBinaryWithDialog(
        'screenshot-annotated.png',
        blob,
        'image/png',
        [{ name: 'PNG (*.png)', extensions: ['png'] }],
        t('save_screenshot', 'Uložit snímek')
      )
    );

  return (
    <div className="space-y-5">
      <Header
        title="Screenshot annotator"
        desc={t('screenshot_desc', 'Kreslete rámečky, šipky, text a volnou rukou na snímky s exportem PNG.')}
      />
      <div className={box + ' space-y-4'}>
        <FilePicker
          id="screenshot-input"
          label={t('choose_image', 'Vybrat obrázek')}
          fileName={fileName || undefined}
          accept="image/*"
          onChange={e => e.target.files?.[0] && load(e.target.files[0])}
        />

        {src && (
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={tool === 'rect' ? btn : secondary}
                  onClick={() => setTool('rect')}
                  title="Rámeček / Zvýraznění"
                >
                  <Square className="w-3.5 h-3.5 inline mr-1" /> Rámeček
                </button>
                <button
                  type="button"
                  className={tool === 'arrow' ? btn : secondary}
                  onClick={() => setTool('arrow')}
                  title="Ukazovací šipka"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 inline mr-1" /> Šipka
                </button>
                <button
                  type="button"
                  className={tool === 'pen' ? btn : secondary}
                  onClick={() => setTool('pen')}
                  title="Kreslení volnou rukou"
                >
                  <Pencil className="w-3.5 h-3.5 inline mr-1" /> Pero
                </button>
                <button
                  type="button"
                  className={tool === 'text' ? btn : secondary}
                  onClick={() => setTool('text')}
                  title="Textová poznámka"
                >
                  <Type className="w-3.5 h-3.5 inline mr-1" /> Text
                </button>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-1.5">
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ffffff'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      activeColor === c ? 'scale-125 border-white' : 'border-slate-800 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setActiveColor(c)}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className={secondary} onClick={undo} disabled={!shapes.length} title="Vrátit poslední akci">
                  <Undo className="w-3.5 h-3.5 inline mr-1" /> Vrátit
                </button>
                <button className={secondary} onClick={() => setShapes([])} disabled={!shapes.length}>
                  Vymazat vše
                </button>
                <button className={btn} onClick={save}>
                  <Download className="w-3.5 h-3.5 inline mr-1" /> Uložit PNG
                </button>
              </div>
            </div>

            {tool === 'text' && (
              <div className="flex gap-2 items-center bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400">Text k vložení kliknutím:</span>
                <input
                  className={input + ' py-1'}
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Zadejte text a klikněte do obrázku…"
                />
              </div>
            )}

            <div className="overflow-auto max-h-[600px] border border-slate-800 rounded-lg p-2 bg-slate-950 text-center">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="max-w-full mx-auto rounded cursor-crosshair shadow"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const WorkdayCalculatorTool: React.FC = () => {
  const { t, language } = useI18n();
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(20);
  const [result, setResult] = useState('');

  const calculate = () => {
    const date = new Date(`${start}T12:00:00`);
    let left = days;
    while (left > 0) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) left--;
    }
    setResult(date.toLocaleDateString(language));
  };

  return (
    <div className="space-y-5">
      <Header
        title={t('workday_calculator_title', 'Pracovní dny a dovolená')}
        desc={t('workday_calculator_desc', 'Přičtěte pracovní dny k datu a ignorujte víkendy.')}
      />
      <div className={box + ' space-y-3'}>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={input} type="date" value={start} onChange={e => setStart(e.target.value)} />
          <input className={input} type="number" value={days} onChange={e => setDays(Number(e.target.value))} />
        </div>
        <button className={btn} onClick={calculate}>
          {t('calculate', 'Vypočítat')}
        </button>
        {result && (
          <div className={box + ' text-emerald-400 font-semibold'}>
            {t('result_date', 'Cílové datum')}: {result}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   GEOGRAPHIC & GPS CONVERTER
   ───────────────────────────────────────────────────────────── */
export const GeoGpsTool: React.FC = () => {
  const { t } = useI18n();
  const [lat, setLat] = useState(50.0755);
  const [lon, setLon] = useState(14.4378);

  const [lat2, setLat2] = useState(48.8566);
  const [lon2, setLon2] = useState(2.3522);

  const dmsLat = (value: number) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(2);
    const dir = value >= 0 ? 'N' : 'S';
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };

  const dmsLon = (value: number) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(2);
    const dir = value >= 0 ? 'E' : 'W';
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };

  const distanceKm = useMemo(() => {
    const R = 6371; // km
    const dLat = ((lat2 - lat) * Math.PI) / 180;
    const dLon = ((lon2 - lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  }, [lat, lon, lat2, lon2]);

  return (
    <div className="space-y-5">
      <Header
        title="Geografické výpočty & GPS"
        desc={t('geo_gps_desc', 'Převeďte souřadnice mezi DD a DMS, spočítejte vzdálenost a zobrazte mapu.')}
      />
      <div className={box + ' space-y-4'}>
        <h3 className="font-semibold text-white text-sm">Bod 1 (Základní souřadnice)</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {t('latitude', 'Zeměpisná šířka (Latitude)')}
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lat} onChange={e => setLat(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('longitude', 'Zeměpisná délka (Longitude)')}
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lon} onChange={e => setLon(Number(e.target.value))} />
          </label>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-xs">
          <div>
            <strong className="text-slate-300">DMS formát: </strong>
            <span className="font-mono text-emerald-400">{dmsLat(lat)}, {dmsLon(lon)}</span>
          </div>
          <div>
            <strong className="text-slate-300">Desetinný formát: </strong>
            <span className="font-mono text-slate-200">{lat.toFixed(6)}, {lon.toFixed(6)}</span>
          </div>
          <div className="pt-2">
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('open_in_osm', 'Zobrazit na OpenStreetMap')}
            </a>
          </div>
        </div>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">
          Vzdálenost k bodu 2 (Haversine kalkulátor)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            Bod 2 - Šířka
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lat2} onChange={e => setLat2(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            Bod 2 - Délka
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lon2} onChange={e => setLon2(Number(e.target.value))} />
          </label>
        </div>

        <div className="p-3 bg-indigo-950/20 rounded-lg border border-indigo-800/40 text-xs">
          Vzdušná vzdálenost mezi oběma body:{' '}
          <strong className="text-indigo-300 text-sm font-mono">{distanceKm} km</strong> (
          {(Number(distanceKm) * 0.621371).toFixed(2)} mil)
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   PERIODICKÝ FINANČNÍ KALKULÁTOR
   ───────────────────────────────────────────────────────────── */
export const PeriodicFinanceTool: React.FC = () => {
  const { t } = useI18n();
  const [currency, setCurrency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);
  const [principal, setPrincipal] = useState(100000);
  const [addition, setAddition] = useState(2000);
  const [rate, setRate] = useState(6.5);
  const [frequency, setFrequency] = useState<number>(12);
  const [years, setYears] = useState(10);

  const totalPeriods = frequency * years;
  const ratePerPeriod = rate / 100 / frequency;

  const total = useMemo(() => {
    if (ratePerPeriod === 0) {
      return principal + addition * totalPeriods;
    }
    const principalGrow = principal * Math.pow(1 + ratePerPeriod, totalPeriods);
    const additionsGrow = addition * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
    return principalGrow + additionsGrow;
  }, [principal, addition, ratePerPeriod, totalPeriods]);

  const totalDeposited = principal + addition * totalPeriods;
  const totalInterest = Math.max(0, total - totalDeposited);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Header
          title={t('periodic_finance', 'Periodický finanční kalkulátor')}
          desc={t(
            'periodic_finance_desc',
            'Vypočítejte složené úročení z počátečního vkladu, pravidelných příspěvků a zvolené periody.'
          )}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 shrink-0">
          <Coins className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-slate-400 font-medium">{t('currency', 'Měna')}:</span>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded px-2 py-0.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
          >
            {SUPPORTED_FIAT_CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-slate-900 text-slate-200">
                {c.flag} {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={box + ' space-y-4'}>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">
            {t('initial_lump_sum', 'Počáteční jednorázový vklad')} ({currSymbol})
            <input className={input + ' mt-1'} type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('regular_addition', 'Pravidelný vklad za periodu')} ({currSymbol})
            <input className={input + ' mt-1'} type="number" value={addition} onChange={e => setAddition(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('annual_rate_percent', 'Roční úroková sazba (%)')}
            <input className={input + ' mt-1'} type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))} />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {t('compounding_frequency', 'Periodicita připisování')}
            <select
              className={input + ' mt-1'}
              value={frequency}
              onChange={e => setFrequency(Number(e.target.value))}
            >
              <option value="12">Měsíčně (12× ročně)</option>
              <option value="4">Čtvrtletně (4× ročně)</option>
              <option value="2">Pololetně (2× ročně)</option>
              <option value="1">Ročně (1× ročně)</option>
              <option value="365">Denně (365× ročně)</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('duration_years', 'Doba trvání (v letech)')}
            <input className={input + ' mt-1'} type="number" min="1" max="50" value={years} onChange={e => setYears(Number(e.target.value))} />
          </label>
        </div>

        <div className="grid md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">{t('total_principal_invested', 'Celkem vámi vloženo')}</span>
            <span className="text-lg font-bold text-slate-200 mt-1 block">
              {formatCurrency(totalDeposited, currency)}
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">{t('total_interest_earned', 'Získaný úrok celkem')}</span>
            <span className="text-lg font-bold text-indigo-400 mt-1 block">
              +{formatCurrency(totalInterest, currency)}
            </span>
          </div>
          <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-800/40 text-center">
            <span className="text-xs text-slate-400 block">{t('future_total_value', 'Budoucí konečná hodnota')}</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   BINARY & HEX CONVERTER (Two-way synchronized: Text <-> HEX <-> BIN <-> DEC <-> BASE64)
   ───────────────────────────────────────────────────────────── */
export const BinaryHexTool: React.FC = () => {
  const { t } = useI18n();
  const [text, setText] = useState('OmniDesk');
  const [hex, setHex] = useState('4f 6d 6e 69 44 65 73 6b');
  const [binary, setBinary] = useState('01001111 01101101 01101110 01101001 01000100 01100101 01110011 01101011');
  const [decimal, setDecimal] = useState('79 109 110 105 68 101 115 107');
  const [base64, setBase64] = useState('T21uaURlc2s=');

  const updateFromText = (val: string) => {
    setText(val);
    const bytes = new TextEncoder().encode(val);
    setHex(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    setBinary(Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' '));
    setDecimal(Array.from(bytes).map(b => b.toString(10)).join(' '));
    try {
      setBase64(btoa(String.fromCharCode(...bytes)));
    } catch {
      setBase64('');
    }
  };

  const updateFromHex = (hexStr: string) => {
    setHex(hexStr);
    try {
      const clean = hexStr.replace(/[^0-9a-fA-F]/g, '');
      const bytes: number[] = [];
      for (let i = 0; i < clean.length; i += 2) {
        bytes.push(parseInt(clean.slice(i, i + 2), 16));
      }
      const u8 = new Uint8Array(bytes);
      const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(u8);
      setText(decodedText);
      setBinary(Array.from(u8).map(b => b.toString(2).padStart(8, '0')).join(' '));
      setDecimal(Array.from(u8).map(b => b.toString(10)).join(' '));
      setBase64(btoa(String.fromCharCode(...u8)));
    } catch {
      // ignore parsing error
    }
  };

  const updateFromBinary = (binStr: string) => {
    setBinary(binStr);
    try {
      const tokens = binStr.trim().split(/\s+/).filter(Boolean);
      const bytes: number[] = [];
      for (const tok of tokens) {
        bytes.push(parseInt(tok, 2));
      }
      const u8 = new Uint8Array(bytes);
      const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(u8);
      setText(decodedText);
      setHex(Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join(' '));
      setDecimal(Array.from(u8).map(b => b.toString(10)).join(' '));
      setBase64(btoa(String.fromCharCode(...u8)));
    } catch {
      // ignore
    }
  };

  const updateFromBase64 = (b64Str: string) => {
    setBase64(b64Str);
    try {
      const raw = atob(b64Str.trim());
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      setText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      setHex(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
      setBinary(Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' '));
      setDecimal(Array.from(bytes).map(b => b.toString(10)).join(' '));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="Binární & hexadecimální převodník"
        desc={t('binary_hex_desc', 'Obousměrný převodník mezi textem, HEX, binárním kódem, decimálními bajty a Base64.')}
      />
      <div className={box + ' space-y-4'}>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">1. Text (UTF-8):</span>
            <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(text)}>
              <Copy className="w-3 h-3 inline mr-1" /> Kopírovat
            </button>
          </div>
          <textarea className={input + ' min-h-20 font-mono text-xs'} value={text} onChange={e => updateFromText(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">2. Šestnáctková soustava (HEX):</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(hex)}>
                <Copy className="w-3 h-3 inline mr-1" /> Kopírovat
              </button>
            </div>
            <textarea className={input + ' min-h-20 font-mono text-xs text-amber-300'} value={hex} onChange={e => updateFromHex(e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">3. Binární soustava (BIN):</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(binary)}>
                <Copy className="w-3 h-3 inline mr-1" /> Kopírovat
              </button>
            </div>
            <textarea className={input + ' min-h-20 font-mono text-xs text-emerald-300'} value={binary} onChange={e => updateFromBinary(e.target.value)} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">4. Decimální ASCII bajty (0-255):</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(decimal)}>
                <Copy className="w-3 h-3 inline mr-1" /> Kopírovat
              </button>
            </div>
            <input className={input + ' font-mono text-xs text-sky-300'} value={decimal} readOnly />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">5. Base64 kódování:</span>
              <button className="text-indigo-400 hover:text-indigo-300" onClick={() => navigator.clipboard.writeText(base64)}>
                <Copy className="w-3 h-3 inline mr-1" /> Kopírovat
              </button>
            </div>
            <input className={input + ' font-mono text-xs text-purple-300'} value={base64} onChange={e => updateFromBase64(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
};
