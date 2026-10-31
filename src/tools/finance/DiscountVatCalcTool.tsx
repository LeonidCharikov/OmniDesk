import React, { useState, useId } from 'react';
import {
  Percent,
  Receipt,
  Users,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Tag,
  Calculator,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const DiscountVatCalcTool: React.FC = () => {
  const { t } = useI18n();

  // Active tab: 'discount' | 'vat' | 'tip'
  const [activeTab, setActiveTab] = useState<'discount' | 'vat' | 'tip'>('discount');

  // Currency from user config
  const [currency] = useState(() => {
    try {
      const saved = localStorage.getItem('omnidesk_user_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultCurrency) return parsed.defaultCurrency;
      }
    } catch {
      // ignore
    }
    return 'CZK';
  });

  const [copied, setCopied] = useState(false);

  // 1. Discount State
  const [origPrice, setOrigPrice] = useState<string>('1299');
  const [discountPercent, setDiscountPercent] = useState<number>(25);
  const [customDiscount, setCustomDiscount] = useState<string>('');
  const [dealType, setDealType] = useState<'percentage' | 'bogo'>('percentage');
  const [bogoBuy, setBogoBuy] = useState<number>(2);
  const [bogoGetFree, setBogoGetFree] = useState<number>(1);

  // 2. VAT State
  const [vatAmountInput, setVatAmountInput] = useState<string>('1000');
  const [vatMode, setVatMode] = useState<'without_vat' | 'with_vat'>('without_vat');
  const [vatRate, setVatRate] = useState<number>(21);
  const [customVat, setCustomVat] = useState<string>('');

  // 3. Tip State
  const [billTotal, setBillTotal] = useState<string>('850');
  const [tipPercent, setTipPercent] = useState<number>(10);
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [roundUp, setRoundUp] = useState<boolean>(true);

  const origPriceId = useId();
  const vatInputId = useId();
  const billTotalId = useId();

  // Calculations for Discount
  const priceNum = parseFloat(origPrice) || 0;
  let finalDiscountPercent = discountPercent;
  let finalPrice = 0;
  let savedAmount = 0;

  if (dealType === 'percentage') {
    const activePercent = customDiscount ? parseFloat(customDiscount) || 0 : discountPercent;
    finalDiscountPercent = Math.min(100, Math.max(0, activePercent));
    savedAmount = (priceNum * finalDiscountPercent) / 100;
    finalPrice = Math.max(0, priceNum - savedAmount);
  } else {
    // BOGO: buy X get Y free -> total items: X + Y, pay for X
    const totalItems = bogoBuy + bogoGetFree;
    if (totalItems > 0 && bogoBuy > 0) {
      const discountRatio = bogoGetFree / totalItems;
      finalDiscountPercent = Math.round(discountRatio * 100);
      savedAmount = priceNum * discountRatio;
      finalPrice = priceNum - savedAmount;
    }
  }

  // Calculations for VAT
  const vatInputVal = parseFloat(vatAmountInput) || 0;
  const activeVatRate = customVat ? parseFloat(customVat) || 0 : vatRate;
  let basePrice = 0;
  let vatCalculated = 0;
  let totalWithVat = 0;

  if (vatMode === 'without_vat') {
    basePrice = vatInputVal;
    vatCalculated = (basePrice * activeVatRate) / 100;
    totalWithVat = basePrice + vatCalculated;
  } else {
    totalWithVat = vatInputVal;
    basePrice = totalWithVat / (1 + activeVatRate / 100);
    vatCalculated = totalWithVat - basePrice;
  }

  // Calculations for Tip & Split
  const billNum = parseFloat(billTotal) || 0;
  const tipAmount = (billNum * tipPercent) / 100;
  let grandTotal = billNum + tipAmount;
  if (roundUp && grandTotal > 0) {
    grandTotal = Math.ceil(grandTotal / 10) * 10;
  }
  const perPerson = peopleCount > 0 ? grandTotal / peopleCount : grandTotal;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_discount_vat_calc_title', 'Kalkulačka slev, DPH a spropitného')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              {currency}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'tool_discount_vat_calc_desc',
              'Rychlý výpočet výprodejových slev, marže, daně z přidané hodnoty (DPH) a spravedlivého rozdělení útraty v restauraci.'
            )}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('discount')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'discount' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{t('calc_tab_discount', 'Slevy & Výprodeje')}</span>
          </button>
          <button
            onClick={() => setActiveTab('vat')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'vat' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{t('calc_tab_vat', 'Kalkulátor DPH')}</span>
          </button>
          <button
            onClick={() => setActiveTab('tip')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'tip' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('calc_tab_tip', 'Spropitné & Účet')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DISCOUNT */}
      {activeTab === 'discount' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('discount_deal_type', 'Typ slevové akce')}
              </span>
              <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                <button
                  onClick={() => setDealType('percentage')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dealType === 'percentage' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('discount_mode_percent', 'Procentní sleva (%)')}
                </button>
                <button
                  onClick={() => setDealType('bogo')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    dealType === 'bogo' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('discount_mode_bogo', 'Akce 2+1 zdarma')}
                </button>
              </div>
            </div>

            {/* Original Price Input */}
            <div className="space-y-1.5">
              <label htmlFor={origPriceId} className="text-xs font-semibold text-slate-300">
                {t('original_price_label', 'Původní cena zboží')} ({currency})
              </label>
              <div className="relative">
                <input
                  id={origPriceId}
                  type="number"
                  min="0"
                  step="any"
                  value={origPrice}
                  onChange={e => setOrigPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-3 text-sm font-mono text-slate-500">
                  {currency}
                </span>
              </div>
            </div>

            {dealType === 'percentage' ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  {t('discount_percent_label', 'Výše slevy')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 30, 40, 50, 70].map(pct => (
                    <button
                      key={pct}
                      onClick={() => {
                        setDiscountPercent(pct);
                        setCustomDiscount('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                        discountPercent === pct && !customDiscount
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-slate-400">{t('custom_percent_label', 'Vlastní procento:')}</span>
                  <div className="relative w-28">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      value={customDiscount}
                      onChange={e => setCustomDiscount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-slate-500">%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  {t('bogo_deal_title', 'Balíček: Kup X kusů, získej Y zdarma')}
                </span>
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">{t('bogo_buy_count', 'Koupit kusů:')}</span>
                    <input
                      type="number"
                      min="1"
                      value={bogoBuy}
                      onChange={e => setBogoBuy(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-mono text-white"
                    />
                  </div>
                  <span className="text-slate-500 font-bold mt-4">+</span>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">{t('bogo_free_count', 'Získat zdarma:')}</span>
                    <input
                      type="number"
                      min="1"
                      value={bogoGetFree}
                      onChange={e => setBogoGetFree(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-mono text-white"
                    />
                  </div>
                </div>
                <p className="text-xs text-indigo-300">
                  {t('bogo_summary_text', 'Efektivní sleva činí')} {finalDiscountPercent}% {t('per_item', 'na 1 kus')}.
                </p>
              </div>
            )}
          </div>

          {/* Results Summary Card */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  {t('final_price_header', 'Konečná cena po slevě')}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                  -{finalDiscountPercent}%
                </span>
              </div>

              <div className="mt-4 text-4xl font-extrabold text-white font-mono tracking-tight">
                {finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xl font-normal text-indigo-400">{currency}</span>
              </div>

              <div className="mt-6 space-y-3 pt-4 border-t border-indigo-500/20 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{t('original_price_row', 'Původní cena:')}</span>
                  <span className="font-mono text-slate-300 line-through">
                    {priceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                  <span>{t('you_save_row', 'Ušetříte:')}</span>
                  <span className="font-mono">
                    -{savedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  `${finalPrice.toFixed(2)} ${currency} (${t('discount_of', 'sleva')} ${finalDiscountPercent}%, ${t('saved', 'ušetřeno')} ${savedAmount.toFixed(2)} ${currency})`
                )
              }
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? t('copied_to_clipboard', 'Zkopírováno') : t('copy_result', 'Kopírovat výsledek')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: VAT CALCULATOR */}
      {activeTab === 'vat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
            {/* Calculation direction */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {t('vat_direction_label', 'Směr výpočtu daně')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVatMode('without_vat')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    vatMode === 'without_vat'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{t('vat_mode_from_base', 'Základ bez DPH -> s daní')}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t('vat_mode_from_base_sub', 'Přičíst daň k základu')}</div>
                </button>
                <button
                  onClick={() => setVatMode('with_vat')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    vatMode === 'with_vat'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{t('vat_mode_from_total', 'Cena s DPH -> základ')}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t('vat_mode_from_total_sub', 'Odečíst a vyčíslit daň')}</div>
                </button>
              </div>
            </div>

            {/* Input Amount */}
            <div className="space-y-1.5">
              <label htmlFor={vatInputId} className="text-xs font-semibold text-slate-300">
                {vatMode === 'without_vat' ? t('base_without_vat_label', 'Částka bez DPH') : t('price_with_vat_label', 'Částka včetně DPH')} ({currency})
              </label>
              <div className="relative">
                <input
                  id={vatInputId}
                  type="number"
                  min="0"
                  step="any"
                  value={vatAmountInput}
                  onChange={e => setVatAmountInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-3 text-sm font-mono text-slate-500">
                  {currency}
                </span>
              </div>
            </div>

            {/* VAT Rate Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                {t('vat_rate_label', 'Sazba DPH')}
              </label>
              <div className="flex flex-wrap gap-2">
                {[21, 12, 15, 19, 20, 10, 0].map(rate => (
                  <button
                    key={rate}
                    onClick={() => {
                      setVatRate(rate);
                      setCustomVat('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      vatRate === rate && !customVat
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-slate-400">{t('custom_vat_rate', 'Vlastní sazba DPH:')}</span>
                <div className="relative w-28">
                  <input
                    type="number"
                    min="0"
                    placeholder="0-100"
                    value={customVat}
                    onChange={e => setCustomVat(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* VAT Results */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                {t('vat_breakdown_header', 'Rozpad daňového dokladu')} ({activeVatRate}%)
              </span>

              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{t('tax_base_row', 'Základ daně (bez DPH):')}</span>
                  <span className="font-mono text-sm font-semibold text-slate-200">
                    {basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span>{t('calculated_vat_row', 'Vyčíslené DPH')} ({activeVatRate}%):</span>
                  <span className="font-mono text-sm font-semibold">
                    +{vatCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase">{t('total_with_vat_row', 'Celkem s DPH:')}</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  `${t('tax_base_row', 'Základ')}: ${basePrice.toFixed(2)} ${currency}, DPH (${activeVatRate}%): ${vatCalculated.toFixed(2)} ${currency}, ${t('total', 'Celkem')}: ${totalWithVat.toFixed(2)} ${currency}`
                )
              }
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? t('copied_to_clipboard', 'Zkopírováno') : t('copy_breakdown', 'Kopírovat rozpis')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: TIP & BILL SPLIT */}
      {activeTab === 'tip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
            {/* Bill Amount */}
            <div className="space-y-1.5">
              <label htmlFor={billTotalId} className="text-xs font-semibold text-slate-300">
                {t('restaurant_bill_label', 'Částka na účtu (bez spropitného)')} ({currency})
              </label>
              <div className="relative">
                <input
                  id={billTotalId}
                  type="number"
                  min="0"
                  step="any"
                  value={billTotal}
                  onChange={e => setBillTotal(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-3 text-sm font-mono text-slate-500">
                  {currency}
                </span>
              </div>
            </div>

            {/* Tip Percentage */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                {t('tip_percentage_label', 'Spropitné (dýško)')}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[0, 5, 10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setTipPercent(pct)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-colors ${
                      tipPercent === pct
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Split count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {t('number_of_people_label', 'Počet platících osob:')}
                </label>
                <span className="text-sm font-mono font-bold text-indigo-400">
                  {peopleCount} {peopleCount === 1 ? t('person_single', 'osoba') : t('persons_plural', 'osob')}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={peopleCount}
                onChange={e => setPeopleCount(parseInt(e.target.value) || 1)}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Round up checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="round-up"
                checked={roundUp}
                onChange={e => setRoundUp(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              <label htmlFor="round-up" className="text-xs text-slate-300 cursor-pointer">
                {t('round_up_total', 'Zaokrouhlit celkovou útratu nahoru (na desítky)')}
              </label>
            </div>
          </div>

          {/* Tip Summary Card */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 block">
                {t('cost_per_person_header', 'Částka na jednu osobu')}
              </span>

              <div className="mt-3 text-4xl font-extrabold text-white font-mono">
                {perPerson.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}{' '}
                <span className="text-xl font-normal text-indigo-400">{currency}</span>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-slate-950/60 border border-indigo-500/20 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{t('bill_subtotal', 'Původní útrata:')}</span>
                  <span className="font-mono text-slate-200">
                    {billNum.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-amber-300">
                  <span>{t('tip_total_row', 'Spropitné')} ({tipPercent}%):</span>
                  <span className="font-mono font-semibold">
                    +{tipAmount.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
                  <span>{t('grand_total_row', 'Celkem k úhradě:')}</span>
                  <span className="font-mono text-sm text-emerald-400">
                    {grandTotal.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  `${t('total', 'Celkem')}: ${grandTotal.toFixed(2)} ${currency} (${perPerson.toFixed(1)} ${currency} / ${t('person', 'osoba')})`
                )
              }
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? t('copied_to_clipboard', 'Zkopírováno') : t('copy_result', 'Kopírovat výsledek')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
