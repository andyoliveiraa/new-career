import React, { useState, useEffect } from 'react';
import type { ProfileData } from '../types';
import { api } from '../api';
import { User, Save, Plus, Trash2, CheckCircle2, GraduationCap } from 'lucide-react';

interface ProfileViewProps {
  onSaved?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onSaved }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newDegree, setNewDegree] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [showAddEdu, setShowAddEdu] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
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
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onSaved) onSaved();
    } catch (err) {
      alert('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim() || !profile) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skillToRemove)
    });
  };

  const addEducation = () => {
    if (!newDegree.trim() || !newInstitution.trim() || !profile) return;
    const newEdu = {
      degree: newDegree.trim(),
      institution: newInstitution.trim(),
      period: newPeriod.trim() || 'Concluído'
    };
    setProfile({
      ...profile,
      educations: [...(profile.educations || []), newEdu]
    });
    setNewDegree('');
    setNewInstitution('');
    setNewPeriod('');
    setShowAddEdu(false);
  };

  const removeEducation = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      educations: (profile.educations || []).filter((_, idx) => idx !== index)
    });
  };

  if (loading || !profile) {
    return <div className="p-12 text-center text-txt-muted text-sm">Carregando perfil mestre...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-txt-primary flex items-center gap-2">
            <User className="w-5 h-5 text-accent-light" />
            Perfil Mestre do Candidato
          </h2>
          <p className="text-xs text-txt-secondary mt-0.5">
            Dados autênticos e fatos verificados que alimentam a geração de currículos ATS sem alucinações.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {saving ? 'A guardar...' : savedSuccess ? 'Guardado!' : 'Guardar Alterações'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-txt-primary uppercase tracking-wider text-xs">
            Informações Pessoais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Nome Completo</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Título Profissional (Headline)</label>
              <input
                type="text"
                value={profile.headline || ''}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Email</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Telefone</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Localização Base</label>
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={profile.linkedin_url || ''}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-2">
          <label className="block text-xs font-semibold text-txt-primary uppercase tracking-wider">
            Resumo Profissional Base
          </label>
          <textarea
            rows={4}
            value={profile.summary || ''}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            className="w-full bg-surface-200 border border-surface-border rounded-lg p-3 text-sm text-txt-primary focus:outline-none focus:border-accent leading-relaxed"
          />
        </div>

        {/* Skills Tag Cloud */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-3">
          <label className="block text-xs font-semibold text-txt-primary uppercase tracking-wider">
            Competências Técnicas & Ferramentas
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar nova competência (ex: Docker, FastAPI)..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              className="flex-1 bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {profile.skills.map((s, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-200 border border-surface-border text-xs text-txt-primary">
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Experiences Summary */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-txt-primary uppercase tracking-wider text-xs">
            Experiências Profissionais Registadas ({profile.experiences.length})
          </h3>
          <div className="space-y-3">
            {profile.experiences.map((exp, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-surface-200/50 border border-surface-border space-y-1">
                <div className="flex justify-between text-sm font-medium text-txt-primary">
                  <span>{exp.role} — <span className="text-accent-light">{exp.company}</span></span>
                  <span className="text-xs text-txt-muted">{exp.period}</span>
                </div>
                {exp.bullets && (
                  <ul className="text-xs text-txt-secondary list-disc pl-4 space-y-1 pt-1">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Educations Summary */}
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-txt-primary uppercase tracking-wider text-xs flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-accent-light" />
              Formação Académica Registada ({(profile.educations || []).length})
            </h3>
            <button
              type="button"
              onClick={() => setShowAddEdu(!showAddEdu)}
              className="text-xs text-accent-light hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Formação
            </button>
          </div>

          {showAddEdu && (
            <div className="p-3.5 rounded-xl bg-surface-200 border border-surface-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Grau / Curso (ex: Licenciatura em Engenharia)"
                  value={newDegree}
                  onChange={(e) => setNewDegree(e.target.value)}
                  className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Instituição (ex: Univ. de Lisboa)"
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                  className="bg-surface-100 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Período (ex: 2019 - 2023)"
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
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={addEducation}
                  className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Guardar Formação
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(!profile.educations || profile.educations.length === 0) ? (
              <div className="text-xs text-txt-muted py-2">Nenhuma formação académica adicionada.</div>
            ) : (
              profile.educations.map((edu, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-surface-200/50 border border-surface-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-txt-primary">
                      {edu.degree} — <span className="text-accent-light">{edu.institution}</span>
                    </div>
                    <div className="text-xs text-txt-muted">{edu.period}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEducation(idx)}
                    className="p-1.5 text-txt-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    title="Remover formação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
