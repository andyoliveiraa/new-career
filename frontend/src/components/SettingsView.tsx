import React, { useState, useEffect } from 'react';
import type { UserSettings, TestKeyResult, TestWebhookResult } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import {
  Sliders, Bell, Key, Sparkles, CheckCircle2, AlertCircle,
  Eye, EyeOff, Save, RefreshCw, ExternalLink, HelpCircle,
  ChevronDown, ChevronUp, Bot, ShieldCheck, Check, Trash2
} from 'lucide-react';

interface KeyCardConfig {
  provider: 'gemini' | 'openai' | 'groq' | 'serpapi' | 'jsearch';
  title: string;
  badge: string;
  description: string;
  docsUrl: string;
  placeholder: string;
  field: 'gemini_api_key' | 'openai_api_key' | 'groq_api_key' | 'serpapi_api_key' | 'jsearch_api_key';
  hasField: 'has_gemini_key' | 'has_openai_key' | 'has_groq_key' | 'has_serpapi_key' | 'has_jsearch_key';
  maskedField: 'gemini_api_key_masked' | 'openai_api_key_masked' | 'groq_api_key_masked' | 'serpapi_api_key_masked' | 'jsearch_api_key_masked';
}

const PROVIDERS: KeyCardConfig[] = [
  {
    provider: 'gemini',
    title: 'Google Gemini AI',
    badge: 'Recomendado / Rápido',
    description: 'Motor principal para análise de aderência de vagas, extração de palavras-chave e tailoring de CVs.',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIzaSy...',
    field: 'gemini_api_key',
    hasField: 'has_gemini_key',
    maskedField: 'gemini_api_key_masked'
  },
  {
    provider: 'groq',
    title: 'Groq Cloud (Llama 3.3)',
    badge: 'Inferência Ultra-Rápida',
    description: 'Processamento de alta velocidade com modelos Llama 3.3 70B para geração instantânea.',
    docsUrl: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
    field: 'groq_api_key',
    hasField: 'has_groq_key',
    maskedField: 'groq_api_key_masked'
  },
  {
    provider: 'openai',
    title: 'OpenAI (GPT-4o)',
    badge: 'Alta Precisão',
    description: 'Alternativa para redação de cartas de apresentação e simulação comportamental de entrevistas.',
    docsUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
    field: 'openai_api_key',
    hasField: 'has_openai_key',
    maskedField: 'openai_api_key_masked'
  },
  {
    provider: 'serpapi',
    title: 'SerpApi (Google Jobs)',
    badge: 'Scraper de Vagas',
    description: 'Permite busca estruturada e indexação de anúncios publicados diretamente no Google Jobs.',
    docsUrl: 'https://serpapi.com/manage-api-key',
    placeholder: 'Chave de 64 caracteres...',
    field: 'serpapi_api_key',
    hasField: 'has_serpapi_key',
    maskedField: 'serpapi_api_key_masked'
  },
  {
    provider: 'jsearch',
    title: 'RapidAPI JSearch',
    badge: 'Multi-Portal Jobs',
    description: 'Agregação global de vagas em portais como LinkedIn, Indeed e Glassdoor.',
    docsUrl: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
    placeholder: 'RapidAPI-Key...',
    field: 'jsearch_api_key',
    hasField: 'has_jsearch_key',
    maskedField: 'jsearch_api_key_masked'
  }
];

