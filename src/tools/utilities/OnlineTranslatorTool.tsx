import React, { useState, useId } from 'react';
import { Globe, WifiOff, ArrowRightLeft, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  isOffline: boolean;
}

const PHRASE_DICTIONARY: Record<string, Record<string, string>> = {
  cs: {
    hello: 'Ahoj, jak se máš?',
    doc: 'Tento dokument byl bezpečně převeden v lokální aplikaci.',
    offline: 'Systém funguje plně offline bez nutnosti připojení k internetu.',
    tauri: 'Tauri je lehký multiplatformní framework pro tvorbu desktopových aplikací.',
  },
  en: {
    hello: 'Hello, how are you?',
    doc: 'This document was securely converted in a local application.',
    offline: 'The system functions fully offline without requiring an internet connection.',
    tauri: 'Tauri is a lightweight cross-platform framework for building desktop apps.',
  },
  de: {
    hello: 'Hallo, wie geht es dir?',
    doc: 'Dieses Dokument wurde in einer lokalen Anwendung sicher konvertiert.',
    offline: 'Das System funktioniert vollständig offline ohne Internetverbindung.',
    tauri: 'Tauri ist ein leichtgewichtiges plattformübergreifendes Framework für Desktop-Apps.',
  },
};

export const OnlineTranslatorTool: React.FC<Props> = ({ isOffline }) => {
  const [sourceLang, setSourceLang] = useState<'cs' | 'en' | 'de'>('cs');
  const [targetLang, setTargetLang] = useState<'cs' | 'en' | 'de'>('en');
  const [inputText, setInputText] = useState('Tento dokument byl bezpečně převeden v lokální aplikaci.');
  const [outputText, setOutputText] = useState('This document was securely converted in a local application.');
  const [isTranslating, setIsTranslating] = useState(false);

  const sourceLangId = useId();
  const targetLangId = useId();
  const sourceTextId = useId();

  const handleTranslate = () => {
    if (isOffline) return;
    setIsTranslating(true);
    setTimeout(() => {
      // Find matching dictionary template or mock realistic contextual translation
      const lower = inputText.toLowerCase().trim();
      let translation = '';
      if (lower.includes('ahoj') || lower.includes('hello') || lower.includes('hallo')) {
        translation = PHRASE_DICTIONARY[targetLang].hello;
      } else if (lower.includes('offline') || lower.includes('internet')) {
        translation = PHRASE_DICTIONARY[targetLang].offline;
      } else if (lower.includes('tauri') || lower.includes('desktop')) {
        translation = PHRASE_DICTIONARY[targetLang].tauri;
      } else {
        translation = `[Překlad do ${targetLang.toUpperCase()}]: ${inputText}`;
      }
      setOutputText(translation);
      setIsTranslating(false);
    }, 400);
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  if (isOffline) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Hybridní Překladač</h2>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Vyžaduje online připojení
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Ukázka hybridní architektury aplikace — online nástroj je v offline režimu bezpečně uzamčen.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-100">Nástroj je dočasně nedostupný</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Překladový engine vyžaduje externí API na cloudu. Protože jste v offline režimu (nebo máte zapnutou simulaci v horní liště), je tento modul pozastaven, aby nedocházelo k chybám.
            </p>
          </div>
          <div className="text-xs text-amber-300 font-mono">
            Všechny ostatní offline nástroje (převodník DOCX do PDF, kalkulačky, JSON) zůstávají plně funkční!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Hybridní Online Překladač</h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Online API aktivní
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Nástroj využívající online překladové služby s okamžitým náhledem.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <label htmlFor={sourceLangId} className="sr-only">Výchozí jazyk</label>
          <select
            id={sourceLangId}
            value={sourceLang}
            onChange={e => setSourceLang(e.target.value as 'cs' | 'en' | 'de')}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
          >
            <option value="cs">Čeština</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>

          <button
            onClick={swapLanguages}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Prohodit jazyky"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <label htmlFor={targetLangId} className="sr-only">Cílový jazyk</label>
          <select
            id={targetLangId}
            value={targetLang}
            onChange={e => setTargetLang(e.target.value as 'cs' | 'en' | 'de')}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
          >
            <option value="en">English</option>
            <option value="cs">Čeština</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isTranslating ? 'Překládám...' : 'Přeložit'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor={sourceTextId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Vstupní text
          </label>
          <textarea
            id={sourceTextId}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="w-full h-48 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Výsledek překladu
          </span>
          <div className="w-full h-48 px-4 py-3 bg-slate-900/30 border border-slate-800 rounded-xl text-sm text-slate-200 leading-relaxed overflow-y-auto">
            {outputText}
          </div>
        </div>
      </div>
    </div>
  );
};
