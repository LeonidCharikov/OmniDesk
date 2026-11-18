import React, { useEffect, useRef, useState } from 'react';
import { Download, Plus, Trash2, Search, FileText, Printer } from 'lucide-react';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { printPlainText } from '../../services/printService';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { loadToolJson, saveToolJson } from '../../services/idbStorage';
import { button, secondary, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   6. NOTES WORKSPACE
   ───────────────────────────────────────────────────────────── */
type Note = { id: number; title: string; body: string; updatedAt: number };

export const NotesTool: React.FC = () => {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('omnidesk-notes');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 1,
        title: t('first_note_title', 'První poznámka'),
        body: t('first_note_body', 'Vítejte v lokálním poznámkovém bloku. Data se automaticky ukládají do vašeho prohlížeče.'),
        updatedAt: Date.now(),
      },
    ];
  });
  const [selected, setSelected] = useState<number | null>(notes[0]?.id || null);
  const [query, setQuery] = useState('');
  const notesModifiedRef = useRef(false);

  const current = notes.find(note => note.id === selected);

  const save = (updated: Note[]) => {
    notesModifiedRef.current = true;
    setNotes(updated);
    void saveToolJson('omnidesk-notes', updated);
  };

  useEffect(() => {
    let active = true;
    const piped = consumePendingToolPipe('notes');
    if (piped) {
      notesModifiedRef.current = true;
      const applyPipedText = (bodyText: string, titleHint?: string) => {
        const note: Note = {
          id: Date.now(),
          title: titleHint || t('new_note_title', 'New Note'),
          body: bodyText,
          updatedAt: Date.now(),
        };
        setNotes(prev => {
          const next = [note, ...prev];
          void saveToolJson('omnidesk-notes', next);
          return next;
        });
        setSelected(note.id);
      };
      if (piped.kind === 'text' && typeof piped.text === 'string') {
        applyPipedText(piped.text);
      } else if (piped.kind === 'file' && piped.file) {
        piped.file.text().then(txt => applyPipedText(txt, piped.file?.name));
      }
    } else {
      void loadToolJson<Note[]>('omnidesk-notes').then(stored => {
        if (!active || notesModifiedRef.current) return;
        if (Array.isArray(stored) && stored.length > 0) {
          setNotes(stored);
          setSelected(prev => prev ?? stored[0].id);
        }
      });
    }

    const handleExternalNotes = () => {
      try {
        const saved = localStorage.getItem('omnidesk-notes');
        if (saved) {
          setNotes(JSON.parse(saved));
          return;
        }
      } catch {
        // ignore
      }
      void loadToolJson<Note[]>('omnidesk-notes').then(stored => {
        if (Array.isArray(stored)) setNotes(stored);
      });
    };
    window.addEventListener('omnidesk-notes-updated', handleExternalNotes);
    return () => {
      active = false;
      window.removeEventListener('omnidesk-notes-updated', handleExternalNotes);
    };
  }, []);

  const update = (patch: Partial<Note>) => {
    const next = notes.map(note =>
      note.id === selected ? { ...note, ...patch, updatedAt: Date.now() } : note
    );
    save(next);
  };

  const add = () => {
    const note: Note = {
      id: Date.now(),
      title: t('new_note_title', 'Nová poznámka'),
      body: '',
      updatedAt: Date.now(),
    };
    save([note, ...notes]);
    setSelected(note.id);
  };

  const remove = (id: number) => {
    const next = notes.filter(n => n.id !== id);
    save(next);
    if (selected === id) {
      setSelected(next[0]?.id || null);
    }
  };

  const exportCurrent = async () => {
    if (!current) return;
    await saveTextWithDialog(
      `${current.title.replace(/[/\\?%*:|"<>]/g, '_') || 'note'}.txt`,
      `${current.title}\n${'='.repeat(current.title.length)}\n\n${current.body}`,
      [{ name: 'Text file (*.txt)', extensions: ['txt'] }],
      t('save_note', 'Uložit poznámku')
    );
  };

  const filtered = notes.filter(note =>
    `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <ToolHeader title="Notes Workspace" description={t('notes_desc', 'Multiple local notes with search and automatic saving.')} />
      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <div className={panel + ' space-y-3 flex flex-col h-[520px]'}>
          <div className="flex gap-2">
            <button className={button + ' flex-1'} onClick={add}>
              <Plus className="inline w-4 h-4 mr-1" /> {t('new_note', 'Nová')}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              className={input + ' pl-8 text-xs'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('search_notes', 'Hledat poznámky…')}
            />
          </div>
          <div className="space-y-1 overflow-y-auto flex-1 pr-1">
            {filtered.map(note => (
              <div
                key={note.id}
                onClick={() => setSelected(note.id)}
                className={`p-2.5 rounded-lg cursor-pointer transition-colors group flex items-center justify-between ${
                  note.id === selected
                    ? 'bg-indigo-600/30 border border-indigo-500/40 text-white'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h4 className="text-xs font-semibold truncate">{t(note.title, note.title) || t('untitled', 'Bez názvu')}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {t(note.body.slice(0, 40), note.body.slice(0, 40)) || t('empty_note', 'Prázdný text…')}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => {
                    e.stopPropagation();
                    remove(note.id);
                  }}
                  title={t('delete', 'Smazat')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">
                {t('no_matching_notes', 'Nebyly nalezeny žádné poznámky.')}
              </p>
            )}
          </div>
        </div>

        <div className={panel + ' space-y-3 flex flex-col h-[520px]'}>
          {current ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  className={input + ' font-semibold text-base flex-1 min-w-[160px]'}
                  value={current.title}
                  onChange={e => update({ title: e.target.value })}
                  placeholder={t('note_title_placeholder', 'Note title')}
                />
                <SendToToolButton
                  sourceToolId="notes"
                  kind="text"
                  getText={() => current.body}
                  disabled={!current.body.trim()}
                />
                <button
                  className={secondary}
                  onClick={() =>
                    void printPlainText(current.body, {
                      title: current.title || t('new_note_title', 'Note'),
                    })
                  }
                  disabled={!current.body.trim()}
                  title={t('print_btn', 'Print')}
                >
                  <Printer className="w-4 h-4 inline mr-1 text-indigo-400" /> {t('print_btn', 'Print')}
                </button>
                <button className={secondary} onClick={exportCurrent} title={t('export_note', 'Export note')}>
                  <Download className="w-4 h-4 inline mr-1" /> {t('export', 'Export')}
                </button>
              </div>
              <textarea
                className={input + ' flex-1 font-mono text-xs leading-relaxed resize-none'}
                value={current.body}
                onChange={e => update({ body: e.target.value })}
                placeholder={t('note_body_placeholder', 'Zde můžete psát své myšlenky a zápisky…')}
              />
              <div className="text-[11px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-800">
                <span>
                  {current.body.length} {t('chars', 'znaků')} •{' '}
                  {current.body.trim() ? current.body.trim().split(/\s+/).length : 0} {t('words', 'slov')}
                </span>
                <span>{t('saved_locally', 'Uloženo lokálně')}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
              <FileText className="w-10 h-10 mb-2 opacity-40" />
              <p>{t('create_first_note', 'Vyberte nebo vytvořte novou poznámku.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
