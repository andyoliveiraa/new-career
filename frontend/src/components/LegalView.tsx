import React from 'react';
import {
  ArrowLeft,
  Scale,
  ShieldCheck,
  Lock,
  Database,
  Server,
  KeyRound,
  FileCheck2,
  UserCheck,
  EyeOff,
  Workflow,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { trackEvent } from '../firebase';

interface LegalViewProps {
  page: 'rgpd' | 'privacy';
  onChangePage: (page: 'rgpd' | 'privacy') => void;
  onBack: () => void;
  backLabel?: string;
  showLanguageSelector?: boolean;
}

export const LegalView: React.FC<LegalViewProps> = ({
  page,
  onChangePage,
  onBack,
  backLabel,
  showLanguageSelector = true,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const handleSwitchPage = (target: 'rgpd' | 'privacy') => {
    trackEvent('legal_page_switched', { page: target });
    onChangePage(target);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-9 px-3.5 inline-flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 text-xs font-medium text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel || t('legal.backToLogin')}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => handleSwitchPage('rgpd')}
                className={`h-7 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                  page === 'rgpd'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t('legal.rgpdTab')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPage('privacy')}
                className={`h-7 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                  page === 'privacy'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('legal.privacyTab')}</span>
              </button>
            </div>

            {showLanguageSelector && (
              <LanguageSelector
                value={language}
                onChange={setLanguage}
                ariaLabel={t('app.languageLabel')}
                compact
              />
            )}
          </div>
        </div>

        {/* Hero Header Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              {page === 'rgpd' ? (
                <Scale className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-blue-400 mb-1">
                {page === 'rgpd' ? t('legal.rgpdBadge') : t('legal.privacyBadge')}
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
                {page === 'rgpd' ? t('legal.rgpdTitle') : t('legal.privacyTitle')}
              </h1>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
                {page === 'rgpd' ? t('legal.rgpdSubtitle') : t('legal.privacySubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Page Body */}
        {page === 'rgpd' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Database className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.rgpdSec1Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.rgpdSec1Body')}</p>
            </section>

            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <FileCheck2 className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.rgpdSec2Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.rgpdSec2Body')}</p>
            </section>

            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Server className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.rgpdSec3Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.rgpdSec3Body')}</p>
            </section>

            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.rgpdSec4Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.rgpdSec4Body')}</p>
            </section>

            <section className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <EyeOff className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.rgpdSec5Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.rgpdSec5Body')}</p>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Workflow className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.privSec1Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.privSec1Body')}</p>
            </section>

            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.privSec2Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.privSec2Body')}</p>
            </section>

            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.privSec3Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.privSec3Body')}</p>
            </section>

            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Database className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.privSec4Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.privSec4Body')}</p>
            </section>

            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <h2>{t('legal.privSec5Title')}</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t('legal.privSec5Body')}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
