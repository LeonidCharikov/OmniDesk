import React from 'react';
import { Coins } from 'lucide-react';
import { getCurrencySymbol } from '../../services/currencyService';
import { useI18n } from '../../i18n/context';

interface AppCurrencyBadgeProps {
  currency: string;
  compact?: boolean;
}

export const AppCurrencyBadge: React.FC<AppCurrencyBadgeProps> = ({ currency, compact = false }) => {
  const { t } = useI18n();
  const symbol = getCurrencySymbol(currency);

  const openCurrencySettings = () => {
    window.dispatchEvent(
      new CustomEvent('omnidesk-open-settings', { detail: { tab: 'currency' } })
    );
  };

  return (
    <button
      type="button"
      onClick={openCurrencySettings}
      title={t('tab_currency', 'Default Currency')}
      aria-label={`${t('tab_currency', 'Default Currency')}: ${currency} (${symbol})`}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-xs font-medium text-indigo-300 transition-colors shrink-0 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1.5'
      }`}
    >
      <Coins className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
      <span className="font-mono font-semibold">
        {currency} ({symbol})
      </span>
    </button>
  );
};