export const SettingsView: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Draft values for secret inputs (empty means keep saved secret; explicit '' in clearedFields means clear)
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [clearedSecrets, setClearedSecrets] = useState<Record<string, boolean>>({});

  // Visibility toggles
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Webhook Test State
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<TestWebhookResult | null>(null);

  // Key Test States
  const [testingKey, setTestingKey] = useState<Record<string, boolean>>({});
  const [keyResults, setKeyResults] = useState<Record<string, TestKeyResult>>({});

  // Guide accordion
  const [showDiscordGuide, setShowDiscordGuide] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getUserSettings();
      setSettings(data);
      setSecretDrafts({});
      setClearedSecrets({});
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar configurações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof UserSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSecretDraftChange = (field: string, value: string) => {
    setSecretDrafts(prev => ({ ...prev, [field]: value }));
    if (value.trim()) {
      setClearedSecrets(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleClearSecret = (field: string) => {
    setSecretDrafts(prev => ({ ...prev, [field]: '' }));
    setClearedSecrets(prev => ({ ...prev, [field]: true }));
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: Partial<UserSettings> = {
        discord_notify_on_new_jobs: settings.discord_notify_on_new_jobs,
        discord_notify_on_status_change: settings.discord_notify_on_status_change,
        primary_ai_provider: settings.primary_ai_provider,
      };

      const secretKeys = [
        'discord_webhook_url',
        'gemini_api_key',
        'openai_api_key',
        'groq_api_key',
        'serpapi_api_key',
        'jsearch_api_key'
      ] as const;

      for (const sk of secretKeys) {
        if (clearedSecrets[sk]) {
          payload[sk] = '';
        } else if (secretDrafts[sk] && secretDrafts[sk].trim()) {
          payload[sk] = secretDrafts[sk].trim();
        }
      }

      const updated = await api.updateUserSettings(payload);
      setSettings(updated);
      setSecretDrafts({});
      setClearedSecrets({});
      setSaveSuccessMsg('Configurações e credenciais guardadas com sucesso!');
      showToast('Configurações guardadas com segurança.', 'success');
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    } catch (err: any) {
      showToast(err.message || 'Erro ao guardar configurações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const draft = secretDrafts['discord_webhook_url']?.trim();
      const res = await api.testDiscordWebhook(draft || undefined);
      setWebhookTestResult(res);
    } catch (err: any) {
      setWebhookTestResult({
        success: false,
        message: err.message || 'Erro ao comunicar com o servidor para testar o webhook.'
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleTestKey = async (provider: string, field: string) => {
    setTestingKey(prev => ({ ...prev, [provider]: true }));
    try {
      const draftVal = secretDrafts[field]?.trim();
      const res = await api.testApiKey(provider, draftVal || undefined);
      setKeyResults(prev => ({ ...prev, [provider]: res }));
    } catch (err: any) {
      setKeyResults(prev => ({
        ...prev,
        [provider]: {
          provider,
          valid: false,
          status: 'error',
          message: err.message || 'Falha na requisição de teste.'
        }
      }));
    } finally {
      setTestingKey(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleTestAllKeys = async () => {
    if (!settings) return;
    for (const p of PROVIDERS) {
      const hasDraft = Boolean(secretDrafts[p.field]?.trim());
      const hasSaved = Boolean(settings[p.hasField]) && !clearedSecrets[p.field];
      if (hasDraft || hasSaved) {
        handleTestKey(p.provider, p.field);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-txt-muted text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-accent-light" />
          <span>A carregar as suas configurações de integrações...</span>
        </div>
      </div>
    );
  }

  const webhookConfigured = Boolean(settings?.has_discord_webhook) && !clearedSecrets['discord_webhook_url'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-100 p-6 rounded-2xl border border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-accent-light" />
            <h1 className="font-display font-bold text-xl text-txt-primary">
              Configurações & Integrações
            </h1>
          </div>
          <p className="text-xs text-txt-secondary mt-1">
            Configure o seu Webhook do Discord e faça a gestão das suas chaves de API (encriptadas em repouso no servidor).
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>A guardar...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Configurações</span>
            </>
          )}
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. DISCORD WEBHOOK INTEGRATION */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-txt-primary">Webhook do Discord</h2>
              <p className="text-xs text-txt-muted">
                Receba alertas automáticos de novas vagas e atualizações de candidaturas no seu servidor de Discord.
              </p>
            </div>
          </div>

          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${
            webhookConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-surface-200 text-txt-muted border-surface-border'
          }`}>
            {webhookConfigured ? `Configurado (${settings?.discord_webhook_url_masked || 'ativo'})` : 'Não Configurado'}
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-txt-muted uppercase tracking-wider">
            URL do Webhook do Discord
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showWebhookUrl ? 'text' : 'password'}
                value={secretDrafts['discord_webhook_url'] ?? ''}
                onChange={(e) => handleSecretDraftChange('discord_webhook_url', e.target.value)}
                placeholder={
                  webhookConfigured
                    ? `Guardado (${settings?.discord_webhook_url_masked}) — cole aqui apenas para substituir`
                    : 'https://discord.com/api/webhooks/1234567890/token-do-seu-canal...'
                }
                className="w-full bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-txt-primary pr-10 focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary transition-colors"
                title={showWebhookUrl ? 'Ocultar URL' : 'Mostrar URL'}
              >
                {showWebhookUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {webhookConfigured && (
              <button
                type="button"
                onClick={() => handleClearSecret('discord_webhook_url')}
                className="p-2.5 bg-surface-200 hover:bg-rose-500/10 text-txt-muted hover:text-rose-400 border border-surface-border rounded-xl transition-colors"
                title="Remover Webhook guardado"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
            >
              {testingWebhook ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-light" />
                  <span>A testar...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-accent-light" />
                  <span>Testar Webhook</span>
                </>
              )}
            </button>
          </div>
        </div>

        {webhookTestResult && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            webhookTestResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {webhookTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-semibold">
                {webhookTestResult.success ? 'Conexão Bem-Sucedida!' : 'Falha no Teste do Webhook'}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">{webhookTestResult.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-200 border border-surface-border cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-txt-primary block">Alertas de Novas Vagas</span>
              <span className="text-[10px] text-txt-muted">Enviar mensagem no Discord quando a varredura encontrar vagas</span>
            </div>
            <input
              type="checkbox"
              checked={settings?.discord_notify_on_new_jobs || false}
              onChange={(e) => handleFieldChange('discord_notify_on_new_jobs', e.target.checked)}
              className="w-4 h-4 rounded text-accent cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-200 border border-surface-border cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-txt-primary block">Avanço de Candidaturas</span>
              <span className="text-[10px] text-txt-muted">Notificar quando uma vaga for marcada como Entrevista ou Oferta</span>
            </div>
            <input
              type="checkbox"
              checked={settings?.discord_notify_on_status_change || false}
              onChange={(e) => handleFieldChange('discord_notify_on_status_change', e.target.checked)}
              className="w-4 h-4 rounded text-accent cursor-pointer"
            />
          </label>
        </div>

        <div className="border-t border-surface-border pt-3">
          <button
            type="button"
            onClick={() => setShowDiscordGuide(!showDiscordGuide)}
            className="flex items-center justify-between w-full text-left text-xs font-medium text-txt-muted hover:text-txt-primary transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-accent-light" />
              <span>Como obter o URL do Webhook no Discord em 3 passos</span>
            </div>
            {showDiscordGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDiscordGuide && (
            <div className="mt-3 p-3.5 rounded-xl bg-surface-200/60 border border-surface-border text-xs text-txt-secondary space-y-2">
              <p className="leading-relaxed">
                <strong>1.</strong> No seu servidor do Discord, clique com o botão direito no canal desejado e selecione <em>Editar Canal</em>.
              </p>
              <p className="leading-relaxed">
                <strong>2.</strong> Aceda à aba <em>Integrações</em> e clique em <em>Webhooks</em> &rarr; <em>Novo Webhook</em>.
              </p>
              <p className="leading-relaxed">
                <strong>3.</strong> Dê o nome <strong>New Career</strong>, clique em <strong>Copiar URL do Webhook</strong>, cole acima e clique em <em>Testar Webhook</em>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. API KEYS MANAGEMENT */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-light">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-txt-primary">
                Chaves de API (Inteligência Artificial & Scrapers)
              </h2>
              <p className="text-xs text-txt-muted">
                As chaves são armazenadas encriptadas e nunca são reexpostas após guardadas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestAllKeys}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-200 hover:bg-surface-300 text-txt-primary border border-surface-border rounded-xl text-xs font-semibold transition-colors shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent-light" />
            <span>Testar Todas as Chaves</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {PROVIDERS.map((item) => {
            const draftVal = secretDrafts[item.field] ?? '';
            const hasSaved = Boolean(settings?.[item.hasField]) && !clearedSecrets[item.field];
            const maskedPreview = settings?.[item.maskedField];
            const isTesting = testingKey[item.provider];
            const result = keyResults[item.provider];
            const isVisible = showKeys[item.provider];

            return (
              <div
                key={item.provider}
                className="p-4 rounded-xl bg-surface-200/50 border border-surface-border space-y-3 transition-colors hover:border-surface-border/80"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-txt-primary">{item.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-300 text-txt-muted border border-surface-border">
                      {item.badge}
                    </span>
                    {hasSaved && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                        Configurada ({maskedPreview})
                      </span>
                    )}
                  </div>

                  <a
                    href={item.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-accent-light hover:underline inline-flex items-center gap-1"
                  >
                    Obter Chave <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-txt-muted leading-relaxed">{item.description}</p>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={draftVal}
                      onChange={(e) => handleSecretDraftChange(item.field, e.target.value)}
                      placeholder={
                        hasSaved
                          ? `Chave guardada (${maskedPreview}) — insira apenas para substituir`
                          : item.placeholder
                      }
                      className="w-full bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2 text-xs text-txt-primary pr-10 focus:outline-none focus:border-accent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(item.provider)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary transition-colors"
                      title={isVisible ? 'Ocultar' : 'Mostrar'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {hasSaved && (
                    <button
                      type="button"
                      onClick={() => handleClearSecret(item.field)}
                      className="p-2 bg-surface-200 hover:bg-rose-500/10 text-txt-muted hover:text-rose-400 border border-surface-border rounded-xl transition-colors"
                      title="Remover chave guardada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTestKey(item.provider, item.field)}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3 py-2 bg-surface-300 hover:bg-surface-border text-txt-primary rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-light" />
                        <span>A testar...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-accent-light" />
                        <span>Testar Conexão</span>
                      </>
                    )}
                  </button>
                </div>

                {result && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    result.valid
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {result.valid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px]">{result.message}</div>
                      {result.details && <p className="text-[10px] opacity-80 font-mono">{result.details}</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. PRIMARY AI PROVIDER SELECTION */}
      <div className="bg-surface-100 border border-surface-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-txt-primary">Provedor de IA Primário</h2>
            <p className="text-xs text-txt-muted">
              Selecione o motor preferencial a utilizar na análise de compatibilidade e tailoring de currículos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'gemini', title: 'Google Gemini', desc: 'Rápido, alta cota gratuita, excelente entendimento semântico.' },
            { id: 'groq', title: 'Groq (Llama 3.3)', desc: 'Ultra-rápido, modelos abertos de ponta com baixa latência.' },
            { id: 'openai', title: 'OpenAI (GPT-4o)', desc: 'Precisão máxima para redação executiva e cartas.' }
          ].map(opt => {
            const isSelected = (settings?.primary_ai_provider || 'gemini') === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleFieldChange('primary_ai_provider', opt.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-surface-border bg-surface-200/50 hover:bg-surface-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-txt-primary">{opt.title}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent-light" />}
                </div>
                <p className="text-[11px] text-txt-muted leading-relaxed">{opt.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-surface-200/50 border border-surface-border text-[11px] text-txt-muted">
          <strong>Hierarquia de Fallback Automática:</strong> Se o provedor primário falhar ou atingir limite de requisições, o sistema tenta automaticamente os restantes provedores configurados antes de recorrer ao modo heurístico offline.
        </div>
      </div>
    </div>
  );
};
