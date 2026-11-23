import type { Job, ApplicationStats, ProfileData, JDAnalysis, CVTailorResult, CoverLetterResult, ScanRecord } from './types';

const API_BASE = 'http://localhost:8000/api';

export const api = {
  // Jobs
  async getJobs(params: {
    query?: string;
    location?: string;
    source?: string;
    status?: string;
    liveness?: string;
    is_remote?: boolean;
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
    if (params.limit) q.append('limit', String(params.limit));
    if (params.offset) q.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/jobs?${q.toString()}`);
    if (!res.ok) throw new Error('Erro ao buscar vagas');
    return res.json();
  },

  async getJob(id: number): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    if (!res.ok) throw new Error('Erro ao obter detalhes da vaga');
    return res.json();
  },

  async checkLiveness(jobId: number): Promise<{ job_id: number; liveness_status: string; liveness_reason?: string }> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/check-liveness`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao verificar disponibilidade');
    return res.json();
  },

  async deleteJob(jobId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir vaga');
  },

  // Applications
  async getStats(): Promise<ApplicationStats> {
    const res = await fetch(`${API_BASE}/applications/stats`);
    if (!res.ok) throw new Error('Erro ao buscar métricas');
    return res.json();
  },

  async markApplied(jobId: number, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/${jobId}/apply?notes=${encodeURIComponent(notes || '')}`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao registrar candidatura');
    return res.json();
  },

  async updateApplication(jobId: number, update: { status?: string; notes?: string; feedback_notes?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Erro ao atualizar candidatura');
    return res.json();
  },

  // Profile
  async getProfile(): Promise<ProfileData> {
    const res = await fetch(`${API_BASE}/profile`);
    if (!res.ok) throw new Error('Erro ao buscar perfil mestre');
    return res.json();
  },

  async updateProfile(profile: ProfileData): Promise<ProfileData> {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Erro ao salvar perfil');
    return res.json();
  },

  // Scrapers
  async triggerScan(sources: string[], query: string, location: string, limit = 20): Promise<any> {
    const res = await fetch(`${API_BASE}/scrapers/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources, query, location, limit })
    });
    if (!res.ok) throw new Error('Erro ao iniciar varredura');
    return res.json();
  },

  async getScanHistory(): Promise<ScanRecord[]> {
    const res = await fetch(`${API_BASE}/scrapers/history`);
    if (!res.ok) throw new Error('Erro ao buscar histórico de varreduras');
    return res.json();
  },

  // AI Studio
  async analyzeJob(jobId: number): Promise<JDAnalysis> {
    const res = await fetch(`${API_BASE}/ai/analyze/${jobId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao analisar vaga com IA');
    return res.json();
  },

  async tailorCV(jobId: number): Promise<CVTailorResult> {
    const res = await fetch(`${API_BASE}/ai/tailor-cv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId })
    });
    if (!res.ok) throw new Error('Erro ao adaptar currículo');
    return res.json();
  },

  async generateCoverLetter(jobId: number, angle = 'direct'): Promise<CoverLetterResult> {
    const res = await fetch(`${API_BASE}/ai/cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, angle })
    });
    if (!res.ok) throw new Error('Erro ao gerar carta de apresentação');
    return res.json();
  }
};
