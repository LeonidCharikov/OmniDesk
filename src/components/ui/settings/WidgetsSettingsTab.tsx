import React from 'react';
import {
  Calculator,
  Check,
  CheckSquare,
  Clock,
  Coins,
  Cpu,
  FileEdit,
  Sliders,
  X,
} from 'lucide-react';
import { UserConfig } from '../../../types/tool';
import { useI18n } from '../../../i18n/context';
import {
  CITIES,
  CITY_NAMES,
  CRYPTOS,
  CURRENCY_NAMES,
  DEFAULT_WIDGETS_CONFIG,
  FIATS,
} from './settingsConstants';
import { CurrencyFlagIcon } from '../CurrencyFlagIcon';
import {
  MAX_WIDGET_SLOTS,
  normalizeWidgetSlotList,
  removeWidgetSlotAt,
  resizeWidgetSlotList,
  updateWidgetSlotAt,
} from '../../../utils/widgetCustomization';

interface WidgetsSettingsTabProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
}

const SLOT_COUNTS = [1, 2, 3] as const;
const ALL_CITY_IDS = CITIES.map(c => c.id);
const ALL_FIAT_CODES = FIATS.map(f => f.code);
const ALL_CRYPTO_CODES = CRYPTOS.map(c => c.code);

export const WidgetsSettingsTab: React.FC<WidgetsSettingsTabProps> = ({
  config,
  onUpdateConfig,
}) => {
  const { t, language } = useI18n();
  const currentWidgets = config.widgets || DEFAULT_WIDGETS_CONFIG;

  const selectedCities = normalizeWidgetSlotList(
    currentWidgets.selectedCities,
    currentWidgets.selectedCity || DEFAULT_WIDGETS_CONFIG.selectedCity,
    MAX_WIDGET_SLOTS
  );
  const selectedFiats = normalizeWidgetSlotList(
    currentWidgets.selectedFiats,
    currentWidgets.selectedFiat || DEFAULT_WIDGETS_CONFIG.selectedFiat,
    MAX_WIDGET_SLOTS
  );
  const selectedCryptos = normalizeWidgetSlotList(
    currentWidgets.selectedCryptos,
    currentWidgets.selectedCrypto || DEFAULT_WIDGETS_CONFIG.selectedCrypto,
    MAX_WIDGET_SLOTS
  );

  const toggleWidget = (widgetId: string) => {
    const currentEnabled = currentWidgets.enabledWidgets || [];
    const updated = currentEnabled.includes(widgetId)
      ? currentEnabled.filter(id => id !== widgetId)
      : [...currentEnabled, widgetId];

    onUpdateConfig({
      ...config,
      widgets: {
        ...currentWidgets,
        enabledWidgets: updated,
      },
      enabledWidgets: updated,
    });
  };

  const commitWidgetList = (
    key: 'selectedCities' | 'selectedFiats' | 'selectedCryptos',
    updated: string[]
  ) => {
    const next = { ...currentWidgets, [key]: updated };
    if (key === 'selectedCities') {
      next.selectedCity = updated[0];
      next.selectedCityName = CITIES.find(city => city.id === updated[0])?.name || 'Prague';
    }
    if (key === 'selectedFiats') {
      next.selectedFiat = updated[0];
    }
    if (key === 'selectedCryptos') {
      next.selectedCrypto = updated[0];
    }
    onUpdateConfig({ ...config, widgets: next });
  };

  const handleResizeList = (
    key: 'selectedCities' | 'selectedFiats' | 'selectedCryptos',
    targetCount: number
  ) => {
    if (key === 'selectedCities') {
      commitWidgetList(
        key,
        resizeWidgetSlotList(selectedCities, targetCount, ALL_CITY_IDS, DEFAULT_WIDGETS_CONFIG.selectedCity)
      );
    } else if (key === 'selectedFiats') {
      commitWidgetList(
        key,
        resizeWidgetSlotList(selectedFiats, targetCount, ALL_FIAT_CODES, DEFAULT_WIDGETS_CONFIG.selectedFiat)
      );
    } else {
      commitWidgetList(
        key,
        resizeWidgetSlotList(selectedCryptos, targetCount, ALL_CRYPTO_CODES, DEFAULT_WIDGETS_CONFIG.selectedCrypto)
      );
    }
  };

  const handleUpdateSlot = (
    key: 'selectedCities' | 'selectedFiats' | 'selectedCryptos',
    index: number,
    value: string
  ) => {
    if (key === 'selectedCities') {
      commitWidgetList(
        key,
        updateWidgetSlotAt(selectedCities, index, value, DEFAULT_WIDGETS_CONFIG.selectedCity)
      );
    } else if (key === 'selectedFiats') {
      commitWidgetList(
        key,
        updateWidgetSlotAt(selectedFiats, index, value, DEFAULT_WIDGETS_CONFIG.selectedFiat)
      );
    } else {
      commitWidgetList(
        key,
        updateWidgetSlotAt(selectedCryptos, index, value, DEFAULT_WIDGETS_CONFIG.selectedCrypto)
      );
    }
  };

  const handleRemoveSlot = (
    key: 'selectedCities' | 'selectedFiats' | 'selectedCryptos',
    index: number
  ) => {
    if (key === 'selectedCities') {
      commitWidgetList(
        key,
        removeWidgetSlotAt(selectedCities, index, DEFAULT_WIDGETS_CONFIG.selectedCity)
      );
    } else if (key === 'selectedFiats') {
      commitWidgetList(
        key,
        removeWidgetSlotAt(selectedFiats, index, DEFAULT_WIDGETS_CONFIG.selectedFiat)
      );
    } else {
      commitWidgetList(
        key,
        removeWidgetSlotAt(selectedCryptos, index, DEFAULT_WIDGETS_CONFIG.selectedCrypto)
      );
    }
  };

  const renderCountSelector = (
    currentCount: number,
    onChangeCount: (count: number) => void,
    ariaLabel: string
  ) => (
    <div
      className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-700/80 p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {SLOT_COUNTS.map(count => (
        <button
          key={count}
          type="button"
          onClick={() => onChangeCount(count)}
          className={`px-2 py-0.5 text-[11px] font-mono rounded-md transition-colors ${
            currentCount === count
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {count}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t('widgets_visibility', 'Active Mini Widgets in Sidebar')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('widgets_visibility_desc', 'Enable or disable individual mini panels.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            {
              id: 'clock',
              title: t('widget_clock_title', 'Live Clock & World Time'),
              desc: t('widget_clock_desc', 'Time and date for selected world cities'),
              icon: <Clock className="w-4 h-4 text-indigo-400" />,
            },
            {
              id: 'timer',
              title: t('widget_timer_title', 'Quick Timer / Pomodoro'),
              desc: t('widget_timer_desc', 'Quick 25m focus and break countdown'),
              icon: <Sliders className="w-4 h-4 text-amber-400" />,
            },
            {
              id: 'crypto',
              title: t('widget_crypto_title', 'Exchange Rates & Crypto'),
              desc: t('widget_crypto_desc', 'Track selected cryptocurrency and fiat currency'),
              icon: <Coins className="w-4 h-4 text-emerald-400" />,
            },
            {
              id: 'calc',
              title: t('widget_calc_title', 'Quick Calculator & Unit Converter'),
              desc: t('widget_calc_desc', 'Instant math calculations and unit conversions'),
              icon: <Calculator className="w-4 h-4 text-indigo-400" />,
            },
            {
              id: 'tasks',
              title: t('widget_tasks_title', 'Daily Task Checklist'),
              desc: t('widget_tasks_desc', 'Quick list of priorities and daily goals'),
              icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
            },
            {
              id: 'notes',
              title: t('widget_notes_title', 'Quick Sticky Note'),
              desc: t('widget_notes_desc', 'Instant notes right in the sidebar'),
              icon: <FileEdit className="w-4 h-4 text-yellow-400" />,
            },
            {
              id: 'system',
              title: t('widget_system_title', 'System Hardware Gauge'),
              desc: t('widget_system_desc', 'Compact CPU and RAM load indicator'),
              icon: <Cpu className="w-4 h-4 text-cyan-400" />,
            },
          ].map(w => {
            const isEnabled = currentWidgets.enabledWidgets?.includes(w.id);
            return (
              <div
                key={w.id}
                onClick={() => toggleWidget(w.id)}
                className={`cursor-pointer p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isEnabled
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    {w.icon}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">{w.title}</span>
                    <span className="text-[11px] text-slate-400 block">{w.desc}</span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isEnabled
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {isEnabled && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" />
          {t('widget_customization', 'Widget Content Customization')}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Clock Cities */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                {t('selected_city_for_clock', 'Clock Cities')}
              </label>
              {renderCountSelector(
                selectedCities.length,
                count => handleResizeList('selectedCities', count),
                `${t('selected_city_for_clock', 'Clock Cities')} - ${t('widget_slots_count', 'Count')}`
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {t('widget_city_count_hint', 'Display 1–3 world clocks in the sidebar')}
            </p>
            <div className="space-y-1.5">
              {selectedCities.map((cityId, index) => (
                <div key={`${cityId}-${index}`} className="flex items-center gap-1.5">
                  <select
                    value={cityId}
                    onChange={e => handleUpdateSlot('selectedCities', index, e.target.value)}
                    className="w-full min-w-0 text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CITIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label.replace(c.name, CITY_NAMES[c.id]?.[language] || c.name)}
                      </option>
                    ))}
                  </select>
                  {selectedCities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot('selectedCities', index)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors shrink-0"
                      title={t('widget_remove_item', 'Remove')}
                      aria-label={t('widget_remove_item', 'Remove')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tracked Fiat Currencies */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                {t('selected_fiat', 'Tracked Fiat Currency')}
              </label>
              {renderCountSelector(
                selectedFiats.length,
                count => handleResizeList('selectedFiats', count),
                `${t('selected_fiat', 'Tracked Fiat Currency')} - ${t('widget_slots_count', 'Count')}`
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {t('widget_fiat_count_hint', '1st is base currency; add 2–3 to compare FX rates')}
            </p>
            <div className="space-y-1.5">
              {selectedFiats.map((fiatCode, index) => (
                <div key={`${fiatCode}-${index}`} className="flex items-center gap-1.5">
                  <CurrencyFlagIcon
                    code={fiatCode}
                    className="w-5 h-3.5 rounded-[2px] shrink-0"
                  />
                  <select
                    value={fiatCode}
                    onChange={e => handleUpdateSlot('selectedFiats', index, e.target.value)}
                    className="w-full min-w-0 text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {FIATS.map(f => (
                      <option key={f.code} value={f.code}>
                        {CURRENCY_NAMES[f.code]?.[language] || f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                  {selectedFiats.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot('selectedFiats', index)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors shrink-0"
                      title={t('widget_remove_item', 'Remove')}
                      aria-label={t('widget_remove_item', 'Remove')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tracked Cryptocurrencies */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300">
                {t('selected_crypto', 'Tracked Cryptocurrency')}
              </label>
              {renderCountSelector(
                selectedCryptos.length,
                count => handleResizeList('selectedCryptos', count),
                `${t('selected_crypto', 'Tracked Cryptocurrency')} - ${t('widget_slots_count', 'Count')}`
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {t('widget_crypto_count_hint', 'Track 1–3 cryptocurrencies in the sidebar')}
            </p>
            <div className="space-y-1.5">
              {selectedCryptos.map((cryptoCode, index) => (
                <div key={`${cryptoCode}-${index}`} className="flex items-center gap-1.5">
                  <select
                    value={cryptoCode}
                    onChange={e => handleUpdateSlot('selectedCryptos', index, e.target.value)}
                    className="w-full min-w-0 text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CRYPTOS.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {selectedCryptos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot('selectedCryptos', index)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors shrink-0"
                      title={t('widget_remove_item', 'Remove')}
                      aria-label={t('widget_remove_item', 'Remove')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80">
          <label className="text-xs font-medium text-slate-300 block max-w-xs">
            {t('widget_timer_custom', 'Custom timer duration (minutes)')}
            <input
              type="number"
              min="1"
              max="180"
              value={currentWidgets.timerDurationMinutes || 25}
              onChange={e =>
                onUpdateConfig({
                  ...config,
                  widgets: {
                    ...currentWidgets,
                    timerDurationMinutes: Math.min(180, Math.max(1, Number(e.target.value) || 1)),
                  },
                })
              }
              className="mt-1 w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
