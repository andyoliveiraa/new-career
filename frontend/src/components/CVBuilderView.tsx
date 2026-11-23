import React, { useState, useEffect, useCallback } from 'react';
import type { CVTemplate, ATSAuditResult } from '../types';
import { api } from '../api';
import {
  Palette, Layout, AlertTriangle, Eye, EyeOff,
  ArrowUp, ArrowDown, Sparkles, RefreshCw, Save, Trash2,
  Copy, Star, HelpCircle, User, Type, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, Sliders
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Grafite Executivo', hex: '#1e293b' },
  { name: 'Azul Corporativo', hex: '#2563eb' },
  { name: 'Azul Ardósia', hex: '#475569' },
  { name: 'Verde Esmeralda', hex: '#059669' },
  { name: 'Teal Moderno', hex: '#0f766e' },
  { name: 'Índigo Profissional', hex: '#4f46e5' },
  { name: 'Roxo Criativo', hex: '#7c3aed' },
  { name: 'Rubi Elegante', hex: '#b91c1c' },
  { name: 'Âmbar Premium', hex: '#b45309' }
];

const POPULAR_GOOGLE_FONTS = [
  { name: 'Inter', category: 'Sans-Serif (Recomendada ATS)' },
  { name: 'Roboto', category: 'Sans-Serif (Padrão ATS)' },
  { name: 'DM Sans', category: 'Sans-Serif (Moderno)' },
  { name: 'Plus Jakarta Sans', category: 'Sans-Serif (Executivo)' },
  { name: 'Outfit', category: 'Sans-Serif (Minimalista)' },
  { name: 'Space Grotesk', category: 'Tech / Engenharia' },
  { name: 'Montserrat', category: 'Sans-Serif (Forte)' },
  { name: 'Poppins', category: 'Sans-Serif (Geométrico)' },
  { name: 'Open Sans', category: 'Sans-Serif (Universal)' },
  { name: 'Work Sans', category: 'Sans-Serif (Limpo)' },
  { name: 'Manrope', category: 'Sans-Serif (Corporativo)' },
  { name: 'Merriweather', category: 'Serif (Tradicional)' },
  { name: 'Lora', category: 'Serif (Elegante)' },
  { name: 'Fira Sans', category: 'Tech (Claro)' }
];

const BLOCK_DEFINITIONS: Record<string, { label: string; desc: string }> = {
  summary: { label: 'Resumo Profissional', desc: 'Apresentação executiva e proposta de valor' },
  skills: { label: 'Competências Técnicas', desc: 'Linguagens, frameworks e tecnologias' },
  experiences: { label: 'Experiência Profissional', desc: 'Histórico de cargos com métricas de impacto' },
  educations: { label: 'Formação Académica', desc: 'Licenciaturas, mestrados e instituições' },
  projects: { label: 'Projetos de Destaque', desc: 'Projetos pessoais e open-source com tecnologias' },
  certifications: { label: 'Certificações & Licenças', desc: 'Certificados técnicos (AWS, Azure, etc.)' },
  languages: { label: 'Idiomas', desc: 'Línguas faladas e níveis de proficiência' }
};

