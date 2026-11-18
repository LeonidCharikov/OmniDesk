import React from 'react';
import { Check } from 'lucide-react';
import { UserConfig } from '../../../types/tool';
import { useI18n } from '../../../i18n/context';
import { ALL_CURRENCIES, CURRENCY_NAMES, DEFAULT_WIDGETS_CONFIG } from './settingsConstants';

interface CurrencySettingsTabProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
}

export const CurrencySettingsTab: React.FC<CurrencySettingsTabProps> = ({
  config,
  onUpdateConfig,
}) => {
  const { t, language } = useI18n();
  const currentWidgets = config.widgets || DEFAULT_WIDGETS_CONFIG;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {t('choose_default_currency', 'Default Application Currency')}
          </h3>
          <p className="text-xs text-slate-400">
            {t('currency_description', 'This currency will be preselected in currency converters, crypto calculators, and sidebar widgets.')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-mono">
          <span>{t('active_default_currency', 'Active default currency:')}</span>
          <strong className="text-white font-bold">{config.defaultCurrency || 'CZK'}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {ALL_CURRENCIES.map(curr => {
          const isSelected = (config.defaultCurrency || 'CZK') === curr.code;
          return (
            <div
              key={curr.code}
              onClick={() => {
                onUpdateConfig({
                  ...config,
                  defaultCurrency: curr.code,
                  widgets: {
                    ...currentWidgets,
                    selectedFiat: curr.code,
                  },
                });
              }}
              className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/30'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{curr.flag}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white font-mono">{curr.code}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({curr.symbol})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {CURRENCY_NAMES[curr.code]?.[language] || curr.name}
                  </span>
                </div>
              </div>

              {isSelected ? (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Check className="w-3 h-3" />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border border-slate-700 bg-slate-900" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
