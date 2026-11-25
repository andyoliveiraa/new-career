import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CVTemplate, ATSAuditResult } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Palette, Layout, AlertTriangle, Eye, EyeOff,
  ArrowUp, ArrowDown, Sparkles, RefreshCw, Save, Trash2,
  Copy, Star, HelpCircle, User, Type, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, Sliders, X,
  ZoomIn, ZoomOut, Maximize2, MoveHorizontal, Lightbulb, Upload
} from 'lucide-react';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

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
  const [showTipsAccordion, setShowTipsAccordion] = useState(false);
  const [showStrengthsAccordion, setShowStrengthsAccordion] = useState(false);
  const [customFontInput, setCustomFontInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // A4 Preview scaling state
  const previewStageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({ width: 640, height: 740 });
  const [zoomMode, setZoomMode] = useState<'fitPage' | 'fitWidth' | 'manual'>('fitPage');
  const [manualZoom, setManualZoom] = useState<number>(0.7);
  const [docHeight, setDocHeight] = useState<number>(A4_HEIGHT_PX);

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

  useEffect(() => {
    const el = previewStageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setStageSize({ width, height });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  const measureIframeHeight = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const bodyHeight = doc.body?.scrollHeight || 0;
      const docElHeight = doc.documentElement?.scrollHeight || 0;
      const measured = Math.max(bodyHeight, docElHeight, A4_HEIGHT_PX);
      setDocHeight(measured);
    } catch {
      setDocHeight(A4_HEIGHT_PX);
    }
  }, []);

  const computedScale = React.useMemo(() => {
    const availW = Math.max(240, stageSize.width - 32);
    const availH = Math.max(320, stageSize.height - 32);
    if (zoomMode === 'fitPage') {
      return Math.min(availW / A4_WIDTH_PX, availH / A4_HEIGHT_PX, 1);
    }
    if (zoomMode === 'fitWidth') {
      return Math.min(availW / A4_WIDTH_PX, 1.25);
    }
    return manualZoom;
  }, [stageSize, zoomMode, manualZoom]);

  const pageCount = Math.max(1, Math.ceil((docHeight - 16) / A4_HEIGHT_PX));

  const updateTemplateField = <K extends keyof CVTemplate>(field: K, value: CVTemplate[K]) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({ ...selectedTemplate, [field]: value });
  };

  const handleToggleBlock = (blockKey: string) => {
    if (!selectedTemplate) return;
    const currentVis = selectedTemplate.block_visibility || {};
    updateTemplateField('block_visibility', { ...currentVis, [blockKey]: !currentVis[blockKey] });
  };

  const processPhotoFile = useCallback((file: File) => {
    if (!selectedTemplate) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast(t('cvBuilder.photoUploadInvalid'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 480;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setSelectedTemplate((prev) => (prev ? { ...prev, has_photo: true, photo_url: dataUrl } : prev));
        showToast(t('cvBuilder.photoUploadSuccess'), 'success');
      };
      img.onerror = () => {
        showToast(t('cvBuilder.photoUploadInvalid'), 'error');
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.onerror = () => {
      showToast(t('cvBuilder.photoUploadInvalid'), 'error');
    };
    reader.readAsDataURL(file);
  }, [selectedTemplate, showToast, t]);

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
    <div className="space-y-4">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-surface-100 p-4 rounded-xl border border-surface-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent-light shrink-0" />
            <h1 className="font-display font-semibold text-lg text-txt-primary truncate">
              {t('cvBuilder.title')}
            </h1>
          </div>
          <p className="text-xs text-txt-secondary mt-1 truncate">
            {t('cvBuilder.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 shrink-0">
          <div className="h-9 flex items-center gap-2 bg-surface-200 border border-surface-border rounded-lg px-3">
            <span className="text-xs font-medium text-txt-muted shrink-0">{t('cvBuilder.templateLabel')}</span>
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
              className="bg-transparent text-xs font-medium text-txt-primary focus:outline-none cursor-pointer max-w-[220px] truncate"
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
            className="h-9 px-3 text-xs font-medium bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-lg transition-colors whitespace-nowrap"
          >
            {t('cvBuilder.newBtn')}
          </button>

          <button
            type="button"
            onClick={handleDuplicateTemplate}
            title={t('cvBuilder.duplicateTooltip')}
            className="h-9 w-9 flex items-center justify-center text-txt-secondary hover:text-txt-primary bg-surface-200 hover:bg-surface-300 rounded-lg border border-surface-border transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>

          {selectedTemplate && !selectedTemplate.is_default && (
            <button
              type="button"
              onClick={handleSetDefault}
              title={t('cvBuilder.setDefaultTooltip')}
              className="h-9 flex items-center gap-1.5 px-3 text-xs font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg border border-amber-500/30 transition-colors whitespace-nowrap"
            >
              <Star className="w-3.5 h-3.5" />
              {t('cvBuilder.defaultBtn')}
            </button>
          )}

          {selectedTemplate && templates.length > 1 && (
            confirmingDelete ? (
              <div className="h-9 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3">
                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  className="text-xs font-medium text-rose-400 hover:text-rose-300"
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
                className="h-9 w-9 flex items-center justify-center text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving}
            className="h-9 flex items-center gap-1.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-[336px_minmax(0,1fr)_344px] gap-4 items-start">
        <div className="lg:col-span-5 xl:col-span-1 space-y-4">
          <div className="bg-surface-100 border border-surface-border rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1.5">
                {t('cvBuilder.templateNameLabel')}
              </label>
              <input
                type="text"
                value={selectedTemplate?.name || ''}
                onChange={(e) => updateTemplateField('name', e.target.value)}
                className="w-full h-9 bg-surface-200 border border-surface-border rounded-lg px-3 text-xs text-txt-primary focus:outline-none focus:border-accent"
                placeholder={t('cvBuilder.templateNamePlaceholder')}
              />
            </div>

            <div className="flex flex-wrap gap-1 p-1 bg-surface-200/70 border border-surface-border rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveConfigTab('layout')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  activeConfigTab === 'layout' ? 'bg-surface-300 text-txt-primary border border-surface-border' : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Layout className="w-3.5 h-3.5 shrink-0" />
                <span>{t('cvBuilder.tabLayout')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('blocks')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  activeConfigTab === 'blocks' ? 'bg-surface-300 text-txt-primary border border-surface-border' : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span>{t('cvBuilder.tabBlocks')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('typography')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  activeConfigTab === 'typography' ? 'bg-surface-300 text-txt-primary border border-surface-border' : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Type className="w-3.5 h-3.5 shrink-0" />
                <span>{t('cvBuilder.tabTypography')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveConfigTab('photo')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  activeConfigTab === 'photo' ? 'bg-surface-300 text-txt-primary border border-surface-border' : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>{t('cvBuilder.tabPhoto')}</span>
              </button>
            </div>

            {activeConfigTab === 'layout' && (
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-medium text-txt-secondary">
                  {t('cvBuilder.structuralLayout')}
                </label>

                <div className="grid grid-cols-1 gap-2">
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
                    <button
                      type="button"
                      key={layoutOpt.id}
                      onClick={() => updateTemplateField('layout', layoutOpt.id as any)}
                      className={`w-full p-3 rounded-lg border text-start transition-colors ${
                        selectedTemplate?.layout === layoutOpt.id
                          ? 'border-accent bg-accent/10'
                          : 'border-surface-border bg-surface-200/50 hover:bg-surface-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-txt-primary">{layoutOpt.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium shrink-0 ${layoutOpt.badgeColor}`}>
                          {layoutOpt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-secondary leading-relaxed">{layoutOpt.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-medium text-txt-secondary mb-1.5">
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
                        className={`h-8 text-xs rounded-lg border font-medium transition-colors ${
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
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-txt-secondary">
                    {t('cvBuilder.blocksOrderTitle')}
                  </label>
                  <span className="text-[11px] text-txt-muted">{t('cvBuilder.blocksOrderHint')}</span>
                </div>

                <div className="space-y-2">
                  {selectedTemplate?.blocks_order.map((blockKey, idx) => {
                    const blockDef = blockDefinitions[blockKey] || { label: blockKey, desc: '' };
                    const isVisible = selectedTemplate.block_visibility[blockKey] !== false;

                    return (
                      <div
                        key={blockKey}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
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
                            className={`p-1 rounded-md transition-colors ${
                              isVisible ? 'text-accent-light hover:bg-accent/10' : 'text-txt-muted hover:bg-surface-300'
                            }`}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{blockDef.label}</div>
                            <div className="text-[11px] text-txt-muted truncate">{blockDef.desc}</div>
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
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-txt-secondary">
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
                        className="w-20 h-7 text-[11px] font-mono bg-surface-200 border border-surface-border rounded-md px-2 text-txt-primary text-center"
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
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-start text-[11px] transition-colors ${
                          selectedTemplate?.accent_color?.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-accent bg-accent/10 font-medium text-txt-primary'
                            : 'border-surface-border bg-surface-200 hover:bg-surface-300 text-txt-secondary'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: preset.hex }} />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1.5">
                    {t('cvBuilder.bodyFontLabel')}
                  </label>
                  <select
                    value={selectedTemplate?.font_family || 'Inter'}
                    onChange={(e) => {
                      updateTemplateField('font_family', e.target.value);
                      setCustomFontInput(e.target.value);
                    }}
                    className="w-full h-9 bg-surface-200 border border-surface-border rounded-lg px-3 text-xs text-txt-primary focus:outline-none focus:border-accent mb-2"
                  >
                    {popularGoogleFonts.map(f => (
                      <option key={f.name} value={f.name} className="bg-surface-100">
                        {f.name} — {f.category}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-txt-muted block">
                      {t('cvBuilder.customFontHint')}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customFontInput}
                        onChange={(e) => setCustomFontInput(e.target.value)}
                        placeholder="Ex: Sora, Lexend"
                        className="flex-1 h-8 bg-surface-200 border border-surface-border rounded-lg px-3 text-xs text-txt-primary focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customFontInput.trim()) {
                            updateTemplateField('font_family', customFontInput.trim());
                          }
                        }}
                        className="h-8 px-3 bg-surface-300 hover:bg-surface-border text-xs rounded-lg text-txt-primary font-medium transition-colors"
                      >
                        {t('cvBuilder.applyFont')}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1.5">
                    {t('cvBuilder.headingFontLabel')}
                  </label>
                  <select
                    value={selectedTemplate?.font_heading || selectedTemplate?.font_family || 'Inter'}
                    onChange={(e) => updateTemplateField('font_heading', e.target.value)}
                    className="w-full h-9 bg-surface-200 border border-surface-border rounded-lg px-3 text-xs text-txt-primary focus:outline-none focus:border-accent"
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
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-200 border border-surface-border">
                  <div>
                    <span className="text-xs font-medium text-txt-primary block">{t('cvBuilder.includePhotoTitle')}</span>
                    <span className="text-[11px] text-txt-muted">
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
                      <label className="block text-xs font-medium text-txt-secondary mb-1.5">
                        {t('cvBuilder.photoUploadTitle')}
                      </label>

                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processPhotoFile(file);
                          e.target.value = '';
                        }}
                      />

                      {selectedTemplate.photo_url ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-200 border border-surface-border">
                          <img
                            src={selectedTemplate.photo_url}
                            alt={selectedTemplate.name}
                            className="w-14 h-14 rounded-full object-cover border border-surface-border shrink-0 bg-white"
                          />
                          <div className="flex-1 min-w-0 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="h-8 px-3 rounded-lg bg-surface-300 hover:bg-surface-border text-xs font-medium text-txt-primary transition-colors flex items-center gap-1.5"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {t('cvBuilder.photoChangeBtn')}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTemplateField('photo_url', '')}
                              className="h-8 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium text-rose-400 transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {t('cvBuilder.photoRemoveBtn')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingPhoto(true);
                          }}
                          onDragLeave={() => setIsDraggingPhoto(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingPhoto(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) processPhotoFile(file);
                          }}
                          className={`w-full p-5 rounded-lg border border-dashed text-center transition-colors flex flex-col items-center gap-2 ${
                            isDraggingPhoto
                              ? 'border-accent bg-accent/10 text-txt-primary'
                              : 'border-surface-border bg-surface-200/50 hover:bg-surface-200 text-txt-secondary hover:text-txt-primary'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-surface-300 border border-surface-border flex items-center justify-center text-accent-light">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-txt-primary">
                            {t('cvBuilder.photoUploadCta')}
                          </span>
                          <span className="text-[11px] text-txt-muted leading-snug">
                            {t('cvBuilder.photoDropHint')}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
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

        {/* COLUMN 2: FULL A4 LIVE PREVIEW */}
        <div className="lg:col-span-7 xl:col-span-1">
          <div className="bg-surface-100 border border-surface-border rounded-xl flex flex-col h-[700px] lg:h-[calc(100vh-12.5rem)] lg:min-h-[680px] lg:max-h-[940px]">
            <div className="px-4 py-2.5 border-b border-surface-border flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-txt-primary truncate">
                  {t('cvBuilder.previewTitle')}
                </span>
                {previewHtml && !loadingPreview && (
                  <span className="text-[11px] font-mono tabular-nums text-txt-muted bg-surface-200 border border-surface-border px-2 py-0.5 rounded shrink-0">
                    {pageCount === 1
                      ? t('cvBuilder.pageCountSingular')
                      : t('cvBuilder.pageCountPlural', { count: pageCount })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center bg-surface-200 border border-surface-border rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomMode('fitPage')}
                    className={`h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      zoomMode === 'fitPage'
                        ? 'bg-surface-300 text-txt-primary'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('cvBuilder.fitPage')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode('fitWidth')}
                    className={`h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      zoomMode === 'fitWidth'
                        ? 'bg-surface-300 text-txt-primary'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    <MoveHorizontal className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('cvBuilder.fitWidth')}</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center bg-surface-200 border border-surface-border rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0.4, Number((computedScale - 0.1).toFixed(2)));
                      setManualZoom(next);
                      setZoomMode('manual');
                    }}
                    className="h-7 w-7 flex items-center justify-center text-txt-muted hover:text-txt-primary"
                    title={t('cvBuilder.zoomOut')}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono tabular-nums text-txt-secondary px-1.5 min-w-[40px] text-center">
                    {Math.round(computedScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(1.3, Number((computedScale + 0.1).toFixed(2)));
                      setManualZoom(next);
                      setZoomMode('manual');
                    }}
                    className="h-7 w-7 flex items-center justify-center text-txt-muted hover:text-txt-primary"
                    title={t('cvBuilder.zoomIn')}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => selectedTemplate && refreshPreviewAndAudit(selectedTemplate)}
                  disabled={loadingPreview}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-txt-secondary hover:text-txt-primary bg-surface-200 hover:bg-surface-300 border border-surface-border transition-colors"
                  title={t('cvBuilder.reloadPreview')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin text-accent-light' : ''}`} />
                </button>
              </div>
            </div>

            <div
              ref={previewStageRef}
              className="flex-1 overflow-auto bg-[#0b101b] p-4 rounded-b-xl flex justify-center items-start"
            >
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full text-txt-muted text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-accent-light" />
                  <span>{t('cvBuilder.compilingPreview')}</span>
                </div>
              ) : previewHtml ? (
                <div
                  style={{
                    width: `${Math.round(A4_WIDTH_PX * computedScale)}px`,
                    height: `${Math.round(docHeight * computedScale)}px`,
                  }}
                  className="relative shrink-0 mx-auto"
                >
                  <div
                    style={{
                      width: `${A4_WIDTH_PX}px`,
                      height: `${docHeight}px`,
                      transform: `scale(${computedScale})`,
                      transformOrigin: 'top left',
                    }}
                    className="relative bg-white rounded-sm shadow-2xl border border-slate-300/60 overflow-hidden"
                  >
                    <iframe
                      ref={iframeRef}
                      title="CV Preview"
                      srcDoc={previewHtml}
                      onLoad={() => {
                        measureIframeHeight();
                        setTimeout(measureIframeHeight, 350);
                      }}
                      style={{ width: `${A4_WIDTH_PX}px`, height: `${docHeight}px` }}
                      className="border-0 block"
                      sandbox="allow-same-origin"
                    />

                    {Array.from({ length: Math.max(0, pageCount - 1) }).map((_, idx) => (
                      <div
                        key={idx}
                        style={{ top: `${(idx + 1) * A4_HEIGHT_PX}px` }}
                        className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-blue-500/40 flex justify-end pr-3"
                      >
                        <span className="-mt-2.5 bg-blue-600 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                          A4 · {idx + 2}
                        </span>
                      </div>
                    ))}
                  </div>
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
        <div className="lg:col-span-12 xl:col-span-1 space-y-4">
          <div className="bg-surface-100 border border-surface-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-txt-secondary">
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-200 border border-surface-border">
                  <div
                    className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-display font-semibold text-xl tabular-nums shrink-0 ${
                      auditResult.score >= 85
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : auditResult.score >= 70
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <span>{auditResult.score}</span>
                    <span className="text-[10px] font-normal opacity-75">/100</span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-txt-primary">
                      {auditResult.score >= 85
                        ? t('cvBuilder.atsExcellent')
                        : auditResult.score >= 70
                        ? t('cvBuilder.atsGood')
                        : t('cvBuilder.atsNeedsWork')}
                    </div>
                    <div className="text-[11px] text-txt-muted leading-snug mt-0.5">
                      {auditResult.summary}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-txt-secondary block">
                    {t('cvBuilder.checklistTitle')}
                  </span>
                  {auditResult.checklist.map(item => (
                    <div key={item.id} className="text-xs p-2.5 rounded-lg bg-surface-200/50 border border-surface-border/70 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-txt-primary flex items-center gap-1.5 min-w-0">
                          {item.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                            item.passed
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {item.passed ? t('cvBuilder.passedBadge') : t('cvBuilder.warningBadge')}
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-muted ps-5 leading-relaxed">{item.message}</p>
                    </div>
                  ))}
                </div>

                {auditResult.actionable_tips && auditResult.actionable_tips.length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                    <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                      {t('cvBuilder.actionableTipsTitle')}
                    </span>
                    <ul className="text-[11px] text-txt-secondary space-y-1 list-disc ps-4 leading-relaxed">
                      {auditResult.actionable_tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {auditResult.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                    <span className="text-xs font-medium text-amber-400 block">{t('cvBuilder.warningsTitle')}</span>
                    <ul className="text-[11px] text-txt-secondary space-y-1 list-disc ps-4 leading-relaxed">
                      {auditResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {auditResult.strengths.length > 0 && (
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                    <button
                      type="button"
                      onClick={() => setShowStrengthsAccordion(!showStrengthsAccordion)}
                      className="w-full flex items-center justify-between text-start"
                    >
                      <span className="text-xs font-medium text-emerald-400">
                        {t('cvBuilder.strengthsTitle')} ({auditResult.strengths.length})
                      </span>
                      {showStrengthsAccordion ? (
                        <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                    {showStrengthsAccordion && (
                      <ul className="text-[11px] text-txt-secondary space-y-1 list-disc ps-4 mt-2 pt-2 border-t border-emerald-500/15 leading-relaxed">
                        {auditResult.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="bg-surface-100 border border-surface-border rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowTipsAccordion(!showTipsAccordion)}
              className="w-full flex items-center justify-between text-start focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent-light" />
                <span className="text-xs font-medium text-txt-primary">
                  {t('cvBuilder.goldenTipsTitle')}
                </span>
              </div>
              {showTipsAccordion ? <ChevronUp className="w-4 h-4 text-txt-muted" /> : <ChevronDown className="w-4 h-4 text-txt-muted" />}
            </button>

            {showTipsAccordion && (
              <div className="space-y-2.5 pt-2 text-xs text-txt-secondary border-t border-surface-border">
                <div className="p-2.5 rounded-lg bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-medium text-txt-primary">{t('cvBuilder.tipXyzTitle')}</div>
                  <p className="text-[11px] text-txt-muted leading-relaxed">
                    {t('cvBuilder.tipXyzDesc')}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-medium text-txt-primary">{t('cvBuilder.tipSixSecTitle')}</div>
                  <p className="text-[11px] text-txt-muted leading-relaxed">
                    {t('cvBuilder.tipSixSecDesc')}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-medium text-txt-primary">{t('cvBuilder.tipPhotoTitle')}</div>
                  <p className="text-[11px] text-txt-muted leading-relaxed">
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
