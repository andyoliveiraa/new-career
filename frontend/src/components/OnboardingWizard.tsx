import React, { useState } from 'react';
import {
  FolderSync, Sparkles, CheckCircle2, AlertCircle, ArrowRight,
  Check, Layers
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { OnboardingResult } from '../types';

export const OnboardingWizard: React.FC = () => {
  const { user, setCompletedOnboarding } = useAuth();
  const [selectedMode, setSelectedMode] = useState<'career_ops' | 'manual' | null>(null);

  // Career-Ops state
  const [directoryPath, setDirectoryPath] = useState(
    'C:\\Users\\andy_\\Desktop\\IA\\career-ops'
  );
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<OnboardingResult | null>(null);

  // Manual state
  const [headline, setHeadline] = useState('Profissional em Tecnologias de Informação & Gestão');
  const [location, setLocation] = useState('Covilhã, Portugal');
  const [phone, setPhone] = useState('+351 925 220 777');
  const [initialSkills, setInitialSkills] = useState('Python, Linux, Suporte Técnico, Atendimento');
  const [initialCvText, setInitialCvText] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const handleImportCareerOps = async () => {
    if (!directoryPath.trim()) {
      setImportError('Por favor indique o caminho da pasta do Career-Ops.');
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const res = await api.onboardingCareerOps(directoryPath.trim());
      setImportResult(res);
    } catch (err: any) {
      setImportError(err.message || 'Erro ao importar dados do Career-Ops.');
    } finally {
      setImporting(false);
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
          {!selectedMode && (
            <div>
              <h2 className="text-base font-medium text-slate-200 mb-2 text-center">
                Já utilizou o sistema Career-Ops anteriormente?
              </h2>
              <p className="text-xs text-slate-400 mb-6 text-center">
                Pode importar instantaneamente todo o seu histórico ou começar com um perfil novo.
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
                      Importe o seu perfil, histórico de vagas submetidas, relatórios de fit e o CV base em Markdown.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1 text-xs font-medium text-blue-400">
                    <span>Configurar importação</span>
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

          {/* MODE: Career-Ops Import */}
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
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  Career-Ops Importer
                </span>
              </div>

              <h2 className="text-lg font-medium text-slate-100 mb-1">
                Importar Dados do Career-Ops
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                Indique a pasta local onde tem os ficheiros do Career-Ops. Vamos ler e sincronizar todos os registos.
              </p>

              {importError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Path Input */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Caminho da Pasta do Career-Ops
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={directoryPath}
                    onChange={(e) => setDirectoryPath(e.target.value)}
                    placeholder="Ex: C:\Users\nome\Desktop\career-ops"
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* What will be imported */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 mb-6 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
                  Ficheiros e Dados Identificados:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong className="text-slate-300">cv.md:</strong> CV Base Mestre para a IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong className="text-slate-300">profile.yml:</strong> Competências e perfil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong className="text-slate-300">applications.md:</strong> Vagas já candidatadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong className="text-slate-300">output/*.pdf:</strong> PDFs de currículos gerados</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleImportCareerOps}
                disabled={importing}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>A analisar e importar dados...</span>
                  </>
                ) : (
                  <>
                    <span>Verificar e Importar Dados</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* SUCCESS SCREEN FOR CAREER-OPS */}
          {importResult && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">
                Importação Concluída com Sucesso!
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Todos os dados foram indexados e associados à sua conta com total privacidade.
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

          {/* MODE: Manual Setup */}
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
