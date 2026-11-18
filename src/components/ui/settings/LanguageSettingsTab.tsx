import React from 'react';
import { Check } from 'lucide-react';
import { UserConfig } from '../../../types/tool';
import { SupportedLanguage, useI18n } from '../../../i18n/context';
import { LanguageFlagIcon } from '../LanguageFlagIcon';

interface LanguageSettingsTabProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
}

const LANGUAGES: Array<{ code: SupportedLanguage; label: string; flag: string; sub: string }> = [
  { code: 'cs', label: 'Čeština', flag: '🇨🇿', sub: 'Czech' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', sub: 'Russian' },
  { code: 'en', label: 'English', flag: '🇬🇧', sub: 'Universal' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', sub: 'German' },
  { code: 'es', label: 'Español', flag: '🇪🇸', sub: 'Spanish' },
];

export const LanguageSettingsTab: React.FC<LanguageSettingsTabProps> = ({
  config,
  onUpdateConfig,
}) => {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">
          {t('select_language', 'Select Interface Language')}
        </h3>
        <p className="text-xs text-slate-400">
          {t('language_desc', 'OmniDesk supports 5 fully localized languages.')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LANGUAGES.map(lang => {
          const isSelected = language === lang.code;
          return (
            <div
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                onUpdateConfig({
                  ...config,
                  language: lang.code,
                });
              }}
              className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <LanguageFlagIcon code={lang.code} className="w-7 h-5 rounded-sm shrink-0 shadow-sm" />
                <div>
                  <span className="text-xs font-semibold text-white block">{lang.label}</span>
                  <span className="text-[10px] text-slate-400 block">
                    {t(`lang_name_${lang.code}`, lang.sub)}
                  </span>
                </div>
              </div>
              {isSelected && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
