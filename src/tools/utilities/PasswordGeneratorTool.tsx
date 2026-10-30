import React, { useState, useId } from 'react';
import { KeyRound, RefreshCw, Copy, Check, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const WORDS = [
  'alfa', 'delta', 'galaxy', 'falcon', 'matrix', 'silver', 'orbit', 'quantum',
  'vector', 'zenith', 'pulse', 'cipher', 'nexus', 'beacon', 'titan', 'shadow',
  'crystal', 'aurora', 'vertex', 'shield', 'phoenix', 'solaris', 'vortex', 'echo',
  'hvezda', 'strom', 'kamen', 'reka', 'slunce', 'mesic', 'zamek', 'les', 'hora'
];

export const PasswordGeneratorTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'random' | 'passphrase'>('random');
  const [length, setLength] = useState<number>(18);
  const [includeUpper, setIncludeUpper] = useState<boolean>(true);
  const [includeLower, setIncludeLower] = useState<boolean>(true);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(4);
  const [separator, setSeparator] = useState<string>('-');

  const [password, setPassword] = useState<string>('k8#M9x$vL2!pQ7*wZ5');
  const [copied, setCopied] = useState<boolean>(false);

  const lengthId = useId();
  const wordCountId = useId();
  const separatorId = useId();

  const generatePassword = () => {
    if (mode === 'passphrase') {
      const selectedWords: string[] = [];
      const array = new Uint32Array(wordCount);
      crypto.getRandomValues(array);
      for (let i = 0; i < wordCount; i++) {
        const idx = array[i] % WORDS.length;
        selectedWords.push(WORDS[idx]);
      }
      setPassword(selectedWords.join(separator));
      return;
    }

    let chars = '';
    if (includeLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (includeUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) chars += '0123456789';
    if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (excludeAmbiguous) {
      chars = chars.replace(/[il1Lo0O]/g, '');
    }

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    setPassword(result);
  };

  // Calculate entropy
  let poolSize = 0;
  if (mode === 'passphrase') {
    poolSize = WORDS.length;
  } else {
    if (includeLower) poolSize += 26;
    if (includeUpper) poolSize += 26;
    if (includeNumbers) poolSize += 10;
    if (includeSymbols) poolSize += 30;
  }
  const entropy = mode === 'passphrase' 
    ? Math.round(wordCount * Math.log2(WORDS.length))
    : Math.round(length * Math.log2(Math.max(2, poolSize)));

  const getStrengthLabel = () => {
    if (entropy < 40) return { label: t('pwd_weak', 'Slabé'), color: 'text-red-400', bg: 'bg-red-500' };
    if (entropy < 65) return { label: t('pwd_good', 'Dobré'), color: 'text-amber-400', bg: 'bg-amber-500' };
    if (entropy < 90) return { label: t('pwd_very_strong', 'Velmi silné'), color: 'text-emerald-400', bg: 'bg-emerald-500' };
    return { label: t('pwd_military_grade', 'Vojenská síla (Nerozlousknutelné)'), color: 'text-indigo-400', bg: 'bg-indigo-500' };
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = getStrengthLabel();

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('tool_password_gen_title', 'Generátor Bezpečných Hesel')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('password_gen_desc', 'Kryptograficky bezpečné generování náhodných hesel (CSPRNG) a zapamatovatelných víceslovných frází.')}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setMode('random')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'random' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('random_chars_mode', 'Náhodné znaky')}
          </button>
          <button
            onClick={() => setMode('passphrase')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'passphrase' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('passphrase_mode', 'Slovní fráze (Passphrase)')}
          </button>
        </div>
      </div>

      {/* Password display card */}
      <div className="p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-wider break-all select-all">
            {password}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={generatePassword}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={t('generate_new_pwd', 'Vygenerovat nové heslo')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={copyPassword}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? t('copied', 'Zkopírováno') : t('copy', 'Kopírovat')}
            </button>
          </div>
        </div>

        {/* Strength meter */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              {t('password_strength', 'Síla hesla')}: <strong className={strength.color}>{strength.label}</strong>
            </span>
            <span className="font-mono text-slate-400 tabular-nums">
              {t('entropy', 'Entropie')}: {entropy} {t('bits', 'bitů')}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (entropy / 120) * 100)}%` }}
              className={`h-full ${strength.bg} transition-all duration-300`}
            />
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          {t('generator_parameters', 'Parametry generátoru')}
        </span>

        {mode === 'random' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label htmlFor={lengthId} className="text-slate-300">{t('password_length', 'Délka hesla:')}</label>
                <span className="font-mono text-indigo-400 font-bold">{length} {t('chars_short', 'znaků')}</span>
              </div>
              <input
                id={lengthId}
                type="range"
                min="8"
                max="64"
                value={length}
                onChange={e => setLength(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={includeUpper}
                  onChange={e => setIncludeUpper(e.target.checked)}
                  className="rounded bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span>{t('include_uppercase', 'Velká písmena (A–Z)')}</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={includeLower}
                  onChange={e => setIncludeLower(e.target.checked)}
                  className="rounded bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span>{t('include_lowercase', 'Malá písmena (a–z)')}</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={e => setIncludeNumbers(e.target.checked)}
                  className="rounded bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span>{t('include_numbers', 'Čísla (0–9)')}</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={e => setIncludeSymbols(e.target.checked)}
                  className="rounded bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span>{t('include_symbols', 'Symboly (!@#$%)')}</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={e => setExcludeAmbiguous(e.target.checked)}
                  className="rounded bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span>{t('exclude_ambiguous', 'Vynechat nejednoznačné (0, O, l, 1)')}</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <label htmlFor={wordCountId} className="text-slate-300">{t('words_count', 'Počet slov:')}</label>
                <span className="font-mono text-indigo-400 font-bold">{wordCount}</span>
              </div>
              <input
                id={wordCountId}
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={e => setWordCount(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor={separatorId} className="text-xs text-slate-300 block">{t('words_separator', 'Oddělovač slov:')}</label>
              <select
                id={separatorId}
                value={separator}
                onChange={e => setSeparator(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="-">{t('hyphen', 'Pomlčka (-)')}</option>
                <option value=".">{t('dot', 'Tečka (.)')}</option>
                <option value="_">{t('underscore', 'Podtržítko (_)')}</option>
                <option value=" ">{t('space', 'Mezera ( )')}</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
