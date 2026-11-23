from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, Any, Optional
from backend.app.schemas.auth import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    CareerOpsOnboardingRequest, ManualOnboardingRequest, OnboardingResultResponse
)
from backend.app.auth_utils import hash_password, verify_password, create_access_token, get_current_user
from backend.app.firebase import firebase_manager
from backend.app.services.career_ops_importer import CareerOpsImporter

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
        full_name=req.full_name
    )

    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            full_name=user["full_name"],
            email=user["email"],
            has_completed_onboarding=user.get("has_completed_onboarding", False),
            created_at=user.get("created_at")
        )
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
        user=UserResponse(
            id=user["id"],
            full_name=user["full_name"],
            email=user["email"],
            has_completed_onboarding=user.get("has_completed_onboarding", False),
            created_at=user.get("created_at")
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        has_completed_onboarding=current_user.get("has_completed_onboarding", False),
        created_at=current_user.get("created_at")
    )

@router.post("/onboarding/career-ops", response_model=OnboardingResultResponse)
async def onboarding_career_ops(
    req: CareerOpsOnboardingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    result = await CareerOpsImporter.import_from_directory(req.directory_path, current_user["id"])
    return OnboardingResultResponse(**result)

@router.post("/onboarding/upload-zip", response_model=OnboardingResultResponse)
async def onboarding_upload_zip(
    zip_file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Modo Rápido: Upload de arquivo ZIP completo da pasta Career-Ops."""
    if not zip_file.filename.lower().endswith(".zip"):
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

@router.post("/onboarding/manual", response_model=OnboardingResultResponse)
async def onboarding_manual(
    req: ManualOnboardingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    profile_dict = {
        "id": 1,
        "user_id": user_id,
        "full_name": current_user["full_name"],
        "headline": req.headline or "Profissional em Transição / Procura Ativa",
        "email": current_user["email"],
        "phone": req.phone,
        "location": req.location or "Portugal",
        "linkedin_url": None,
        "github_url": None,
        "portfolio_url": None,
        "summary": req.summary or "Perfil profissional inicial criado na plataforma New Career.",
        "skills": req.initial_skills or [],
        "experiences": [],
        "educations": [],
        "certifications": [],
        "verified_facts": [],
        "master_cv_text": req.initial_cv_text or ""
    }
    await firebase_manager.save_profile(user_id, profile_dict)
    await firebase_manager.update_user(user_id, {"has_completed_onboarding": True})

    return OnboardingResultResponse(
        success=True,
        message="Perfil inicial configurado com sucesso!",
        experiences_count=0,
        educations_count=0,
        skills_count=len(req.initial_skills),
        jobs_count=0,
        applications_count=0,
        cv_base_loaded=bool(req.initial_cv_text),
        profile_name=current_user["full_name"]
    )
