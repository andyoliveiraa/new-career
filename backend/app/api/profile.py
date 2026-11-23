from fastapi import APIRouter
from datetime import datetime, timezone
from backend.app.schemas.profile import ProfileUpdate, ProfileResponse
from backend.app.firebase import firebase_manager

router = APIRouter(prefix="/profile", tags=["Profile"])

DEFAULT_PROFILE = {
    "id": 1,
    "full_name": "André Filipe Oliveira Dias",
    "headline": "Profissional em Tecnologias de Informação & Gestão Operacional",
    "email": "oliveira.dias@ubi.pt",
    "phone": "+351 925 220 777",
    "location": "Covilhã, Portugal",
    "linkedin_url": "https://linkedin.com/in/andre-dias-ubi",
    "github_url": "https://github.com/andyoliveiraa",
    "portfolio_url": None,
    "summary": "Profissional com formação em Informática Web, Móvel e na Nuvem pela Universidade da Beira Interior (UBI) e experiência comprovada em suporte técnico, sistemas e gestão de operações.",
    "skills": [
        {"name": "Python", "level": "avancado", "category": "tech"},
        {"name": "Linux & Redes", "level": "avancado", "category": "tech"},
        {"name": "Suporte Técnico & Troubleshooting", "level": "expert", "category": "tech"},
        {"name": "Gestão Operacional", "level": "expert", "category": "operations"}
    ],
    "experiences": [],
    "educations": [],
    "certifications": [],
    "verified_facts": []
}

@router.get("", response_model=ProfileResponse)
async def get_profile():
    prof = await firebase_manager.get_profile()
    if not prof:
        prof = await firebase_manager.save_profile(DEFAULT_PROFILE)

    now = datetime.now(timezone.utc)
    return ProfileResponse(
        id=int(prof.get("id", 1)),
        full_name=prof.get("full_name", "André Filipe Oliveira Dias"),
        headline=prof.get("headline"),
        email=prof.get("email"),
        phone=prof.get("phone"),
        location=prof.get("location"),
        linkedin_url=prof.get("linkedin_url"),
        github_url=prof.get("github_url"),
        portfolio_url=prof.get("portfolio_url"),
        summary=prof.get("summary"),
        skills=prof.get("skills") or [],
        experiences=prof.get("experiences") or [],
        educations=prof.get("educations") or [],
        certifications=prof.get("certifications") or [],
        verified_facts=prof.get("verified_facts") or [],
        updated_at=prof.get("updated_at") or now
    )

@router.put("", response_model=ProfileResponse)
async def update_profile(profile_data: ProfileUpdate):
    data = profile_data.model_dump()
    saved = await firebase_manager.save_profile(data)
    now = datetime.now(timezone.utc)
    return ProfileResponse(
        id=int(saved.get("id", 1)),
        full_name=saved.get("full_name", ""),
        headline=saved.get("headline"),
        email=saved.get("email"),
        phone=saved.get("phone"),
        location=saved.get("location"),
        linkedin_url=saved.get("linkedin_url"),
        github_url=saved.get("github_url"),
        portfolio_url=saved.get("portfolio_url"),
        summary=saved.get("summary"),
        skills=saved.get("skills") or [],
        experiences=saved.get("experiences") or [],
        educations=saved.get("educations") or [],
        certifications=saved.get("certifications") or [],
        verified_facts=saved.get("verified_facts") or [],
        updated_at=saved.get("updated_at") or now
    )
