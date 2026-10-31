import React, { useState, useEffect, useRef, useId } from 'react';
import {
  FileText,
  Download,
  Upload,
  Copy,
  Check,
  Search,
  RotateCcw,
  Sparkles,
  AlignLeft,
  Type,
  Trash2,
  Save,
  Clock,
  CheckCircle2,
  FilePlus,
  HelpCircle,
  WrapText,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

const DRAFT_STORAGE_KEY = 'omnidesk_text_editor_draft_v1';
const FILENAME_STORAGE_KEY = 'omnidesk_text_editor_filename_v1';

export const TextEditorTool: React.FC = () => {
  const { t } = useI18n();

  // File state
  const [fileName, setFileName] = useState(() => {
    return localStorage.getItem(FILENAME_STORAGE_KEY) || 'dokument.txt';
  });
  const [content, setContent] = useState(() => {
    return (
      localStorage.getItem(DRAFT_STORAGE_KEY) ||
      '# OmniDesk Textový Dokument\n\nTento textový editor funguje 100% offline přímo na vašem zařízení.\nMůžete vytvářet nové .txt soubory, otevírat existující z disku a ukládat je zpět.\n\n- Podpora UTF-8 češtiny i dalších jazyků\n- Vyhledávání a nahrazování\n- Transformace textu (velká/malá písmena, řazení řádků)\n- Živá statistika slov a znaků'
    );
  });

  // Editor configuration
  const [wordWrap, setWordWrap] = useState(true);
  const [isMonospace, setIsMonospace] = useState(true);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedNotification, setSavedNotification] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchInputId = useId();
  const replaceInputId = useId();

  // Auto-save draft on changes
  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, content);
  }, [content]);

  useEffect(() => {
    localStorage.setItem(FILENAME_STORAGE_KEY, fileName);
  }, [fileName]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileName, content]);

  // Document statistics
  const linesCount = content.split('\n').length;
  const charsCount = content.length;
  const charsNoSpacesCount = content.replace(/\s/g, '').length;
  const wordsCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const bytesCount = new Blob([content]).size;
  const estimatedReadTime = Math.max(1, Math.ceil(wordsCount / 200));

  // File download as .txt
  const downloadFile = () => {
    const safeName = fileName.trim() ? (fileName.includes('.') ? fileName : `${fileName}.txt`) : 'dokument.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.click();
    URL.revokeObjectURL(url);

    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  // Copy full content
  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open existing text file from host
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setContent(text || '');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Create clean new file
  const handleNewFile = () => {
    if (content.trim() && !window.confirm(t('confirm_new_file', 'Vytvořit nový soubor? Neuložené změny v textu budou přepsány.'))) {
      return;
    }
    setContent('');
    setFileName('novy_soubor.txt');
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Find & Replace functions
  const handleReplaceNext = () => {
    if (!searchQuery) return;
    const flags = matchCase ? '' : 'i';
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    setContent(prev => prev.replace(regex, replaceQuery));
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    setContent(prev => prev.replace(regex, replaceQuery));
  };

  // Text transformations
  const applyTransform = (type: 'upper' | 'lower' | 'title' | 'trim' | 'sort' | 'dedup' | 'timestamp' | 'numbering') => {
    switch (type) {
      case 'upper':
        setContent(prev => prev.toUpperCase());
        break;
      case 'lower':
        setContent(prev => prev.toLowerCase());
        break;
      case 'title':
        setContent(prev =>
          prev.replace(/\b\w/g, char => char.toUpperCase())
        );
        break;
      case 'trim':
        setContent(prev =>
          prev
            .split('\n')
            .filter(line => line.trim().length > 0)
            .join('\n')
        );
        break;
      case 'sort':
        setContent(prev =>
          prev
            .split('\n')
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .join('\n')
        );
        break;
      case 'dedup':
        setContent(prev => Array.from(new Set(prev.split('\n'))).join('\n'));
        break;
      case 'numbering':
        setContent(prev =>
          prev
            .split('\n')
            .map((line, idx) => `${idx + 1}. ${line}`)
            .join('\n')
        );
        break;
      case 'timestamp': {
        const now = new Date().toLocaleString();
        setContent(prev => `${prev}\n\n[Záznam: ${now}]\n`);
        break;
      }
    }
  };

  // Generate line numbers column
  const lineNumbers = Array.from({ length: Math.max(1, linesCount) }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_text_editor_title', 'Textový Editor & Poznámkový blok (.txt)')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              100% Offline UTF-8
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'tool_text_editor_desc',
              'Vytváření, úprava a stahování textových souborů bez serveru. Podpora vyhledávání, nahrazování, počítadla slov a formátovacích utilit.'
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleNewFile}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            title="Nový prázdný soubor"
          >
            <FilePlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nový soubor</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            title="Otevřít .txt/.md soubor z počítače"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Otevřít soubor</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.text,.log,.json,.csv,.sql,.js,.ts"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={copyContent}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Zkopírováno' : 'Kopírovat vše'}</span>
          </button>

          <button
            onClick={downloadFile}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
            title="Uložit a stáhnout soubor na disk (Ctrl+S)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Stáhnout .txt</span>
          </button>
        </div>
      </div>

      {/* Editor Workspace Card */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden shadow-xl flex flex-col">
        {/* Editor Top Toolbar */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filename input */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="nazev_souboru.txt"
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-md font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
              title="Název souboru"
            />
          </div>

          {/* Quick Toolbar Operations */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowFindReplace(prev => !prev)}
              className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1 ${
                showFindReplace
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Hledat & Nahradit (Ctrl+F)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hledat</span>
            </button>

            <button
              onClick={() => setWordWrap(prev => !prev)}
              className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1 ${
                wordWrap
                  ? 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Zalamování řádků"
            >
              <WrapText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zalamovat</span>
            </button>

            <button
              onClick={() => setIsMonospace(prev => !prev)}
              className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1 ${
                isMonospace
                  ? 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Přepnout písmo (Monospace / Proporcionální)"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMonospace ? 'Mono' : 'Sans'}</span>
            </button>

            {/* Transformations Dropdown / Buttons */}
            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={() => applyTransform('upper')}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white"
              title="PŘEVÉST NA VELKÁ PÍSMENA"
            >
              AA
            </button>

            <button
              onClick={() => applyTransform('lower')}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white"
              title="převést na malá písmena"
            >
              aa
            </button>

            <button
              onClick={() => applyTransform('trim')}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white hidden md:inline"
              title="Odstranit prázdné řádky"
            >
              Vyčistit prázdné
            </button>

            <button
              onClick={() => applyTransform('sort')}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white hidden md:inline"
              title="Seřadit řádky abecedně (A-Z)"
            >
              A-Z
            </button>

            <button
              onClick={() => applyTransform('timestamp')}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
              title="Vložit časové razítko"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              onClick={() => setContent('')}
              className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400"
              title="Vymazat celý text"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Find & Replace Bar (Collapsible) */}
        {showFindReplace && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs animate-fade-in">
            <div className="flex items-center gap-1.5">
              <label htmlFor={searchInputId} className="sr-only">
                Hledat text
              </label>
              <input
                id={searchInputId}
                type="text"
                placeholder="Hledat text..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor={replaceInputId} className="sr-only">
                Nahradit textem
              </label>
              <input
                id={replaceInputId}
                type="text"
                placeholder="Nahradit čím..."
                value={replaceQuery}
                onChange={e => setReplaceQuery(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMatchCase(prev => !prev)}
                className={`px-2 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  matchCase
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Rozlišovat velikost písmen (Aa)"
              >
                Aa
              </button>

              <button
                onClick={handleReplaceNext}
                disabled={!searchQuery}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium"
              >
                Nahradit
              </button>

              <button
                onClick={handleReplaceAll}
                disabled={!searchQuery}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium shadow"
              >
                Nahradit vše
              </button>
            </div>
          </div>
        )}

        {/* Textarea with synced Line Numbers */}
        <div className="relative flex flex-1 min-h-[460px] bg-slate-950 font-mono text-sm">
          {/* Line Numbers Column */}
          <div
            ref={lineNumbersRef}
            className="w-12 sm:w-14 py-4 pr-3 pl-2 bg-slate-950/90 border-r border-slate-800/80 text-right select-none text-slate-600 text-xs overflow-hidden"
          >
            {lineNumbers.map(n => (
              <div key={n} className="leading-6">
                {n}
              </div>
            ))}
          </div>

          {/* Core Text Input */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onScroll={handleScroll}
            placeholder="Začněte psát nebo vložte text..."
            spellCheck={false}
            className={`flex-1 p-4 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none resize-none leading-6 min-h-[460px] ${
              wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
            } ${isMonospace ? 'font-mono' : 'font-sans'}`}
          />
        </div>

        {/* Status & Statistics Footer */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Řádků: <strong className="text-white font-mono">{linesCount.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              Slov: <strong className="text-white font-mono">{wordsCount.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              Znaků: <strong className="text-white font-mono">{charsCount.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              Velikost: <strong className="text-white font-mono">{(bytesCount / 1024).toFixed(1)} KB</strong>
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Čas čtení: ~{estimatedReadTime} min
            </span>
          </div>

          <div className="flex items-center gap-2">
            {savedNotification ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Soubor úspěšně stažen!
              </span>
            ) : (
              <span className="text-slate-500 font-mono text-[10px]">
                Automaticky ukládáno do lokální paměti
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
