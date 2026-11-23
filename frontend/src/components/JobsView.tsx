import React, { useState } from 'react';
import type { Job } from '../types';
import { Search, MapPin, ExternalLink, Sparkles, RefreshCw, Send, Trash2, Columns, List } from 'lucide-react';

interface JobsViewProps {
  jobs: Job[];
  loading: boolean;
  onRefresh: () => void;
  onMarkApplied: (jobId: number) => void;
  onCheckLiveness: (jobId: number) => void;
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
}

const STATUS_COLUMNS = [
  { id: 'disponivel', label: 'Disponíveis', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5' },
  { id: 'avaliada', label: 'Avaliadas', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
  { id: 'em_preparacao', label: 'Em Preparação', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' },
  { id: 'candidatado', label: 'Candidatado', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
  { id: 'entrevista', label: 'Entrevista', color: 'border-purple-500/30 text-purple-400 bg-purple-500/5' },
  { id: 'positiva', label: 'Oferta / Positiva', color: 'border-green-500/40 text-green-400 bg-green-500/10' },
  { id: 'negativa', label: 'Negativa', color: 'border-slate-500/30 text-slate-400 bg-slate-500/5' },
  { id: 'descartada', label: 'Descartada', color: 'border-red-500/20 text-red-400 bg-red-500/5' }
];

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  loading,
  onRefresh,
  onMarkApplied,
  onCheckLiveness,
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
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [checkingLivenessId, setCheckingLivenessId] = useState<number | null>(null);

  const handleLiveness = async (jobId: number) => {
    setCheckingLivenessId(jobId);
    try {
      await onCheckLiveness(jobId);
    } finally {
      setCheckingLivenessId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-txt-primary">
            Pipeline de Vagas & Candidaturas
          </h2>
          <p className="text-xs text-txt-secondary mt-0.5">
            {jobs.length} vagas encontradas e organizadas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle List / Kanban */}
          <div className="bg-surface-100 border border-surface-border rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-surface-200 text-txt-primary' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban' ? 'bg-surface-200 text-txt-primary' : 'text-txt-muted hover:text-txt-primary'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Kanban
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-surface-100 hover:bg-surface-200 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg transition-colors"
            title="Atualizar lista"
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
            placeholder="Pesquisar por cargo, empresa, tecnologia..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-surface-200 border border-surface-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="relative min-w-[150px]">
          <MapPin className="w-3.5 h-3.5 text-txt-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cidade ou Remoto"
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
          <option value="">Todas as Fontes</option>
          <option value="netempregos">Net-Empregos</option>
          <option value="google">Google Jobs</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
          <option value="greenhouse">Greenhouse (ATS)</option>
          <option value="lever">Lever (ATS)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface-200 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-txt-primary focus:outline-none focus:border-accent"
        >
          <option value="">Todos os Status</option>
          <option value="disponivel">Disponível</option>
          <option value="avaliada">Avaliada</option>
          <option value="em_preparacao">Em Preparação</option>
          <option value="candidatado">Candidatado</option>
          <option value="entrevista">Entrevista</option>
          <option value="positiva">Positiva</option>
          <option value="negativa">Negativa</option>
          <option value="descartada">Descartada</option>
        </select>
      </div>

      {/* Content Rendering: List View or Kanban View */}
      {viewMode === 'list' ? (
        <div className="bg-surface-100 border border-surface-border rounded-xl overflow-hidden">
          <div className="divide-y divide-surface-border">
            {jobs.length === 0 ? (
              <div className="py-12 text-center text-txt-muted text-sm">
                Nenhuma vaga encontrada com os filtros selecionados.
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
                          Remoto
                        </span>
                      )}
                      {j.match_score !== undefined && j.match_score !== null && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/10 text-purple-300 rounded border border-purple-500/20 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {Math.round(j.match_score)}% Match
                        </span>
                      )}
                      {/* Liveness badge */}
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${
                        j.liveness_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        j.liveness_status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`} title={j.liveness_reason || 'Status de disponibilidade'}>
                        {j.liveness_status === 'active' ? '● Ativa' : j.liveness_status === 'expired' ? '✕ Expirada' : '○ A Verificar'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center text-xs text-txt-secondary gap-3">
                      <span className="font-medium text-txt-primary">{j.company}</span>
                      <span>•</span>
                      <span>{j.location || 'Portugal'}</span>
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
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Selector */}
                    <select
                      value={j.application_status || 'disponivel'}
                      onChange={(e) => onUpdateStatus(j.id, e.target.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium focus:outline-none ${
                        j.application_status === 'candidatado' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                        j.application_status === 'positiva' ? 'bg-green-500/20 border-green-500/40 text-green-300' :
                        j.application_status === 'entrevista' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' :
                        'bg-surface-200 border-surface-border text-txt-primary'
                      }`}
                    >
                      <option value="disponivel">Disponível</option>
                      <option value="avaliada">Avaliada</option>
                      <option value="em_preparacao">Em Preparação</option>
                      <option value="candidatado">Candidatado</option>
                      <option value="entrevista">Entrevista</option>
                      <option value="positiva">Positiva</option>
                      <option value="negativa">Negativa</option>
                      <option value="descartada">Descartada</option>
                    </select>

                    {/* Quick Mark Applied Button */}
                    {j.application_status !== 'candidatado' && (
                      <button
                        onClick={() => onMarkApplied(j.id)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1"
                        title="Marcar como 'Já me candidatei'"
                      >
                        <Send className="w-3 h-3" />
                        Candidatar
                      </button>
                    )}

                    {/* Check Liveness Button */}
                    <button
                      onClick={() => handleLiveness(j.id)}
                      disabled={checkingLivenessId === j.id}
                      className="p-1.5 bg-surface-200 hover:bg-surface-300 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg transition-colors"
                      title="Verificar se a vaga ainda está aberta"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingLivenessId === j.id ? 'animate-spin' : ''}`} />
                    </button>

                    {/* AI Studio */}
                    <button
                      onClick={() => onOpenJobAI(j)}
                      className="px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Studio
                    </button>

                    {/* External Link */}
                    <a
                      href={j.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-surface-200 hover:bg-surface-300 text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg transition-colors"
                      title="Abrir vaga no site de origem"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteJob(j.id)}
                      className="p-1.5 hover:bg-red-500/10 text-txt-muted hover:text-red-400 rounded-lg transition-colors"
                      title="Remover vaga"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.slice(0, 4).map((col) => {
            const columnJobs = jobs.filter((j) => (j.application_status || 'disponivel') === col.id);
            return (
              <div key={col.id} className="bg-surface-100 border border-surface-border rounded-xl p-3 flex flex-col min-w-[280px]">
                <div className={`flex items-center justify-between pb-2 mb-3 border-b border-surface-border ${col.color}`}>
                  <span className="font-semibold text-xs uppercase tracking-wider">{col.label}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-surface-200">
                    {columnJobs.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {columnJobs.length === 0 ? (
                    <div className="py-8 text-center text-txt-muted text-xs">Vazio</div>
                  ) : (
                    columnJobs.map((j) => (
                      <div
                        key={j.id}
                        className="p-3 bg-surface-200/60 hover:bg-surface-200 border border-surface-border rounded-lg space-y-2 cursor-pointer transition-colors"
                        onClick={() => onOpenJobAI(j)}
                      >
                        <div className="font-medium text-txt-primary text-sm line-clamp-1">{j.title}</div>
                        <div className="text-xs text-txt-secondary flex justify-between">
                          <span>{j.company}</span>
                          <span className="text-txt-muted">{j.location || 'Portugal'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-txt-muted uppercase text-[10px]">{j.source}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            j.liveness_status === 'active' ? 'text-emerald-400 bg-emerald-500/10' :
                            j.liveness_status === 'expired' ? 'text-red-400 bg-red-500/10' : 'text-slate-400'
                          }`}>
                            {j.liveness_status === 'active' ? 'Ativa' : j.liveness_status === 'expired' ? 'Expirada' : 'Verificar'}
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
    </div>
  );
};
