from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal

SUPPORTED_LANGUAGES = ("en", "pt", "de", "es", "zh", "ar", "ko")
SupportedLanguage = Literal["en", "pt", "de", "es", "zh", "ar", "ko"]


def _normalize_language(v: object) -> str:
    if v is None:
        return "en"
    if isinstance(v, str):
        return v.strip().lower()
    return str(v)


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, description="Nome completo do utilizador")
    email: str = Field(..., min_length=3, description="Email para autenticação")
    password: str = Field(..., min_length=6, description="Palavra-passe (mínimo 6 caracteres)")
    preferred_language: SupportedLanguage = Field(default="en", description="Idioma preferido do utilizador")

    @field_validator("preferred_language", mode="before")
    @classmethod
    def validate_language(cls, v: object) -> str:
        return _normalize_language(v)


class UserPreferencesUpdate(BaseModel):
    preferred_language: SupportedLanguage = Field(..., description="Idioma preferido do utilizador")

    @field_validator("preferred_language", mode="before")
    @classmethod
    def validate_language(cls, v: object) -> str:
        return _normalize_language(v)


class UserLogin(BaseModel):
    email: str = Field(..., description="Email")
    password: str = Field(..., description="Palavra-passe")


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    preferred_language: str = "en"
    has_completed_onboarding: bool = False
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CareerOpsOnboardingRequest(BaseModel):
    directory_path: str = Field(..., description="Caminho da pasta do Career-Ops na máquina local")

class ManualOnboardingRequest(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    initial_skills: List[str] = []
    experiences: List[Dict[str, Any]] = []
    educations: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    languages: List[Dict[str, Any]] = []
    verified_facts: List[str] = []
    initial_cv_text: Optional[str] = None


class ParsedCVProfile(BaseModel):
    full_name: str = ""
    headline: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = ""
    skills: List[str] = []
    experiences: List[Dict[str, Any]] = []
    educations: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    languages: List[Dict[str, Any]] = []
    verified_facts: List[str] = []


class ParseCVResponse(BaseModel):
    filename: str
    cv_markdown: str
    profile: ParsedCVProfile
    used_ai: bool = False

class OnboardingResultResponse(BaseModel):
    success: bool
    message: str
    experiences_count: int = 0
    educations_count: int = 0
    skills_count: int = 0
    jobs_count: int = 0
    applications_count: int = 0
    cv_base_loaded: bool = False
    profile_name: Optional[str] = None
