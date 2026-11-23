from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, description="Nome completo do utilizador")
    email: str = Field(..., min_length=3, description="Email para autenticação")
    password: str = Field(..., min_length=6, description="Palavra-passe (mínimo 6 caracteres)")

class UserLogin(BaseModel):
    email: str = Field(..., description="Email")
    password: str = Field(..., description="Palavra-passe")

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    has_completed_onboarding: bool = False
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CareerOpsOnboardingRequest(BaseModel):
    directory_path: str = Field(..., description="Caminho da pasta do Career-Ops na máquina local")

class ManualOnboardingRequest(BaseModel):
    headline: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    summary: Optional[str] = None
    initial_skills: List[str] = []
    initial_cv_text: Optional[str] = None

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
