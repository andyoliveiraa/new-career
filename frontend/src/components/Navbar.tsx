import React from 'react';
import { Briefcase, LayoutDashboard, User, Search } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  statsTotal?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, statsTotal = 0 }) => {
  const navItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'jobs', label: 'Vagas & Pipeline', icon: Briefcase, badge: statsTotal > 0 ? statsTotal : undefined },
    { id: 'scrapers', label: 'Central de Varredura', icon: Search },
    { id: 'profile', label: 'Perfil Mestre', icon: User },
  ];

  return (
    <header className="border-b border-surface-border bg-surface-100/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-lg shadow-sm">
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

          {/* System Status Indicator */}
          <div className="flex items-center space-x-2 text-xs text-txt-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sistema Ativo</span>
          </div>
        </div>
      </div>
    </header>
  );
};
