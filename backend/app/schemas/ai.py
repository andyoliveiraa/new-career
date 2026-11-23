from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class JDAnalysisRequest(BaseModel):
    job_id: int

class JDAnalysisResponse(BaseModel):
    job_id: int
    match_score: float
    summary: str
    strengths: List[str]
    gaps: List[str]
    keywords: List[str]
    recommendation: str

class CVTailorRequest(BaseModel):
    job_id: int
    provider: Optional[str] = "gemini" # gemini, openai, groq, local
    tone: Optional[str] = "direct" # direct, technical, leadership
    template_id: Optional[str] = None # Optional ID of the CV template to use

class CVTailorResponse(BaseModel):
    job_id: int
    tailored_summary: str
    tailored_experiences: List[Dict[str, Any]]
    highlighted_skills: List[str]
    pdf_download_url: Optional[str] = None

class CoverLetterRequest(BaseModel):
    job_id: int
    provider: Optional[str] = "gemini"
    angle: Optional[str] = "problem_solver" # why_company, problem_solver, direct_experience

class CoverLetterResponse(BaseModel):
    job_id: int
    cover_letter_text: str
    linkedin_note: str

class InterviewPrepResponse(BaseModel):
    job_id: int
    likely_questions: List[Dict[str, str]] # question, purpose, recommended_star_angle
    company_intel: Dict[str, Any]
