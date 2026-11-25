import React, { useState, useEffect } from 'react';
import type { ProfileData } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { SkillsTagEditor } from './SkillsTagEditor';
import { ExperiencesEditor } from './ExperiencesEditor';
import { EducationsEditor } from './EducationsEditor';
import { LanguagesEditor } from './LanguagesEditor';
import {
  User, Save, Plus, Trash2, CheckCircle2,
  FolderGit2, Award, ShieldCheck
} from 'lucide-react';

interface ProfileViewProps {
  onSaved?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onSaved }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [newFact, setNewFact] = useState('');

  const [showAddProj, setShowAddProj] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projDesc, setProjDesc] = useState('');

  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');


  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile({
        ...data,
        skills: data.skills || [],
        experiences: data.experiences || [],
        educations: data.educations || [],
        certifications: data.certifications || [],
        projects: data.projects || [],
        languages: data.languages || [],
        verified_facts: data.verified_facts || [],
      });
    } catch (err: any) {
      showToast(err.message || t('profile.toastLoadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await api.updateProfile(profile);
      setSavedSuccess(true);
      showToast(t('profile.toastSaved'), 'success');
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onSaved) onSaved();
    } catch (err: any) {
      showToast(err.message || t('profile.toastSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const addProject = () => {
    if (!projTitle.trim() || !profile) return;
    setProfile({
      ...profile,
      projects: [
        ...(profile.projects || []),
        { title: projTitle.trim(), tech: projTech.trim(), description: projDesc.trim() }
      ]
    });
    setProjTitle('');
    setProjTech('');
    setProjDesc('');
    setShowAddProj(false);
  };

  const removeProject = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: (profile.projects || []).filter((_, idx) => idx !== index)
    });
  };

  const addCertification = () => {
    if (!certName.trim() || !profile) return;
    setProfile({
      ...profile,
      certifications: [...(profile.certifications || []), { name: certName.trim(), issuer: certIssuer.trim() }]
    });
    setCertName('');
    setCertIssuer('');
  };

  const removeCertification = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      certifications: (profile.certifications || []).filter((_, idx) => idx !== index)
    });
  };


  const addFact = () => {
    if (!newFact.trim() || !profile) return;
    setProfile({
      ...profile,
      verified_facts: [...(profile.verified_facts || []), newFact.trim()]
    });
    setNewFact('');
  };

  const removeFact = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      verified_facts: (profile.verified_facts || []).filter((_, idx) => idx !== index)
    });
  };

  if (loading || !profile) {
    return <div className="p-12 text-center text-txt-muted text-sm">{t('profile.loading')}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-txt-primary flex items-center gap-2">
            <User className="w-5 h-5 text-accent-light" />
            {t('profile.title')}
          </h2>
          <p className="text-xs text-txt-secondary mt-0.5">
            {t('profile.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {saving ? t('common.saving') : savedSuccess ? t('common.saved') : t('profile.saveChanges')}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-xs text-txt-primary uppercase tracking-wider">
            {t('profile.personalInfoTitle')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.fullName')}</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.headline')}</label>
              <input
                type="text"
                value={profile.headline || ''}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.email')}</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.phone')}</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.location')}</label>
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.linkedin')}</label>
              <input
                type="url"
                value={profile.linkedin_url || ''}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.github')}</label>
              <input
                type="url"
                value={profile.github_url || ''}
                onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                placeholder="https://github.com/..."
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">{t('profile.portfolio')}</label>
              <input
                type="url"
                value={profile.portfolio_url || ''}
                onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-2">
          <label className="block text-xs font-semibold text-txt-primary uppercase tracking-wider">
            {t('profile.summaryTitle')}
          </label>
          <textarea
            rows={4}
            value={profile.summary || ''}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            className="w-full bg-surface-200 border border-surface-border rounded-lg p-3 text-sm text-txt-primary focus:outline-none focus:border-accent leading-relaxed"
          />
        </div>

        {/* Skills Tag Cloud */}
        <SkillsTagEditor
          skills={profile.skills}
          onChange={(nextSkills) => setProfile({ ...profile, skills: nextSkills })}
        />

        {/* Experiences Editor */}
        <ExperiencesEditor
          experiences={profile.experiences}
          onChange={(nextExperiences) => setProfile({ ...profile, experiences: nextExperiences })}
        />

        {/* Educations Summary */}
        <EducationsEditor
          educations={profile.educations || []}
          onChange={(nextEducations) => setProfile({ ...profile, educations: nextEducations })}
        />

        {/* Projects */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-txt-primary uppercase tracking-wider flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-accent-light" />
              {t('profile.projectsTitle', { count: (profile.projects || []).length })}
            </h3>
            <button
              type="button"
              onClick={() => setShowAddProj(!showAddProj)}
              className="text-xs text-accent-light hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> {t('profile.addProject')}
            </button>
          </div>

          {showAddProj && (
            <div className="p-3.5 rounded-xl bg-surface-200 border border-surface-border space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={t('profile.projTitlePlaceholder')}
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder={t('profile.projTechPlaceholder')}
                  value={projTech}
                  onChange={(e) => setProjTech(e.target.value)}
                  className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
              </div>
              <textarea
                rows={2}
                placeholder={t('profile.projDescPlaceholder')}
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                className="w-full bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddProj(false)} className="px-2.5 py-1 text-xs text-txt-secondary hover:text-txt-primary">
                  {t('common.cancel')}
                </button>
                <button type="button" onClick={addProject} className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold">
                  {t('profile.saveProject')}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(profile.projects || []).map((proj, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-surface-200/50 border border-surface-border flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-txt-primary">
                    {proj.title} {proj.tech && <span className="text-xs text-accent-light">({proj.tech})</span>}
                  </div>
                  {proj.description && <p className="text-xs text-txt-secondary mt-0.5">{proj.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeProject(idx)}
                  className="p-1.5 text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications & Languages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-xs text-txt-primary uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-accent-light" />
              {t('profile.certificationsTitle')}
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('profile.certNamePlaceholder')}
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                className="flex-1 bg-surface-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder={t('profile.certIssuerPlaceholder')}
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
                className="w-28 bg-surface-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={addCertification}
                className="px-2.5 py-1.5 bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {(profile.certifications || []).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-surface-200/50 border border-surface-border">
                  <span>
                    <strong className="text-txt-primary">{c.name}</strong>
                    {c.issuer && <span className="text-txt-muted"> — {c.issuer}</span>}
                  </span>
                  <button type="button" onClick={() => removeCertification(idx)} className="text-txt-muted hover:text-rose-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <LanguagesEditor
              languages={profile.languages || []}
              onChange={(next) => setProfile({ ...profile!, languages: next })}
            />
        </div>

        {/* Verified Facts */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-xs text-txt-primary uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {t('profile.verifiedFactsTitle')}
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('profile.factPlaceholder')}
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFact(); } }}
              className="flex-1 bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addFact}
              className="px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> {t('common.add')}
            </button>
          </div>
          <ul className="space-y-1.5">
            {(profile.verified_facts || []).map((fact, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-surface-200/50 border border-surface-border text-txt-secondary">
                <span>{fact}</span>
                <button type="button" onClick={() => removeFact(idx)} className="text-txt-muted hover:text-rose-400 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </div>
  );
};
