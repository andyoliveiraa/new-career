import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SkillsTagEditorProps {
  skills: string[];
  onChange: (nextSkills: string[]) => void;
  title?: string;
  compact?: boolean;
}

export const SkillsTagEditor: React.FC<SkillsTagEditorProps> = ({
  skills,
  onChange,
  title,
  compact = false,
}) => {
  const { t } = useLanguage();
  const [newSkill, setNewSkill] = useState('');

  const addSkills = () => {
    const raw = newSkill.trim();
    if (!raw) return;
    const candidates = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;

    const existingLower = new Set(skills.map((s) => s.toLowerCase()));
    const toAdd = candidates.filter((c) => !existingLower.has(c.toLowerCase()));
    if (toAdd.length > 0) {
      onChange([...skills, ...toAdd]);
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div
      className={
        compact
          ? 'p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3'
          : 'bg-surface-100 border border-surface-border rounded-xl p-5 space-y-3'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <label
          className={
            compact
              ? 'block text-xs font-semibold text-slate-300 uppercase tracking-wider'
              : 'block text-xs font-semibold text-txt-primary uppercase tracking-wider'
          }
        >
          {title || t('profile.skillsTitle')}
        </label>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-200 border border-surface-border text-txt-muted">
          {skills.length}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t('profile.skillPlaceholder')}
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSkills();
            }
          }}
          className={
            compact
              ? 'flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500'
              : 'flex-1 bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent'
          }
        />
        <button
          type="button"
          onClick={addSkills}
          className={
            compact
              ? 'px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors shrink-0'
              : 'px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-lg text-xs font-medium flex items-center gap-1 transition-colors shrink-0'
          }
        >
          <Plus className="w-3.5 h-3.5" /> {t('common.add')}
        </button>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {skills.map((s, idx) => (
            <span
              key={`${s}-${idx}`}
              className={
                compact
                  ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200'
                  : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-200 border border-surface-border text-xs text-txt-primary'
              }
            >
              <span>{s}</span>
              <button
                type="button"
                onClick={() => removeSkill(s)}
                className="text-txt-muted hover:text-rose-400 transition-colors"
                aria-label={`${t('common.delete')} ${s}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
