import React, { useState } from 'react';
import type { Job, ManualJobPayload } from '../types';
import {
  Search, MapPin, ExternalLink, Sparkles, RefreshCw, Send,
  Trash2, Columns, List, Plus, Download, ShieldCheck, X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface JobsViewProps {
  jobs: Job[];
  loading: boolean;
  onRefresh: () => void;
  onMarkApplied: (jobId: number) => void;
  onCheckLiveness: (jobId: number) => void;
  onCheckLivenessBatch: () => Promise<void>;
  onCreateManualJob: (payload: ManualJobPayload) => Promise<void>;
  onExportJobs: (format: 'csv' | 'json') => Promise<void>;
  onUpdateStatus: (jobId: number, status: string) => void;
  onDeleteJob: (jobId: number) => void;
  onOpenJobAI: (job: Job) => void;
  filterQuery: string;
  setFilterQuery: (q: string) => void;
  filterLocation: string;
  setFilterLocation: (l: string) => void;
  filterSource: string;
  setFilterSource: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterLiveness: string;
  setFilterLiveness: (l: string) => void;
  filterRemoteOnly: boolean;
  setFilterRemoteOnly: (r: boolean) => void;
  sortBy: 'created_at' | 'match_score' | 'distance_km';
  setSortBy: (s: 'created_at' | 'match_score' | 'distance_km') => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  loading,
  onRefresh,
  onMarkApplied,
  onCheckLiveness,
  onCheckLivenessBatch,
  onCreateManualJob,
  onExportJobs,
  onUpdateStatus,
  onDeleteJob,
  onOpenJobAI,
  filterQuery,
  setFilterQuery,
  filterLocation,
  setFilterLocation,
  filterSource,
  setFilterSource,
  filterStatus,
  setFilterStatus,
  filterLiveness,
  setFilterLiveness,
  filterRemoteOnly,
  setFilterRemoteOnly,
  sortBy,
  setSortBy,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [checkingLivenessId, setCheckingLivenessId] = useState<number | null>(null);
  const [checkingBatch, setCheckingBatch] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualSalary, setManualSalary] = useState('');
  const [manualRemote, setManualRemote] = useState(false);
  const [manualDesc, setManualDesc] = useState('');
  const [addingJob, setAddingJob] = useState(false);

  const statusColumns = [
    { id: 'disponivel', label: t('jobs.statusDisponivel'), color: 'border-amber-500/30 text-amber-400 bg-amber-500/5' },
    { id: 'avaliada', label: t('jobs.statusAvaliada'), color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
    { id: 'em_preparacao', label: t('jobs.statusEmPreparacao'), color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' },
    { id: 'candidatado', label: t('jobs.statusCandidatado'), color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
    { id: 'entrevista', label: t('jobs.statusEntrevista'), color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' },
    { id: 'positiva', label: t('jobs.statusPositiva'), color: 'border-green-500/40 text-green-400 bg-green-500/10' },
    { id: 'negativa', label: t('jobs.statusNegativa'), color: 'border-slate-500/30 text-slate-400 bg-slate-500/5' },
    { id: 'descartada', label: t('jobs.statusDescartada'), color: 'border-red-500/20 text-red-400 bg-red-500/5' }
  ];

  const handleLiveness = async (jobId: number) => {
    setCheckingLivenessId(jobId);
    try {
      await onCheckLiveness(jobId);
    } finally {
      setCheckingLivenessId(null);
    }
  };

  const handleBatchLiveness = async () => {
    setCheckingBatch(true);
    try {
      await onCheckLivenessBatch();
    } finally {
      setCheckingBatch(false);
    }
  };

  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    setAddingJob(true);
    try {
      await onCreateManualJob({
        url: manualUrl.trim(),
        title: manualTitle.trim() || undefined,
        company: manualCompany.trim() || undefined,
        location: manualLocation.trim() || undefined,
        salary: manualSalary.trim() || undefined,
        is_remote: manualRemote,
        description: manualDesc.trim() || undefined,
      });
      setShowAddModal(false);
      setManualUrl('');
      setManualTitle('');
      setManualCompany('');
      setManualLocation('');
      setManualSalary('');
      setManualRemote(false);
      setManualDesc('');
    } finally {
      setAddingJob(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-txt-primary">
            {t('jobs.title')}
          </h2>
          <p className="text-xs text-txt-secondary mt-0.5">
            {t('jobs.foundCount', { count: jobs.length })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('jobs.addJob')}
          </button>

          <button
            type="button"
            onClick={handleBatchLiveness}
            disabled={checkingBatch || jobs.length === 0}
            className="px-3 py-1.5 bg-surface-100 hover:bg-surface-200 text-txt-primary border border-surface-border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title={t('jobs.batchLivenessTooltip')}
          >
            <ShieldCheck className={`w-3.5 h-3.5 text-emerald-400 ${checkingBatch ? 'animate-pulse' : ''}`} />
            {checkingBatch ? t('jobs.checkingLiveness') : t('jobs.batchLiveness')}
          </button>

          <button
            type="button"
            onClick={() => onExportJobs('csv')}
            className="px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            title={t('jobs.exportCsvTooltip')}
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          <button
            type="button"
            onClick={() => onExportJobs('json')}
            className="px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            title={t('jobs.exportJsonTooltip')}
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>

          {/* Toggle List / Kanban */}
          <div className="bg-surface-100 border border-surface-border rounded-lg p-1 flex">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-surface-200 text-txt-primary' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              {t('jobs.listMode')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban' ? 'bg-surface-200 text-txt-primary' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              {t('jobs.kanbanMode')}
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-surface-100 hover:bg-surface-200 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg transition-colors"
            title={t('jobs.refreshTooltip')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-100 border border-surface-border rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-txt-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('jobs.searchPlaceholder')}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-surface-200 border border-surface-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="relative min-w-[140px]">
          <MapPin className="w-3.5 h-3.5 text-txt-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('jobs.locationPlaceholder')}
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-full bg-surface-200 border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-accent"
          />
        </div>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
        >
          <option value="">{t('jobs.allSources')}</option>
          <option value="netempregos">Net-Empregos</option>
          <option value="google">Google Jobs</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
          <option value="greenhouse">Greenhouse (ATS)</option>
          <option value="lever">Lever (ATS)</option>
          <option value="ashby">Ashby (ATS)</option>
          <option value="manual">{t('jobs.sourceManual')}</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
        >
          <option value="">{t('jobs.allStatuses')}</option>
          {statusColumns.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <select
          value={filterLiveness}
          onChange={(e) => setFilterLiveness(e.target.value)}
          className="bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
        >
          <option value="">{t('jobs.anyLiveness')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="expired">{t('common.expired')}</option>
          <option value="uncertain">{t('common.uncertain')}</option>
          <option value="unknown">{t('common.unknown')}</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
        >
          <option value="created_at">{t('jobs.sortNewest')}</option>
          <option value="match_score">{t('jobs.sortMatch')}</option>
          <option value="distance_km">{t('jobs.sortDistance')}</option>
        </select>

        <label className="flex items-center gap-2 text-xs text-txt-secondary cursor-pointer px-2 py-1.5 rounded-lg bg-surface-200 border border-surface-border">
          <input
            type="checkbox"
            checked={filterRemoteOnly}
            onChange={(e) => setFilterRemoteOnly(e.target.checked)}
            className="accent-accent"
          />
          <span>{t('jobs.remoteOnly')}</span>
        </label>
      </div>

      {/* Content Rendering: List View or Kanban View */}
      {viewMode === 'list' ? (
        <div className="bg-surface-100 border border-surface-border rounded-xl overflow-hidden">
          <div className="divide-y divide-surface-border">
            {jobs.length === 0 ? (
              <div className="py-12 text-center text-txt-muted text-sm">
                {t('jobs.emptyFiltered')}
              </div>
            ) : (
              jobs.map((j) => (
                <div key={j.id} className="p-4 hover:bg-surface-200/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Job Main Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-txt-primary text-base hover:text-accent-light cursor-pointer" onClick={() => onOpenJobAI(j)}>
                        {j.title}
                      </span>
                      {j.is_remote && (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                          {t('common.remote')}
                        </span>
                      )}
                      {j.match_score !== undefined && j.match_score !== null && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-accent/10 text-accent-light rounded border border-accent/20 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {t('jobs.matchSuffix', { score: Math.round(j.match_score) })}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${
                        j.liveness_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        j.liveness_status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`} title={j.liveness_reason || t('jobs.livenessTooltip')}>
                        {j.liveness_status === 'active' ? t('common.active') : j.liveness_status === 'expired' ? t('common.expired') : t('common.toVerify')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center text-xs text-txt-secondary gap-3">
                      <span className="font-medium text-txt-primary">{j.company}</span>
                      <span>•</span>
                      <span>{j.location || '-'}</span>
                      {j.distance_km !== null && j.distance_km !== undefined && (
                        <>
                          <span>•</span>
                          <span className="text-txt-muted">{j.distance_km} km</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.5 bg-surface-200 rounded text-txt-muted">
                        {j.source}
                      </span>
                      {j.salary && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">{j.salary}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Action Bar */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={j.application_status || 'disponivel'}
                      onChange={(e) => onUpdateStatus(j.id, e.target.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium focus:outline-none ${
                        j.application_status === 'candidatado' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                        j.application_status === 'positiva' ? 'bg-green-500/20 border-green-500/40 text-green-300' :
                        j.application_status === 'entrevista' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' :
                        'bg-surface-200 border-surface-border text-txt-primary'
                      }`}
                    >
                      {statusColumns.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>

                    {j.application_status !== 'candidatado' && (
                      <button
                        type="button"
                        onClick={() => onMarkApplied(j.id)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1"
                        title={t('jobs.applyTooltip')}
                      >
                        <Send className="w-3 h-3" />
                        {t('jobs.applyBtn')}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleLiveness(j.id)}
                      disabled={checkingLivenessId === j.id}
                      className="p-1.5 bg-surface-200 hover:bg-surface-300 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg transition-colors"
                      title={t('jobs.checkLivenessTooltip')}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingLivenessId === j.id ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenJobAI(j)}
                      className="px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      {t('dashboard.aiStudio')}
                    </button>

                    <a
                      href={j.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-surface-200 hover:bg-surface-300 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg transition-colors"
                      title={t('jobs.openSourceTooltip')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {confirmDeleteId === j.id ? (
                      <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteJob(j.id);
                            setConfirmDeleteId(null);
                          }}
                          className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                        >
                          {t('common.confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-txt-muted hover:text-txt-primary ml-1"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(j.id)}
                        className="p-1.5 hover:bg-red-500/10 text-txt-muted hover:text-red-400 rounded-lg transition-colors"
                        title={t('jobs.deleteTooltip')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Full 8-Column Kanban Board View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statusColumns.map((col) => {
            const columnJobs = jobs.filter((j) => (j.application_status || 'disponivel') === col.id);
            return (
              <div key={col.id} className="bg-surface-100 border border-surface-border rounded-xl p-3 flex flex-col w-[280px] shrink-0">
                <div className={`flex items-center justify-between pb-2 mb-3 border-b border-surface-border ${col.color}`}>
                  <span className="font-semibold text-xs uppercase tracking-wider">{col.label}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-surface-200">
                    {columnJobs.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {columnJobs.length === 0 ? (
                    <div className="py-8 text-center text-txt-muted text-xs">{t('jobs.emptyColumn')}</div>
                  ) : (
                    columnJobs.map((j) => (
                      <div
                        key={j.id}
                        className="p-3 bg-surface-200/60 hover:bg-surface-200 border border-surface-border rounded-lg space-y-2 cursor-pointer transition-colors"
                        onClick={() => onOpenJobAI(j)}
                      >
                        <div className="font-medium text-txt-primary text-sm line-clamp-1">{j.title}</div>
                        <div className="text-xs text-txt-secondary flex items-center justify-between gap-2 min-w-0">
                          <span className="truncate font-medium text-txt-primary/90" title={j.company}>{j.company}</span>
                          <span className="text-txt-muted shrink-0 text-[11px]">{j.location || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-txt-muted uppercase text-[10px]">{j.source}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            j.liveness_status === 'active' ? 'text-emerald-400 bg-emerald-500/10' :
                            j.liveness_status === 'expired' ? 'text-red-400 bg-red-500/10' : 'text-slate-400'
                          }`}>
                            {j.liveness_status === 'active' ? t('common.active') : j.liveness_status === 'expired' ? t('common.expired') : t('common.toVerify')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-100 border border-surface-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="font-display font-bold text-base text-txt-primary">{t('jobs.modalTitle')}</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-txt-muted hover:text-txt-primary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">{t('jobs.modalUrlLabel')}</label>
                <input
                  type="url"
                  required
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">{t('jobs.modalRoleLabel')}</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder={t('jobs.modalRolePlaceholder')}
                    className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">{t('jobs.modalCompanyLabel')}</label>
                  <input
                    type="text"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder={t('jobs.modalCompanyPlaceholder')}
                    className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">{t('jobs.modalLocationLabel')}</label>
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder={t('jobs.modalLocationPlaceholder')}
                    className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">{t('jobs.modalSalaryLabel')}</label>
                  <input
                    type="text"
                    value={manualSalary}
                    onChange={(e) => setManualSalary(e.target.value)}
                    placeholder={t('jobs.modalSalaryPlaceholder')}
                    className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-txt-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualRemote}
                  onChange={(e) => setManualRemote(e.target.checked)}
                  className="accent-accent"
                />
                <span>{t('jobs.modalRemoteLabel')}</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">{t('jobs.modalDescLabel')}</label>
                <textarea
                  rows={3}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder={t('jobs.modalDescPlaceholder')}
                  className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-txt-secondary hover:text-txt-primary rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addingJob}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {addingJob ? t('common.saving') : t('jobs.modalSave')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
