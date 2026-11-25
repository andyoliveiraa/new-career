from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends

from backend.app.auth_utils import get_current_user
from backend.app.config import settings
from backend.app.firebase import firebase_manager
from backend.app.schemas.profile import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


def _to_profile_response(prof: Dict[str, Any], current_user: Dict[str, Any]) -> ProfileResponse:
    now = datetime.now(timezone.utc)
    return ProfileResponse(
        id=int(prof.get("id", 1)),
        full_name=prof.get("full_name") or current_user.get("full_name", ""),
        headline=prof.get("headline"),
        email=prof.get("email") or current_user.get("email", ""),
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
        projects=prof.get("projects") or [],
        languages=prof.get("languages") or [],
        verified_facts=prof.get("verified_facts") or [],
        updated_at=prof.get("updated_at") or now
    )


@router.get("", response_model=ProfileResponse)
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    prof = await firebase_manager.get_profile(user_id)
    if not prof:
        prof = {
            "id": 1,
            "user_id": user_id,
            "full_name": current_user.get("full_name", ""),
            "headline": "Profissional em Transição / Procura Ativa",
            "email": current_user.get("email", ""),
            "phone": "",
            "location": settings.DEFAULT_COUNTRY,
            "linkedin_url": None,
            "github_url": None,
            "portfolio_url": None,
            "summary": "Perfil mestre criado na plataforma New Career.",
            "skills": [],
            "experiences": [],
            "educations": [],
            "certifications": [],
            "projects": [],
            "languages": [],
            "verified_facts": [],
            "master_cv_text": ""
        }
        await firebase_manager.save_profile(user_id, prof)

    return _to_profile_response(prof, current_user)


@router.put("", response_model=ProfileResponse)
async def update_profile(profile_data: ProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    existing = await firebase_manager.get_profile(user_id)
    data = profile_data.model_dump()
    data["id"] = existing.get("id", 1)
    data["user_id"] = user_id
    if existing.get("master_cv_text") and "master_cv_text" not in data:
        data["master_cv_text"] = existing["master_cv_text"]
    saved = await firebase_manager.save_profile(user_id, data)
    await firebase_manager.record_metric("profile_updates", user_id)
    return _to_profile_response(saved, current_user)
