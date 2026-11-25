import React, { useState } from 'react';
import { GraduationCap, Plus, Trash2, Pencil, Check, Clock } from 'lucide-react';
import type { ProfileEducation } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface EducationsEditorProps {
  educations: ProfileEducation[];
  onChange: (nextEducations: ProfileEducation[]) => void;
  compact?: boolean;
}

const ONGOING_PERIOD_RE =
  /\b(?:present(?:e)?|atual(?:mente)?|actual(?:mente|idad)?|current(?:ly)?|ongoing|heute|now|em\s+curso|a\s+decorrer|en\s+curso|in\s+progress|laufend|expected|desde|since|seit)\b|至今|현재|الحاضر/i;

function extractStartYear(period?: string): string {
  const match = (period || '').match(/\b(?:19|20)\d{2}\b/);
  return match ? match[0] : '';
}

function isEducationInProgress(edu: ProfileEducation): boolean {
  if (typeof edu.in_progress === 'boolean') return edu.in_progress;
  const period = (edu.period || '').trim();
  if (!period) return false;
  if (ONGOING_PERIOD_RE.test(period)) return true;
  const years = period.match(/\b(?:19|20)\d{2}\b/g);
  if (years && years.length >= 2) {
    const endYear = Number(years[years.length - 1]);
    if (endYear > new Date().getFullYear()) return true;
  }
  return false;
}

function resolveStartYear(edu: ProfileEducation): string {
  return (edu.start_year || '').trim() || extractStartYear(edu.period);
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
  const [newInProgress, setNewInProgress] = useState(false);
  const [newStartYear, setNewStartYear] = useState('');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ProfileEducation | null>(null);
  const [editInProgress, setEditInProgress] = useState(false);
  const [editStartYear, setEditStartYear] = useState('');

  const toggleNewInProgress = () => {
    setNewInProgress((prev) => {
      const next = !prev;
      if (next) {
        if (!newStartYear.trim()) {
          const detected = extractStartYear(newPeriod);
          if (detected) setNewStartYear(detected);
        }
      } else if (!newPeriod.trim() && newStartYear.trim()) {
        setNewPeriod(newStartYear.trim());
      }
      return next;
    });
  };

  const toggleEditInProgress = () => {
    setEditInProgress((prev) => {
      const next = !prev;
      if (next && editDraft) {
        if (!editStartYear.trim()) {
          const detected = extractStartYear(editDraft.period);
          if (detected) setEditStartYear(detected);
        }
      } else if (!next && editDraft && !editDraft.period.trim() && editStartYear.trim()) {
        setEditDraft({ ...editDraft, period: editStartYear.trim() });
      }
      return next;
    });
  };

  const addEducation = () => {
    if (!newDegree.trim() || !newInstitution.trim()) return;
    const cleanYear = extractStartYear(newStartYear) || newStartYear.trim();
    const resolvedPeriod = newInProgress
      ? cleanYear
        ? `${cleanYear} - ${t('profile.presentDefault')}`
        : t('profile.presentDefault')
      : newPeriod.trim() || t('profile.completedDefault');

    onChange([
      ...educations,
      {
        degree: newDegree.trim(),
        institution: newInstitution.trim(),
        period: resolvedPeriod,
        in_progress: newInProgress,
        start_year: newInProgress ? cleanYear : extractStartYear(resolvedPeriod) || undefined,
      },
    ]);
    setNewDegree('');
    setNewInstitution('');
    setNewPeriod('');
    setNewInProgress(false);
    setNewStartYear('');
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
    const target = educations[index];
    const detectedInProgress = isEducationInProgress(target);
    const detectedStartYear = resolveStartYear(target);
    setEditingIndex(index);
    setEditDraft({ ...target });
    setEditInProgress(detectedInProgress);
    setEditStartYear(detectedStartYear);
  };

  const saveEdit = () => {
    if (editingIndex === null || !editDraft) return;
    const cleanYear = extractStartYear(editStartYear) || editStartYear.trim();
    const resolvedPeriod = editInProgress
      ? cleanYear
        ? `${cleanYear} - ${t('profile.presentDefault')}`
        : t('profile.presentDefault')
      : editDraft.period.trim();

    const next = [...educations];
    next[editingIndex] = {
      degree: editDraft.degree.trim() || next[editingIndex].degree,
      institution: editDraft.institution.trim(),
      period: resolvedPeriod,
      in_progress: editInProgress,
      start_year: editInProgress ? cleanYear : extractStartYear(resolvedPeriod) || undefined,
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
            {newInProgress ? (
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder={t('profile.eduStartYearPlaceholder')}
                value={newStartYear}
                onChange={(e) => setNewStartYear(e.target.value)}
                className="bg-surface-100 border border-accent/60 rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
              />
            ) : (
              <input
                type="text"
                placeholder={t('profile.eduPeriodPlaceholder')}
                value={newPeriod}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPeriod(val);
                  if (ONGOING_PERIOD_RE.test(val)) {
                    const yr = extractStartYear(val);
                    if (yr) setNewStartYear(yr);
                    setNewInProgress(true);
                  }
                }}
                className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              aria-pressed={newInProgress}
              onClick={toggleNewInProgress}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                newInProgress
                  ? 'bg-accent/15 border-accent text-accent-light'
                  : 'bg-surface-100 border-surface-border text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('profile.eduInProgress')}</span>
            </button>
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
        </div>
      )}

      <div className="space-y-2">
        {educations.length === 0 ? (
          <div className="text-xs text-txt-muted py-2">{t('profile.noEducations')}</div>
        ) : (
          educations.map((edu, idx) => {
            const inProgress = isEducationInProgress(edu);
            const startYear = resolveStartYear(edu);

            return editingIndex === idx && editDraft ? (
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
                  {editInProgress ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder={t('profile.eduStartYearPlaceholder')}
                      value={editStartYear}
                      onChange={(e) => setEditStartYear(e.target.value)}
                      className="bg-surface-100 border border-accent/60 rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={t('profile.eduPeriodPlaceholder')}
                      value={editDraft.period}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditDraft({ ...editDraft, period: val });
                        if (ONGOING_PERIOD_RE.test(val)) {
                          const yr = extractStartYear(val);
                          if (yr) setEditStartYear(yr);
                          setEditInProgress(true);
                        }
                      }}
                      className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-pressed={editInProgress}
                    onClick={toggleEditInProgress}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      editInProgress
                        ? 'bg-accent/15 border-accent text-accent-light'
                        : 'bg-surface-100 border-surface-border text-txt-secondary hover:text-txt-primary'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('profile.eduInProgress')}</span>
                  </button>
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
                    ? 'p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start justify-between gap-2 min-w-0 overflow-hidden'
                    : 'p-3 rounded-lg bg-surface-200/50 border border-surface-border flex items-start justify-between gap-2 min-w-0 overflow-hidden'
                }
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-sm font-medium text-txt-primary break-words">
                    {edu.degree}
                    {edu.institution ? (
                      <>
                        {' '}— <span className="text-accent-light">{edu.institution}</span>
                      </>
                    ) : null}
                  </div>
                  {(inProgress || edu.period) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-txt-muted break-words">
                      {inProgress ? (
                        <>
                          <span>
                            {startYear ? t('profile.eduSinceYear', { year: startYear }) : edu.period}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <Clock className="w-3 h-3" />
                            <span>{t('profile.eduInProgressBadge')}</span>
                          </span>
                        </>
                      ) : (
                        <span>{edu.period}</span>
                      )}
                    </div>
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
                    onClick={() => removeEducation(idx)}
                    className="p-1.5 text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    title={t('profile.removeEducation')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
