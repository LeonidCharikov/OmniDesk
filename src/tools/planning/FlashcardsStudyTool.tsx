import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, RotateCw, Trash2, Check, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  known: boolean;
}

interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
}

const STORAGE_KEY = 'omnidesk_flashcards_v1';

export const FlashcardsStudyTool: React.FC = () => {
  const { t } = useI18n();
  const [decks, setDecks] = useState<Deck[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'starter',
        title: t('fc_sample_deck', 'Everyday Spanish Basics'),
        cards: [
          { id: 'c1', front: 'Buenos días', back: 'Good morning', known: false },
          { id: 'c2', front: 'Muchas gracias', back: 'Thank you very much', known: false },
          { id: 'c3', front: '¿Cuánto cuesta?', back: 'How much does it cost?', known: false },
          { id: 'c4', front: 'La cuenta, por favor', back: 'The check, please', known: false },
        ],
      },
    ];
  });

  const [activeDeckId, setActiveDeckId] = useState<string>(() => decks[0]?.id || '');
  const [mode, setMode] = useState<'study' | 'manage'>('study');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    } catch {
      // ignore
    }
  }, [decks]);

  const activeDeck = decks.find(d => d.id === activeDeckId) || decks[0];
  const studyQueue = activeDeck ? activeDeck.cards.filter(c => !c.known) : [];
  const activeCard = studyQueue[currentIdx % Math.max(1, studyQueue.length)];
  const knownCount = activeDeck ? activeDeck.cards.filter(c => c.known).length : 0;

  const createDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;
    const deck: Deck = { id: Date.now().toString(), title: newDeckTitle.trim(), cards: [] };
    setDecks(prev => [...prev, deck]);
    setActiveDeckId(deck.id);
    setNewDeckTitle('');
    setMode('manage');
  };

  const addCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !newFront.trim() || !newBack.trim()) return;
    const card: Flashcard = {
      id: Date.now().toString(),
      front: newFront.trim(),
      back: newBack.trim(),
      known: false,
    };
    setDecks(prev => prev.map(d => (d.id === activeDeck.id ? { ...d, cards: [...d.cards, card] } : d)));
    setNewFront('');
    setNewBack('');
  };

  const markCard = (known: boolean) => {
    if (!activeDeck || !activeCard) return;
    setDecks(prev =>
      prev.map(d =>
        d.id === activeDeck.id
          ? { ...d, cards: d.cards.map(c => (c.id === activeCard.id ? { ...c, known } : c)) }
          : d
      )
    );
    setIsFlipped(false);
    if (!known) {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const resetProgress = () => {
    if (!activeDeck) return;
    setDecks(prev =>
      prev.map(d =>
        d.id === activeDeck.id ? { ...d, cards: d.cards.map(c => ({ ...c, known: false })) } : d
      )
    );
    setCurrentIdx(0);
    setIsFlipped(false);
  };

  const deleteCard = (cardId: string) => {
    if (!activeDeck) return;
    setDecks(prev =>
      prev.map(d =>
        d.id === activeDeck.id ? { ...d, cards: d.cards.filter(c => c.id !== cardId) } : d
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('fc_title', 'Simple Flashcards (Study Deck)')}</h2>
              <p className="text-xs text-slate-400">
                {t('fc_subtitle', 'Create Q&A decks, flip cards to memorize, and track mastery offline.')}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setMode('study')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'study' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('fc_mode_study', 'Study')}
            </button>
            <button
              type="button"
              onClick={() => setMode('manage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'manage' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('fc_mode_manage', 'Edit Deck')}
            </button>
          </div>
        </div>

        {/* Deck Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeDeck?.id || ''}
              onChange={e => {
                setActiveDeckId(e.target.value);
                setCurrentIdx(0);
                setIsFlipped(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
            >
              {decks.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.cards.length})
                </option>
              ))}
            </select>
            {activeDeck && (
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {knownCount} / {activeDeck.cards.length} {t('fc_mastered', 'mastered')}
              </span>
            )}
          </div>

          <form onSubmit={createDeck} className="flex gap-2">
            <input
              type="text"
              value={newDeckTitle}
              onChange={e => setNewDeckTitle(e.target.value)}
              placeholder={t('fc_new_deck_placeholder', 'New deck name...')}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('fc_create_deck', 'New Deck')}</span>
            </button>
          </form>
        </div>

        {mode === 'study' ? (
          activeDeck && activeDeck.cards.length === 0 ? (
            <div className="p-10 text-center rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <p className="text-xs text-slate-400">{t('fc_empty_deck', 'This deck has no cards yet.')}</p>
              <button
                type="button"
                onClick={() => setMode('manage')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                {t('fc_add_cards_btn', 'Add Cards')}
              </button>
            </div>
          ) : studyQueue.length === 0 ? (
            <div className="p-10 text-center rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <p className="text-base font-semibold text-emerald-400">{t('fc_all_done', 'All cards mastered!')}</p>
              <button
                type="button"
                onClick={resetProgress}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('fc_study_again', 'Reset & Study Again')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setIsFlipped(f => !f)}
                className="w-full min-h-[210px] p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center text-center gap-3 cursor-pointer"
              >
                <span className="text-xs font-mono text-slate-500">
                  {isFlipped ? t('fc_answer', 'Answer') : t('fc_question', 'Prompt')}
                </span>
                <div className="text-2xl font-bold text-white">
                  {isFlipped ? activeCard?.back : activeCard?.front}
                </div>
                <span className="text-xs text-indigo-400 flex items-center gap-1 mt-2">
                  <RotateCw className="w-3 h-3" />
                  {t('fc_click_flip', 'Click card to flip')}
                </span>
              </button>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => markCard(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-amber-300 hover:border-amber-500/50 transition-colors"
                >
                  {t('fc_review_again', 'Review Again')}
                </button>
                <button
                  type="button"
                  onClick={() => markCard(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('fc_know_it', 'Know It')}</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <form onSubmit={addCard} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-xs text-slate-400 mb-1">{t('fc_front_label', 'Front (Question / Term)')}</label>
                <input
                  type="text"
                  required
                  value={newFront}
                  onChange={e => setNewFront(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-xs text-slate-400 mb-1">{t('fc_back_label', 'Back (Answer / Translation)')}</label>
                <input
                  type="text"
                  required
                  value={newBack}
                  onChange={e => setNewBack(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('fc_add_card', 'Add')}</span>
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
              {activeDeck?.cards.map(c => (
                <div key={c.id} className="p-3 flex items-center justify-between gap-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                    <span className="font-medium text-white truncate">{c.front}</span>
                    <span className="text-slate-400 truncate">{c.back}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCard(c.id)}
                    aria-label={t('delete_item', 'Delete item')}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
