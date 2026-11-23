import React, { useState, useRef } from 'react';
import {
  FolderSync, Sparkles, CheckCircle2, AlertCircle, ArrowRight,
  Check, Layers, UploadCloud, Shield, FileText, Archive
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { OnboardingResult } from '../types';

export const OnboardingWizard: React.FC = () => {
  const { user, setCompletedOnboarding } = useAuth();
  const [selectedMode, setSelectedMode] = useState<'career_ops' | 'manual' | null>(null);

  // Sub-mode in Career-Ops: 'zip' (Modo Rápido) or 'privacy' (Modo Privacidade)
  const [careerOpsSubMode, setCareerOpsSubMode] = useState<'privacy' | 'zip'>('privacy');

  // Modo Rápido (Full Zip)
  const [fullZipFile, setFullZipFile] = useState<File | null>(null);
  const fullZipInputRef = useRef<HTMLInputElement>(null);

  // Modo de Privacidade (Individual files)
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [applicationsFile, setApplicationsFile] = useState<File | null>(null);
  const [outputZipFile, setOutputZipFile] = useState<File | null>(null);

  const cvInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const appsInputRef = useRef<HTMLInputElement>(null);
  const outputZipInputRef = useRef<HTMLInputElement>(null);

  // Processing & Feedback state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<OnboardingResult | null>(null);

  // Manual state
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [initialSkills, setInitialSkills] = useState('');
  const [initialCvText, setInitialCvText] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // 1. Submit Modo Rápido (ZIP)
  const handleImportFullZip = async () => {
    if (!fullZipFile) {
      setImportError('Por favor selecione o ficheiro .zip da pasta do Career-Ops.');
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const res = await api.uploadCareerOpsZip(fullZipFile);
      setImportResult(res);
    } catch (err: any) {
      setImportError(err.message || 'Erro ao descompactar e importar arquivo ZIP.');
    } finally {
      setImporting(false);
    }
  };

  // 2. Submit Modo de Privacidade (Ficheiros Individuais)
  const handleImportPrivacy = async () => {
    if (!cvFile) {
      setImportError('O ficheiro "cv.md" é obrigatório como CV Base Mestre.');
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
      setImportError(err.message || 'Erro ao importar ficheiros no modo privacidade.');
    } finally {
      setImporting(false);
    }
  };

  // 3. Submit Manual
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
        headline,
        location,
        phone,
        initial_skills: skillsArray,
        initial_cv_text: initialCvText
      });
      setCompletedOnboarding();
    } catch (err: any) {
      setManualError(err.message || 'Erro ao guardar configuração.');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Configuração Inicial da Conta</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
            Olá, {user?.full_name || 'Profissional'}!
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-lg mx-auto">
            Vamos preparar a sua conta para monitorizar vagas, personalizar currículos e gerir o seu pipeline de candidaturas.
          </p>
        </div>

        {/* Wizard Main Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* SCREEN 1: CHOICE */}
          {!selectedMode && (
            <div>
              <h2 className="text-base font-medium text-slate-200 mb-2 text-center">
                Já utilizou o sistema Career-Ops anteriormente?
              </h2>
              <p className="text-xs text-slate-400 mb-6 text-center">
                Pode enviar os seus ficheiros do Career-Ops para a VPS ou começar com um perfil novo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Career-Ops */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('career_ops')}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 hover:border-blue-500/50 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <FolderSync className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span>Sim, importar do Career-Ops</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Carregue o seu CV Base em Markdown, perfil e histórico de vagas submetidas com PDFs.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1 text-xs font-medium text-blue-400">
                    <span>Configurar envio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Option B: Fresh */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('manual')}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 hover:border-slate-700 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1">
                      Não, começar do zero
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Crie um perfil novo e comece a rastrear oportunidades em tempo real a partir do zero.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1 text-xs font-medium text-slate-400">
                    <span>Configuração rápida</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: CAREER-OPS UPLOADS (MODO PRIVACIDADE vs MODO RÁPIDO) */}
          {selectedMode === 'career_ops' && !importResult && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedMode(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← Escolher outra opção
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
                    <span>Modo Privacidade</span>
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
                    <span>ZIP Completo</span>
                  </button>
                </div>
              </div>

              {importError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* SUB-MODE 1: MODO DE PRIVACIDADE */}
              {careerOpsSubMode === 'privacy' && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-slate-100 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Modo de Privacidade (Upload Ficheiro a Ficheiro)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controle exatamente o que envia para a VPS. Suba apenas os ficheiros essenciais e comprima exclusivamente a pasta <strong>output/</strong> em ZIP.
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {/* 1. cv.md */}
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <span>1. CV Base Mestre (`cv.md`)</span>
                            <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">Obrigatório</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            Caminho no Career-Ops: <strong className="text-slate-300">cv.md</strong> (na raiz)
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
                          {cvFile ? `✓ ${cvFile.name}` : 'Selecionar .md'}
                        </button>
                      </div>
                    </div>

                    {/* 2. profile.yml */}
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            2. Perfil & Competências (`profile.yml`)
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            Caminho no Career-Ops: <strong className="text-slate-300">config/profile.yml</strong>
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
                          {profileFile ? `✓ ${profileFile.name}` : 'Selecionar .yml'}
                        </button>
                      </div>
                    </div>

                    {/* 3. applications.md */}
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            3. Vagas Submetidas (`applications.md`)
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            Caminho no Career-Ops: <strong className="text-slate-300">data/applications.md</strong>
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
                          {applicationsFile ? `✓ ${applicationsFile.name}` : 'Selecionar .md'}
                        </button>
                      </div>
                    </div>

                    {/* 4. output.zip */}
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Archive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            4. PDFs das Vagas (`output.zip`)
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            Caminho no Career-Ops: Comprima apenas a pasta <strong className="text-slate-300">output/</strong>
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
                          {outputZipFile ? `✓ ${outputZipFile.name}` : 'Selecionar .zip'}
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
                        <span>A processar ficheiros e descompactar PDFs...</span>
                      </>
                    ) : (
                      <>
                        <span>Importar com Privacidade</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* SUB-MODE 2: MODO RÁPIDO (ARQUIVO ZIP COMPLETO) */}
              {careerOpsSubMode === 'zip' && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-slate-100 flex items-center gap-2">
                      <Archive className="w-4 h-4 text-blue-400" />
                      <span>Modo Rápido (Pasta Completa em ZIP)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Comprima toda a pasta do Career-Ops num ficheiro <strong>.zip</strong>. O servidor VPS descompactará e organizará tudo automaticamente.
                    </p>
                  </div>

                  {/* Dropzone */}
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
                          {(fullZipFile.size / (1024 * 1024)).toFixed(2)} MB • Clique para alterar
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          Clique aqui ou arraste o ficheiro <span className="font-mono text-blue-400">career-ops.zip</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Contendo `cv.md`, `config/profile.yml`, `data/applications.md` e pasta `output/`
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
                        <span>A enviar e descompactar na VPS...</span>
                      </>
                    ) : (
                      <>
                        <span>Descompactar e Importar no Servidor</span>
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
                Importação Concluída com Sucesso!
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Todos os ficheiros foram descompactados e indexados com total isolamento para o utilizador.
              </p>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-slate-100">{importResult.jobs_count}</div>
                  <div className="text-[11px] text-slate-400">Vagas e Candidaturas</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-slate-100">{importResult.experiences_count}</div>
                  <div className="text-[11px] text-slate-400">Experiências</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-slate-100">{importResult.skills_count}</div>
                  <div className="text-[11px] text-slate-400">Competências</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-lg font-bold text-emerald-400">Ativo</div>
                  <div className="text-[11px] text-slate-400">CV Base Mestre</div>
                </div>
              </div>

              <button
                type="button"
                onClick={setCompletedOnboarding}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Aceder à Minha Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* SCREEN 4: MANUAL SETUP */}
          {selectedMode === 'manual' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedMode(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← Escolher outra opção
                </button>
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                  Setup Rápido
                </span>
              </div>

              <h2 className="text-lg font-medium text-slate-100 mb-1">
                Configuração Básica do Perfil
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                Defina o seu cargo pretendido e competências base para começar a monitorizar vagas.
              </p>

              {manualError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Título Profissional / Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Ex: Desenvolvedor Full Stack / Engenheiro de Software"
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Localização Preferencial
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Lisboa, Porto ou Remoto"
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Contacto Telefónico
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+351 9xx xxx xxx"
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Principais Competências (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={initialSkills}
                    onChange={(e) => setInitialSkills(e.target.value)}
                    placeholder="Python, React, TypeScript, SQL..."
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    CV Base em Texto / Markdown (opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={initialCvText}
                    onChange={(e) => setInitialCvText(e.target.value)}
                    placeholder="Cole aqui o texto ou resumo do seu currículo base..."
                    className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={manualLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {manualLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Concluir e Começar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
