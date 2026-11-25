import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any

HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
SAFE_FONT_RE = re.compile(r"^[A-Za-z0-9 \-]+$")
DATA_IMAGE_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$", re.IGNORECASE)


class CVTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome identificativo do modelo")
    layout: str = Field(default="classic_ats", description="classic_ats, modern_split, compact_executive, tech_minimal")
    has_photo: bool = Field(default=False, description="Se inclui fotografia de perfil")
    photo_url: Optional[str] = Field(default=None, description="URL ou data URI da foto")
    accent_color: str = Field(default="#2563eb", description="Cor primária / destaque em HEX (ex: #2563eb)")
    font_family: str = Field(default="Inter", description="Fonte do Google Fonts para o corpo (ex: Inter, Roboto, DM Sans)")
    font_heading: Optional[str] = Field(default=None, description="Fonte do Google Fonts para cabeçalhos (opcional)")
    font_size_scale: Optional[str] = Field(default="normal", description="compact, normal, spacious")
    blocks_order: List[str] = Field(
        default_factory=lambda: ["summary", "skills", "experiences", "educations", "certifications", "projects", "languages"]
    )
    block_visibility: Dict[str, bool] = Field(
        default_factory=lambda: {
            "summary": True,
            "skills": True,
            "experiences": True,
            "educations": True,
            "certifications": True,
            "projects": True,
            "languages": True
        }
    )
    is_default: bool = Field(default=False, description="Define se é o modelo padrão para candidaturas")

    @field_validator("accent_color")
    @classmethod
    def validate_accent_color(cls, v: str) -> str:
        val = (v or "").strip()
        if not HEX_COLOR_RE.match(val):
            return "#2563eb"
        return val

    @field_validator("font_family", "font_heading")
    @classmethod
    def validate_font_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if not SAFE_FONT_RE.match(cleaned):
            raise ValueError("Nome de fonte inválido: utilize apenas letras, números, espaços e hífen.")
        return cleaned

    @field_validator("photo_url")
    @classmethod
    def validate_photo_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if cleaned.startswith(("https://", "http://")) or DATA_IMAGE_RE.match(cleaned):
            return cleaned
        raise ValueError("URL de fotografia inválida: use http(s):// ou data:image/...;base64.")


class CVTemplateCreate(CVTemplateBase):
    pass


class CVTemplateUpdate(BaseModel):
    name: Optional[str] = None
    layout: Optional[str] = None
    has_photo: Optional[bool] = None
    photo_url: Optional[str] = None
    accent_color: Optional[str] = None
    font_family: Optional[str] = None
    font_heading: Optional[str] = None
    font_size_scale: Optional[str] = None
    blocks_order: Optional[List[str]] = None
    block_visibility: Optional[Dict[str, bool]] = None
    is_default: Optional[bool] = None

    @field_validator("accent_color")
    @classmethod
    def validate_accent_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if not HEX_COLOR_RE.match(val):
            return "#2563eb"
        return val

    @field_validator("font_family", "font_heading")
    @classmethod
    def validate_font_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if not SAFE_FONT_RE.match(cleaned):
            raise ValueError("Nome de fonte inválido: utilize apenas letras, números, espaços e hífen.")
        return cleaned

    @field_validator("photo_url")
    @classmethod
    def validate_photo_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if cleaned.startswith(("https://", "http://")) or DATA_IMAGE_RE.match(cleaned):
            return cleaned
        raise ValueError("URL de fotografia inválida: use http(s):// ou data:image/...;base64.")


class CVTemplateResponse(CVTemplateBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str


class ATSAuditCheckItem(BaseModel):
    id: str
    label: str
    passed: bool
    importance: str
    message: str


class ATSAuditResponse(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Pontuação ATS de 0 a 100")
    status: str = Field(..., description="excellent, good, needs_improvement")
    summary: str
    checklist: List[ATSAuditCheckItem]
    strengths: List[str]
    warnings: List[str]
    actionable_tips: List[str]


class ATSAuditRequest(BaseModel):
    template: CVTemplateBase
    profile: Optional[Dict[str, Any]] = None
    job_id: Optional[int] = None


class CVPreviewRequest(BaseModel):
    template: CVTemplateBase
    tailored_summary: Optional[str] = None
    tailored_experiences: Optional[List[Dict[str, Any]]] = None
    highlighted_skills: Optional[List[str]] = None
