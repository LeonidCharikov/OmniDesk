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
  AlignCenter,
  AlignRight,
  Type,
  Trash2,
  Save,
  Clock,
  CheckCircle2,
  FilePlus,
  HelpCircle,
  WrapText,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  Edit3,
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
      '# OmniDesk Textový Dokument\n\nTento textový editor funguje 100% offline přímo na vašem zařízení.\nMůžete vytvářet nové .txt soubory, otevírat existující z disku a ukládat je zpět.\n\n## Formátování textu\n- Zvýrazněte libovolný úsek textu a aplikujte VELKÁ či malá písmena jen na vybranou část\n- Použijte tlačítka H1, H2, H3 pro vložení nadpisů\n- Nastavte zarovnání (vlevo, na střed, vpravo)\n- Měňte velikost písma celého editoru nebo aplikujte rozměr na vybraný text'
    );
  });

  // Editor configuration
  const [wordWrap, setWordWrap] = useState(true);
  const [isMonospace, setIsMonospace] = useState(true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [baseFontSize, setBaseFontSize] = useState<number>(14);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
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

  // Apply letter casing specifically to selected text (or full text if none selected)
  const applyCaseTransform = (type: 'upper' | 'lower' | 'title') => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end) {
        // Selection-specific transformation
        const selected = content.substring(start, end);
        let transformed = selected;
        if (type === 'upper') transformed = selected.toUpperCase();
        else if (type === 'lower') transformed = selected.toLowerCase();
        else if (type === 'title') transformed = selected.replace(/\b\w/g, char => char.toUpperCase());

        const nextContent = content.substring(0, start) + transformed + content.substring(end);
        setContent(nextContent);

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + transformed.length);
        }, 0);
        return;
      }
    }

    // Fallback: apply to entire content
    if (type === 'upper') setContent(prev => prev.toUpperCase());
    else if (type === 'lower') setContent(prev => prev.toLowerCase());
    else if (type === 'title') setContent(prev => prev.replace(/\b\w/g, char => char.toUpperCase()));
  };

  // Apply Headings (H1, H2, H3, P)
  const applyHeading = (level: 1 | 2 | 3 | 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const prefix = level === 1 ? '# ' : level === 2 ? '## ' : level === 3 ? '### ' : '';

    if (start !== end) {
      // Apply to selected lines
      const selected = content.substring(start, end);
      const transformed = selected
        .split('\n')
        .map(line => {
          const stripped = line.replace(/^#{1,6}\s*/, '');
          return prefix ? `${prefix}${stripped}` : stripped;
        })
        .join('\n');

      const nextContent = content.substring(0, start) + transformed + content.substring(end);
      setContent(nextContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + transformed.length);
      }, 0);
    } else {
      // Apply to the current line where cursor is located
      const lastNewline = content.lastIndexOf('\n', start - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const nextNewline = content.indexOf('\n', start);
      const lineEnd = nextNewline === -1 ? content.length : nextNewline;

      const currentLine = content.substring(lineStart, lineEnd);
      const strippedLine = currentLine.replace(/^#{1,6}\s*/, '');
      const newLine = prefix ? `${prefix}${strippedLine}` : strippedLine;

      const nextContent = content.substring(0, lineStart) + newLine + content.substring(lineEnd);
      setContent(nextContent);
      setTimeout(() => {
        textarea.focus();
        const newCursor = lineStart + newLine.length;
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    }
  };

  // Apply specific font size to selected text (e.g. wrapped tag) or update base font size
  const applyFontSizeToText = (sizePx: number) => {
    const textarea = textareaRef.current;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);

      // Check if already wrapped in font-size span
      const tagWrapped = `<span style="font-size: ${sizePx}px">${selected.replace(/<span style="font-size: \d+px">([\s\S]*?)<\/span>/g, '$1')}</span>`;
      const nextContent = content.substring(0, start) + tagWrapped + content.substring(end);
      setContent(nextContent);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + tagWrapped.length);
      }, 0);
    } else {
      // Change editor base font size
      setBaseFontSize(sizePx);
    }
  };

  // Text general utilities
  const applyGeneralTransform = (type: 'trim' | 'sort' | 'dedup' | 'timestamp' | 'numbering') => {
    switch (type) {
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
        setContent(prev => `${prev}\n\n[${t('record_timestamp', 'Záznam')}: ${now}]\n`);
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
            title={t('new_file_tooltip', 'Nový prázdný soubor')}
          >
            <FilePlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('new_file', 'Nový soubor')}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            title={t('open_file_tooltip', 'Otevřít .txt/.md soubor z disku')}
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('open_file', 'Otevřít soubor')}</span>
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
            <span>{copied ? t('copied', 'Zkopírováno') : t('copy_all', 'Kopírovat vše')}</span>
          </button>

          <button
            onClick={downloadFile}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
            title={t('download_file_tooltip', 'Uložit a stáhnout soubor na disk (Ctrl+S)')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('download_txt', 'Stáhnout .txt')}</span>
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
            {/* View Mode Toggle: Edit / Preview */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === 'edit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title={t('editor_mode_edit', 'Režim psaní')}
              >
                <Edit3 className="w-3 h-3" />
                <span className="hidden sm:inline">{t('editor_tab_write', 'Psát')}</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title={t('editor_preview_toggle', 'Náhled formátování')}
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">{t('editor_tab_preview', 'Náhled')}</span>
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Headings group */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => applyHeading(1)}
                className="px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] font-bold text-indigo-300 hover:text-white"
                title={t('editor_heading_h1', 'Nadpis H1 (# text)')}
              >
                H1
              </button>
              <button
                onClick={() => applyHeading(2)}
                className="px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] font-bold text-indigo-300 hover:text-white"
                title={t('editor_heading_h2', 'Nadpis H2 (## text)')}
              >
                H2
              </button>
              <button
                onClick={() => applyHeading(3)}
                className="px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] font-bold text-indigo-300 hover:text-white"
                title={t('editor_heading_h3', 'Nadpis H3 (### text)')}
              >
                H3
              </button>
              <button
                onClick={() => applyHeading(0)}
                className="px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] text-slate-400 hover:text-white"
                title={t('editor_heading_p', 'Běžný odstavec (P)')}
              >
                P
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Text Alignment buttons */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => setTextAlign('left')}
                className={`p-1 rounded text-xs transition-colors ${
                  textAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={t('editor_align_left', 'Zarovnat vlevo')}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('center')}
                className={`p-1 rounded text-xs transition-colors ${
                  textAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={t('editor_align_center', 'Zarovnat na střed')}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('right')}
                className={`p-1 rounded text-xs transition-colors ${
                  textAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={t('editor_align_right', 'Zarovnat vpravo')}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Selection-aware letter transforms: AA, aa, Aa */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => applyCaseTransform('upper')}
                className="px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] font-mono font-bold text-slate-300 hover:text-white"
                title={t('editor_upper_case', 'VELKÁ PÍSMENA (výběr či vše)')}
              >
                AA
              </button>
              <button
                onClick={() => applyCaseTransform('lower')}
                className="px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] font-mono text-slate-300 hover:text-white"
                title={t('editor_lower_case', 'malá písmena (výběr či vše)')}
              >
                aa
              </button>
              <button
                onClick={() => applyCaseTransform('title')}
                className="px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] font-mono text-slate-300 hover:text-white"
                title={t('editor_title_case', 'První Velká Písmena')}
              >
                Aa
              </button>
            </div>

            {/* Font Size Selector / Applier */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Type className="w-3 h-3 text-indigo-400 shrink-0" />
              <select
                value={baseFontSize}
                onChange={e => applyFontSizeToText(Number(e.target.value))}
                className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
                title={t('editor_font_size_tooltip', 'Změnit velikost písma (pro vybraný text či celý editor)')}
              >
                <option value={12} className="bg-slate-900">12px</option>
                <option value={14} className="bg-slate-900">14px</option>
                <option value={16} className="bg-slate-900">16px</option>
                <option value={18} className="bg-slate-900">18px</option>
                <option value={20} className="bg-slate-900">20px</option>
                <option value={24} className="bg-slate-900">24px</option>
                <option value={32} className="bg-slate-900">32px</option>
              </select>
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Search & Replace */}
            <button
              onClick={() => setShowFindReplace(prev => !prev)}
              className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1 ${
                showFindReplace
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title={t('search_replace_shortcut', 'Hledat & Nahradit (Ctrl+F)')}
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Wrap & Font switcher */}
            <button
              onClick={() => setWordWrap(prev => !prev)}
              className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1 ${
                wordWrap
                  ? 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={t('word_wrap', 'Zalamování řádků')}
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsMonospace(prev => !prev)}
              className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1 ${
                isMonospace
                  ? 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={t('toggle_font_family', 'Přepnout písmo (Monospace / Proporcionální)')}
            >
              <span className="font-mono text-[10px]">{isMonospace ? 'Mono' : 'Sans'}</span>
            </button>

            {/* Timestamp & Clear */}
            <button
              onClick={() => applyGeneralTransform('timestamp')}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
              title={t('insert_timestamp', 'Vložit časové razítko')}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              onClick={() => setContent('')}
              className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400"
              title={t('clear_all_text', 'Vymazat celý text')}
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
                {t('search_text_label', 'Hledat text')}
              </label>
              <input
                id={searchInputId}
                type="text"
                placeholder={t('search_text_placeholder', 'Hledat text...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor={replaceInputId} className="sr-only">
                {t('replace_text_label', 'Nahradit textem')}
              </label>
              <input
                id={replaceInputId}
                type="text"
                placeholder={t('replace_text_placeholder', 'Nahradit čím...')}
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
                title={t('case_sensitive', 'Rozlišovat velikost písmen (Aa)')}
              >
                Aa
              </button>

              <button
                onClick={handleReplaceNext}
                disabled={!searchQuery}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium"
              >
                {t('replace_btn', 'Nahradit')}
              </button>

              <button
                onClick={handleReplaceAll}
                disabled={!searchQuery}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium shadow"
              >
                {t('replace_all_btn', 'Nahradit vše')}
              </button>
            </div>
          </div>
        )}

        {/* Main Editor or Formatted Preview */}
        {viewMode === 'edit' ? (
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
              placeholder={t('editor_start_typing', 'Začněte psát nebo vložte text...')}
              spellCheck={false}
              style={{ fontSize: `${baseFontSize}px`, lineHeight: 1.6 }}
              className={`flex-1 p-4 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none resize-none min-h-[460px] ${
                wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
              } ${isMonospace ? 'font-mono' : 'font-sans'} ${
                textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'
              }`}
            />
          </div>
        ) : (
          /* Formatted Preview Mode */
          <div
            style={{ fontSize: `${baseFontSize}px` }}
            className={`p-6 bg-slate-950 text-slate-100 min-h-[460px] overflow-y-auto space-y-4 leading-relaxed ${
              isMonospace ? 'font-mono' : 'font-sans'
            } ${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'}`}
          >
            {content.split('\n\n').map((block, bIdx) => {
              if (block.startsWith('### ')) {
                return (
                  <h3 key={bIdx} className="text-lg font-bold text-indigo-300 mt-2">
                    {block.replace(/^###\s*/, '')}
                  </h3>
                );
              }
              if (block.startsWith('## ')) {
                return (
                  <h2 key={bIdx} className="text-xl font-bold text-white border-b border-slate-800/80 pb-1 mt-3">
                    {block.replace(/^##\s*/, '')}
                  </h2>
                );
              }
              if (block.startsWith('# ')) {
                return (
                  <h1 key={bIdx} className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
                    {block.replace(/^#\s*/, '')}
                  </h1>
                );
              }
              // Paragraph with potential inline HTML span sizing
              return (
                <div
                  key={bIdx}
                  className="whitespace-pre-wrap text-slate-300"
                  dangerouslySetInnerHTML={{
                    __html: block
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/&lt;span style="font-size: (\d+)px"&gt;([\s\S]*?)&lt;\/span&gt;/g, '<span style="font-size: $1px" class="text-indigo-200 font-semibold">$2</span>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="text-slate-200">$1</em>'),
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Status & Statistics Footer */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {t('stat_lines', 'Řádků')}: <strong className="text-white font-mono">{linesCount.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              {t('stat_words', 'Slov')}: <strong className="text-white font-mono">{wordsCount.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              {t('stat_chars', 'Znaků')}: <strong className="text-white font-mono">{charsCount.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              {t('stat_size', 'Velikost')}: <strong className="text-white font-mono">{(bytesCount / 1024).toFixed(1)} KB</strong>
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {t('stat_read_time', 'Čas čtení')}: ~{estimatedReadTime} min
            </span>
          </div>

          <div className="flex items-center gap-2">
            {savedNotification ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('file_downloaded_success', 'Soubor úspěšně stažen!')}
              </span>
            ) : (
              <span className="text-slate-500 font-mono text-[10px]">
                {t('auto_saved_local', 'Automaticky ukládáno do lokální paměti')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
