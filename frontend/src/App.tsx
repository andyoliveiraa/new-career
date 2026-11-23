import React, { useState, useEffect } from 'react';
import type { Job, ApplicationStats } from './types';
import { api } from './api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { JobsView } from './components/JobsView';
import { ScraperView } from './components/ScraperView';
import { ProfileView } from './components/ProfileView';
import { AIStudioModal } from './components/AIStudioModal';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'scrapers' | 'profile'>('dashboard');
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

  useEffect(() => {
    if (isAuthenticated && user?.has_completed_onboarding) {
      loadData();
    }
  }, [isAuthenticated, user?.has_completed_onboarding, filterQuery, filterLocation, filterSource, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, statsData] = await Promise.all([
        api.getJobs({
          query: filterQuery || undefined,
          location: filterLocation || undefined,
          source: filterSource || undefined,
          status: filterStatus || undefined,
          limit: 100
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
  };

  const handleMarkApplied = async (jobId: number) => {
    try {
      await api.markApplied(jobId);
      await loadData();
    } catch (err) {
      alert('Erro ao marcar como candidatado.');
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
    } catch (err) {
      alert('Erro ao verificar disponibilidade.');
    }
  };

  const handleUpdateStatus = async (jobId: number, status: string) => {
    try {
      await api.updateApplication(jobId, { status });
      await loadData();
    } catch (err) {
      alert('Erro ao atualizar status.');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Deseja realmente remover esta vaga do sistema?')) return;
    try {
      await api.deleteJob(jobId);
      await loadData();
    } catch (err) {
      alert('Erro ao excluir vaga.');
    }
  };

  // 1. Loading auth state
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

  // 2. Unauthenticated: Login or Register
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterView onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onSwitchToRegister={() => setAuthView('register')} />;
  }

  // 3. Authenticated but needs Onboarding Setup
  if (user && !user.has_completed_onboarding) {
    return <OnboardingWizard />;
  }

  // 4. Authenticated & Onboarded: Full Workspace
  return (
    <div className="min-h-screen bg-background text-txt-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        statsTotal={stats.total_jobs}
      />

      {/* Main Content Area */}
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
          />
        )}

        {activeTab === 'scrapers' && (
          <ScraperView onScanCompleted={loadData} />
        )}

        {activeTab === 'profile' && (
          <ProfileView onSaved={loadData} />
        )}
      </main>

      {/* AI Studio Modal */}
      {selectedJobForAI && (
        <AIStudioModal
          job={selectedJobForAI}
          onClose={() => setSelectedJobForAI(null)}
          onRefreshJob={loadData}
        />
      )}

      {/* Subtle Footer */}
      <footer className="border-t border-surface-border py-4 text-center text-xs text-txt-muted bg-surface-100/40">
        New Career — Plataforma Multi-Utilizador de Emprego & AI Career Ops • Padrão Unslop Craft
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
