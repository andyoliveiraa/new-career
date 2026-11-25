import React, { useState, useEffect, useCallback } from 'react';
import type { Job, ApplicationStats, ManualJobPayload } from './types';
import { api } from './api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { JobsView } from './components/JobsView';
import { ScraperView } from './components/ScraperView';
import { ProfileView } from './components/ProfileView';
import { CVBuilderView } from './components/CVBuilderView';
import { SettingsView } from './components/SettingsView';
import { AIStudioModal } from './components/AIStudioModal';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'cv-builder' | 'scrapers' | 'profile' | 'settings'>('dashboard');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total_jobs: 0,
    disponivel: 0,
    avaliada: 0,
    em_preparacao: 0,
    candidatado: 0,
    entrevista: 0,
    positiva: 0,
    negativa: 0,
    descartada: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedJobForAI, setSelectedJobForAI] = useState<Job | null>(null);

  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLiveness, setFilterLiveness] = useState('');
  const [filterRemoteOnly, setFilterRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'match_score' | 'distance_km'>('created_at');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsData, statsData] = await Promise.all([
        api.getJobs({
          query: filterQuery || undefined,
          location: filterLocation || undefined,
          source: filterSource || undefined,
          status: filterStatus || undefined,
          liveness: filterLiveness || undefined,
          is_remote: filterRemoteOnly ? true : undefined,
          sort_by: sortBy,
          limit: 150
        }),
        api.getStats()
      ]);
      setJobs(jobsData);
      setStats(statsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [filterQuery, filterLocation, filterSource, filterStatus, filterLiveness, filterRemoteOnly, sortBy]);

  useEffect(() => {
    if (isAuthenticated && user?.has_completed_onboarding) {
      loadData();
    }
  }, [isAuthenticated, user?.has_completed_onboarding, loadData]);

  const handleMarkApplied = async (jobId: number) => {
    try {
      await api.markApplied(jobId);
      showToast('Candidatura marcada como submetida.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao marcar como candidatado.', 'error');
    }
  };

  const handleCheckLiveness = async (jobId: number) => {
    try {
      const res = await api.checkLiveness(jobId);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, liveness_status: res.liveness_status as any, liveness_reason: res.liveness_reason }
            : j
        )
      );
      showToast(`Disponibilidade atualizada: ${res.liveness_status}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao verificar disponibilidade.', 'error');
    }
  };

  const handleCheckLivenessBatch = async () => {
    try {
      const ids = jobs.slice(0, 20).map((j) => j.id);
      const res = await api.checkLivenessBatch(ids);
      showToast(`Verificação concluída (${res.checked}): ${res.active} ativas, ${res.expired} expiradas.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao verificar disponibilidade em lote.', 'error');
    }
  };

  const handleCreateManualJob = async (payload: ManualJobPayload) => {
    try {
      await api.createManualJob(payload);
      showToast('Vaga adicionada ao pipeline.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao adicionar vaga.', 'error');
      throw err;
    }
  };

  const handleExportJobs = async (format: 'csv' | 'json') => {
    try {
      await api.exportJobs(format, filterStatus || undefined);
      showToast(`Exportação ${format.toUpperCase()} concluída.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao exportar vagas.', 'error');
    }
  };

  const handleUpdateStatus = async (jobId: number, status: string) => {
    try {
      await api.updateApplication(jobId, { status });
      showToast('Estado da candidatura atualizado.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar estado.', 'error');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    try {
      await api.deleteJob(jobId);
      showToast('Vaga removida do sistema.', 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir vaga.', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400">A carregar New Career...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterView onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onSwitchToRegister={() => setAuthView('register')} />;
  }

  if (user && !user.has_completed_onboarding) {
    return <OnboardingWizard />;
  }

  return (
    <div className="min-h-screen bg-background text-txt-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        statsTotal={stats.total_jobs}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            recentJobs={jobs}
            onNavigateTab={(tab: string) => setActiveTab(tab as any)}
            onOpenJobAI={(job: Job) => setSelectedJobForAI(job)}
          />
        )}

        {activeTab === 'jobs' && (
          <JobsView
            jobs={jobs}
            loading={loading}
            onRefresh={loadData}
            onMarkApplied={handleMarkApplied}
            onCheckLiveness={handleCheckLiveness}
            onCheckLivenessBatch={handleCheckLivenessBatch}
            onCreateManualJob={handleCreateManualJob}
            onExportJobs={handleExportJobs}
            onUpdateStatus={handleUpdateStatus}
            onDeleteJob={handleDeleteJob}
            onOpenJobAI={(job: Job) => setSelectedJobForAI(job)}
            filterQuery={filterQuery}
            setFilterQuery={setFilterQuery}
            filterLocation={filterLocation}
            setFilterLocation={setFilterLocation}
            filterSource={filterSource}
            setFilterSource={setFilterSource}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterLiveness={filterLiveness}
            setFilterLiveness={setFilterLiveness}
            filterRemoteOnly={filterRemoteOnly}
            setFilterRemoteOnly={setFilterRemoteOnly}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        )}

        {activeTab === 'cv-builder' && <CVBuilderView />}
        {activeTab === 'scrapers' && <ScraperView onScanCompleted={loadData} />}
        {activeTab === 'profile' && <ProfileView onSaved={loadData} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {selectedJobForAI && (
        <AIStudioModal
          job={selectedJobForAI}
          onClose={() => setSelectedJobForAI(null)}
          onRefreshJob={loadData}
        />
      )}

      <footer className="border-t border-surface-border py-4 text-center text-xs text-txt-muted bg-surface-100/40">
        New Career — Plataforma Multi-Utilizador de Emprego & AI Career Ops • Padrão Unslop Craft
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
