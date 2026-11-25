from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import os
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.app.schemas.auth import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    UserPreferencesUpdate, ParseCVResponse,
    CareerOpsOnboardingRequest, ManualOnboardingRequest, OnboardingResultResponse
)
from backend.app.auth_utils import hash_password, verify_password, create_access_token, get_current_user
from backend.app.firebase import firebase_manager
from backend.app.services.career_ops_importer import CareerOpsImporter
from backend.app.services.cv_parser import CVParserService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _to_user_response(user: Dict[str, Any]) -> UserResponse:
    return UserResponse(
        id=user["id"],
        full_name=user["full_name"],
        email=user["email"],
        preferred_language=user.get("preferred_language", "en"),
        has_completed_onboarding=user.get("has_completed_onboarding", False),
        created_at=user.get("created_at")
    )


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegister):
    existing = await firebase_manager.get_user_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma conta associada a este endereço de email."
        )

    pwd_hash = hash_password(req.password)
    user = await firebase_manager.create_user(
        email=req.email,
        password_hash=pwd_hash,
        full_name=req.full_name,
        preferred_language=req.preferred_language,
    )

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=_to_user_response(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin):
    user = await firebase_manager.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou palavra-passe incorretos."
        )

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=_to_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return _to_user_response(current_user)


@router.patch("/me/language", response_model=UserResponse)
async def update_my_language(
    req: UserPreferencesUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    updated = await firebase_manager.update_user(
        current_user["id"],
        {"preferred_language": req.preferred_language}
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")
    return _to_user_response(updated)


@router.post("/onboarding/career-ops", response_model=OnboardingResultResponse)
async def onboarding_career_ops(
    req: CareerOpsOnboardingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if not settings.ALLOW_LOCAL_DIR_IMPORT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Importação direta de diretórios do servidor está desativada por segurança. Utilize o upload de ZIP ou o Modo Privacidade."
        )
    result = await CareerOpsImporter.import_from_directory(req.directory_path, current_user["id"])
    return OnboardingResultResponse(**result)


@router.post("/onboarding/upload-zip", response_model=OnboardingResultResponse)
async def onboarding_upload_zip(
    zip_file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Modo Rápido: Upload de arquivo ZIP completo da pasta Career-Ops."""
    filename = (zip_file.filename or "").lower()
    if not filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Por favor envie um ficheiro com formato .zip válido.")

    content = await zip_file.read()
    result = await CareerOpsImporter.import_from_zip(content, current_user["id"])
    return OnboardingResultResponse(**result)


@router.post("/onboarding/upload-privacy", response_model=OnboardingResultResponse)
async def onboarding_upload_privacy(
    cv_file: UploadFile = File(..., description="Ficheiro cv.md"),
    profile_file: Optional[UploadFile] = File(None, description="Ficheiro config/profile.yml"),
    applications_file: Optional[UploadFile] = File(None, description="Ficheiro data/applications.md"),
    output_zip: Optional[UploadFile] = File(None, description="Ficheiro ZIP com os PDFs da pasta output/"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Modo de Privacidade: Upload individual dos ficheiros Markdown/YAML e apenas a pasta output em ZIP."""
    cv_bytes = await cv_file.read()
    cv_content = cv_bytes.decode("utf-8", errors="replace")

    profile_content = None
    if profile_file:
        prof_bytes = await profile_file.read()
        profile_content = prof_bytes.decode("utf-8", errors="replace")

    applications_content = None
    if applications_file:
        apps_bytes = await applications_file.read()
        applications_content = apps_bytes.decode("utf-8", errors="replace")

    output_zip_bytes = None
    if output_zip:
        output_zip_bytes = await output_zip.read()

    result = await CareerOpsImporter.import_from_files(
        user_id=current_user["id"],
        cv_content=cv_content,
        profile_content=profile_content,
        applications_content=applications_content,
        output_zip_bytes=output_zip_bytes
    )
    return OnboardingResultResponse(**result)


@router.post("/onboarding/parse-cv", response_model=ParseCVResponse)
async def onboarding_parse_cv(
    cv_file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Converte o CV anexado (PDF, DOCX, MD, TXT, HTML) para Markdown e extrai todos os dados para confirmação."""
    content = await cv_file.read()
    user_keys = await firebase_manager.get_user_settings(current_user["id"])
    parsed = await CVParserService.parse_cv_upload(
        filename=cv_file.filename or "cv.pdf",
        content=content,
        user_doc=current_user,
        user_keys=user_keys,
    )
    return ParseCVResponse(**parsed)


@router.post("/onboarding/manual", response_model=OnboardingResultResponse)
async def onboarding_manual(
    req: ManualOnboardingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    cv_md = req.initial_cv_text or ""
    if cv_md.strip():
        user_storage_dir = os.path.join(settings.STORAGE_DIR, "users", user_id)
        os.makedirs(user_storage_dir, exist_ok=True)
        with open(os.path.join(user_storage_dir, "master_cv.md"), "w", encoding="utf-8") as f:
            f.write(cv_md)

    resolved_name = (req.full_name or "").strip() or current_user["full_name"]
    profile_dict = {
        "id": 1,
        "user_id": user_id,
        "full_name": resolved_name,
        "headline": req.headline or "Profissional em Transição / Procura Ativa",
        "email": (req.email or "").strip() or current_user["email"],
        "phone": req.phone,
        "location": req.location or settings.DEFAULT_COUNTRY,
        "linkedin_url": req.linkedin_url or None,
        "github_url": req.github_url or None,
        "portfolio_url": req.portfolio_url or None,
        "summary": req.summary or "Perfil profissional inicial criado na plataforma New Career.",
        "skills": req.initial_skills or [],
        "experiences": req.experiences or [],
        "educations": req.educations or [],
        "certifications": req.certifications or [],
        "projects": req.projects or [],
        "languages": req.languages or [],
        "verified_facts": req.verified_facts or [],
        "master_cv_text": cv_md
    }
    await firebase_manager.save_profile(user_id, profile_dict)
    await firebase_manager.update_user(user_id, {"has_completed_onboarding": True})

    return OnboardingResultResponse(
        success=True,
        message="Perfil inicial configurado com sucesso!",
        experiences_count=len(req.experiences or []),
        educations_count=len(req.educations or []),
        skills_count=len(req.initial_skills),
        jobs_count=0,
        applications_count=0,
        cv_base_loaded=bool(cv_md.strip()),
        profile_name=resolved_name
    )
