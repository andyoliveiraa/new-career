import React from 'react';
import type { ApplicationStats, Job } from '../types';
import { Briefcase, Send, Users, CheckCircle2, XCircle, Search, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DashboardViewProps {
  stats: ApplicationStats;
  recentJobs: Job[];
  onNavigateTab: (tab: string) => void;
  onOpenJobAI: (job: Job) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentJobs,
  onNavigateTab,
  onOpenJobAI,
}) => {
  const { t } = useLanguage();

  const cards = [
    { label: t('dashboard.kpiTotal'), value: stats.total_jobs, icon: Briefcase, color: 'text-blue-400' },
    { label: t('dashboard.kpiAvailable'), value: stats.disponivel, icon: Clock, color: 'text-amber-400' },
    { label: t('dashboard.kpiApplied'), value: stats.candidatado, icon: Send, color: 'text-indigo-400' },
    { label: t('dashboard.kpiInterview'), value: stats.entrevista, icon: Users, color: 'text-purple-400' },
    { label: t('dashboard.kpiPositive'), value: stats.positiva, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: t('dashboard.kpiDiscarded'), value: stats.descartada, icon: XCircle, color: 'text-slate-500' },
  ];

  const applicationRate = stats.total_jobs > 0 ? ((stats.candidatado / stats.total_jobs) * 100).toFixed(1) : '0';
  const successRate = stats.candidatado > 0 ? ((stats.positiva / stats.candidatado) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-surface-100 border border-surface-border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-txt-primary">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-txt-secondary mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigateTab('scrapers')}
            className="flex items-center px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Search className="w-4 h-4 mr-2" />
            {t('dashboard.newScan')}
          </button>
          <button
            onClick={() => onNavigateTab('jobs')}
            className="flex items-center px-4 py-2 bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-lg text-sm font-medium transition-colors"
          >
            {t('dashboard.viewJobs')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-surface-100 border border-surface-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-txt-muted mb-2">
                <span className="text-xs font-medium">{c.label}</span>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className="font-display text-2xl font-bold text-txt-primary">
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Funnel Metrics & Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-100 border border-surface-border rounded-xl p-5">
          <h3 className="font-display font-semibold text-base text-txt-primary mb-4 flex items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mr-2" />
            {t('dashboard.funnelTitle')}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-txt-secondary">{t('dashboard.applicationRate')}</span>
                <span className="font-semibold text-txt-primary">{applicationRate}%</span>
              </div>
              <div className="w-full bg-surface-200 h-2 rounded-full overflow-hidden">
                <div className="bg-accent h-full rounded-full" style={{ width: `${Math.min(100, Number(applicationRate))}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-txt-secondary">{t('dashboard.conversionRate')}</span>
                <span className="font-semibold text-emerald-400">{successRate}%</span>
              </div>
              <div className="w-full bg-surface-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(successRate))}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-100 border border-surface-border rounded-xl p-5">
          <h3 className="font-display font-semibold text-base text-txt-primary mb-4">
            {t('dashboard.sourcesTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border">
              <div className="font-medium text-txt-primary">{t('dashboard.sourceNetEmpregos')}</div>
              <div className="text-xs text-txt-muted mt-0.5">{t('dashboard.sourceNetEmpregosDesc')}</div>
            </div>
            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border">
              <div className="font-medium text-txt-primary">{t('dashboard.sourceGoogle')}</div>
              <div className="text-xs text-txt-muted mt-0.5">{t('dashboard.sourceGoogleDesc')}</div>
            </div>
            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border">
              <div className="font-medium text-txt-primary">{t('dashboard.sourceJobSpy')}</div>
              <div className="text-xs text-txt-muted mt-0.5">{t('dashboard.sourceJobSpyDesc')}</div>
            </div>
            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border">
              <div className="font-medium text-txt-primary">{t('dashboard.sourceAts')}</div>
              <div className="text-xs text-txt-muted mt-0.5">{t('dashboard.sourceAtsDesc')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Discovered Jobs */}
      <div className="bg-surface-100 border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-base text-txt-primary">
            {t('dashboard.recentJobsTitle')}
          </h3>
          <button
            onClick={() => onNavigateTab('jobs')}
            className="text-xs font-medium text-accent-light hover:underline flex items-center"
          >
            {t('dashboard.viewAll')}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-8 text-txt-muted text-sm">
            {t('dashboard.emptyRecent')}
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentJobs.slice(0, 5).map((j) => (
              <div key={j.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-txt-primary text-sm truncate">{j.title}</span>
                    {j.is_remote && (
                      <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                        {t('common.remote')}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] uppercase font-semibold rounded border ${
                      j.liveness_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      j.liveness_status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {j.liveness_status === 'active' ? t('common.active') : j.liveness_status === 'expired' ? t('common.expired') : t('common.toVerify')}
                    </span>
                  </div>
                  <div className="text-xs text-txt-secondary mt-0.5 flex items-center gap-3">
                    <span>{j.company}</span>
                    <span>•</span>
                    <span>{j.location || '-'}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] text-txt-muted">{j.source}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenJobAI(j)}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-md transition-colors"
                  >
                    {t('dashboard.aiStudio')}
                  </button>
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-medium bg-accent/10 hover:bg-accent/20 text-accent-light rounded-md transition-colors"
                  >
                    {t('dashboard.openJob')}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
