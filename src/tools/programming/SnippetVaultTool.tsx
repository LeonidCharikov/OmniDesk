import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  Plus,
  Search,
  Star,
  Terminal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { loadToolJson, saveToolJson } from '../../services/idbStorage';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { extractSnippetVariables, renderSnippetTemplate } from '../../utils/newTools.logic';

type SnippetLanguage = 'bash' | 'sql' | 'docker' | 'git' | 'typescript' | 'regex' | 'other';

interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  language: SnippetLanguage;
  tags: string[];
  code: string;
  favorite: boolean;
  updatedAt: number;
}

const STORAGE_KEY = 'omnidesk_snippet_vault_v1';

const LANGUAGES: SnippetLanguage[] = ['bash', 'sql', 'docker', 'git', 'typescript', 'regex', 'other'];

const STARTER_SNIPPETS: CodeSnippet[] = [
  {
    id: 'starter-git-squash',
    title: 'Interactive Rebase Last N Commits',
    description: 'Clean up or squash recent local commits before pushing a feature branch.',
    language: 'git',
    tags: ['rebase', 'squash', 'cleanup'],
    code: 'git rebase -i HEAD~{{count}}',
    favorite: true,
    updatedAt: 1730000000000,
  },
  {
    id: 'starter-docker-logs',
    title: 'Follow Container Logs with Tail',
    description: 'Stream the latest lines from a running Docker container with timestamps.',
    language: 'docker',
    tags: ['logs', 'debug', 'container'],
    code: 'docker logs -f --tail {{lines}} -t {{container_name}}',
    favorite: true,
    updatedAt: 1730000001000,
  },
  {
    id: 'starter-bash-find',
    title: 'Find & Replace in Files (Offline)',
    description: 'Search files matching a pattern and list matches with line numbers.',
    language: 'bash',
    tags: ['grep', 'search', 'cli'],
    code: 'grep -rnw "{{directory}}" -e "{{pattern}}" --exclude-dir=node_modules',
    favorite: false,
    updatedAt: 1730000002000,
  },
  {
    id: 'starter-sql-top',
    title: 'Top Records Grouped by Column',
    description: 'Aggregate counts per category and return the top N rows.',
    language: 'sql',
    tags: ['analytics', 'group-by', 'query'],
    code: 'SELECT {{group_col}}, COUNT(*) AS total\nFROM {{table_name}}\nGROUP BY {{group_col}}\nORDER BY total DESC\nLIMIT {{limit}};',
    favorite: false,
    updatedAt: 1730000003000,
  },
  {
    id: 'starter-ts-debounce',
    title: 'Typed Debounce Helper',
    description: 'Zero-dependency strict TypeScript debounce wrapper.',
    language: 'typescript',
    tags: ['helper', 'hooks', 'performance'],
    code: 'export function debounce<T extends (...args: never[]) => void>(fn: T, delayMs = {{delay_ms}}) {\n  let timer: ReturnType<typeof setTimeout> | undefined;\n  return (...args: Parameters<T>) => {\n    if (timer) clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delayMs);\n  };\n}',
    favorite: false,
    updatedAt: 1730000004000,
  },
  {
    id: 'starter-regex-semver',
    title: 'Semantic Version (SemVer) Pattern',
    description: 'Matches major.minor.patch with optional pre-release suffix.',
    language: 'regex',
    tags: ['semver', 'validation', 'version'],
    code: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$',
    favorite: false,
    updatedAt: 1730000005000,
  },
];

function isValidSnippetArray(data: unknown): data is CodeSnippet[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    item =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as CodeSnippet).id === 'string' &&
      typeof (item as CodeSnippet).title === 'string' &&
      typeof (item as CodeSnippet).code === 'string'
  );
}