export const CVBuilderView: React.FC = () => {
  const [templates, setTemplates] = useState<CVTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [auditResult, setAuditResult] = useState<ATSAuditResult | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'layout' | 'typography' | 'blocks' | 'photo'>('layout');
  const [showTipsAccordion, setShowTipsAccordion] = useState(true);
  const [customFontInput, setCustomFontInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 1. Load Templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getCVTemplates();
      setTemplates(list);
      if (list.length > 0) {
        // Pick default or first
        const def = list.find(t => t.is_default) || list[0];
        setSelectedTemplate(def);
        setCustomFontInput(def.font_family);
      }
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // 2. Fetch Preview and ATS Audit whenever selectedTemplate changes
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
      console.error('Erro na pré-visualização/auditoria:', err);
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

  // Template modifications
  const updateTemplateField = <K extends keyof CVTemplate>(field: K, value: CVTemplate[K]) => {
    if (!selectedTemplate) return;
    const updated = { ...selectedTemplate, [field]: value };
    setSelectedTemplate(updated);
  };

  const handleToggleBlock = (blockKey: string) => {
    if (!selectedTemplate) return;
    const currentVis = selectedTemplate.block_visibility || {};
    const updatedVis = { ...currentVis, [blockKey]: !currentVis[blockKey] };
    updateTemplateField('block_visibility', updatedVis);
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
      setTemplates(prev => prev.map(t => t.id === saved.id ? saved : t));
      setSaveSuccessMsg('Modelo guardado com sucesso!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      alert('Erro ao guardar modelo de CV');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewTemplate = async () => {
    const name = prompt('Nome do novo modelo de CV:', 'Meu Modelo Personalizado');
    if (!name) return;

    try {
      const created = await api.createCVTemplate({
        name,
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
    } catch (err) {
      alert('Erro ao criar novo modelo');
    }
  };

  const handleDuplicateTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const duplicated = await api.createCVTemplate({
        ...selectedTemplate,
        id: undefined,
        name: `${selectedTemplate.name} (Cópia)`,
        is_default: false
      });
      setTemplates(prev => [duplicated, ...prev]);
      setSelectedTemplate(duplicated);
    } catch (err) {
      alert('Erro ao duplicar modelo');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (templates.length <= 1) {
      alert('Deve manter pelo menos um modelo de CV configurado.');
      return;
    }
    if (!confirm(`Tem a certeza que pretende eliminar o modelo "${selectedTemplate.name}"?`)) return;

    try {
      await api.deleteCVTemplate(selectedTemplate.id);
      const remaining = templates.filter(t => t.id !== selectedTemplate.id);
      setTemplates(remaining);
      setSelectedTemplate(remaining[0] || null);
    } catch (err) {
      alert('Erro ao eliminar modelo');
    }
  };

  const handleSetDefault = async () => {
    if (!selectedTemplate) return;
    try {
      const updated = await api.updateCVTemplate(selectedTemplate.id, { is_default: true });
      setSelectedTemplate(updated);
      setTemplates(prev => prev.map(t => ({
        ...t,
        is_default: t.id === updated.id
      })));
    } catch (err) {
      alert('Erro ao definir como modelo padrão');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-txt-muted text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-accent-light" />
          <span>A carregar modelos de CV e motor ATS...</span>
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
              Estúdio de Modelos de CV & Auditor ATS
            </h1>
          </div>
          <p className="text-xs text-txt-secondary mt-1">
            Personalize a disposição por blocos, cores, tipografia do Google Fonts e valide a compatibilidade ATS em tempo real.
          </p>
        </div>

        {/* Template Selector & Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-200 border border-surface-border rounded-xl px-3 py-1.5">
            <span className="text-xs font-medium text-txt-muted">Modelo:</span>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const found = templates.find(t => t.id === e.target.value);
                if (found) {
                  setSelectedTemplate(found);
                  setCustomFontInput(found.font_family);
                }
              }}
              className="bg-transparent text-xs font-semibold text-txt-primary focus:outline-none cursor-pointer"
            >
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id} className="bg-surface-100 text-txt-primary">
                  {tpl.name} {tpl.is_default ? '★ (Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateNewTemplate}
            className="px-3 py-1.5 text-xs font-medium bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-xl transition-colors"
          >
            + Novo
          </button>

          <button
            onClick={handleDuplicateTemplate}
            title="Duplicar modelo"
            className="p-2 text-txt-secondary hover:text-txt-primary hover:bg-surface-200 rounded-xl border border-surface-border transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {selectedTemplate && !selectedTemplate.is_default && (
            <button
              onClick={handleSetDefault}
              title="Definir como modelo padrão para candidaturas"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 rounded-xl border border-amber-500/30 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              Padrão
            </button>
          )}

          <button
            onClick={handleSaveTemplate}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'A guardar...' : 'Guardar'}
          </button>

          {selectedTemplate && templates.length > 1 && (
            <button
              onClick={handleDeleteTemplate}
              title="Eliminar este modelo"
              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
        
        {/* ================= COLUMN 1: CONTROLS & BUILDER (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 space-y-4">
            
            {/* Template Name Input */}
            <div>
              <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                Nome do Modelo
              </label>
              <input
                type="text"
                value={selectedTemplate?.name || ''}
                onChange={(e) => updateTemplateField('name', e.target.value)}
                className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                placeholder="Ex: ATS Clássico Internacional"
              />
            </div>

            {/* Config Sub-Tabs */}
            <div className="flex border-b border-surface-border text-xs gap-1">
              <button
                onClick={() => setActiveConfigTab('layout')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'layout'
                    ? 'border-accent text-accent-light'
                    : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                Layout
              </button>

              <button
                onClick={() => setActiveConfigTab('blocks')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'blocks'
                    ? 'border-accent text-accent-light'
                    : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Blocos
              </button>

              <button
                onClick={() => setActiveConfigTab('typography')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'typography'
                    ? 'border-accent text-accent-light'
                    : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Fontes & Cores
              </button>

              <button
                onClick={() => setActiveConfigTab('photo')}
                className={`flex items-center gap-1 pb-2 px-2.5 font-medium border-b-2 transition-colors ${
                  activeConfigTab === 'photo'
                    ? 'border-accent text-accent-light'
                    : 'border-transparent text-txt-muted hover:text-txt-primary'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Foto
              </button>
            </div>

            {/* TAB: LAYOUT SELECTION */}
            {activeConfigTab === 'layout' && (
              <div className="space-y-3 pt-2">
                <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                  Disposição Estrutural
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: 'classic_ats',
                      title: 'ATS Clássico (1 Coluna Linear)',
                      badge: '100% ATS Safe',
                      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      desc: 'Formatação recomendada para candidaturas internacionais e portais corporativos (Taleo, Workday, Greenhouse).'
                    },
                    {
                      id: 'modern_split',
                      title: 'Executivo Moderno (2 Colunas)',
                      badge: 'Design Equilibrado',
                      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                      desc: 'Barra lateral para competências e formação, coluna ampla para experiências de alto impacto.'
                    },
                    {
                      id: 'compact_executive',
                      title: 'Compacto Simétrico',
                      badge: 'Alta Densidade',
                      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                      desc: 'Cabeçalho centrado elegante e divisórias subtis para aproveitar ao máximo a página.'
                    },
                    {
                      id: 'tech_minimal',
                      title: 'Tech Minimalista',
                      badge: 'Engenharia & Tech',
                      badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
                      desc: 'Estilo clean focado em stack técnico, métricas destacadas e legibilidade pura.'
                    }
                  ].map(layoutOpt => (
                    <div
                      key={layoutOpt.id}
                      onClick={() => updateTemplateField('layout', layoutOpt.id as any)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedTemplate?.layout === layoutOpt.id
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'border-surface-border bg-surface-200/50 hover:bg-surface-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-txt-primary">
                          {layoutOpt.title}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${layoutOpt.badgeColor}`}>
                          {layoutOpt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-secondary leading-relaxed">
                        {layoutOpt.desc}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                    Escala de Espaçamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'compact', label: 'Compacto' },
                      { id: 'normal', label: 'Padrão' },
                      { id: 'spacious', label: 'Espaçoso' }
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

            {/* TAB: BLOCKS BUILDER (REORDER & VISIBILITY) */}
            {activeConfigTab === 'blocks' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                    Ordem & Visibilidade dos Blocos
                  </label>
                  <span className="text-[10px] text-txt-muted">Use as setas para ordenar</span>
                </div>

                <div className="space-y-2">
                  {selectedTemplate?.blocks_order.map((blockKey, idx) => {
                    const blockDef = BLOCK_DEFINITIONS[blockKey] || { label: blockKey, desc: '' };
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
                            title={isVisible ? 'Ocultar bloco' : 'Mostrar bloco'}
                            className={`p-1 rounded-lg transition-colors ${
                              isVisible ? 'text-accent-light hover:bg-accent/10' : 'text-txt-muted hover:bg-surface-300'
                            }`}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <div>
                            <div className="text-xs font-semibold truncate">{blockDef.label}</div>
                            <div className="text-[10px] text-txt-muted truncate">{blockDef.desc}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-txt-secondary hover:text-txt-primary hover:bg-surface-300 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(idx, 'down')}
                            disabled={idx === selectedTemplate.blocks_order.length - 1}
                            className="p-1 rounded text-txt-secondary hover:text-txt-primary hover:bg-surface-300 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Mover para baixo"
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

            {/* TAB: TYPOGRAPHY & COLORS */}
            {activeConfigTab === 'typography' && (
              <div className="space-y-4 pt-2">
                {/* Custom Color & Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                      Cor de Destaque do CV
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedTemplate?.accent_color || '#2563eb'}
                        onChange={(e) => updateTemplateField('accent_color', e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-surface-border bg-transparent"
                        title="Seletor de cor livre"
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

                  {/* Preset Swatches */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_COLORS.map(preset => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => updateTemplateField('accent_color', preset.hex)}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left text-[11px] transition-all ${
                          selectedTemplate?.accent_color?.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-accent bg-accent/10 font-bold'
                            : 'border-surface-border bg-surface-200 hover:bg-surface-300'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span className="truncate text-txt-secondary">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Google Fonts Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                    Fonte do Corpo (Google Fonts)
                  </label>
                  <select
                    value={selectedTemplate?.font_family || 'Inter'}
                    onChange={(e) => {
                      updateTemplateField('font_family', e.target.value);
                      setCustomFontInput(e.target.value);
                    }}
                    className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent mb-2"
                  >
                    {POPULAR_GOOGLE_FONTS.map(f => (
                      <option key={f.name} value={f.name} className="bg-surface-100">
                        {f.name} — {f.category}
                      </option>
                    ))}
                  </select>

                  {/* Custom Google Font Input */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-txt-muted">
                      Ou digite qualquer fonte da biblioteca do Google Fonts:
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customFontInput}
                        onChange={(e) => setCustomFontInput(e.target.value)}
                        placeholder="Ex: Sora, Lexend, Cabinet Grotesk"
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
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Heading Font */}
                <div>
                  <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider mb-1.5">
                    Fonte dos Títulos (Opcional)
                  </label>
                  <select
                    value={selectedTemplate?.font_heading || selectedTemplate?.font_family || 'Inter'}
                    onChange={(e) => updateTemplateField('font_heading', e.target.value)}
                    className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Igual à fonte do corpo</option>
                    {POPULAR_GOOGLE_FONTS.map(f => (
                      <option key={f.name} value={f.name} className="bg-surface-100">
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TAB: PHOTO & AVATAR */}
            {activeConfigTab === 'photo' && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-200 border border-surface-border">
                  <div>
                    <span className="text-xs font-semibold text-txt-primary block">Incluir Fotografia no CV</span>
                    <span className="text-[10px] text-txt-muted">
                      {selectedTemplate?.has_photo ? 'Ativada no cabeçalho/barra' : 'Desativada (Máxima conformidade ATS)'}
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
                        URL ou Ficheiro da Fotografia
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate?.photo_url || ''}
                        onChange={(e) => updateTemplateField('photo_url', e.target.value)}
                        placeholder="https://exemplo.com/minha-foto.jpg ou data:image/..."
                        className="w-full bg-surface-200 border border-surface-border rounded-xl px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* ATS Warning for Photo */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Aviso ATS sobre Fotografia
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        Em mercados como EUA, Reino Unido e Canadá, sistemas ATS rejeitam CVs com foto devido a regras de conformidade (EEOC). Em Portugal e na Europa é habitual, mas para vagas internacionais remotas é mais seguro desativar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ================= COLUMN 2: LIVE A4 PREVIEW (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 flex flex-col h-[780px]">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-txt-primary uppercase tracking-wider">
                  Pré-visualização A4 em Tempo Real
                </span>
              </div>
              <button
                onClick={() => selectedTemplate && refreshPreviewAndAudit(selectedTemplate)}
                disabled={loadingPreview}
                className="p-1.5 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-surface-200 transition-colors"
                title="Recarregar pré-visualização"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin text-accent-light' : ''}`} />
              </button>
            </div>

            {/* A4 Document Viewport */}
            <div className="flex-1 overflow-auto bg-slate-900/50 p-4 rounded-xl mt-3 flex justify-center">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full text-txt-muted text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-accent-light" />
                  <span>A compilar visualização...</span>
                </div>
              ) : previewHtml ? (
                <div className="w-full bg-white rounded-lg shadow-xl overflow-hidden border border-slate-300">
                  <iframe
                    title="CV Preview"
                    srcDoc={previewHtml}
                    className="w-full h-full min-h-[700px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-txt-muted text-xs">
                  Sem dados para pré-visualização
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= COLUMN 3: REAL-TIME ATS AUDIT & CRAFT TIPS (3 cols) ================= */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* ATS Score Card */}
          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-txt-muted uppercase tracking-wider">
                Auditoria ATS em Tempo Real
              </span>
              <Sparkles className="w-4 h-4 text-accent-light" />
            </div>

            {loadingAudit ? (
              <div className="py-8 text-center text-xs text-txt-muted">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent-light" />
                <span>A auditar conformidade ATS...</span>
              </div>
            ) : auditResult ? (
              <div className="space-y-4">
                {/* Score Gauge */}
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
                        ? 'Excelente Rastreio ATS'
                        : auditResult.score >= 70
                        ? 'Boa Compatibilidade'
                        : 'Requer Otimizações'}
                    </div>
                    <div className="text-[11px] text-txt-muted leading-tight mt-0.5">
                      {auditResult.summary}
                    </div>
                  </div>
                </div>

                {/* Checklist Breakdown */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider block">
                    Checklist de Verificação
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
                          {item.passed ? 'Aprovado' : 'Aviso'}
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-muted pl-5">{item.message}</p>
                    </div>
                  ))}
                </div>

                {/* Warnings & Tips */}
                {auditResult.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                    <span className="text-xs font-bold text-amber-400 block">Pontos a Melhorar</span>
                    <ul className="text-[11px] text-txt-secondary space-y-1 list-disc pl-4">
                      {auditResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {auditResult.strengths.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-400 block">Pontos Fortes</span>
                    <ul className="text-[11px] text-txt-secondary space-y-1 list-disc pl-4">
                      {auditResult.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Dicas de Ouro Collapsible Accordion */}
          <div className="bg-surface-100 border border-surface-border rounded-2xl p-4 space-y-3">
            <button
              onClick={() => setShowTipsAccordion(!showTipsAccordion)}
              className="w-full flex items-center justify-between text-left focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent-light" />
                <span className="text-xs font-bold text-txt-primary uppercase tracking-wider">
                  Dicas de Ouro para o CV
                </span>
              </div>
              {showTipsAccordion ? (
                <ChevronUp className="w-4 h-4 text-txt-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-txt-muted" />
              )}
            </button>

            {showTipsAccordion && (
              <div className="space-y-3 pt-2 text-xs text-txt-secondary border-t border-surface-border">
                <div className="p-2.5 rounded-xl bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-semibold text-txt-primary">Fórmula XYZ da Google</div>
                  <p className="text-[11px] text-txt-muted">
                    "Alcancei [X] medido por [Y], implementando [Z]". Substitua descrições passivas por resultados com números e métricas.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-semibold text-txt-primary">A Regra dos 6 Segundos</div>
                  <p className="text-[11px] text-txt-muted">
                    Recrutadores olham primeiro para o cargo atual, empresas anteriores e competências-chave. Mantenha os títulos claros e sem termos vagos.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-200 border border-surface-border space-y-1">
                  <div className="font-semibold text-txt-primary">Fotografia vs Sem Fotografia</div>
                  <p className="text-[11px] text-txt-muted">
                    Empresas nos EUA/Reino Unido rejeitam fotos para cumprir regras anti-discriminação. Use foto apenas para candidaturas em Portugal ou na União Europeia.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
