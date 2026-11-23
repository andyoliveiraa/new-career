export interface Job {
  id: number;
  job_key: string;
  title: string;
  company: string;
  location?: string;
  is_remote: boolean;
  salary?: string;
  description?: string;
  url: string;
  source: string;
  liveness_status: 'active' | 'expired' | 'uncertain' | 'unknown';
  liveness_checked_at?: string;
  liveness_reason?: string;
  distance_km?: number;
  published_at?: string;
  created_at: string;
  application_status?: string;
  match_score?: number;
}

export interface ApplicationStats {
  total_jobs: number;
  disponivel: number;
  avaliada: number;
  em_preparacao: number;
  candidatado: number;
  entrevista: number;
  positiva: number;
  negativa: number;
  descartada: number;
}

export interface ProfileData {
  id?: number;
  full_name: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  summary?: string;
  skills: string[];
  experiences: Array<{
    role: string;
    company: string;
    period: string;
    location?: string;
    bullets?: string[];
  }>;
  educations: Array<{
    degree: string;
    institution: string;
    period: string;
  }>;
  verified_facts?: string[];
}

export interface JDAnalysis {
  job_id: number;
  match_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  keywords: string[];
  recommendation: string;
}

export interface CVTailorResult {
  job_id: number;
  tailored_summary: string;
  tailored_experiences: any[];
  highlighted_skills: string[];
  pdf_download_url?: string;
}

export interface CoverLetterResult {
  job_id: number;
  cover_letter_text: string;
  linkedin_note: string;
}

export interface ScanRecord {
  id: number;
  engine: string;
  query: string;
  location?: string;
  total_found: number;
  total_new: number;
  status: string;
  duration_seconds?: number;
  executed_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  has_completed_onboarding: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface OnboardingResult {
  success: boolean;
  message: string;
  experiences_count: number;
  educations_count: number;
  skills_count: number;
  jobs_count: number;
  applications_count: number;
  cv_base_loaded: boolean;
  profile_name?: string;
}

export interface CVTemplate {
  id: string;
  name: string;
  layout: 'classic_ats' | 'modern_split' | 'compact_executive' | 'tech_minimal';
  has_photo: boolean;
  photo_url?: string | null;
  accent_color: string;
  font_family: string;
  font_heading?: string | null;
  font_size_scale: 'compact' | 'normal' | 'spacious';
  blocks_order: string[];
  block_visibility: Record<string, boolean>;
  is_default: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ATSAuditCheckItem {
  id: string;
  label: string;
  passed: boolean;
  importance: 'high' | 'medium' | 'low';
  message: string;
}

export interface ATSAuditResult {
  score: number;
  status: 'excellent' | 'good' | 'needs_improvement';
  summary: string;
  checklist: ATSAuditCheckItem[];
  strengths: string[];
  warnings: string[];
  actionable_tips: string[];
}
