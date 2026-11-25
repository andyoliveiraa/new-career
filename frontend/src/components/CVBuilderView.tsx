import React, { useState, useEffect, useCallback } from 'react';
import type { CVTemplate, ATSAuditResult } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Palette, Layout, AlertTriangle, Eye, EyeOff,
  ArrowUp, ArrowDown, Sparkles, RefreshCw, Save, Trash2,
  Copy, Star, HelpCircle, User, Type, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, Sliders, X
} from 'lucide-react';

export const CVBuilderView: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<CVTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [auditResult, setAuditResult] = useState<ATSAuditResult | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [activeConfigTab, setActiveConfigTab] = useState<'layout' | 'typography' | 'blocks' | 'photo'>('layout');
  const [showTipsAccordion, setShowTipsAccordion] = useState(true);
  const [customFontInput, setCustomFontInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const presetColors = [
    { name: t('cvBuilder.colorSlateDark'), fullName: t('cvBuilder.colorSlateDark'), hex: '#1e293b' },
    { name: t('cvBuilder.colorBlue'), fullName: t('cvBuilder.colorBlue'), hex: '#2563eb' },
    { name: t('cvBuilder.colorSlate'), fullName: t('cvBuilder.colorSlate'), hex: '#475569' },
    { name: t('cvBuilder.colorEmerald'), fullName: t('cvBuilder.colorEmerald'), hex: '#059669' },
    { name: t('cvBuilder.colorTeal'), fullName: t('cvBuilder.colorTeal'), hex: '#0f766e' },
    { name: t('cvBuilder.colorIndigo'), fullName: t('cvBuilder.colorIndigo'), hex: '#4f46e5' },
    { name: t('cvBuilder.colorPurple'), fullName: t('cvBuilder.colorPurple'), hex: '#7c3aed' },
    { name: t('cvBuilder.colorRuby'), fullName: t('cvBuilder.colorRuby'), hex: '#b91c1c' },
    { name: t('cvBuilder.colorAmber'), fullName: t('cvBuilder.colorAmber'), hex: '#b45309' }
  ];

  const popularGoogleFonts = [
    { name: 'Inter', category: t('cvBuilder.fontCatRecommended') },
    { name: 'Roboto', category: t('cvBuilder.fontCatStandard') },
    { name: 'DM Sans', category: t('cvBuilder.fontCatModern') },
    { name: 'Plus Jakarta Sans', category: t('cvBuilder.fontCatExecutive') },
    { name: 'Outfit', category: t('cvBuilder.fontCatMinimal') },
    { name: 'Space Grotesk', category: t('cvBuilder.fontCatTech') },
    { name: 'Montserrat', category: t('cvBuilder.fontCatBold') },
    { name: 'Poppins', category: t('cvBuilder.fontCatGeometric') },
    { name: 'Open Sans', category: t('cvBuilder.fontCatUniversal') },
    { name: 'Work Sans', category: t('cvBuilder.fontCatClean') },
    { name: 'Manrope', category: t('cvBuilder.fontCatCorporate') },
    { name: 'Merriweather', category: t('cvBuilder.fontCatTraditional') },
    { name: 'Lora', category: t('cvBuilder.fontCatElegant') },
    { name: 'Fira Sans', category: t('cvBuilder.fontCatClear') }
  ];

  const blockDefinitions: Record<string, { label: string; desc: string }> = {
    summary: { label: t('cvBuilder.blockSummary'), desc: t('cvBuilder.blockSummaryDesc') },
    skills: { label: t('cvBuilder.blockSkills'), desc: t('cvBuilder.blockSkillsDesc') },
    experiences: { label: t('cvBuilder.blockExperiences'), desc: t('cvBuilder.blockExperiencesDesc') },
    educations: { label: t('cvBuilder.blockEducations'), desc: t('cvBuilder.blockEducationsDesc') },
    projects: { label: t('cvBuilder.blockProjects'), desc: t('cvBuilder.blockProjectsDesc') },
    certifications: { label: t('cvBuilder.blockCertifications'), desc: t('cvBuilder.blockCertificationsDesc') },
    languages: { label: t('cvBuilder.blockLanguages'), desc: t('cvBuilder.blockLanguagesDesc') }
  };

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getCVTemplates();
      setTemplates(list);
      if (list.length > 0) {
        const def = list.find(t => t.is_default) || list[0];
        setSelectedTemplate(def);
        setCustomFontInput(def.font_family);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const refreshPreviewAndAudit = useCallback(async (tpl: CVTemplate) => {
    setLoadingPreview(true);
    setLoadingAudit(true);
    try {
      const [html, audit] = await Promise.all([
        api.previewCVTemplate(tpl),
        api.auditCVTemplate(tpl)
      ]);
      setPreviewHtml(html);
      setAuditResult(audit);
    } catch (err) {
      console.error('Preview/audit error:', err);
    } finally {
      setLoadingPreview(false);
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const debounceTimer = setTimeout(() => {
        refreshPreviewAndAudit(selectedTemplate);
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [selectedTemplate, refreshPreviewAndAudit]);

  const updateTemplateField = <K extends keyof CVTemplate>(field: K, value: CVTemplate[K]) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({ ...selectedTemplate, [field]: value });
  };

  const handleToggleBlock = (blockKey: string) => {
    if (!selectedTemplate) return;
    const currentVis = selectedTemplate.block_visibility || {};
    updateTemplateField('block_visibility', { ...currentVis, [blockKey]: !currentVis[blockKey] });
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;
    const order = [...selectedTemplate.blocks_order];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;

    const temp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = temp;
    updateTemplateField('blocks_order', order);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const saved = await api.updateCVTemplate(selectedTemplate.id, selectedTemplate);
      setSelectedTemplate(saved);
      setTemplates(prev => prev.map(tpl => tpl.id === saved.id ? saved : tpl));
      setSaveSuccessMsg(t('cvBuilder.saveSuccess'));
      showToast(t('cvBuilder.toastSaved'), 'success');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      showToast(err.message || t('cvBuilder.toastSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTemplateName.trim() || t('cvBuilder.defaultNewName');

    try {
      const created = await api.createCVTemplate({
        name: cleanName,
        layout: 'classic_ats',
        accent_color: '#2563eb',
        font_family: 'Inter',
        font_size_scale: 'normal',
        has_photo: false,
        blocks_order: ['summary', 'skills', 'experiences', 'educations', 'certifications', 'projects', 'languages'],
        block_visibility: {
          summary: true, skills: true, experiences: true,
          educations: true, certifications: true, projects: true, languages: true
        },
        is_default: false
      });
      setTemplates(prev => [created, ...prev]);
      setSelectedTemplate(created);
      setCustomFontInput(created.font_family);
      setShowCreateModal(false);
      setNewTemplateName('');
      showToast(t('cvBuilder.toastCreated'), 'success');
    } catch (err: any) {
      showToast(err.message || t('cvBuilder.toastCreateError'), 'error');
    }
  };

  const handleDuplicateTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const duplicated = await api.createCVTemplate({
        ...selectedTemplate,
        id: undefined,
        name: `${selectedTemplate.name} ${t('cvBuilder.copySuffix')}`,
        is_default: false
      });
      setTemplates(prev => [duplicated, ...prev]);
      setSelectedTemplate(duplicated);
      showToast(t('cvBuilder.toastDuplicated'), 'success');
    } catch (err: any) {
      showToast(err.message || t('cvBuilder.toastDuplicateError'), 'error');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (templates.length <= 1) {
      showToast(t('cvBuilder.toastKeepOne'), 'error');
      return;
    }

    try {
      await api.deleteCVTemplate(selectedTemplate.id);
      const remaining = templates.filter(tpl => tpl.id !== selectedTemplate.id);
      setTemplates(remaining);
      setSelectedTemplate(remaining[0] || null);
      setConfirmingDelete(false);
      showToast(t('cvBuilder.toastDeleted'), 'info');
    } catch (err: any) {
      showToast(err.message || t('cvBuilder.toastDeleteError'), 'error');
    }
  };

  const handleSetDefault = async () => {
    if (!selectedTemplate) return;
    try {
      const updated = await api.updateCVTemplate(selectedTemplate.id, { is_default: true });
      setSelectedTemplate(updated);
      setTemplates(prev => prev.map(tpl => ({ ...tpl, is_default: tpl.id === updated.id })));
      showToast(t('cvBuilder.toastSetDefault'), 'success');
    } catch (err: any) {
      showToast(err.message || t('cvBuilder.toastSetDefaultError'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-txt-muted text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-accent-light" />
          <span>{t('cvBuilder.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-100 p-5 rounded-2xl border border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-accent-light" />
            <h1 className="font-display font-bold text-xl text-txt-primary">
              {t('cvBuilder.title')}
            </h1>
          </div>
          <p className="text-xs text-txt-secondary mt-1">
            {t('cvBuilder.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-200 border border-surface-border rounded-xl px-3 py-1.5">
            <span className="text-xs font-medium text-txt-muted">{t('cvBuilder.templateLabel')}</span>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const found = templates.find(tpl => tpl.id === e.target.value);
                if (found) {
                  setSelectedTemplate(found);
                  setCustomFontInput(found.font_family);
                  setConfirmingDelete(false);
                }
              }}
              className="bg-transparent text-xs font-semibold text-txt-primary focus:outline-none cursor-pointer"
            >
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id} className="bg-surface-100 text-txt-primary">
                  {tpl.name} {tpl.is_default ? t('common.defaultBadge') : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewTemplateName(t('cvBuilder.defaultNewName'));
              setShowCreateModal(true);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-xl transition-colors"
          >
            {t('cvBuilder.newBtn')}
          </button>

          <button
            type="button"
            onClick={handleDuplicateTemplate}
            title={t('cvBuilder.duplicateTooltip')}
            className="p-2 text-txt-secondary hover:text-txt-primary hover:bg-surface-200 rounded-xl border border-surface-border transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {selectedTemplate && !selectedTemplate.is_default && (
            <button
              type="button"
              onClick={handleSetDefault}
              title={t('cvBuilder.setDefaultTooltip')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 rounded-xl border border-amber-500/30 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              {t('cvBuilder.defaultBtn')}
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? t('common.saving') : t('common.save')}
          </button>

          {selectedTemplate && templates.length > 1 && (
            confirmingDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl px-2.5 py-1">
                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                >
                  {t('common.confirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs text-txt-muted hover:text-txt-primary"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                title={t('cvBuilder.deleteTooltip')}
                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                {t('cvBuilder.templateNameLabel')}
              </label>
              <input
                type="text"
                value={selectedTemplate?.name || ''}
                onChange={(e) => updateTemplateField('name', e.target.value)}
                className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                placeholder={t('cvBuilder.templateNamePlaceholder')}
              />
            </div>

            <div className="flex border-b border-surface-border text-xs gap-1">
              <button
                type="button"
                onClick={() => setActiveConfigTab('layout')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'layout' ? 'border-accent text-accent-light' : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Layout className="w-3.5 h-3.5" /> {t('cvBuilder.tabLayout')}
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('blocks')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'blocks' ? 'border-accent text-accent-light' : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> {t('cvBuilder.tabBlocks')}
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('typography')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'typography' ? 'border-accent text-accent-light' : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Type className="w-3.5 h-3.5" /> {t('cvBuilder.tabTypography')}
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('photo')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'photo' ? 'border-accent text-accent-light' : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <User className="w-3.5 h-3.5" /> {t('cvBuilder.tabPhoto')}
              </button>
            </div>

            {activeConfigTab === 'layout' && (
              <div className="space-y-3 pt-2">
                <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                  {t('cvBuilder.structuralLayout')}
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: 'classic_ats',
                      title: t('cvBuilder.layoutClassicTitle'),
                      badge: t('cvBuilder.layoutClassicBadge'),
                      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      desc: t('cvBuilder.layoutClassicDesc')
                    },
                    {
                      id: 'modern_split',
                      title: t('cvBuilder.layoutModernTitle'),
                      badge: t('cvBuilder.layoutModernBadge'),
                      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                      desc: t('cvBuilder.layoutModernDesc')
                    },
                    {
                      id: 'compact_executive',
                      title: t('cvBuilder.layoutCompactTitle'),
                      badge: t('cvBuilder.layoutCompactBadge'),
                      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                      desc: t('cvBuilder.layoutCompactDesc')
                    },
                    {
                      id: 'tech_minimal',
                      title: t('cvBuilder.layoutTechTitle'),
                      badge: t('cvBuilder.layoutTechBadge'),
                      badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
                      desc: t('cvBuilder.layoutTechDesc')
                    }
                  ].map(layoutOpt => (
                    <div
                      key={layoutOpt.id}
                      onClick={() => updateTemplateField('layout', layoutOpt.id as any)}
                      className={`p-3 rounded-xl border text-start cursor-pointer transition-all ${
                        selectedTemplate?.layout === layoutOpt.id
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'border-surface-border bg-surface-200/50 hover:bg-surface-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-txt-primary">{layoutOpt.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${layoutOpt.badgeColor}`}>
                          {layoutOpt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-secondary leading-relaxed">{layoutOpt.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                    {t('cvBuilder.spacingScale')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'compact', label: t('cvBuilder.scaleCompact') },
                      { id: 'normal', label: t('cvBuilder.scaleNormal') },
                      { id: 'spacious', label: t('cvBuilder.scaleSpacious') }
                    ].map(scale => (
                      <button
                        key={scale.id}
                        type="button"
                        onClick={() => updateTemplateField('font_size_scale', scale.id as any)}
                        className={`py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                          selectedTemplate?.font_size_scale === scale.id
                            ? 'border-accent bg-accent/10 text-accent-light'
                            : 'border-surface-border bg-surface-200 text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {scale.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeConfigTab === 'blocks' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                    {t('cvBuilder.blocksOrderTitle')}
                  </label>
                  <span className="text-[10px] text-txt-muted">{t('cvBuilder.blocksOrderHint')}</span>
                </div>

                <div className="space-y-2">
                  {selectedTemplate?.blocks_order.map((blockKey, idx) => {
                    const blockDef = blockDefinitions[blockKey] || { label: blockKey, desc: '' };
                    const isVisible = selectedTemplate.block_visibility[blockKey] !== false;

                    return (
                      <div
                        key={blockKey}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isVisible
                            ? 'border-surface-border bg-surface-200 text-txt-primary'
                            : 'border-surface-border/50 bg-surface-200/30 text-txt-muted opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(blockKey)}
                            title={isVisible ? t('cvBuilder.hideBlock') : t('cvBuilder.showBlock')}
                            className={`p-1 rounded-lg transition-colors ${
                              isVisible ? 'text-accent-light hover:bg-accent/10' : 'text-txt-muted hover:bg-surface-300'
                            }`}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{blockDef.label}</div>
                            <div className="text-[10px] text-txt-muted truncate">{blockDef.desc}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-txt-secondary hover:text-txt-primary hover:bg-surface-300 disabled:opacity-30"
                            title={t('cvBuilder.moveUp')}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(idx, 'down')}
                            disabled={idx === selectedTemplate.blocks_order.length - 1}
                            className="p-1 rounded text-txt-secondary hover:text-txt-primary hover:bg-surface-300 disabled:opacity-30"
                            title={t('cvBuilder.moveDown')}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeConfigTab === 'typography' && (
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                      {t('cvBuilder.accentColorLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedTemplate?.accent_color || '#2563eb'}
                        onChange={(e) => updateTemplateField('accent_color', e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-surface-border bg-transparent"
                        title={t('cvBuilder.freeColorPicker')}
                      />
                      <input
                        type="text"
                        value={selectedTemplate?.accent_color || ''}
                        onChange={(e) => updateTemplateField('accent_color', e.target.value)}
                        className="w-20 text-[11px] font-mono bg-surface-200 border border-surface-border rounded px-2 py-1 text-txt-primary text-center"
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {presetColors.map(preset => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => updateTemplateField('accent_color', preset.hex)}
                        title={preset.fullName}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-start text-[11px] transition-all ${
                          selectedTemplate?.accent_color?.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-accent bg-accent/10 font-bold'
                            : 'border-surface-border bg-surface-200 hover:bg-surface-300'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: preset.hex }} />
                        <span className="truncate text-txt-secondary font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                    {t('cvBuilder.bodyFontLabel')}
                  </label>
                  <select
                    value={selectedTemplate?.font_family || 'Inter'}
                    onChange={(e) => {
                      updateTemplateField('font_family', e.target.value);
                      setCustomFontInput(e.target.value);
                    }}
                    className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent mb-2"
                  >
                    {popularGoogleFonts.map(f => (
                      <option key={f.name} value={f.name} className="bg-surface-100">
                        {f.name} — {f.category}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-1">
                    <span className="text-[10px] text-txt-muted">
                      {t('cvBuilder.customFontHint')}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customFontInput}
                        onChange={(e) => setCustomFontInput(e.target.value)}
                        placeholder="Ex: Sora, Lexend"
                        className="flex-1 bg-surface-200 border border-surface-border rounded-xl px-3 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customFontInput.trim()) {
                            updateTemplateField('font_family', customFontInput.trim());
                          }
                        }}
                        className="px-3 py-1.5 bg-surface-300 hover:bg-surface-border text-xs rounded-xl text-txt-primary font-medium transition-colors"
                      >
                        {t('cvBuilder.applyFont')}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                    {t('cvBuilder.headingFontLabel')}
                  </label>
                  <select
                    value={selectedTemplate?.font_heading || selectedTemplate?.font_family || 'Inter'}
                    onChange={(e) => updateTemplateField('font_heading', e.target.value)}
                    className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">{t('cvBuilder.sameAsBodyFont')}</option>
                    {popularGoogleFonts.map(f => (
                      <option key={f.name} value={f.name} className="bg-surface-100">
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeConfigTab === 'photo' && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-200 border border-surface-border">
                  <div>
                    <span className="text-xs font-semibold text-txt-primary block">{t('cvBuilder.includePhotoTitle')}</span>
                    <span className="text-[10px] text-txt-muted">
                      {selectedTemplate?.has_photo ? t('cvBuilder.photoEnabledDesc') : t('cvBuilder.photoDisabledDesc')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTemplate?.has_photo || false}
                    onChange={(e) => updateTemplateField('has_photo', e.target.checked)}
                    className="w-4 h-4 rounded text-accent cursor-pointer"
                  />
                </div>

                {selectedTemplate?.has_photo && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                        {t('cvBuilder.photoUrlLabel')}
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate?.photo_url || ''}
                        onChange={(e) => updateTemplateField('photo_url', e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {t('cvBuilder.photoWarningTitle')}
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        {t('cvBuilder.photoWarningDesc')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: LIVE A4 PREVIEW */}
        <div className="lg:col-span-7 xl:col-span-5 space-y-3">
          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 flex flex-col h-[780px]">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-txt-primary uppercase tracking-wider">
                  {t('cvBuilder.previewTitle')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => selectedTemplate && refreshPreviewAndAudit(selectedTemplate)}
                disabled={loadingPreview}
                className="p-1.5 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-surface-200 transition-colors"
                title={t('cvBuilder.reloadPreview')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin text-accent-light' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-900/50 p-4 rounded-xl mt-3 flex justify-center">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full text-txt-muted text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-accent-light" />
                  <span>{t('cvBuilder.compilingPreview')}</span>
                </div>
              ) : previewHtml ? (
                <div className="w-full bg-white rounded-lg shadow-xl overflow-hidden border border-slate-300">
                  <iframe
                    title="CV Preview"
                    srcDoc={previewHtml}
                    className="w-full h-full min-h-[700px] border-0"
                    sandbox=""
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-txt-muted text-xs">
                  {t('cvBuilder.noPreviewData')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 3: REAL-TIME ATS AUDIT & CRAFT TIPS */}
        <div className="lg:col-span-12 xl:col-span-3 space-y-4">
          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-txt-muted uppercase tracking-wider">
                {t('cvBuilder.atsAuditTitle')}
              </span>
              <Sparkles className="w-4 h-4 text-accent-light" />
            </div>

            {loadingAudit ? (
              <div className="py-8 text-center text-xs text-txt-muted">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent-light" />
                <span>{t('cvBuilder.auditingAts')}</span>
              </div>
            ) : auditResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-200 border border-surface-border">
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-display font-extrabold text-xl shrink-0 ${
                      auditResult.score >= 85
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : auditResult.score >= 70
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <span>{auditResult.score}</span>
                    <span className="text-[9px] font-normal opacity-70">/100</span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-txt-primary">
                      {auditResult.score >= 85
                        ? t('cvBuilder.atsExcellent')
                        : auditResult.score >= 70
                        ? t('cvBuilder.atsGood')
                        : t('cvBuilder.atsNeedsWork')}
                    </div>
                    <div className="text-[11px] text-txt-muted leading-tight mt-0.5">
                      {auditResult.summary}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider block">
                    {t('cvBuilder.checklistTitle')}
                  </span>
                  {auditResult.checklist.map(item => (
                    <div key={item.id} className="text-xs p-2 rounded-lg bg-surface-200/50 border border-surface-border/60 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-txt-primary flex items-center gap-1.5">
                          {item.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          {item.label}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${item.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {item.passed ? t('cvBuilder.passedBadge') : t('cvBuilder.warningBadge')}
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-muted ps-5">{item.message}</p>
                    </div>
                  ))}
                </div>

                {auditResult.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                    <span className="text-xs font-bold text-amber-400 block">{t('cvBuilder.warningsTitle')}</span>
                    <ul className="text-[11px] text-txt-secondary space-y-1 list-disc ps-4">
                      {auditResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {auditResult.strengths.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-400 block">{t('cvBuilder.strengthsTitle')}</span>
                    <ul className="text-[11px] text-txt-secondary space-y-1 list-disc ps-4">
                      {auditResult.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowTipsAccordion(!showTipsAccordion)}
              className="w-full flex items-center justify-between text-start focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent-light" />
                <span className="text-xs font-bold text-txt-primary uppercase tracking-wider">
                  {t('cvBuilder.goldenTipsTitle')}
                </span>
              </div>
              {showTipsAccordion ? <ChevronUp className="w-4 h-4 text-txt-muted" /> : <ChevronDown className="w-4 h-4 text-txt-muted" />}
            </button>

            {showTipsAccordion && (
              <div className="space-y-3 pt-2 text-xs text-txt-secondary border-t border-surface-border">
                <div className="p-2.5 rounded-xl bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-semibold text-txt-primary">{t('cvBuilder.tipXyzTitle')}</div>
                  <p className="text-[11px] text-txt-muted">
                    {t('cvBuilder.tipXyzDesc')}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-semibold text-txt-primary">{t('cvBuilder.tipSixSecTitle')}</div>
                  <p className="text-[11px] text-txt-muted">
                    {t('cvBuilder.tipSixSecDesc')}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-semibold text-txt-primary">{t('cvBuilder.tipPhotoTitle')}</div>
                  <p className="text-[11px] text-txt-muted">
                    {t('cvBuilder.tipPhotoDesc')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-100 border border-surface-border rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="font-display font-bold text-base text-txt-primary">{t('cvBuilder.newModalTitle')}</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-txt-muted hover:text-txt-primary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNewTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">{t('cvBuilder.templateNameLabel')}</label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold"
                >
                  {t('cvBuilder.createTemplateBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
