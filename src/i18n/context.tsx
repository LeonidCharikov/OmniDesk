import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import en from '../locales/en.json';

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

type LocaleDict = Record<string, string>;

const LOCALE_LOADERS: Record<Exclude<SupportedLanguage, 'en'>, () => Promise<{ default: LocaleDict }>> = {
  cs: () => import('../locales/cs.json'),
  de: () => import('../locales/de.json'),
  es: () => import('../locales/es.json'),
  ru: () => import('../locales/ru.json'),
};

const EN_DICT = en as LocaleDict;

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

function readSavedLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem('omnidesk_language') as SupportedLanguage;
    if (saved && ['cs', 'en', 'de', 'es', 'ru'].includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(readSavedLanguage);
  const [activeDict, setActiveDict] = useState<{ lang: SupportedLanguage; dict: LocaleDict }>({
    lang: 'en',
    dict: EN_DICT,
  });
  const autoTranslateRef = useRef<((text: string, targetLang: SupportedLanguage) => string) | null>(null);
  const autoTranslateLoadingRef = useRef(false);
  const [, setAutoTranslateVersion] = useState(0);

  useEffect(() => {
    if (language === 'en') {
      setActiveDict({ lang: 'en', dict: EN_DICT });
      return;
    }

    let cancelled = false;
    LOCALE_LOADERS[language]()
      .then(mod => {
        if (!cancelled) {
          setActiveDict({ lang: language, dict: mod.default });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActiveDict({ lang: 'en', dict: EN_DICT });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('omnidesk_language', lang);
    } catch {
      // ignore
    }
  }, []);

  const ensureAutoTranslate = useCallback(() => {
    if (autoTranslateRef.current || autoTranslateLoadingRef.current) return;
    autoTranslateLoadingRef.current = true;
    import('./autoTranslate')
      .then(mod => {
        autoTranslateRef.current = mod.autoTranslate;
        setAutoTranslateVersion(v => v + 1);
      })
      .catch(() => {
        autoTranslateLoadingRef.current = false;
      });
  }, []);

  const t = useCallback(
    (key: string, fallback?: string, params?: Record<string, string | number>): string => {
      const langDict = activeDict.lang === language ? activeDict.dict : undefined;
      let template = langDict && langDict[key];

      if (!template && language !== 'en') {
        template = EN_DICT[key];
      }

      if (!template) {
        if (language !== 'cs' && language !== 'en') {
          const sourceText = fallback || EN_DICT[key] || key;
          if (autoTranslateRef.current) {
            const autoTranslated = autoTranslateRef.current(sourceText, language);
            if (autoTranslated && autoTranslated !== sourceText) {
              template = autoTranslated;
            }
          } else {
            ensureAutoTranslate();
          }
        }
      }

      if (!template) {
        template = fallback || key;
        if (language !== 'cs' && language !== 'en' && autoTranslateRef.current) {
          template = autoTranslateRef.current(template, language);
        }
      }

      if (params) {
        for (const [pKey, pVal] of Object.entries(params)) {
          template = template.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }
      }

      return template;
    },
    [activeDict, ensureAutoTranslate, language]
  );

  return (
    <I18nContext.Provider value={{ language, currentLanguage: language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