export const SnippetVaultTool: React.FC = () => {
  const { t } = useI18n();
  const [snippets, setSnippets] = useState<CodeSnippet[]>(STARTER_SNIPPETS);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(STARTER_SNIPPETS[0].id);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<SnippetLanguage | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftLang, setDraftLang] = useState<SnippetLanguage>('bash');
  const [draftTags, setDraftTags] = useState('');
  const [draftCode, setDraftCode] = useState('');

  useEffect(() => {
    let active = true;
    loadToolJson<CodeSnippet[]>(STORAGE_KEY).then(saved => {
      if (!active) return;
      if (isValidSnippetArray(saved) && saved.length > 0) {
        setSnippets(saved);
        setSelectedId(saved[0].id);
      }
      setLoaded(true);
    });

    const piped = consumePendingToolPipe('snippet-vault');
    if (piped?.kind === 'text' && piped.text) {
      setIsEditing(true);
      setEditId(null);
      setDraftTitle('Imported Snippet');
      setDraftDesc('');
      setDraftLang('other');
      setDraftTags('imported');
      setDraftCode(piped.text);
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveToolJson(STORAGE_KEY, snippets).catch(() => {});
  }, [snippets, loaded]);

  const filteredSnippets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snippets
      .filter(s => (langFilter === 'all' ? true : s.language === langFilter))
      .filter(s => (onlyFavorites ? s.favorite : true))
      .filter(s => {
        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.tags.some(tag => tag.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
  }, [snippets, search, langFilter, onlyFavorites]);

  const activeSnippet = useMemo(
    () => snippets.find(s => s.id === selectedId) || filteredSnippets[0] || null,
    [snippets, selectedId, filteredSnippets]
  );

  const detectedVars = useMemo(
    () => (activeSnippet ? extractSnippetVariables(activeSnippet.code) : []),
    [activeSnippet]
  );

  const renderedCode = useMemo(
    () => (activeSnippet ? renderSnippetTemplate(activeSnippet.code, varValues) : ''),
    [activeSnippet, varValues]
  );

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(''), 2400);
  };

  const openNewEditor = () => {
    setEditId(null);
    setDraftTitle('');
    setDraftDesc('');
    setDraftLang('bash');
    setDraftTags('');
    setDraftCode('');
    setIsEditing(true);
  };

  const openEditFor = (snippet: CodeSnippet) => {
    setEditId(snippet.id);
    setDraftTitle(snippet.title);
    setDraftDesc(snippet.description);
    setDraftLang(snippet.language);
    setDraftTags(snippet.tags.join(', '));
    setDraftCode(snippet.code);
    setIsEditing(true);
  };

  const saveDraft = () => {
    const cleanTitle = draftTitle.trim();
    const cleanCode = draftCode.trim();
    if (!cleanTitle || !cleanCode) {
      flashStatus(t('snippet_required_fields', 'Title and code are required.'));
      return;
    }
    const tags = draftTags
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (editId) {
      setSnippets(prev =>
        prev.map(s =>
          s.id === editId
            ? {
                ...s,
                title: cleanTitle,
                description: draftDesc.trim(),
                language: draftLang,
                tags,
                code: draftCode,
                updatedAt: Date.now(),
              }
            : s
        )
      );
      setSelectedId(editId);
      flashStatus(t('snippet_updated', 'Snippet updated.'));
    } else {
      const created: CodeSnippet = {
        id: `snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        description: draftDesc.trim(),
        language: draftLang,
        tags,
        code: draftCode,
        favorite: false,
        updatedAt: Date.now(),
      };
      setSnippets(prev => [created, ...prev]);
      setSelectedId(created.id);
      flashStatus(t('snippet_created', 'Snippet added to vault.'));
    }
    setIsEditing(false);
  };

  const toggleFavorite = (id: string) => {
    setSnippets(prev => prev.map(s => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  };

  const handleDelete = (id: string) => {
    setSnippets(prev => {
      const next = prev.filter(s => s.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id || '');
      }
      return next;
    });
    setConfirmDeleteId(null);
    flashStatus(t('snippet_deleted', 'Snippet removed.'));
  };

  const handleCopy = async () => {
    if (!renderedCode) return;
    await navigator.clipboard.writeText(renderedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleExportJson = async () => {
    await saveTextWithDialog(
      'omnidesk-snippets.json',
      JSON.stringify(snippets, null, 2),
      [{ name: 'JSON (*.json)', extensions: ['json'] }],
      t('snippet_export_json', 'Export Snippets JSON')
    );
    flashStatus(t('snippet_exported', 'Snippets exported.'));
  };

  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isValidSnippetArray(parsed)) {
        flashStatus(t('snippet_invalid_json', 'Invalid snippet backup format.'));
        return;
      }
      const existingIds = new Set(snippets.map(s => s.id));
      const merged = [
        ...parsed.map(item => ({
          ...item,
          id: existingIds.has(item.id) ? `${item.id}-${Date.now()}` : item.id,
          tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
          language: LANGUAGES.includes(item.language) ? item.language : 'other',
          updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
        })),
        ...snippets,
      ];
      setSnippets(merged);
      if (merged[0]) setSelectedId(merged[0].id);
      flashStatus(t('snippet_imported', 'Snippets imported successfully.'));
    } catch {
      flashStatus(t('snippet_invalid_json', 'Invalid snippet backup format.'));
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            {t('snippet_vault_title', 'Local Code & Shell Snippet Vault')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t(
              'snippet_vault_desc',
              'Store reusable shell commands, SQL queries, and code templates locally with live {{variable}} substitution.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewEditor}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('snippet_new', 'New Snippet')}
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {t('export_json', 'Export JSON')}
          </button>
          <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            {t('import_json', 'Import JSON')}
            <input type="file" accept=".json,application/json" className="sr-only" onChange={handleImportJson} />
          </label>
        </div>
      </div>

      {statusMsg && (
        <div className="px-3 py-2 rounded-lg bg-indigo-950/50 border border-indigo-800/60 text-indigo-300 text-xs">
          {statusMsg}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sidebar List */}
        <div className="lg:col-span-4 space-y-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('snippet_search_placeholder', 'Search titles, tags, or code...')}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-xs text-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLangFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                langFilter === 'all'
                  ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('all', 'All')}
            </button>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setLangFilter(lang)}
                className={`px-2 py-1 rounded text-[11px] font-mono uppercase border transition-colors ${
                  langFilter === lang
                    ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOnlyFavorites(v => !v)}
              className={`ml-auto px-2 py-1 rounded text-[11px] inline-flex items-center gap-1 border transition-colors ${
                onlyFavorites
                  ? 'bg-amber-950/50 border-amber-600/50 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className={`w-3 h-3 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
              {t('favorites_only', 'Favorites')}
            </button>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredSnippets.length === 0 ? (
              <div className="p-6 text-center rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-500">
                {t('snippet_empty_list', 'No snippets match your filter.')}
              </div>
            ) : (
              filteredSnippets.map(item => {
                const isSelected = activeSnippet?.id === item.id && !isEditing;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setIsEditing(false);
                      setVarValues({});
                      setConfirmDeleteId(null);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/60'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100 leading-snug">{item.title}</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                        className="text-slate-500 hover:text-amber-400 shrink-0"
                        aria-label={t('toggle_favorite', 'Toggle favorite')}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="uppercase text-indigo-400">{item.language}</span>
                      {item.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="truncate">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Workspace: Editor OR Viewer */}
        <div className="lg:col-span-8 p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {editId ? t('snippet_edit_heading', 'Edit Snippet') : t('snippet_create_heading', 'Create New Snippet')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">{t('snippet_field_title', 'Title')}</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={e => setDraftTitle(e.target.value)}
                    placeholder={t('snippet_title_placeholder', 'e.g. Tail Docker container logs')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('snippet_field_language', 'Language')}</label>
                  <select
                    value={draftLang}
                    onChange={e => setDraftLang(e.target.value as SnippetLanguage)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100 uppercase font-mono"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('snippet_field_desc', 'Description')}</label>
                  <input
                    type="text"
                    value={draftDesc}
                    onChange={e => setDraftDesc(e.target.value)}
                    placeholder={t('snippet_desc_placeholder', 'Short note on when to use it')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('snippet_field_tags', 'Tags (comma-separated)')}</label>
                  <input
                    type="text"
                    value={draftTags}
                    onChange={e => setDraftTags(e.target.value)}
                    placeholder="docker, logs, prod"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t('snippet_field_code', 'Code / Command Template (use {{var}} for fillable placeholders)')}
                </label>
                <textarea
                  rows={10}
                  value={draftCode}
                  onChange={e => setDraftCode(e.target.value)}
                  placeholder="ssh {{user}}@{{host}} -p {{port}}"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-xs font-mono text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  {t('save_snippet', 'Save Snippet')}
                </button>
              </div>
            </div>
          ) : activeSnippet ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-base font-semibold text-white">{activeSnippet.title}</h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                      {activeSnippet.language}
                    </span>
                  </div>
                  {activeSnippet.description && (
                    <p className="text-xs text-slate-400 mt-1">{activeSnippet.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditFor(activeSnippet)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs inline-flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {t('edit', 'Edit')}
                  </button>

                  {confirmDeleteId === activeSnippet.id ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(activeSnippet.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
                      >
                        {t('confirm_delete', 'Confirm Delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                      >
                        {t('cancel', 'Cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeSnippet.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('delete', 'Delete')}
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Template Variables */}
              {detectedVars.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-semibold text-indigo-300">
                    {t('snippet_template_vars', 'Template Variables')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {detectedVars.map(varName => (
                      <div key={varName}>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">
                          {`{{${varName}}}`}
                        </label>
                        <input
                          type="text"
                          value={varValues[varName] || ''}
                          onChange={e =>
                            setVarValues(prev => ({
                              ...prev,
                              [varName]: e.target.value,
                            }))
                          }
                          placeholder={varName}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none text-xs font-mono text-slate-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered Output */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    {t('snippet_rendered_output', 'Ready-to-Copy Output')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
                    </button>
                    <SendToToolButton getText={() => renderedCode} sourceToolId="snippet-vault" />
                  </div>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                  {renderedCode}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-xs text-slate-500 space-y-3">
              <p>{t('snippet_select_hint', 'Select a snippet from the left or create a new one.')}</p>
              <button
                type="button"
                onClick={openNewEditor}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('snippet_new', 'New Snippet')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
