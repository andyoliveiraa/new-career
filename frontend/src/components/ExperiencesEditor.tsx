import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Pencil, Check } from 'lucide-react';
import type { ProfileExperience } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ExperiencesEditorProps {
  experiences: ProfileExperience[];
  onChange: (nextExperiences: ProfileExperience[]) => void;
  compact?: boolean;
}

export const ExperiencesEditor: React.FC<ExperiencesEditorProps> = ({
  experiences,
  onChange,
  compact = false,
}) => {
  const { t } = useLanguage();
  const [showAddExp, setShowAddExp] = useState(false);
  const [expRole, setExpRole] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expPeriod, setExpPeriod] = useState('');
  const [expLocation, setExpLocation] = useState('');
  const [expBullets, setExpBullets] = useState('');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ProfileExperience | null>(null);
  const [editBulletsText, setEditBulletsText] = useState('');

  const addExperience = () => {
    if (!expRole.trim() || !expCompany.trim()) return;
    const bullets = expBullets
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    onChange([
      {
        role: expRole.trim(),
        company: expCompany.trim(),
        period: expPeriod.trim() || t('profile.presentDefault'),
        location: expLocation.trim() || undefined,
        bullets,
      },
      ...experiences,
    ]);
    setExpRole('');
    setExpCompany('');
    setExpPeriod('');
    setExpLocation('');
    setExpBullets('');
    setShowAddExp(false);
  };

  const removeExperience = (index: number) => {
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditDraft(null);
    }
    onChange(experiences.filter((_, idx) => idx !== index));
  };

  const startEdit = (index: number) => {
    const target = experiences[index];
    setEditingIndex(index);
    setEditDraft({ ...target });
    setEditBulletsText((target.bullets || []).join('\n'));
  };

  const saveEdit = () => {
    if (editingIndex === null || !editDraft) return;
    const bullets = editBulletsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);
    const next = [...experiences];
    next[editingIndex] = {
      ...editDraft,
      role: editDraft.role.trim() || next[editingIndex].role,
      company: editDraft.company.trim() || next[editingIndex].company,
      period: editDraft.period.trim(),
      location: editDraft.location?.trim() || undefined,
      bullets,
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
      <div className="flex items-center justify-between">
        <h3
          className={`font-semibold text-xs uppercase tracking-wider flex items-center gap-2 ${
            compact ? 'text-slate-300' : 'text-txt-primary'
          }`}
        >
          <Briefcase className="w-4 h-4 text-accent-light" />
          {t('profile.experiencesTitle', { count: experiences.length })}
        </h3>
        <button
          type="button"
          onClick={() => setShowAddExp(!showAddExp)}
          className="text-xs text-accent-light hover:underline flex items-center gap-1 font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> {t('profile.addExperience')}
        </button>
      </div>

      {showAddExp && (
        <div
          className={
            compact
              ? 'p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3'
              : 'p-4 rounded-xl bg-surface-200 border border-surface-border space-y-3'
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder={t('profile.expRolePlaceholder')}
              value={expRole}
              onChange={(e) => setExpRole(e.target.value)}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder={t('profile.expCompanyPlaceholder')}
              value={expCompany}
              onChange={(e) => setExpCompany(e.target.value)}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder={t('profile.expPeriodPlaceholder')}
              value={expPeriod}
              onChange={(e) => setExpPeriod(e.target.value)}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder={t('profile.expLocationPlaceholder')}
              value={expLocation}
              onChange={(e) => setExpLocation(e.target.value)}
              className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
          </div>
          <textarea
            rows={3}
            placeholder={t('profile.expBulletsPlaceholder')}
            value={expBullets}
            onChange={(e) => setExpBullets(e.target.value)}
            className="w-full bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddExp(false)}
              className="px-2.5 py-1 text-xs text-txt-secondary hover:text-txt-primary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={addExperience}
              className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold"
            >
              {t('profile.addExperience')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {experiences.length === 0 ? (
          <div className="text-xs text-txt-muted py-2">{t('profile.noExperiences')}</div>
        ) : (
          experiences.map((exp, idx) =>
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
                    placeholder={t('profile.expRolePlaceholder')}
                    value={editDraft.role}
                    onChange={(e) => setEditDraft({ ...editDraft, role: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder={t('profile.expCompanyPlaceholder')}
                    value={editDraft.company}
                    onChange={(e) => setEditDraft({ ...editDraft, company: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder={t('profile.expPeriodPlaceholder')}
                    value={editDraft.period}
                    onChange={(e) => setEditDraft({ ...editDraft, period: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder={t('profile.expLocationPlaceholder')}
                    value={editDraft.location || ''}
                    onChange={(e) => setEditDraft({ ...editDraft, location: e.target.value })}
                    className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder={t('profile.expBulletsPlaceholder')}
                  value={editBulletsText}
                  onChange={(e) => setEditBulletsText(e.target.value)}
                  className="w-full bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
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
                    ? 'p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5 min-w-0 w-full overflow-hidden'
                    : 'p-3 rounded-lg bg-surface-200/50 border border-surface-border space-y-1.5 min-w-0 w-full overflow-hidden'
                }
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-txt-primary break-words">
                      {exp.role}
                      {exp.company ? (
                        <>
                          {' '}— <span className="text-accent-light">{exp.company}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="text-xs text-txt-muted break-words">
                      {exp.period}
                      {exp.location ? ` • ${exp.location}` : ''}
                    </div>
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
                      onClick={() => removeExperience(idx)}
                      className="p-1.5 text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      title={t('profile.removeExperience')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="text-xs text-txt-secondary list-disc ps-5 space-y-1 pt-1 break-words [overflow-wrap:anywhere]">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="leading-relaxed break-words">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};
