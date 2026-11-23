import React from 'react';
import { Briefcase, LayoutDashboard, User, Search, Palette, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  statsTotal?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, statsTotal = 0 }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'jobs', label: 'Vagas & Pipeline', icon: Briefcase, badge: statsTotal > 0 ? statsTotal : undefined },
    { id: 'cv-builder', label: 'Modelos de CV', icon: Palette },
    { id: 'scrapers', label: 'Central de Varredura', icon: Search },
    { id: 'profile', label: 'Perfil Mestre', icon: User },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="border-b border-surface-border bg-surface-100/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm shadow-sm">
              NC
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-txt-primary">
                New Career
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-surface-200 text-txt-muted border border-surface-border">
                v1.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-surface-200 text-txt-primary border border-surface-border'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-200/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-accent-light' : 'text-txt-muted'}`} />
                  {item.label}
                  {item.badge !== undefined && (
                    <span className="ml-2 px-1.5 py-0.2 text-xs font-semibold rounded-full bg-accent/20 text-accent-light">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User profile & Logout */}
          <div className="flex items-center space-x-3">
            {user && (
              <div className="flex items-center gap-2.5 pl-3 border-l border-surface-border">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-semibold text-xs flex items-center justify-center">
                  {getInitials(user.full_name || 'NC')}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium text-txt-primary leading-none">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-txt-muted leading-tight mt-0.5">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Terminar Sessão"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
