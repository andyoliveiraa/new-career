import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, ShieldCheck, LogOut, Search, RefreshCw,
  CheckCircle2, Clock, Globe, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string | null;
  last_login_at: string | null;
  has_completed_onboarding: boolean;
  preferred_language: string;
}

interface PlatformMetrics {
  total_users: number;
  platform_totals: Record<string, number>;
  today_metrics: Record<string, number>;
  date: string;
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';
const PAGE_SIZE = 20;

function adminHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return 'agora mesmo';
    if (mins < 60) return `há ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `há ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `há ${days}d`;
  } catch { return iso; }
}

const LANG_LABELS: Record<string, string> = {
  en: 'EN', pt: 'PT', es: 'ES', de: 'DE', zh: 'ZH', ar: 'AR', ko: 'KO',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onLogout }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { headers: adminHeaders(token) }),
        fetch(`${API_BASE}/admin/metrics`, { headers: adminHeaders(token) }),
      ]);
      if (usersRes.status === 401 || usersRes.status === 403) {
        onLogout();
        return;
      }
      const usersData = await usersRes.json();
      const metricsData = await metricsRes.json();
      setUsers(usersData.users || []);
      setMetrics(metricsData);
    } catch {
      setError('Erro ao carregar dados. Verifique a ligação ao servidor.');
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = [
    {
      label: 'Total de Utilizadores',
      value: metrics?.total_users ?? users.length,
      icon: Users,
      color: 'text-accent-blue',
    },
    {
      label: 'Onboarding Concluído',
      value: users.filter(u => u.has_completed_onboarding).length,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'Registos Hoje',
      value: metrics?.today_metrics?.registers ?? 0,
      icon: Clock,
      color: 'text-amber-400',
    },
    {
      label: 'Logins Hoje',
      value: metrics?.today_metrics?.logins ?? 0,
      icon: ShieldCheck,
      color: 'text-txt-secondary',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-surface-border bg-surface-100/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span className="font-semibold text-txt-primary text-sm">Admin</span>
            <span className="text-surface-border text-sm">·</span>
            <span className="text-txt-secondary text-sm">New Career</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-txt-secondary hover:text-txt-primary border border-surface-border rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-xs text-txt-secondary hover:text-red-400 border border-surface-border rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Terminar Sessão
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-surface-100 border border-surface-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-txt-secondary">{kpi.label}</p>
                  <p className="text-2xl font-bold text-txt-primary tabular-nums mt-1">{loading ? '—' : kpi.value}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-surface-200 border border-surface-border flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Users table */}
        <div className="bg-surface-100 border border-surface-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-3 border-b border-surface-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent-blue" />
              <h2 className="text-sm font-semibold text-txt-primary">Utilizadores Registados</h2>
              <span className="text-xs text-txt-muted bg-surface-200 border border-surface-border rounded-md px-2 py-0.5 tabular-nums">
                {filtered.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted" />
              <input
                type="search"
                placeholder="Nome ou email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-1.5 text-xs bg-surface-200 border border-surface-border rounded-lg text-txt-primary placeholder-txt-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue transition-colors w-52"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Nome', 'Email', 'Registo', 'Último Acesso', 'Idioma', 'Onboarding'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-txt-muted px-4 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-border/50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 bg-surface-200 rounded animate-pulse w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-txt-muted text-xs py-10">
                      {search ? 'Nenhum utilizador encontrado para a pesquisa.' : 'Nenhum utilizador registado.'}
                    </td>
                  </tr>
                ) : (
                  paginated.map(user => (
                    <tr key={user.id} className="border-b border-surface-border/50 hover:bg-surface-200/40 transition-colors">
                      <td className="px-4 py-3 text-txt-primary font-medium whitespace-nowrap max-w-[180px] truncate" title={user.full_name}>
                        {user.full_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-txt-secondary whitespace-nowrap max-w-[220px] truncate" title={user.email}>
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-txt-muted text-xs whitespace-nowrap tabular-nums">
                        {fmtDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-txt-muted text-xs whitespace-nowrap tabular-nums" title={user.last_login_at ?? undefined}>
                        {fmtRelative(user.last_login_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-txt-secondary bg-surface-200 border border-surface-border rounded px-1.5 py-0.5">
                          <Globe className="w-3 h-3" />
                          {LANG_LABELS[user.preferred_language] ?? user.preferred_language}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.has_completed_onboarding ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Sim
                          </span>
                        ) : (
                          <span className="text-xs text-txt-muted">Não</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-surface-border flex items-center justify-between gap-4">
              <span className="text-xs text-txt-muted tabular-nums">
                Página {page} de {totalPages} · {filtered.length} utilizadores
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-surface-border text-txt-secondary hover:text-txt-primary disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-surface-border text-txt-secondary hover:text-txt-primary disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Platform metrics strip */}
        {metrics && (
          <div className="bg-surface-100 border border-surface-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-accent-blue" />
              <h2 className="text-sm font-semibold text-txt-primary">Métricas da Plataforma (acumulado)</h2>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Object.entries(metrics.platform_totals)
                .filter(([k]) => !k.startsWith('page_view_') && k !== 'updated_at')
                .sort(([, a], [, b]) => b - a)
                .map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-txt-muted">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-semibold text-txt-primary tabular-nums">{val}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-surface-border py-3 text-center text-xs text-txt-muted">
        New Career Admin · Sessão válida por 8h · {metrics?.date ?? ''}
      </footer>
    </div>
  );
};
