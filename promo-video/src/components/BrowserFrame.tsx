import React from 'react';
import { Img, staticFile } from 'remotion';
import { Globe, LayoutDashboard, Briefcase, Palette, Search, User, Sliders } from 'lucide-react';
import { FONTS, THEME } from '../theme';

export type NavTabId = 'dashboard' | 'jobs' | 'cv-builder' | 'scrapers' | 'profile' | 'settings';
export type LangCode = 'EN' | 'PT' | 'ES';

const NAV_TRANSLATIONS: Record<LangCode, Record<NavTabId, string>> = {
  EN: {
    dashboard: 'Dashboard',
    jobs: 'Jobs & Pipeline',
    'cv-builder': 'CV Templates',
    scrapers: 'Job Scraper',
    profile: 'Master Profile',
    settings: 'Settings',
  },
  PT: {
    dashboard: 'Painel',
    jobs: 'Vagas & Pipeline',
    'cv-builder': 'Modelos CV',
    scrapers: 'Varredura',
    profile: 'Perfil Mestre',
    settings: 'Configurações',
  },
  ES: {
    dashboard: 'Panel',
    jobs: 'Empleos y Pipeline',
    'cv-builder': 'Plantillas CV',
    scrapers: 'Buscador',
    profile: 'Perfil Maestro',
    settings: 'Ajustes',
  },
};

interface BrowserFrameProps {
  activeTab: NavTabId;
  lang: LangCode;
  isVertical: boolean;
  highlightLang?: boolean;
  jobsCount?: number;
  children: React.ReactNode;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  activeTab,
  lang,
  isVertical,
  highlightLang = false,
  jobsCount = 24,
  children,
}) => {
  const labels = NAV_TRANSLATIONS[lang];

  const navItems: Array<{ id: NavTabId; icon: React.FC<{ className?: string }>; badge?: number }> = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'jobs', icon: Briefcase, badge: jobsCount },
    { id: 'cv-builder', icon: Palette },
    { id: 'scrapers', icon: Search },
    { id: 'profile', icon: User },
    { id: 'settings', icon: Sliders },
  ];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: THEME.bg,
        borderRadius: 20,
        border: `1.5px solid ${THEME.border}`,
        boxShadow: '0 40px 100px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONTS.sans,
      }}
    >
      {/* Browser Window Chrome */}
      <div
        style={{
          height: 44,
          backgroundColor: '#0c1220',
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#ef4444', opacity: 0.85 }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#f59e0b', opacity: 0.85 }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#10b981', opacity: 0.85 }} />
        </div>

        <div
          style={{
            backgroundColor: THEME.surface100,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: '4px 18px',
            fontSize: 13,
            color: THEME.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: THEME.emerald }} />
          <span style={{ color: THEME.textPrimary, fontWeight: 500 }}>career.andydias.pt</span>
        </div>

        <div style={{ width: 48 }} />
      </div>

      {/* App Navbar (faithful to live New Career app) */}
      <div
        style={{
          height: isVertical ? 54 : 58,
          backgroundColor: THEME.surface100,
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isVertical ? '0 16px' : '0 24px',
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Img src={staticFile('nc-mark.svg')} style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 16,
              color: THEME.textPrimary,
              letterSpacing: '-0.02em',
            }}
          >
            New Career
          </span>
          {!isVertical && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 6,
                backgroundColor: THEME.surface200,
                color: THEME.textMuted,
                border: `1px solid ${THEME.border}`,
              }}
            >
              v1.0
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isVertical ? 4 : 6 }}>
          {(isVertical ? navItems.slice(0, 4) : navItems).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: isVertical ? '6px 8px' : '6px 11px',
                  borderRadius: 8,
                  fontSize: isVertical ? 11 : 12,
                  fontWeight: 500,
                  backgroundColor: isActive ? THEME.surface200 : 'transparent',
                  color: isActive ? THEME.textPrimary : THEME.textSecondary,
                  border: isActive ? `1px solid ${THEME.border}` : '1px solid transparent',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {!isVertical && <span>{labels[item.id]}</span>}
                {item.badge !== undefined && !isVertical && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 999,
                      backgroundColor: THEME.accentMuted,
                      color: THEME.accentLight,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Language Selector Pill & User Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px',
              borderRadius: 10,
              backgroundColor: THEME.surface200,
              border: `1.5px solid ${highlightLang ? THEME.accentLight : THEME.border}`,
              boxShadow: highlightLang ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none',
            }}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {(['EN', 'PT', 'ES'] as LangCode[]).map((code) => {
              const selected = lang === code;
              return (
                <div
                  key={code}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: selected ? THEME.accent : 'transparent',
                    color: selected ? '#ffffff' : THEME.textSecondary,
                  }}
                >
                  {code}
                </div>
              );
            })}
          </div>

          {!isVertical && (
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: THEME.accentMuted,
                border: '1px solid rgba(59,130,246,0.35)',
                color: THEME.accentLight,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              AD
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          padding: isVertical ? 18 : 26,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: THEME.bg,
        }}
      >
        {children}
      </div>
    </div>
  );
};
