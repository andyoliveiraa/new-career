import React, { useState } from 'react';
import type { Job, JDAnalysis, CVTailorResult, CoverLetterResult } from '../types';
import { api } from '../api';
import { X, Sparkles, FileText, Send, Download, Check, Copy, ExternalLink, HelpCircle } from 'lucide-react';

interface AIStudioModalProps {
  job: Job | null;
  onClose: () => void;
  onRefreshJob: () => void;
}

export const AIStudioModal: React.FC<AIStudioModalProps> = ({ job, onClose, onRefreshJob }) => {
  if (!job) return null;

  const [activeSubTab, setActiveSubTab] = useState<'fit' | 'cv' | 'cover' | 'interview'>('fit');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [tailorResult, setTailorResult] = useState<CVTailorResult | null>(null);
  const [coverResult, setCoverResult] = useState<CoverLetterResult | null>(null);
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedLinkedin, setCopiedLinkedin] = useState(false);

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const res = await api.analyzeJob(job.id);
      setAnalysis(res);
      onRefreshJob();
    } catch (err) {
      alert('Erro ao analisar vaga com IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleTailorCV = async () => {
    setLoading(true);
    try {
      const res = await api.tailorCV(job.id);
      setTailorResult(res);
      onRefreshJob();
    } catch (err) {
      alert('Erro ao adaptar currículo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCover = async () => {
    setLoading(true);
    try {
      const res = await api.generateCoverLetter(job.id);
      setCoverResult(res);
      onRefreshJob();
    } catch (err) {
      alert('Erro ao gerar carta de apresentação.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'cover' | 'linkedin') => {
    navigator.clipboard.writeText(text);
    if (type === 'cover') {
      setCopiedCover(true);
      setTimeout(() => setCopiedCover(false), 2000);
    } else {
      setCopiedLinkedin(true);
      setTimeout(() => setCopiedLinkedin(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-100 border border-surface-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-200/50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-txt-primary">{job.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-surface-300 text-txt-secondary border border-surface-border">
                {job.company}
              </span>
            </div>
            <div className="text-xs text-txt-muted flex items-center gap-2">
              <span>{job.location || 'Portugal'}</span>
              <span>•</span>
              <a href={job.url} target="_blank" rel="noreferrer" className="text-accent-light hover:underline flex items-center">
                Ver anúncio original <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-300 text-txt-muted hover:text-txt-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-surface-border flex gap-4 text-sm bg-surface-100">
          <button
            onClick={() => setActiveSubTab('fit')}
            className={`pb-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubTab === 'fit' ? 'border-accent text-accent-light' : 'border-transparent text-txt-secondary hover:text-txt-primary'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            1. Análise de Fit & Match
          </button>
          <button
            onClick={() => setActiveSubTab('cv')}
            className={`pb-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubTab === 'cv' ? 'border-accent text-accent-light' : 'border-transparent text-txt-secondary hover:text-txt-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            2. CV ATS Adaptado
          </button>
          <button
            onClick={() => setActiveSubTab('cover')}
            className={`pb-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubTab === 'cover' ? 'border-accent text-accent-light' : 'border-transparent text-txt-secondary hover:text-txt-primary'
            }`}
          >
            <Send className="w-4 h-4" />
            3. Carta & Mensagem
          </button>
          <button
            onClick={() => setActiveSubTab('interview')}
            className={`pb-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubTab === 'interview' ? 'border-accent text-accent-light' : 'border-transparent text-txt-secondary hover:text-txt-primary'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            4. Preparação STAR
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* SubTab 1: Fit & Match */}
          {activeSubTab === 'fit' && (
            <div className="space-y-6">
              {!analysis && (
                <div className="p-6 rounded-xl bg-surface-200 border border-surface-border text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-accent-light mx-auto" />
                  <div className="font-display font-semibold text-base text-txt-primary">
                    Avaliar Compatibilidade com o seu Perfil Mestre
                  </div>
                  <p className="text-xs text-txt-secondary max-w-md mx-auto">
                    O motor de IA compara os requisitos da vaga com as suas competências e experiências reais, calculando o score e sugerindo pontos fortes e lacunas a cobrir.
                  </p>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={loading}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    {loading ? 'A processar análise...' : 'Executar Análise de Fit'}
                  </button>
                </div>
              )}

              {analysis && (
                <div className="space-y-5">
                  {/* Match Score Gauge */}
                  <div className="p-5 rounded-xl bg-surface-200 border border-surface-border flex items-center justify-between">
                    <div>
                      <div className="text-xs text-txt-muted uppercase font-bold tracking-wider">Score ATS Estimado</div>
                      <div className="font-display text-4xl font-extrabold text-txt-primary mt-1">
                        {Math.round(analysis.match_score)}%
                      </div>
                      <p className="text-xs text-txt-secondary mt-1">{analysis.recommendation}</p>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={handleRunAnalysis}
                        disabled={loading}
                        className="text-xs text-accent-light hover:underline"
                      >
                        Recalcular
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-surface-200/50 border border-surface-border">
                    <div className="text-xs font-bold text-txt-muted uppercase mb-1">Diagnóstico Geral</div>
                    <p className="text-sm text-txt-primary leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Strengths & Gaps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <div className="text-xs font-bold text-emerald-400 uppercase">Pontos Fortes Alinhados</div>
                      <ul className="text-xs text-txt-secondary space-y-1.5 list-disc pl-4">
                        {analysis.strengths.map((s, idx) => (
                          <li key={idx}><span className="text-txt-primary">{s}</span></li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                      <div className="text-xs font-bold text-amber-400 uppercase">Lacunas / Pontos a Atenuar</div>
                      <ul className="text-xs text-txt-secondary space-y-1.5 list-disc pl-4">
                        {analysis.gaps.map((g, idx) => (
                          <li key={idx}><span className="text-txt-primary">{g}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <div className="text-xs font-bold text-txt-muted uppercase mb-2">Palavras-Chave Identificadas no Anúncio</div>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords.map((kw, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-xs rounded bg-surface-200 border border-surface-border text-txt-primary">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: CV Tailoring & PDF */}
          {activeSubTab === 'cv' && (
            <div className="space-y-6">
              {!tailorResult ? (
                <div className="p-6 rounded-xl bg-surface-200 border border-surface-border text-center space-y-3">
                  <FileText className="w-8 h-8 text-accent-light mx-auto" />
                  <div className="font-display font-semibold text-base text-txt-primary">
                    Gerar Currículo Otimizado para ATS
                  </div>
                  <p className="text-xs text-txt-secondary max-w-md mx-auto">
                    Adapta cirurgicamente o resumo profissional e os destaques das suas experiências reais às palavras-chave deste anúncio, gerando um PDF profissional pronto para submissão.
                  </p>
                  <button
                    onClick={handleTailorCV}
                    disabled={loading}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    {loading ? 'A adaptar currículo...' : 'Adaptar CV e Compilar PDF'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-surface-200 border border-surface-border flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-txt-primary">Currículo ATS Gerado com Sucesso</div>
                      <div className="text-xs text-txt-muted">Formatação A4 em tipografia Space Grotesk e DM Sans</div>
                    </div>
                    {tailorResult.pdf_download_url && (
                      <a
                        href={`http://localhost:8000${tailorResult.pdf_download_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descarregar PDF
                      </a>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-txt-muted uppercase">Resumo Adaptado</div>
                    <div className="p-4 rounded-lg bg-surface-200/60 border border-surface-border text-sm text-txt-primary leading-relaxed">
                      {tailorResult.tailored_summary}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-txt-muted uppercase">Competências Destacadas</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tailorResult.highlighted_skills.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs rounded bg-accent/10 border border-accent/20 text-accent-light font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 3: Cover Letter & Outreach */}
          {activeSubTab === 'cover' && (
            <div className="space-y-6">
              {!coverResult ? (
                <div className="p-6 rounded-xl bg-surface-200 border border-surface-border text-center space-y-3">
                  <Send className="w-8 h-8 text-accent-light mx-auto" />
                  <div className="font-display font-semibold text-base text-txt-primary">
                    Carta de Motivação & Mensagem LinkedIn
                  </div>
                  <p className="text-xs text-txt-secondary max-w-md mx-auto">
                    Redige uma carta concisa, persuasiva e sem clichês corporativos, além de uma nota curta para conectar com o recrutador.
                  </p>
                  <button
                    onClick={handleGenerateCover}
                    disabled={loading}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    {loading ? 'A redigir texto...' : 'Gerar Carta & Outreach'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-txt-muted uppercase">Carta de Apresentação</span>
                      <button
                        onClick={() => copyToClipboard(coverResult.cover_letter_text, 'cover')}
                        className="text-xs text-accent-light hover:underline flex items-center gap-1"
                      >
                        {copiedCover ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCover ? 'Copiado!' : 'Copiar Texto'}
                      </button>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-200/60 border border-surface-border text-sm text-txt-primary whitespace-pre-wrap leading-relaxed font-sans">
                      {coverResult.cover_letter_text}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-txt-muted uppercase">Nota de Conexão LinkedIn (&lt;300 Caracteres)</span>
                      <button
                        onClick={() => copyToClipboard(coverResult.linkedin_note, 'linkedin')}
                        className="text-xs text-accent-light hover:underline flex items-center gap-1"
                      >
                        {copiedLinkedin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLinkedin ? 'Copiado!' : 'Copiar Nota'}
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-200/60 border border-surface-border text-xs text-txt-primary">
                      {coverResult.linkedin_note}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 4: STAR Interview Prep */}
          {activeSubTab === 'interview' && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-txt-muted uppercase">Perguntas Prováveis & Estrutura STAR+R</div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-surface-200 border border-surface-border space-y-1.5">
                  <div className="font-semibold text-sm text-txt-primary">
                    1. "Como lidou com uma situação de arquitetura ou bug crítico sob restrições severas de prazo?"
                  </div>
                  <div className="text-xs text-accent-light font-medium">Objetivo do Recrutador: Avaliar resiliência e foco no impacto</div>
                  <p className="text-xs text-txt-secondary">
                    <strong>Sugestão STAR:</strong> Situação (sistema em produção com falha/carga), Tarefa (identificar gargalo sem travar utilizadores), Ação (otimização de queries/caching), Resultado (redução da latência em 60%).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-200 border border-surface-border space-y-1.5">
                  <div className="font-semibold text-sm text-txt-primary">
                    2. "Descreva a sua experiência integrando ferramentas de IA ou automação em pipelines existentes."
                  </div>
                  <div className="text-xs text-accent-light font-medium">Objetivo do Recrutador: Validar autonomia e inovação prática</div>
                  <p className="text-xs text-txt-secondary">
                    <strong>Sugestão STAR:</strong> Destaque o projeto de monitoramento com fallbacks de APIs, o loop de refinamento de CVs e o respeito aos princípios de alta fidelidade sem alucinações.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
