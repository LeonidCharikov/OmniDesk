import React, { createContext, useContext, useState, useEffect } from 'react';
import cs from '../locales/cs.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import ru from '../locales/ru.json';

import { autoTranslate } from './autoTranslate';

export type SupportedLanguage = 'cs' | 'en' | 'de' | 'es' | 'ru';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const LOCALES: Record<SupportedLanguage, Record<string, string>> = {
  cs: cs as Record<string, string>,
  en: en as Record<string, string>,
  de: de as Record<string, string>,
  es: es as Record<string, string>,
  ru: ru as Record<string, string>,
};

interface I18nContextType {
  language: SupportedLanguage;
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  currentLanguage: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('omnidesk_language') as SupportedLanguage;
      if (saved && ['cs', 'en', 'de', 'es', 'ru'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('omnidesk_language', lang);
    } catch {
      // ignore
    }
  };

  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    const langDict = LOCALES[language];
    let template = langDict && langDict[key];

    // If key not in target dictionary and language is not Czech, auto-translate!
    if (!template) {
      if (language !== 'cs') {
        const sourceText = fallback || (LOCALES.cs && LOCALES.cs[key]) || key;
        const autoTranslated = autoTranslate(sourceText, language);
        if (autoTranslated && autoTranslated !== sourceText) {
          template = autoTranslated;
        }
      }
    }

    if (!template) {
      const enDict = LOCALES.en;
      template = enDict && enDict[key];
    }
    if (!template) {
      const csDict = LOCALES.cs;
      template = csDict && csDict[key];
    }
    if (!template) {
      template = fallback || key;
      // Last chance auto-translate if fallback was plain Czech
      if (language !== 'cs') {
        template = autoTranslate(template, language);
      }
    }

    if (params) {
      for (const [pKey, pVal] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
    }

    return template;
  };

  return (
    <I18nContext.Provider value={{ language, currentLanguage: language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
