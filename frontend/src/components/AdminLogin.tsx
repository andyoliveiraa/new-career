import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || 'Credenciais inválidas.');
        return;
      }
      const { access_token } = await res.json();
      sessionStorage.setItem('nc_admin_token', access_token);
      onLogin(access_token);
    } catch {
      setError('Erro de ligação ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-200 border border-surface-border mb-4">
            <ShieldCheck className="w-6 h-6 text-accent-blue" />
          </div>
          <h1 className="text-xl font-semibold text-txt-primary">Painel de Administração</h1>
          <p className="text-sm text-txt-secondary mt-1">New Career — Acesso restrito</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface-100 border border-surface-border rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2.5 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue transition-colors"
              placeholder="admin@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1.5">Palavra-passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-surface-200 border border-surface-border rounded-lg px-3 py-2.5 pr-10 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-txt-muted hover:text-txt-secondary transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-txt-muted mt-4">
          Sessão válida por 8 horas
        </p>
      </div>
    </div>
  );
};
