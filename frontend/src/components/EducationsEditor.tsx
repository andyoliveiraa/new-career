import React, { useState } from 'react';
import { GraduationCap, Plus, Trash2, Pencil, Check } from 'lucide-react';
import type { ProfileEducation } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface EducationsEditorProps {
  educations: ProfileEducation[];
  onChange: (nextEducations: ProfileEducation[]) => void;
  compact?: boolean;
}

export const EducationsEditor: React.FC<EducationsEditorProps> = ({
  educations,
  onChange,
  compact = false,
}) => {
  const { t } = useLanguage();
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [newDegree, setNewDegree] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [newPeriod, setNewPeriod] = useState('');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ProfileEducation | null>(null);

  const addEducation = () => {
    if (!newDegree.trim() || !newInstitution.trim()) return;
    onChange([
      ...educations,
      {
        degree: newDegree.trim(),
        institution: newInstitution.trim(),
        period: newPeriod.trim() || t('profile.completedDefault'),
      },
    ]);
    setNewDegree('');
    setNewInstitution('');
    setNewPeriod('');
    setShowAddEdu(false);
  };

  const removeEducation = (index: number) => {
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditDraft(null);
    }
    onChange(educations.filter((_, idx) => idx !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditDraft({ ...educations[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editDraft) return;
    const next = [...educations];
    next[editingIndex] = {
      degree: editDraft.degree.trim() || next[editingIndex].degree,
      institution: editDraft.institution.trim(),
      period: editDraft.period.trim(),
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
          <GraduationCap className="w-4 h-4 text-accent-light shrink-0" />
          <span>{t('profile.educationsTitle', { count: educations.length })}</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowAddEdu(!showAddEdu)}
          className="text-xs text-accent-light hover:underline flex items-center gap-1 font-medium shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> {t('profile.addEducation')}
        </button>
      </div>

      {showAddEdu && (
        <div
          className={
            compact
              ? 'p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3'
              : 'p-3.5 rounded-xl bg-surface-200 border border-surface-border space-y-3'
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder={t('profile.eduDegreePlaceholder')}
              value={newDegree}
              onChange={(e) => setNewDegree(e.target.value)}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder={t('profile.eduInstitutionPlaceholder')}
              value={newInstitution}
              onChange={(e) => setNewInstitution(e.target.value)}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder={t('profile.eduPeriodPlaceholder')}
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddEdu(false)}
              className="px-2.5 py-1 text-xs text-txt-secondary hover:text-txt-primary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={addEducation}
              className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold"
            >
              {t('profile.saveEducation')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {educations.length === 0 ? (
          <div className="text-xs text-txt-muted py-2">{t('profile.noEducations')}</div>
        ) : (
          educations.map((edu, idx) =>
            editingIndex === idx && editDraft ? (
              <div
                key={idx}
                className={
                  compact
                    ? 'p-3 rounded-lg bg-slate-900 border border-blue-500/40 space-y-2.5'
                    : 'p-3 rounded-lg bg-surface-200 border border-accent/40 space-y-2.5'
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder={t('profile.eduDegreePlaceholder')}
                    value={editDraft.degree}
                    onChange={(e) => setEditDraft({ ...editDraft, degree: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder={t('profile.eduInstitutionPlaceholder')}
                    value={editDraft.institution}
                    onChange={(e) => setEditDraft({ ...editDraft, institution: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder={t('profile.eduPeriodPlaceholder')}
                    value={editDraft.period}
                    onChange={(e) => setEditDraft({ ...editDraft, period: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
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
            ) : (
              <div
                key={idx}
                className={
                  compact
                    ? 'p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start justify-between gap-2 min-w-0 overflow-hidden'
                    : 'p-3 rounded-lg bg-surface-200/50 border border-surface-border flex items-start justify-between gap-2 min-w-0 overflow-hidden'
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-txt-primary break-words">
                    {edu.degree}
                    {edu.institution ? (
                      <>
                        {' '}— <span className="text-accent-light">{edu.institution}</span>
                      </>
                    ) : null}
                  </div>
                  {edu.period && <div className="text-xs text-txt-muted break-words">{edu.period}</div>}
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
                    onClick={() => removeEducation(idx)}
                    className="p-1.5 text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    title={t('profile.removeEducation')}
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
