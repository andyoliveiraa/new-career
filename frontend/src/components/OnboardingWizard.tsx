import React, { useState, useRef } from 'react';
import {
  FolderSync, Sparkles, CheckCircle2, AlertCircle, ArrowRight,
  Check, Layers, UploadCloud, Shield, FileText, Archive
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { OnboardingResult, ProfileExperience, ProfileEducation, ProfileLanguage, ProfileCertification, ProfileProject } from '../types';
import { LanguageSelector } from './LanguageSelector';
import type { LanguageCode } from '../i18n';

export const OnboardingWizard: React.FC = () => {
  const { user, setCompletedOnboarding, updatePreferredLanguage } = useAuth();
  const { language, t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<'career_ops' | 'manual' | null>(null);

  const [careerOpsSubMode, setCareerOpsSubMode] = useState<'privacy' | 'zip'>('privacy');

  const [fullZipFile, setFullZipFile] = useState<File | null>(null);
  const fullZipInputRef = useRef<HTMLInputElement>(null);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [applicationsFile, setApplicationsFile] = useState<File | null>(null);
  const [outputZipFile, setOutputZipFile] = useState<File | null>(null);

  const cvInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const appsInputRef = useRef<HTMLInputElement>(null);
  const outputZipInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<OnboardingResult | null>(null);

  // Attach CV -> Markdown -> Confirm Flow
  const [manualStep, setManualStep] = useState<'upload' | 'confirm'>('upload');
  const [reviewTab, setReviewTab] = useState<'profile' | 'markdown'>('profile');
  const [attachedCvFile, setAttachedCvFile] = useState<File | null>(null);
  const attachedCvInputRef = useRef<HTMLInputElement>(null);
  const [parsingCv, setParsingCv] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [headline, setHeadline] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [initialSkills, setInitialSkills] = useState('');
  const [experiences, setExperiences] = useState<ProfileExperience[]>([]);
  const [educations, setEducations] = useState<ProfileEducation[]>([]);
  const [certifications, setCertifications] = useState<ProfileCertification[]>([]);
  const [projects, setProjects] = useState<ProfileProject[]>([]);
  const [languages, setLanguages] = useState<ProfileLanguage[]>([]);
  const [verifiedFacts, setVerifiedFacts] = useState<string[]>([]);
  const [initialCvText, setInitialCvText] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const handleLanguageChange = async (lang: LanguageCode) => {
    try {
      await updatePreferredLanguage(lang);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportFullZip = async () => {
    if (!fullZipFile) {
      setImportError(t('onboarding.zipRequiredError'));
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const res = await api.uploadCareerOpsZip(fullZipFile);
      setImportResult(res);
    } catch (err: any) {
      setImportError(err.message || t('onboarding.zipImportError'));
    } finally {
      setImporting(false);
    }
  };

  const handleImportPrivacy = async () => {
    if (!cvFile) {
      setImportError(t('onboarding.cvRequiredError'));
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const res = await api.uploadCareerOpsPrivacy({
        cvFile,
        profileFile,
        applicationsFile,
        outputZip: outputZipFile
      });
      setImportResult(res);
    } catch (err: any) {
      setImportError(err.message || t('onboarding.privacyImportError'));
    } finally {
      setImporting(false);
    }
  };

  const handleParseAttachedCv = async () => {
    if (!attachedCvFile) {
      setManualError(t('onboarding.cvFileMissingError'));
      return;
    }

    setParsingCv(true);
    setManualError(null);
    try {
      const res = await api.parseCVUpload(attachedCvFile);
      const p = res.profile;
      setFullName(p.full_name || user?.full_name || '');
      setHeadline(p.headline || '');
      setEmail(p.email || user?.email || '');
      setPhone(p.phone || '');
      setLocation(p.location || '');
      setLinkedinUrl(p.linkedin_url || '');
      setGithubUrl(p.github_url || '');
      setPortfolioUrl(p.portfolio_url || '');
      setSummary(p.summary || '');
      setInitialSkills((p.skills || []).join(', '));
      setExperiences(p.experiences || []);
      setEducations(p.educations || []);
      setCertifications(p.certifications || []);
      setProjects(p.projects || []);
      setLanguages(p.languages || []);
      setVerifiedFacts(p.verified_facts || []);
      setInitialCvText(res.cv_markdown || '');
      setReviewTab('profile');
      setManualStep('confirm');
    } catch (err: any) {
      setManualError(err.message || t('onboarding.cvParseError'));
    } finally {
      setParsingCv(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    setManualError(null);
    try {
      const skillsArray = initialSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.onboardingManual({
        full_name: fullName.trim() || undefined,
        headline: headline.trim() || undefined,
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        phone: phone.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        github_url: githubUrl.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
        summary: summary.trim() || undefined,
        initial_skills: skillsArray,
        experiences,
        educations,
        certifications,
        projects,
        languages,
        verified_facts: verifiedFacts,
        initial_cv_text: initialCvText
      });
      setCompletedOnboarding();
    } catch (err: any) {
      setManualError(err.message || t('onboarding.manualSaveError'));
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex justify-end mb-4">
          <LanguageSelector
            value={language}
            onChange={handleLanguageChange}
            ariaLabel={t('app.languageLabel')}
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('onboarding.badge')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
            {t('onboarding.greeting', { name: user?.full_name || t('onboarding.greetingFallback') })}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-lg mx-auto">
            {t('onboarding.subtitle')}
          </p>
        </div>

        {/* Wizard Main Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* SCREEN 1: CHOICE */}
          {!selectedMode && (
            <div>
              <h2 className="text-base font-medium text-slate-200 mb-2 text-center">
                {t('onboarding.question')}
              </h2>
              <p className="text-xs text-slate-400 mb-6 text-center">
                {t('onboarding.questionSubtitle')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedMode('career_ops')}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 hover:border-blue-500/50 text-start transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <FolderSync className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span>{t('onboarding.optionCareerOpsTitle')}</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t('onboarding.optionCareerOpsDesc')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1 text-xs font-medium text-blue-400">
                    <span>{t('onboarding.optionCareerOpsCta')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('manual')}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 hover:border-slate-700 text-start transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1">
                      {t('onboarding.optionManualTitle')}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t('onboarding.optionManualDesc')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1 text-xs font-medium text-slate-400">
                    <span>{t('onboarding.optionManualCta')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: CAREER-OPS UPLOADS */}
          {selectedMode === 'career_ops' && !importResult && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedMode(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← {t('onboarding.chooseAnother')}
                </button>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => { setCareerOpsSubMode('privacy'); setImportError(null); }}
                    className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
                      careerOpsSubMode === 'privacy'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>{t('onboarding.privacyModeTab')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCareerOpsSubMode('zip'); setImportError(null); }}
                    className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
                      careerOpsSubMode === 'zip'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Archive className="w-3 h-3" />
                    <span>{t('onboarding.fullZipTab')}</span>
                  </button>
                </div>
              </div>

              {importError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {careerOpsSubMode === 'privacy' && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-slate-100 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>{t('onboarding.privacyModeTitle')}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('onboarding.privacyModeDesc')}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <span>{t('onboarding.cvFileTitle')}</span>
                            <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              {t('common.required')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {t('onboarding.cvFilePath')}
                          </div>
                        </div>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".md"
                          ref={cvInputRef}
                          onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => cvInputRef.current?.click()}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            cvFile
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {cvFile ? `✓ ${cvFile.name}` : t('onboarding.selectMd')}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {t('onboarding.profileFileTitle')}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {t('onboarding.profileFilePath')}
                          </div>
                        </div>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".yml,.yaml"
                          ref={profileInputRef}
                          onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => profileInputRef.current?.click()}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            profileFile
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {profileFile ? `✓ ${profileFile.name}` : t('onboarding.selectYml')}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {t('onboarding.appsFileTitle')}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {t('onboarding.appsFilePath')}
                          </div>
                        </div>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".md"
                          ref={appsInputRef}
                          onChange={(e) => setApplicationsFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => appsInputRef.current?.click()}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            applicationsFile
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {applicationsFile ? `✓ ${applicationsFile.name}` : t('onboarding.selectMd')}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Archive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {t('onboarding.outputZipTitle')}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {t('onboarding.outputZipPath')}
                          </div>
                        </div>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept=".zip"
                          ref={outputZipInputRef}
                          onChange={(e) => setOutputZipFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => outputZipInputRef.current?.click()}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            outputZipFile
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {outputZipFile ? `✓ ${outputZipFile.name}` : t('onboarding.selectZip')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleImportPrivacy}
                    disabled={importing || !cvFile}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('onboarding.importingPrivacy')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('onboarding.importPrivacyBtn')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {careerOpsSubMode === 'zip' && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-slate-100 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-blue-400" />
                      <span>{t('onboarding.fullZipTitle')}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('onboarding.fullZipDesc')}
                    </p>
                  </div>

                  <div
                    onClick={() => fullZipInputRef.current?.click()}
                    className="p-8 rounded-xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/40 hover:bg-slate-950/70 text-center cursor-pointer transition-colors mb-5 group"
                  >
                    <input
                      type="file"
                      accept=".zip"
                      ref={fullZipInputRef}
                      onChange={(e) => setFullZipFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    {fullZipFile ? (
                      <div>
                        <div className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>{fullZipFile.name}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {(fullZipFile.size / (1024 * 1024)).toFixed(2)} MB • {t('onboarding.clickToChange')}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          {t('onboarding.fullZipDropPrompt')}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {t('onboarding.fullZipDropHint')}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportFullZip}
                    disabled={importing || !fullZipFile}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('onboarding.importingZip')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('onboarding.importZipBtn')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 3: SUCCESS FEEDBACK */}
          {importResult && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">
                {t('onboarding.successTitle')}
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                {t('onboarding.successSubtitle')}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-slate-100">{importResult.jobs_count}</div>
                  <div className="text-[11px] text-slate-400">{t('onboarding.jobsAndAppsCount')}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-slate-100">{importResult.experiences_count}</div>
                  <div className="text-[11px] text-slate-400">{t('onboarding.experiencesCount')}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-slate-100">{importResult.skills_count}</div>
                  <div className="text-[11px] text-slate-400">{t('onboarding.skillsCount')}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-emerald-400">{t('onboarding.masterCvActive')}</div>
                  <div className="text-[11px] text-slate-400">{t('onboarding.masterCvLabel')}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={setCompletedOnboarding}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{t('onboarding.goToDashboard')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* SCREEN 4: ATTACH CV -> CONVERT TO MD -> CONFIRM */}
          {selectedMode === 'manual' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode(null);
                    setManualStep('upload');
                    setManualError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← {t('onboarding.chooseAnother')}
                </button>
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                  {t('onboarding.quickSetupBadge')}
                </span>
              </div>

              {manualError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              {manualStep === 'upload' ? (
                <div>
                  <h2 className="text-lg font-medium text-slate-100 mb-1">
                    {t('onboarding.attachCvTitle')}
                  </h2>
                  <p className="text-xs text-slate-400 mb-5">
                    {t('onboarding.attachCvSubtitle')}
                  </p>

                  <div
                    onClick={() => attachedCvInputRef.current?.click()}
                    className="p-8 rounded-xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/40 hover:bg-slate-950/70 text-center cursor-pointer transition-colors mb-5 group"
                  >
                    <input
                      type="file"
                      accept=".pdf,.docx,.md,.markdown,.txt,.html,.htm"
                      ref={attachedCvInputRef}
                      onChange={(e) => {
                        setAttachedCvFile(e.target.files?.[0] || null);
                        setManualError(null);
                      }}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    {attachedCvFile ? (
                      <div>
                        <div className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>{attachedCvFile.name}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {(attachedCvFile.size / 1024).toFixed(1)} KB • {t('onboarding.clickToChange')}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          {t('onboarding.attachCvDropPrompt')}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {t('onboarding.attachCvDropHint')}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleParseAttachedCv}
                    disabled={parsingCv || !attachedCvFile}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {parsingCv ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('onboarding.convertingCv')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('onboarding.convertCvBtn')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setManualError(null);
                        setManualStep('confirm');
                      }}
                      className="text-xs text-slate-400 hover:text-blue-400 underline transition-colors"
                    >
                      {t('onboarding.fillManuallyLink')}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-300">
                        {t('onboarding.reviewBannerTitle')}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        {t('onboarding.reviewBannerDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewTab('profile')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          reviewTab === 'profile'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {t('onboarding.reviewTabProfile')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewTab('markdown')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          reviewTab === 'markdown'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {t('onboarding.reviewTabMarkdown')}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setManualStep('upload');
                        setManualError(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 underline"
                    >
                      {t('onboarding.uploadAnotherCv')}
                    </button>
                  </div>

                  {reviewTab === 'profile' ? (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pe-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('profile.fullName')}
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('onboarding.headlineLabel')}
                          </label>
                          <input
                            type="text"
                            required
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            placeholder={t('onboarding.headlinePlaceholder')}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('profile.email')}
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('onboarding.phoneLabel')}
                          </label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t('onboarding.phonePlaceholder')}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('onboarding.locationLabel')}
                          </label>
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder={t('onboarding.locationPlaceholder')}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('profile.linkedin')}
                          </label>
                          <input
                            type="text"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('profile.github')}
                          </label>
                          <input
                            type="text"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            {t('profile.portfolio')}
                          </label>
                          <input
                            type="text"
                            value={portfolioUrl}
                            onChange={(e) => setPortfolioUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          {t('profile.summaryTitle')}
                        </label>
                        <textarea
                          rows={2}
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          {t('onboarding.skillsLabel')}
                        </label>
                        <input
                          type="text"
                          value={initialSkills}
                          onChange={(e) => setInitialSkills(e.target.value)}
                          placeholder={t('onboarding.skillsPlaceholder')}
                          className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {experiences.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 space-y-2">
                          <div className="text-xs font-semibold text-slate-300">
                            {t('profile.experiencesTitle', { count: experiences.length })}
                          </div>
                          {experiences.map((exp, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              <input
                                type="text"
                                value={exp.role}
                                onChange={(e) => {
                                  const next = [...experiences];
                                  next[idx] = { ...exp, role: e.target.value };
                                  setExperiences(next);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                              />
                              <input
                                type="text"
                                value={exp.company}
                                onChange={(e) => {
                                  const next = [...experiences];
                                  next[idx] = { ...exp, company: e.target.value };
                                  setExperiences(next);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                              />
                              <input
                                type="text"
                                value={exp.period}
                                onChange={(e) => {
                                  const next = [...experiences];
                                  next[idx] = { ...exp, period: e.target.value };
                                  setExperiences(next);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {educations.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 space-y-2">
                          <div className="text-xs font-semibold text-slate-300">
                            {t('profile.educationsTitle', { count: educations.length })}
                          </div>
                          {educations.map((edu, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              <input
                                type="text"
                                value={edu.degree}
                                onChange={(e) => {
                                  const next = [...educations];
                                  next[idx] = { ...edu, degree: e.target.value };
                                  setEducations(next);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                              />
                              <input
                                type="text"
                                value={edu.institution}
                                onChange={(e) => {
                                  const next = [...educations];
                                  next[idx] = { ...edu, institution: e.target.value };
                                  setEducations(next);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                              />
                              <input
                                type="text"
                                value={edu.period}
                                onChange={(e) => {
                                  const next = [...educations];
                                  next[idx] = { ...edu, period: e.target.value };
                                  setEducations(next);
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {languages.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 space-y-1.5">
                          <div className="text-xs font-semibold text-slate-300">
                            {t('profile.languagesTitle')} ({languages.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {languages.map((l, idx) => (
                              <span key={idx} className="text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                {l.name}{l.level ? ` (${l.level})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        rows={14}
                        value={initialCvText}
                        onChange={(e) => setInitialCvText(e.target.value)}
                        placeholder={t('onboarding.cvTextPlaceholder')}
                        className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 font-mono leading-relaxed"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {manualLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t('onboarding.confirmAndSave')}</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
