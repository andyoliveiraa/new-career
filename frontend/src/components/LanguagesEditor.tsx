import React, { useState } from 'react';
import { Globe, Plus, Trash2, Pencil, Check } from 'lucide-react';
import type { ProfileLanguage } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface LanguagesEditorProps {
  languages: ProfileLanguage[];
  onChange: (nextLanguages: ProfileLanguage[]) => void;
  compact?: boolean;
}

const LEVEL_PRESETS = ['C2', 'C1', 'B2', 'B1', 'A2', 'A1'] as const;

export const LanguagesEditor: React.FC<LanguagesEditorProps> = ({
  languages,
  onChange,
  compact = false,
}) => {
  const { t } = useLanguage();
  const [showAddLang, setShowAddLang] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState('');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ProfileLanguage | null>(null);

  const addLanguage = () => {
    if (!newName.trim()) return;
    onChange([
      ...languages,
      {
        name: newName.trim(),
        level: newLevel.trim() || t('profile.profLevelDefault'),
      },
    ]);
    setNewName('');
    setNewLevel('');
    setShowAddLang(false);
  };

  const removeLanguage = (index: number) => {
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditDraft(null);
    }
    onChange(languages.filter((_, idx) => idx !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditDraft({ ...languages[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editDraft) return;
    const next = [...languages];
    next[editingIndex] = {
      name: editDraft.name.trim() || next[editingIndex].name,
      level: (editDraft.level || '').trim() || t('profile.profLevelDefault'),
    };
    onChange(next);
    setEditingIndex(null);
    setEditDraft(null);
  };

  return (
    <div
      className={
        compact
          ? 'p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 min-w-0 w-full overflow-hidden'
          : 'bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4 min-w-0 w-full overflow-hidden'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          className={`font-semibold text-xs uppercase tracking-wider flex items-center gap-2 ${
            compact ? 'text-slate-300' : 'text-txt-primary'
          }`}
        >
          <Globe className="w-4 h-4 text-accent-light shrink-0" />
          <span>
            {t('profile.languagesTitle')} ({languages.length})
          </span>
        </h3>
        <button
          type="button"
          onClick={() => setShowAddLang(!showAddLang)}
          className="text-xs text-accent-light hover:underline flex items-center gap-1 font-medium shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> {t('profile.addLanguage')}
        </button>
      </div>

      {showAddLang && (
        <div
          className={
            compact
              ? 'p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5'
              : 'p-3.5 rounded-xl bg-surface-200 border border-surface-border space-y-2.5'
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={t('profile.langNamePlaceholder')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder={t('profile.langLevelPlaceholder')}
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {LEVEL_PRESETS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setNewLevel(lvl)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                    newLevel === lvl
                      ? 'bg-accent/15 border-accent text-accent-light'
                      : 'bg-surface-100 border-surface-border text-txt-muted hover:text-txt-primary'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddLang(false)}
                className="px-2.5 py-1 text-xs text-txt-secondary hover:text-txt-primary"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={addLanguage}
                className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold"
              >
                {t('profile.addLanguage')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {languages.length === 0 ? (
          <div className="text-xs text-txt-muted py-2">{t('profile.noLanguages')}</div>
        ) : (
          languages.map((lang, idx) =>
            editingIndex === idx && editDraft ? (
              <div
                key={idx}
                className={
                  compact
                    ? 'p-3 rounded-lg bg-slate-900 border border-blue-500/40 space-y-2.5'
                    : 'p-3 rounded-lg bg-surface-200 border border-accent/40 space-y-2.5'
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={t('profile.langNamePlaceholder')}
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder={t('profile.langLevelPlaceholder')}
                    value={editDraft.level || ''}
                    onChange={(e) => setEditDraft({ ...editDraft, level: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {LEVEL_PRESETS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setEditDraft({ ...editDraft, level: lvl })}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          editDraft.level === lvl
                            ? 'bg-accent/15 border-accent text-accent-light'
                            : 'bg-surface-100 border-surface-border text-txt-muted hover:text-txt-primary'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(null);
                        setEditDraft(null);
                      }}
                      className="px-2.5 py-1 text-xs text-txt-secondary hover:text-txt-primary"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={idx}
                className={
                  compact
                    ? 'p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 min-w-0 overflow-hidden'
                    : 'p-2.5 rounded-lg bg-surface-200/50 border border-surface-border flex items-center justify-between gap-2 min-w-0 overflow-hidden'
                }
              >
                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-txt-primary break-words">{lang.name}</span>
                  {lang.level && (
                    <span className="px-2 py-0.5 rounded bg-surface-100 border border-surface-border text-[11px] text-accent-light font-medium">
                      {lang.level}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(idx)}
                    className="p-1.5 text-txt-muted hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                    aria-label={t('common.save')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLanguage(idx)}
                    className="p-1.5 text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    title={t('profile.removeLanguage')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};
