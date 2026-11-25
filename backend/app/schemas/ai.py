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
    provider: Optional[str] = None
    tone: Optional[str] = "direct"
    template_id: Optional[str] = None


class CVTailorResponse(BaseModel):
    job_id: int
    tailored_summary: str
    tailored_experiences: List[Dict[str, Any]]
    highlighted_skills: List[str]
    pdf_download_url: Optional[str] = None


class CoverLetterRequest(BaseModel):
    job_id: int
    provider: Optional[str] = None
    angle: Optional[str] = "problem_solver"


class CoverLetterResponse(BaseModel):
    job_id: int
    cover_letter_text: str
    linkedin_note: str


class InterviewPrepRequest(BaseModel):
    job_id: int
    provider: Optional[str] = None


class InterviewPrepResponse(BaseModel):
    job_id: int
    likely_questions: List[Dict[str, str]]
    company_intel: Dict[str, Any]
