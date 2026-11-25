import React, { useState } from 'react';
import { Briefcase, LayoutDashboard, User, Search, Palette, Sliders, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  statsTotal?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, statsTotal = 0 }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'jobs', label: t('nav.jobs'), icon: Briefcase, badge: statsTotal > 0 ? statsTotal : undefined },
    { id: 'cv-builder', label: t('nav.cvBuilder'), icon: Palette },
    { id: 'scrapers', label: t('nav.scrapers'), icon: Search },
    { id: 'profile', label: t('nav.profile'), icon: User },
    { id: 'settings', label: t('nav.settings'), icon: Sliders },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-surface-border bg-surface-100/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer shrink-0"
            onClick={() => handleSelectTab('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs shadow-sm">
              NC
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-base sm:text-lg tracking-tight text-txt-primary whitespace-nowrap">
                {t('auth.brandName')}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-200 text-txt-muted border border-surface-border">
                v1.0
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 shrink min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center px-2.5 xl:px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-surface-200 text-txt-primary border border-surface-border shadow-xs'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${isActive ? 'text-accent-light' : 'text-txt-muted'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-accent/20 text-accent-light shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side: User profile & Logout + Mobile Menu Button */}
          <div className="flex items-center gap-2 shrink-0">

            {user && (
              <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-surface-border">
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-semibold text-xs flex items-center justify-center shrink-0"
                  title={user.full_name || t('nav.userFallback')}
                >
                  {getInitials(user.full_name || 'NC')}
                </div>
                <div className="hidden sm:block text-left max-w-[120px] xl:max-w-[150px]">
                  <div className="text-xs font-medium text-txt-primary leading-none truncate" title={user.full_name}>
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-txt-muted leading-tight mt-0.5 truncate" title={user.email}>
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title={t('nav.logout')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-surface-200 border border-surface-border transition-colors"
              aria-label={t('nav.openMenu')}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-surface-border bg-surface-100 px-4 py-3 space-y-2 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-surface-200 text-txt-primary border border-surface-border font-semibold'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-200/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent-light' : 'text-txt-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/20 text-accent-light">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
