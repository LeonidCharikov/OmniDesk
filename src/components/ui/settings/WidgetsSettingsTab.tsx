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

interface WidgetsSettingsTabProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
}

export const WidgetsSettingsTab: React.FC<WidgetsSettingsTabProps> = ({
  config,
  onUpdateConfig,
}) => {
  const { t, language } = useI18n();
  const currentWidgets = config.widgets || DEFAULT_WIDGETS_CONFIG;
  const selectedCities = currentWidgets.selectedCities?.length
    ? currentWidgets.selectedCities
    : [currentWidgets.selectedCity];
  const selectedFiats = currentWidgets.selectedFiats?.length
    ? currentWidgets.selectedFiats
    : [currentWidgets.selectedFiat];
  const selectedCryptos = currentWidgets.selectedCryptos?.length
    ? currentWidgets.selectedCryptos
    : [currentWidgets.selectedCrypto];

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

  const updateWidgetList = (
    key: 'selectedCities' | 'selectedFiats' | 'selectedCryptos',
    index: number,
    value: string
  ) => {
    const source =
      key === 'selectedCities' ? selectedCities : key === 'selectedFiats' ? selectedFiats : selectedCryptos;
    const updated = [...source];
    updated[index] = value;
    const next = { ...currentWidgets, [key]: updated };
    if (key === 'selectedCities' && index === 0) {
      next.selectedCity = value;
      next.selectedCityName = CITIES.find(city => city.id === value)?.name || 'Prague';
    }
    if (key === 'selectedFiats' && index === 0) next.selectedFiat = value;
    if (key === 'selectedCryptos' && index === 0) next.selectedCrypto = value;
    onUpdateConfig({ ...config, widgets: next });
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {t('selected_city_for_clock', 'Clock Cities')}
            </label>
            <div className="space-y-1">
              {Array.from({ length: 3 }, (_, index) => (
                <select
                  key={index}
                  value={selectedCities[index] || selectedCities[0]}
                  onChange={e => updateWidgetList('selectedCities', index, e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  {CITIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label.replace(c.name, CITY_NAMES[c.id]?.[language] || c.name)}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {t('selected_fiat', 'Tracked Fiat Currency')}
            </label>
            <div className="space-y-1">
              {Array.from({ length: 3 }, (_, index) => (
                <select
                  key={index}
                  value={selectedFiats[index] || selectedFiats[0]}
                  onChange={e => updateWidgetList('selectedFiats', index, e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  {FIATS.map(f => (
                    <option key={f.code} value={f.code}>
                      {CURRENCY_NAMES[f.code]?.[language] || f.name} ({f.code})
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {t('selected_crypto', 'Tracked Cryptocurrency')}
            </label>
            <div className="space-y-1">
              {Array.from({ length: 3 }, (_, index) => (
                <select
                  key={index}
                  value={selectedCryptos[index] || selectedCryptos[0]}
                  onChange={e => updateWidgetList('selectedCryptos', index, e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  {CRYPTOS.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ))}
              <label className="text-xs font-medium text-slate-300 sm:col-span-3">
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
                  className="mt-1 w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
