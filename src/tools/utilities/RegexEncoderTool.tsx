import React, { useState, useId } from 'react';
import { Code2, Check, Copy, AlertCircle, Sparkles } from 'lucide-react';

export const RegexEncoderTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'regex' | 'base64' | 'url'>('regex');

  // Regex state
  const [pattern, setPattern] = useState<string>('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})');
  const [flags, setFlags] = useState<{ g: boolean; i: boolean; m: boolean }>({ g: true, i: true, m: false });
  const [testText, setTestText] = useState<string>(
    'Kontaktujte nás na podpora@omnidesk.app nebo obchod@firma.cz pro více informací.'
  );

  // Base64 state
  const [base64Input, setBase64Input] = useState<string>('OmniDesk Tauri Platform');
  const [base64Output, setBase64Output] = useState<string>('');
  const [isBase64Encode, setIsBase64Encode] = useState<boolean>(true);

  // URL Encode state
  const [urlInput, setUrlInput] = useState<string>('https://omnidesk.app/search?query=český text & kód=100%');
  const [urlOutput, setUrlOutput] = useState<string>('');

  const [copied, setCopied] = useState<boolean>(false);
  const regexPatternId = useId();
  const regexTextId = useId();
  const base64InputId = useId();
  const urlInputId = useId();

  // Test Regex
  let regexMatches: Array<{ match: string; index: number; groups: string[] }> = [];
  let regexError: string | null = null;

  try {
    const flagStr = (flags.g ? 'g' : '') + (flags.i ? 'i' : '') + (flags.m ? 'm' : '');
    const re = new RegExp(pattern, flagStr);
    if (flags.g) {
      let m;
      while ((m = re.exec(testText)) !== null) {
        regexMatches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } else {
      const m = re.exec(testText);
      if (m) {
        regexMatches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
        });
      }
    }
  } catch (err: unknown) {
    regexError = err instanceof Error ? err.message : 'Neplatný regulární výraz';
  }

  // Base64 transform
  const handleBase64 = (encode: boolean) => {
    setIsBase64Encode(encode);
    try {
      if (encode) {
        setBase64Output(btoa(unescape(encodeURIComponent(base64Input))));
      } else {
        setBase64Output(decodeURIComponent(escape(atob(base64Input))));
      }
    } catch {
      setBase64Output('Chyba: Neplatný Base64 řetězec');
    }
  };

  // URL transform
  const handleUrl = (encode: boolean) => {
    try {
      if (encode) {
        setUrlOutput(encodeURIComponent(urlInput));
      } else {
        setUrlOutput(decodeURIComponent(urlInput));
      }
    } catch {
      setUrlOutput('Chyba při dekódování URL');
    }
  };

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">RegEx Tester & Base64 / URL Kódovač</h2>
          <p className="text-sm text-slate-400 mt-1">
            Testování regulárních výrazů se skupinami a obousměrné kódování dat.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('regex')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'regex' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            RegEx Tester
          </button>
          <button
            onClick={() => { setActiveTab('base64'); handleBase64(true); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'base64' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Base64
          </button>
          <button
            onClick={() => { setActiveTab('url'); handleUrl(true); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            URL Encoder
          </button>
        </div>
      </div>

      {/* RegEx Tab */}
      {activeTab === 'regex' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={regexPatternId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Regulární výraz (RegEx Pattern)
              </label>

              {/* Flags checkboxes */}
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags.g}
                    onChange={e => setFlags({ ...flags, g: e.target.checked })}
                    className="rounded bg-slate-950 text-indigo-600"
                  />
                  <span className="font-mono">g (globální)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags.i}
                    onChange={e => setFlags({ ...flags, i: e.target.checked })}
                    className="rounded bg-slate-950 text-indigo-600"
                  />
                  <span className="font-mono">i (ignore case)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags.m}
                    onChange={e => setFlags({ ...flags, m: e.target.checked })}
                    className="rounded bg-slate-950 text-indigo-600"
                  />
                  <span className="font-mono">m (multiline)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-slate-500">/</span>
              <input
                id={regexPatternId}
                type="text"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-lg font-mono text-slate-500">/</span>
              <span className="text-xs font-mono text-slate-400">
                {(flags.g ? 'g' : '') + (flags.i ? 'i' : '') + (flags.m ? 'm' : '')}
              </span>
            </div>

            {regexError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regexError}</span>
              </div>
            )}
          </div>

          {/* Test String */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={regexTextId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Testovací textový řetězec
              </label>
              <span className="text-xs font-mono text-emerald-400">
                Nalezeno {regexMatches.length} shod
              </span>
            </div>
            <textarea
              id={regexTextId}
              value={testText}
              onChange={e => setTestText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Matches list */}
          {regexMatches.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Nalezené shody a zachycené skupiny (Capture Groups)
              </span>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {regexMatches.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-400 font-mono">
                        Shoda #{idx + 1}: "{m.match}"
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">Index: {m.index}</span>
                    </div>
                    {m.groups.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {m.groups.map((g, gIdx) => (
                          <span
                            key={gIdx}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                          >
                            Skupina {gIdx + 1}: {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Base64 Tab */}
      {activeTab === 'base64' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBase64(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Zakódovat do Base64
            </button>
            <button
              onClick={() => handleBase64(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Dekódovat z Base64
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor={base64InputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Vstup</label>
              <textarea
                id={base64InputId}
                value={base64Input}
                onChange={e => setBase64Input(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Výsledek</span>
                <button
                  onClick={() => copyResult(base64Output)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Zkopírováno' : 'Kopírovat'}
                </button>
              </div>
              <textarea
                readOnly
                value={base64Output}
                rows={6}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 select-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* URL Tab */}
      {activeTab === 'url' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUrl(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              URL Encode
            </button>
            <button
              onClick={() => handleUrl(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              URL Decode
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor={urlInputId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Vstupní URL</label>
              <textarea
                id={urlInputId}
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Výsledek</span>
                <button
                  onClick={() => copyResult(urlOutput)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Zkopírováno' : 'Kopírovat'}
                </button>
              </div>
              <textarea
                readOnly
                value={urlOutput}
                rows={6}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 select-all"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
