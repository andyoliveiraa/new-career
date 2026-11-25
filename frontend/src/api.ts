import type {
  Job, ApplicationStats, ProfileData, JDAnalysis, CVTailorResult,
  CoverLetterResult, InterviewPrepResult, ScanRecord, AuthResponse, User, OnboardingResult,
  ParsedCVResponse, CVTemplate, ATSAuditResult, UserSettings, TestKeyResult, TestWebhookResult,
  ManualJobPayload, BatchLivenessResult
} from './types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('new_career_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, init: RequestInit = {}, defaultError = 'Erro na comunicação com o servidor'): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    window.dispatchEvent(new CustomEvent('new-career:unauthorized'));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let msg = defaultError;
    if (typeof err?.detail === 'string') {
      msg = err.detail;
    } else if (Array.isArray(err?.detail) && err.detail.length > 0) {
      msg = err.detail.map((item: any) => item?.msg || String(item)).join('; ');
    } else if (typeof err?.message === 'string') {
      msg = err.message;
    }
    throw new Error(msg);
  }
  return res;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

export const api = {
  // Auth
  async register(full_name: string, email: string, password: string, preferred_language = 'en'): Promise<AuthResponse> {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password, preferred_language })
    }, 'Failed to register account');
    return res.json();
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }, 'Invalid email or password');
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await apiFetch('/auth/me', {}, 'Session expired');
    return res.json();
  },

  async updatePreferredLanguage(preferred_language: string): Promise<User> {
    const res = await apiFetch('/auth/me/language', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_language })
    }, 'Failed to update preferred language');
    return res.json();
  },

  async onboardingCareerOps(directory_path: string): Promise<OnboardingResult> {
    const res = await apiFetch('/auth/onboarding/career-ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory_path })
    }, 'Erro ao importar do Career-Ops');
    return res.json();
  },

  async uploadCareerOpsZip(file: File): Promise<OnboardingResult> {
    const formData = new FormData();
    formData.append('zip_file', file);
    const res = await apiFetch('/auth/onboarding/upload-zip', {
      method: 'POST',
      body: formData
    }, 'Erro ao descompactar e importar arquivo ZIP');
    return res.json();
  },

  async uploadCareerOpsPrivacy(files: {
    cvFile: File;
    profileFile?: File | null;
    applicationsFile?: File | null;
    outputZip?: File | null;
  }): Promise<OnboardingResult> {
    const formData = new FormData();
    formData.append('cv_file', files.cvFile);
    if (files.profileFile) formData.append('profile_file', files.profileFile);
    if (files.applicationsFile) formData.append('applications_file', files.applicationsFile);
    if (files.outputZip) formData.append('output_zip', files.outputZip);

    const res = await apiFetch('/auth/onboarding/upload-privacy', {
      method: 'POST',
      body: formData
    }, 'Erro ao importar ficheiros no modo privacidade');
    return res.json();
  },

  async parseCVUpload(file: File): Promise<ParsedCVResponse> {
    const formData = new FormData();
    formData.append('cv_file', file);
    const res = await apiFetch('/auth/onboarding/parse-cv', {
      method: 'POST',
      body: formData
    }, 'Failed to convert CV to Markdown');
    return res.json();
  },

  async onboardingManual(payload: {
    full_name?: string;
    headline?: string;
    email?: string;
    location?: string;
    phone?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    summary?: string;
    initial_skills: string[];
    experiences?: any[];
    educations?: any[];
    certifications?: any[];
    projects?: any[];
    languages?: any[];
    verified_facts?: string[];
    initial_cv_text?: string;
  }): Promise<OnboardingResult> {
    const res = await apiFetch('/auth/onboarding/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 'Failed to save profile configuration');
    return res.json();
  },

  // Jobs
  async getJobs(params: {
    query?: string;
    location?: string;
    source?: string;
    status?: string;
    liveness?: string;
    is_remote?: boolean;
    max_distance?: number;
    sort_by?: 'created_at' | 'match_score' | 'distance_km';
    limit?: number;
    offset?: number;
  }): Promise<Job[]> {
    const q = new URLSearchParams();
    if (params.query) q.append('query', params.query);
    if (params.location) q.append('location', params.location);
    if (params.source) q.append('source', params.source);
    if (params.status) q.append('status', params.status);
    if (params.liveness) q.append('liveness', params.liveness);
    if (params.is_remote !== undefined) q.append('is_remote', String(params.is_remote));
    if (params.max_distance !== undefined) q.append('max_distance', String(params.max_distance));
    if (params.sort_by) q.append('sort_by', params.sort_by);
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await apiFetch(`/jobs?${q.toString()}`, {}, 'Erro ao buscar vagas');
    return res.json();
  },

  async createManualJob(payload: ManualJobPayload): Promise<Job> {
    const res = await apiFetch('/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 'Erro ao adicionar vaga');
    return res.json();
  },

  async getJob(id: number): Promise<Job> {
    const res = await apiFetch(`/jobs/${id}`, {}, 'Erro ao obter detalhes da vaga');
    return res.json();
  },

  async checkLiveness(jobId: number): Promise<{ job_id: number; liveness_status: string; liveness_reason?: string }> {
    const res = await apiFetch(`/jobs/${jobId}/check-liveness`, {
      method: 'POST'
    }, 'Erro ao verificar disponibilidade');
    return res.json();
  },

  async checkLivenessBatch(jobIds?: number[]): Promise<BatchLivenessResult> {
    const res = await apiFetch('/jobs/check-liveness-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_ids: jobIds, only_non_expired: true, limit: 20 })
    }, 'Erro ao verificar disponibilidade em lote');
    return res.json();
  },

  async exportJobs(format: 'csv' | 'json', status?: string): Promise<void> {
    const q = new URLSearchParams({ format });
    if (status) q.append('status', status);
    const res = await apiFetch(`/jobs/export?${q.toString()}`, {}, 'Erro ao exportar vagas');
    const blob = await res.blob();
    triggerBlobDownload(blob, `new-career-vagas.${format}`);
  },

  async deleteJob(jobId: number): Promise<void> {
    await apiFetch(`/jobs/${jobId}`, { method: 'DELETE' }, 'Erro ao excluir vaga');
  },

  // Applications
  async getStats(): Promise<ApplicationStats> {
    const res = await apiFetch('/applications/stats', {}, 'Erro ao buscar métricas');
    return res.json();
  },

  async markApplied(jobId: number, notes?: string): Promise<any> {
    const res = await apiFetch(`/applications/${jobId}/apply?notes=${encodeURIComponent(notes || '')}`, {
      method: 'POST'
    }, 'Erro ao registrar candidatura');
    return res.json();
  },

  async updateApplication(jobId: number, update: { status?: string; notes?: string; feedback_notes?: string }): Promise<any> {
    const res = await apiFetch(`/applications/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    }, 'Erro ao atualizar candidatura');
    return res.json();
  },

  // Profile
  async getProfile(): Promise<ProfileData> {
    const res = await apiFetch('/profile', {}, 'Erro ao buscar perfil mestre');
    return res.json();
  },

  async updateProfile(profile: ProfileData): Promise<ProfileData> {
    const res = await apiFetch('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    }, 'Erro ao salvar perfil');
    return res.json();
  },

  // Scrapers
  async triggerScan(sources: string[], query: string, location: string, limit = 20, max_pages = 3, max_distance_km?: number): Promise<{ status: string; scan_id: number; message: string; sources: string[] }> {
    const res = await apiFetch('/scrapers/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources,
        query,
        location,
        limit,
        max_pages,
        ...(max_distance_km ? { max_distance_km } : {}),
      })
    }, 'Erro ao iniciar varredura');
    return res.json();
  },

  async getScanStatus(scanId: number): Promise<ScanRecord> {
    const res = await apiFetch(`/scrapers/scan/${scanId}`, {}, 'Erro ao consultar estado da varredura');
    return res.json();
  },

  async getScanHistory(): Promise<ScanRecord[]> {
    const res = await apiFetch('/scrapers/history', {}, 'Erro ao buscar histórico de varreduras');
    return res.json();
  },

  // AI Studio
  async analyzeJob(jobId: number): Promise<JDAnalysis> {
    const res = await apiFetch(`/ai/analyze/${jobId}`, { method: 'POST' }, 'Erro ao analisar vaga com IA');
    return res.json();
  },

  async tailorCV(jobId: number, templateId?: string): Promise<CVTailorResult> {
    const res = await apiFetch('/ai/tailor-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, template_id: templateId })
    }, 'Erro ao adaptar currículo');
    return res.json();
  },

  async generateCoverLetter(jobId: number, angle = 'direct'): Promise<CoverLetterResult> {
    const res = await apiFetch('/ai/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, angle })
    }, 'Erro ao gerar carta de apresentação');
    return res.json();
  },

  async generateInterviewPrep(jobId: number): Promise<InterviewPrepResult> {
    const res = await apiFetch('/ai/interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId })
    }, 'Erro ao gerar preparação de entrevista');
    return res.json();
  },

  async downloadProtectedFile(downloadUrlPath: string, fallbackName = 'curriculo.pdf'): Promise<void> {
    const normalized = downloadUrlPath.startsWith('/api/')
      ? downloadUrlPath.slice(4)
      : downloadUrlPath;
    const res = await apiFetch(normalized, {}, 'Erro ao descarregar ficheiro');
    const blob = await res.blob();
    const filename = downloadUrlPath.split('/').pop()?.split('?')[0] || fallbackName;
    triggerBlobDownload(blob, filename);
  },

  // CV Templates & ATS Auditor
  async getCVTemplates(): Promise<CVTemplate[]> {
    const res = await apiFetch('/cv-templates', {}, 'Erro ao carregar modelos de CV');
    return res.json();
  },

  async createCVTemplate(template: Partial<CVTemplate>): Promise<CVTemplate> {
    const res = await apiFetch('/cv-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    }, 'Erro ao criar modelo de CV');
    return res.json();
  },

  async updateCVTemplate(id: string, updates: Partial<CVTemplate>): Promise<CVTemplate> {
    const res = await apiFetch(`/cv-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }, 'Erro ao atualizar modelo de CV');
    return res.json();
  },

  async deleteCVTemplate(id: string): Promise<void> {
    await apiFetch(`/cv-templates/${id}`, { method: 'DELETE' }, 'Erro ao remover modelo de CV');
  },

  async auditCVTemplate(template: Partial<CVTemplate>, profile?: any, jobId?: number): Promise<ATSAuditResult> {
    const res = await apiFetch('/cv-templates/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, profile, job_id: jobId })
    }, 'Erro ao auditar modelo de CV');
    return res.json();
  },

  async previewCVTemplate(template: Partial<CVTemplate>, tailoredSummary?: string, tailoredExperiences?: any[], highlightedSkills?: string[]): Promise<string> {
    const res = await apiFetch('/cv-templates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template,
        tailored_summary: tailoredSummary,
        tailored_experiences: tailoredExperiences,
        highlighted_skills: highlightedSkills
      })
    }, 'Erro ao gerar pré-visualização do CV');
    return res.text();
  },

  // Settings & Integrations
  async getUserSettings(): Promise<UserSettings> {
    const res = await apiFetch('/settings', {}, 'Erro ao carregar configurações do utilizador');
    return res.json();
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const res = await apiFetch('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }, 'Erro ao guardar configurações');
    return res.json();
  },

  async testApiKey(provider: string, apiKey?: string): Promise<TestKeyResult> {
    const res = await apiFetch('/settings/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey || undefined })
    }, 'Erro ao testar chave de API');
    return res.json();
  },

  async testDiscordWebhook(webhookUrl?: string): Promise<TestWebhookResult> {
    const res = await apiFetch('/settings/test-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_url: webhookUrl || undefined })
    }, 'Erro ao testar webhook do Discord');
    return res.json();
  }
};
