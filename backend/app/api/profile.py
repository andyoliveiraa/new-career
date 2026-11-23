from fastapi import APIRouter, Depends
from typing import Dict, Any
from datetime import datetime, timezone
from backend.app.schemas.profile import ProfileUpdate, ProfileResponse
from backend.app.firebase import firebase_manager
from backend.app.auth_utils import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])

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
            "location": "Portugal",
            "linkedin_url": None,
            "github_url": None,
            "portfolio_url": None,
            "summary": "Perfil mestre criado na plataforma New Career.",
            "skills": [],
            "experiences": [],
            "educations": [],
            "certifications": [],
            "verified_facts": [],
            "master_cv_text": ""
        }
        await firebase_manager.save_profile(user_id, prof)

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
        verified_facts=prof.get("verified_facts") or [],
        updated_at=prof.get("updated_at") or now
    )

@router.put("", response_model=ProfileResponse)
async def update_profile(profile_data: ProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    data = profile_data.model_dump()
    data["user_id"] = user_id
    saved = await firebase_manager.save_profile(user_id, data)
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
